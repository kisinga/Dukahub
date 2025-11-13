import { Injectable, Logger, Optional } from '@nestjs/common';
import {
    Customer,
    ID,
    Payment,
    RequestContext,
    TransactionalConnection,
    UserInputError,
} from '@vendure/core';
import { ChannelCommunicationService } from '../channels/channel-communication.service';
import { AuditService } from '../../infrastructure/audit/audit.service';

export interface CreditSummary {
    customerId: ID;
    isCreditApproved: boolean;
    creditLimit: number;
    outstandingAmount: number;
    availableCredit: number;
    lastRepaymentDate?: Date | null;
    lastRepaymentAmount: number;
    creditDuration: number;
}

@Injectable()
export class CreditService {
    private readonly logger = new Logger('CreditService');

    constructor(
        private readonly connection: TransactionalConnection,
        @Optional() private readonly communicationService?: ChannelCommunicationService, // Optional to avoid circular dependency
        @Optional() private readonly auditService?: AuditService, // Optional to avoid circular dependency
    ) { }

    async getCreditSummary(ctx: RequestContext, customerId: ID): Promise<CreditSummary> {
        const customer = await this.getCustomerOrThrow(ctx, customerId);
        return this.mapToSummary(customer);
    }

    async approveCustomerCredit(
        ctx: RequestContext,
        customerId: ID,
        approved: boolean,
        creditLimit?: number,
        creditDuration?: number
    ): Promise<CreditSummary> {
        const customer = await this.getCustomerOrThrow(ctx, customerId);
        const customFields = customer.customFields as any;

        customer.customFields = {
            ...customFields,
            isCreditApproved: approved,
            creditLimit: creditLimit ?? customFields?.creditLimit ?? 0,
            creditDuration: creditDuration ?? customFields?.creditDuration ?? 30,
        } as any;

        // Update custom field for user tracking
        customer.customFields = {
            ...customer.customFields,
            creditApprovedByUserId: ctx.activeUserId,
        } as any;

        await this.connection.getRepository(ctx, Customer).save(customer);
        this.logger.log(
            `Updated credit approval for customer ${customerId}: approved=${approved} limit=${(customer.customFields as any).creditLimit} duration=${(customer.customFields as any).creditDuration}`
        );

        // Log audit event
        if (this.auditService) {
            await this.auditService.log(ctx, 'customer.credit.approved', {
                entityType: 'Customer',
                entityId: customerId.toString(),
                data: {
                    approved,
                    creditLimit: (customer.customFields as any).creditLimit,
                    creditDuration: (customer.customFields as any).creditDuration,
                },
            });
        }

        return this.mapToSummary(customer);
    }

    async updateCustomerCreditLimit(
        ctx: RequestContext,
        customerId: ID,
        creditLimit: number,
        creditDuration?: number
    ): Promise<CreditSummary> {
        if (creditLimit < 0) {
            throw new UserInputError('Credit limit must be zero or positive.');
        }

        if (creditDuration !== undefined && creditDuration < 1) {
            throw new UserInputError('Credit duration must be at least 1 day.');
        }

        const customer = await this.getCustomerOrThrow(ctx, customerId);
        const customFields = customer.customFields as any;
        customer.customFields = {
            ...customFields,
            creditLimit,
            ...(creditDuration !== undefined && { creditDuration }),
        } as any;

        await this.connection.getRepository(ctx, Customer).save(customer);
        this.logger.log(
            `Updated credit limit for customer ${customerId} to ${creditLimit}${creditDuration !== undefined ? `, duration: ${creditDuration}` : ''}`
        );

        // Log audit event
        if (this.auditService) {
            await this.auditService.log(ctx, 'customer.credit.limit_changed', {
                entityType: 'Customer',
                entityId: customerId.toString(),
                data: {
                    creditLimit,
                    creditDuration,
                },
            });
        }

        return this.mapToSummary(customer);
    }
    
    async updateCreditDuration(
        ctx: RequestContext,
        customerId: ID,
        creditDuration: number
    ): Promise<CreditSummary> {
        if (creditDuration < 1) {
            throw new UserInputError('Credit duration must be at least 1 day.');
        }

        const customer = await this.getCustomerOrThrow(ctx, customerId);
        const customFields = customer.customFields as any;
        customer.customFields = {
            ...customFields,
            creditDuration,
        } as any;

        await this.connection.getRepository(ctx, Customer).save(customer);
        this.logger.log(`Updated credit duration for customer ${customerId} to ${creditDuration} days`);

        return this.mapToSummary(customer);
    }

    async applyCreditCharge(ctx: RequestContext, customerId: ID, amount: number): Promise<void> {
        if (amount <= 0) {
            return;
        }

        const customer = await this.getCustomerOrThrow(ctx, customerId);
        const customFields = customer.customFields as any;
        const currentOutstanding = customFields?.outstandingAmount ?? 0;
        const newOutstanding = currentOutstanding - amount;
        
        customer.customFields = {
            ...customFields,
            outstandingAmount: newOutstanding,
        } as any;

        await this.connection.getRepository(ctx, Customer).save(customer);
        this.logger.log(
            `Applied credit charge of ${amount} to customer ${customerId}. Outstanding: ${newOutstanding}`
        );

        // Notify about balance change
        if (this.communicationService) {
            await this.communicationService.sendBalanceChangeNotification(
                ctx,
                String(customerId),
                currentOutstanding,
                newOutstanding
            ).catch(error => {
                this.logger.warn(`Failed to send balance change notification: ${error instanceof Error ? error.message : String(error)}`);
            });
        }
    }

    async releaseCreditCharge(ctx: RequestContext, customerId: ID, amount: number): Promise<void> {
        if (amount <= 0) {
            return;
        }

        const customer = await this.getCustomerOrThrow(ctx, customerId);
        const customFields = customer.customFields as any;
        const currentOutstanding = customFields?.outstandingAmount ?? 0;
        const newOutstanding = currentOutstanding + amount;
        const now = new Date();
        
        customer.customFields = {
            ...customFields,
            outstandingAmount: newOutstanding,
            lastRepaymentDate: now,
            lastRepaymentAmount: amount,
        } as any;

        await this.connection.getRepository(ctx, Customer).save(customer);
        this.logger.log(
            `Recorded repayment of ${amount} for customer ${customerId}. Outstanding: ${newOutstanding}`
        );

        // Notify about balance change
        if (this.communicationService) {
            await this.communicationService.sendBalanceChangeNotification(
                ctx,
                String(customerId),
                currentOutstanding,
                newOutstanding
            ).catch(error => {
                this.logger.warn(`Failed to send balance change notification: ${error instanceof Error ? error.message : String(error)}`);
            });
        }
    }

    async markPaymentMetadata(
        ctx: RequestContext,
        paymentId: ID,
        metadata: Record<string, unknown>
    ): Promise<void> {
        await this.connection.getRepository(ctx, Payment).save({
            id: paymentId,
            metadata,
        } as Payment);
    }

    private async getCustomerOrThrow(ctx: RequestContext, customerId: ID): Promise<Customer> {
        const customer = await this.connection.getRepository(ctx, Customer).findOne({
            where: { id: customerId },
        });

        if (!customer) {
            throw new UserInputError(`Customer ${customerId} not found`);
        }

        return customer;
    }

    private mapToSummary(customer: Customer): CreditSummary {
        // Type assertion for custom fields - they are defined in vendure-config.ts
        const customFields = customer.customFields as any;
        const isCreditApproved = Boolean(customFields?.isCreditApproved);
        const creditLimit = Number(customFields?.creditLimit ?? 0);
        const outstandingAmount = Number(customFields?.outstandingAmount ?? 0);
        const availableCredit = Math.max(creditLimit - Math.abs(outstandingAmount), 0);
        const lastRepaymentDate = customFields?.lastRepaymentDate ? new Date(customFields.lastRepaymentDate) : null;
        const lastRepaymentAmount = Number(customFields?.lastRepaymentAmount ?? 0);
        const creditDuration = Number(customFields?.creditDuration ?? 30);

        return {
            customerId: customer.id,
            isCreditApproved,
            creditLimit,
            outstandingAmount,
            availableCredit,
            lastRepaymentDate,
            lastRepaymentAmount,
            creditDuration,
        };
    }
}

