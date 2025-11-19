import { Injectable, Logger } from '@nestjs/common';
import {
    ID,
    RequestContext,
    UserInputError
} from '@vendure/core';
import { SupplierCreditService } from '../credit/supplier-credit.service';
import { StockPurchase } from './entities/purchase.entity';

/**
 * Purchase Credit Validator Service
 * 
 * Handles credit validation for supplier purchases.
 * Separated for single responsibility and testability.
 */
@Injectable()
export class PurchaseCreditValidatorService {
    private readonly logger = new Logger('PurchaseCreditValidatorService');

    constructor(
        private readonly supplierCreditService: SupplierCreditService,
    ) { }

    /**
     * Validate supplier credit purchase eligibility
     * Checks supplier credit approval status
     */
    async validateSupplierCreditApproval(
        ctx: RequestContext,
        supplierId: string
    ): Promise<void> {
        const summary = await this.supplierCreditService.getSupplierCreditSummary(ctx, supplierId);
        if (!summary.isSupplierCreditApproved) {
            throw new UserInputError('Supplier is not approved for credit purchases.');
        }
    }

    /**
     * Validate supplier credit limit with actual purchase total
     * This is the final validation after purchase is fully calculated
     */
    async validateSupplierCreditLimitWithPurchase(
        ctx: RequestContext,
        supplierId: string,
        purchaseTotal: number // In smallest currency unit (cents)
    ): Promise<void> {
        const summary = await this.supplierCreditService.getSupplierCreditSummary(ctx, supplierId);
        const availableCredit = summary.supplierCreditLimit - summary.outstandingAmount;
        
        // Convert purchase total from cents to base currency units (divide by 100)
        // This matches the unit used for supplierCreditLimit and outstandingAmount (base currency units)
        const purchaseTotalInBaseCurrency = purchaseTotal / 100;

        if (purchaseTotalInBaseCurrency > availableCredit) {
            throw new UserInputError(
                `Supplier credit limit exceeded. Available: ${availableCredit}, Required: ${purchaseTotalInBaseCurrency}. ` +
                `Purchase would exceed credit limit by ${purchaseTotalInBaseCurrency - availableCredit}.`
            );
        }

        this.logger.log(
            `Supplier credit validation passed for supplier ${supplierId}: ` +
            `Available: ${availableCredit}, Purchase Total: ${purchaseTotalInBaseCurrency}, ` +
            `Remaining: ${availableCredit - purchaseTotalInBaseCurrency}`
        );
    }

    /**
     * Validate supplier credit limit with purchase entity
     * Convenience method that extracts total from purchase
     */
    async validateSupplierCreditLimitWithPurchaseEntity(
        ctx: RequestContext,
        supplierId: string,
        purchase: StockPurchase
    ): Promise<void> {
        await this.validateSupplierCreditLimitWithPurchase(ctx, supplierId, purchase.totalCost);
    }
}






