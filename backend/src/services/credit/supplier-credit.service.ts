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
        @Optional() private readonly communicationService?: ChannelCommunicationService,
        @Optional() private readonly auditService?: AuditService,
        @Optional() private readonly financialService?: FinancialService, // Optional for migration period
    ) { }

    async getSupplierCreditSummary(ctx: RequestContext, supplierId: ID): Promise<SupplierCreditSummary> {
        const supplier = await this.getSupplierOrThrow(ctx, supplierId);
        // Get outstanding amount from ledger (single source of truth)
        const outstandingAmount = this.financialService
            ? await this.financialService.getSupplierBalance(ctx, supplierId.toString())
            : await this.calculateSupplierOutstandingAmount(ctx, supplierId); // Fallback during migration
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

        const outstandingAmount = this.financialService
            ? await this.financialService.getSupplierBalance(ctx, supplierId.toString())
            : await this.calculateSupplierOutstandingAmount(ctx, supplierId); // Fallback during migration
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

        const outstandingAmount = this.financialService
            ? await this.financialService.getSupplierBalance(ctx, supplierId.toString())
            : await this.calculateSupplierOutstandingAmount(ctx, supplierId); // Fallback during migration
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

        const outstandingAmount = this.financialService
            ? await this.financialService.getSupplierBalance(ctx, supplierId.toString())
            : await this.calculateSupplierOutstandingAmount(ctx, supplierId); // Fallback during migration
        return this.mapToSummary(supplier, outstandingAmount);
    }

    /**
     * Calculate outstanding amount dynamically from credit purchases and payments
     * @deprecated Use FinancialService.getSupplierBalance() instead. This method is kept for migration fallback.
     * This replaces any stored outstandingAmount field
     */
    async calculateSupplierOutstandingAmount(ctx: RequestContext, supplierId: ID): Promise<number> {
        // Query all credit purchases for supplier in states that indicate unpaid purchases
        const purchaseRepo = this.connection.getRepository(ctx, StockPurchase);
        // Convert Vendure ID (string) to integer for database query
        const purchases = await purchaseRepo.find({
            where: {
                supplierId: parseInt(String(supplierId), 10),
                isCreditPurchase: true,
                paymentStatus: In(['pending', 'partial']),
            },
        });

        // Calculate outstanding amount: sum of purchase totals minus paid amounts
        // Note: totalCost is in smallest currency unit (cents)
        // We need to track payments separately - for now, we'll use paymentStatus
        // 'paid' = fully paid, 'partial' = partially paid, 'pending' = unpaid
        // For simplicity, we'll calculate based on paymentStatus:
        // - 'pending': full amount owed
        // - 'partial': need to track actual paid amount (this would require a payments table)
        // For now, we'll treat 'partial' as having some payment but not fully paid
        // This is a simplification - ideally we'd have a payments table for purchases

        // TODO: In the future, add a purchase_payment table similar to order payments
        // For now, we'll use a simple calculation based on paymentStatus
        const outstandingAmountInCents = purchases.reduce((sum, purchase) => {
            if (purchase.paymentStatus === 'paid') {
                return sum; // Fully paid, no outstanding
            } else if (purchase.paymentStatus === 'partial') {
                // For partial payments, we'd need to track actual paid amount
                // For now, we'll estimate as 50% paid (this should be replaced with actual payment tracking)
                // This is a temporary solution until purchase payments are properly tracked
                return sum + Math.floor(purchase.totalCost * 0.5);
            } else {
                // 'pending' - full amount owed
                return sum + purchase.totalCost;
            }
        }, 0);

        // Convert from cents to base currency units (divide by 100)
        // This matches the unit used for supplierCreditLimit (base currency units)
        return outstandingAmountInCents / 100;
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

        // Notify about balance change (outstanding balance is calculated dynamically)
        if (this.communicationService) {
            const currentOutstanding = this.financialService
                ? await this.financialService.getSupplierBalance(ctx, supplierId.toString())
                : await this.calculateSupplierOutstandingAmount(ctx, supplierId); // Fallback during migration
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


