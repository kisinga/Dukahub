import { Injectable, Logger, Optional } from '@nestjs/common';
import {
    Customer,
    ID,
    RequestContext,
    TransactionalConnection,
    UserInputError,
} from '@vendure/core';
import { In } from 'typeorm';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { ChannelCommunicationService } from '../channels/channel-communication.service';
import { StockPurchase } from '../stock/entities/purchase.entity';
import { FinancialService } from '../financial/financial.service';

export interface SupplierCreditSummary {
    supplierId: ID;
    isSupplierCreditApproved: boolean;
    supplierCreditLimit: number;
    outstandingAmount: number;
    availableCredit: number;
    lastRepaymentDate?: Date | null;
    lastRepaymentAmount: number;
    supplierCreditDuration: number;
}

@Injectable()
export class SupplierCreditService {
    private readonly logger = new Logger('SupplierCreditService');

    constructor(
        private readonly connection: TransactionalConnection,
        private readonly financialService: FinancialService,
        @Optional() private readonly communicationService?: ChannelCommunicationService,
        @Optional() private readonly auditService?: AuditService,
    ) { }

    async getSupplierCreditSummary(ctx: RequestContext, supplierId: ID): Promise<SupplierCreditSummary> {
        const supplier = await this.getSupplierOrThrow(ctx, supplierId);
        // Get outstanding amount from ledger (single source of truth)
        const outstandingAmount = await this.financialService.getSupplierBalance(
            ctx,
            supplierId.toString(),
        );
        return this.mapToSummary(supplier, outstandingAmount);
    }

    async approveSupplierCredit(
        ctx: RequestContext,
        supplierId: ID,
        approved: boolean,
        creditLimit?: number,
        creditDuration?: number
    ): Promise<SupplierCreditSummary> {
        const supplier = await this.getSupplierOrThrow(ctx, supplierId);

        // Verify supplier is marked as supplier
        const customFields = supplier.customFields as any;
        if (!customFields?.isSupplier) {
            throw new UserInputError(`Customer ${supplierId} is not marked as a supplier.`);
        }

        supplier.customFields = {
            ...customFields,
            isSupplierCreditApproved: approved,
            supplierCreditLimit: creditLimit ?? customFields?.supplierCreditLimit ?? 0,
            supplierCreditDuration: creditDuration ?? customFields?.supplierCreditDuration ?? 30,
        } as any;

        // Update custom field for user tracking
        supplier.customFields = {
            ...supplier.customFields,
            supplierCreditApprovedByUserId: ctx.activeUserId,
        } as any;

        await this.connection.getRepository(ctx, Customer).save(supplier);
        this.logger.log(
            `Updated supplier credit approval for supplier ${supplierId}: approved=${approved} limit=${(supplier.customFields as any).supplierCreditLimit} duration=${(supplier.customFields as any).supplierCreditDuration}`
        );

        // Log audit event
        if (this.auditService) {
            await this.auditService.log(ctx, 'supplier.credit.approved', {
                entityType: 'Customer',
                entityId: supplierId.toString(),
                data: {
                    approved,
                    supplierCreditLimit: (supplier.customFields as any).supplierCreditLimit,
                    supplierCreditDuration: (supplier.customFields as any).supplierCreditDuration,
                },
            });
        }

        const outstandingAmount = await this.financialService.getSupplierBalance(
            ctx,
            supplierId.toString(),
        );
        return this.mapToSummary(supplier, outstandingAmount);
    }

    async updateSupplierCreditLimit(
        ctx: RequestContext,
        supplierId: ID,
        creditLimit: number,
        creditDuration?: number
    ): Promise<SupplierCreditSummary> {
        if (creditLimit < 0) {
            throw new UserInputError('Credit limit must be zero or positive.');
        }

        if (creditDuration !== undefined && creditDuration < 1) {
            throw new UserInputError('Credit duration must be at least 1 day.');
        }

        const supplier = await this.getSupplierOrThrow(ctx, supplierId);
        const customFields = supplier.customFields as any;
        supplier.customFields = {
            ...customFields,
            supplierCreditLimit: creditLimit,
            ...(creditDuration !== undefined && { supplierCreditDuration: creditDuration }),
        } as any;

        await this.connection.getRepository(ctx, Customer).save(supplier);
        this.logger.log(
            `Updated supplier credit limit for supplier ${supplierId} to ${creditLimit}${creditDuration !== undefined ? `, duration: ${creditDuration}` : ''}`
        );

        // Log audit event
        if (this.auditService) {
            await this.auditService.log(ctx, 'supplier.credit.limit_changed', {
                entityType: 'Customer',
                entityId: supplierId.toString(),
                data: {
                    supplierCreditLimit: creditLimit,
                    supplierCreditDuration: creditDuration,
                },
            });
        }

        const outstandingAmount = await this.financialService.getSupplierBalance(
            ctx,
            supplierId.toString(),
        );
        return this.mapToSummary(supplier, outstandingAmount);
    }

    async updateSupplierCreditDuration(
        ctx: RequestContext,
        supplierId: ID,
        creditDuration: number
    ): Promise<SupplierCreditSummary> {
        if (creditDuration < 1) {
            throw new UserInputError('Credit duration must be at least 1 day.');
        }

        const supplier = await this.getSupplierOrThrow(ctx, supplierId);
        const customFields = supplier.customFields as any;
        supplier.customFields = {
            ...customFields,
            supplierCreditDuration: creditDuration,
        } as any;

        await this.connection.getRepository(ctx, Customer).save(supplier);
        this.logger.log(`Updated supplier credit duration for supplier ${supplierId} to ${creditDuration} days`);

        const outstandingAmount = await this.financialService.getSupplierBalance(
            ctx,
            supplierId.toString(),
        );
        return this.mapToSummary(supplier, outstandingAmount);
    }

    /**
     * Update supplier repayment tracking fields
     * Called when a payment is made to the supplier
     */
    async recordSupplierRepayment(
        ctx: RequestContext,
        supplierId: ID,
        amount: number
    ): Promise<void> {
        if (amount <= 0) {
            return;
        }

        // Update last repayment tracking fields
        const supplier = await this.getSupplierOrThrow(ctx, supplierId);
        const customFields = supplier.customFields as any;
        const now = new Date();

        supplier.customFields = {
            ...customFields,
            supplierLastRepaymentDate: now,
            supplierLastRepaymentAmount: amount,
        } as any;

        await this.connection.getRepository(ctx, Customer).save(supplier);
        this.logger.log(
            `Recorded supplier repayment tracking for supplier ${supplierId}. Amount: ${amount}, Date: ${now}`
        );

        // Notify about balance change (outstanding balance is calculated from ledger)
        if (this.communicationService) {
            const currentOutstanding = await this.financialService.getSupplierBalance(
                ctx,
                supplierId.toString(),
            );
            await this.communicationService.sendBalanceChangeNotification(
                ctx,
                String(supplierId),
                currentOutstanding + amount, // Estimate previous balance
                currentOutstanding
            ).catch(error => {
                this.logger.warn(`Failed to send balance change notification: ${error instanceof Error ? error.message : String(error)}`);
            });
        }
    }

    private async getSupplierOrThrow(ctx: RequestContext, supplierId: ID): Promise<Customer> {
        const customerRepo = this.connection.getRepository(ctx, Customer);
        const supplier = await customerRepo.findOne({
            where: { id: supplierId },
        });

        if (!supplier) {
            throw new UserInputError(`Supplier ${supplierId} not found`);
        }

        // Verify supplier is marked as supplier
        const customFields = supplier.customFields as any;
        if (!customFields?.isSupplier) {
            throw new UserInputError(`Customer ${supplierId} is not marked as a supplier.`);
        }

        return supplier;
    }

    private mapToSummary(supplier: Customer, outstandingAmount: number): SupplierCreditSummary {
        // Type assertion for custom fields - they are defined in vendure-config.ts
        const customFields = supplier.customFields as any;
        const isSupplierCreditApproved = Boolean(customFields?.isSupplierCreditApproved);
        const supplierCreditLimit = Number(customFields?.supplierCreditLimit ?? 0);
        // outstandingAmount is now passed as parameter (calculated dynamically)
        const availableCredit = Math.max(supplierCreditLimit - Math.abs(outstandingAmount), 0);
        const lastRepaymentDate = customFields?.supplierLastRepaymentDate ? new Date(customFields.supplierLastRepaymentDate) : null;
        const lastRepaymentAmount = Number(customFields?.supplierLastRepaymentAmount ?? 0);
        const supplierCreditDuration = Number(customFields?.supplierCreditDuration ?? 30);

        return {
            supplierId: supplier.id,
            isSupplierCreditApproved,
            supplierCreditLimit,
            outstandingAmount, // Now calculated dynamically
            availableCredit,
            lastRepaymentDate,
            lastRepaymentAmount,
            supplierCreditDuration,
        };
    }
}


