import { Injectable, Logger, Optional } from '@nestjs/common';
import {
    Customer,
    ID,
    Order,
    OrderService,
    Payment,
    RequestContext,
    TransactionalConnection,
    UserInputError,
} from '@vendure/core';
import { In } from 'typeorm';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { ChannelCommunicationService } from '../channels/channel-communication.service';

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
        private readonly orderService: OrderService,
        @Optional() private readonly communicationService?: ChannelCommunicationService, // Optional to avoid circular dependency
        @Optional() private readonly auditService?: AuditService, // Optional to avoid circular dependency
    ) { }

    async getCreditSummary(ctx: RequestContext, customerId: ID): Promise<CreditSummary> {
        const customer = await this.getCustomerOrThrow(ctx, customerId);
        // Calculate outstanding amount dynamically from orders
        const outstandingAmount = await this.calculateOutstandingAmount(ctx, customerId);
        return this.mapToSummary(customer, outstandingAmount);
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

        const outstandingAmount = await this.calculateOutstandingAmount(ctx, customerId);
        return this.mapToSummary(customer, outstandingAmount);
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

        const outstandingAmount = await this.calculateOutstandingAmount(ctx, customerId);
        return this.mapToSummary(customer, outstandingAmount);
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

        const outstandingAmount = await this.calculateOutstandingAmount(ctx, customerId);
        return this.mapToSummary(customer, outstandingAmount);
    }

    /**
     * Calculate outstanding amount dynamically from orders and payments
     * This replaces the stored outstandingAmount field
     */
    private async calculateOutstandingAmount(ctx: RequestContext, customerId: ID): Promise<number> {
        // Query all orders for customer in states that indicate unpaid orders
        const orderRepo = this.connection.getRepository(ctx, Order);
        const orders = await orderRepo.find({
            where: {
                customer: { id: customerId },
                state: In(['ArrangingPayment', 'Fulfilled', 'PartiallyFulfilled']),
            },
            relations: ['payments'],
        });

        // Calculate outstanding amount: sum of order totals minus settled payments
        // Note: order.total and payment.amount are in smallest currency unit (cents)
        const outstandingAmountInCents = orders.reduce((sum, order) => {
            const settledPayments = (order.payments || [])
                .filter(p => p.state === 'Settled')
                .reduce((total, p) => total + p.amount, 0);
            return sum + (order.total - settledPayments);
        }, 0);

        // Convert from cents to base currency units (divide by 100)
        // This matches the unit used for creditLimit (base currency units)
        return outstandingAmountInCents / 100;
    }

    /**
     * @deprecated Use calculateOutstandingAmount instead. Outstanding balance is now calculated dynamically.
     * This method is kept for backward compatibility but does nothing.
     */
    async applyCreditCharge(ctx: RequestContext, customerId: ID, amount: number): Promise<void> {
        // No-op: Outstanding balance is now calculated dynamically from orders
        this.logger.debug(
            `applyCreditCharge called for customer ${customerId} with amount ${amount}. This is a no-op as outstanding balance is calculated dynamically.`
        );
    }

    /**
     * @deprecated Use calculateOutstandingAmount instead. Outstanding balance is now calculated dynamically.
     * This method is kept for backward compatibility but updates lastRepaymentDate and lastRepaymentAmount.
     */
    async releaseCreditCharge(ctx: RequestContext, customerId: ID, amount: number): Promise<void> {
        if (amount <= 0) {
            return;
        }

        // Update last repayment tracking fields (these are still stored)
        const customer = await this.getCustomerOrThrow(ctx, customerId);
        const customFields = customer.customFields as any;
        const now = new Date();

        customer.customFields = {
            ...customFields,
            lastRepaymentDate: now,
            lastRepaymentAmount: amount,
        } as any;

        await this.connection.getRepository(ctx, Customer).save(customer);
        this.logger.log(
            `Recorded repayment tracking for customer ${customerId}. Amount: ${amount}, Date: ${now}`
        );

        // Notify about balance change (outstanding balance is calculated dynamically)
        if (this.communicationService) {
            const currentOutstanding = await this.calculateOutstandingAmount(ctx, customerId);
            // Note: We can't calculate the previous outstanding without the old stored value,
            // so we'll just notify with the current value
            await this.communicationService.sendBalanceChangeNotification(
                ctx,
                String(customerId),
                currentOutstanding + amount, // Estimate previous balance
                currentOutstanding
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

    private mapToSummary(customer: Customer, outstandingAmount: number): CreditSummary {
        // Type assertion for custom fields - they are defined in vendure-config.ts
        const customFields = customer.customFields as any;
        const isCreditApproved = Boolean(customFields?.isCreditApproved);
        const creditLimit = Number(customFields?.creditLimit ?? 0);
        // outstandingAmount is now passed as parameter (calculated dynamically)
        const availableCredit = Math.max(creditLimit - Math.abs(outstandingAmount), 0);
        const lastRepaymentDate = customFields?.lastRepaymentDate ? new Date(customFields.lastRepaymentDate) : null;
        const lastRepaymentAmount = Number(customFields?.lastRepaymentAmount ?? 0);
        const creditDuration = Number(customFields?.creditDuration ?? 30);

        return {
            customerId: customer.id,
            isCreditApproved,
            creditLimit,
            outstandingAmount, // Now calculated dynamically
            availableCredit,
            lastRepaymentDate,
            lastRepaymentAmount,
            creditDuration,
        };
    }
}

