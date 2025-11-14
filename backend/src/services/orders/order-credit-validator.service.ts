import { Injectable, Logger } from '@nestjs/common';
import {
    ID,
    Order,
    RequestContext,
    UserInputError
} from '@vendure/core';
import { CreditService } from '../credit/credit.service';
import { OrderService } from '@vendure/core';

/**
 * Order Credit Validator Service
 * 
 * Handles credit validation for orders.
 * Separated for single responsibility and testability.
 */
@Injectable()
export class OrderCreditValidatorService {
    private readonly logger = new Logger('OrderCreditValidatorService');

    constructor(
        private readonly creditService: CreditService,
        private readonly orderService: OrderService,
    ) { }

    /**
     * Validate credit sale eligibility
     * Checks credit approval status
     */
    async validateCreditApproval(
        ctx: RequestContext,
        customerId: string
    ): Promise<void> {
        const summary = await this.creditService.getCreditSummary(ctx, customerId);
        if (!summary.isCreditApproved) {
            throw new UserInputError('Customer is not approved for credit sales.');
        }
    }

    /**
     * Validate credit limit before order creation
     * Uses estimated total from cart items
     */
    async validateCreditLimitEstimate(
        ctx: RequestContext,
        customerId: string,
        estimatedTotal: number
    ): Promise<void> {
        const summary = await this.creditService.getCreditSummary(ctx, customerId);
        const availableCredit = summary.creditLimit - summary.outstandingAmount;

        if (estimatedTotal > availableCredit) {
            throw new UserInputError(
                `Credit limit exceeded. Available: ${availableCredit}, Required: ${estimatedTotal}`
            );
        }
    }

    /**
     * Validate credit limit with actual order total
     * This is the final validation after order is fully calculated
     */
    async validateCreditLimitWithOrder(
        ctx: RequestContext,
        customerId: string,
        order: Order
    ): Promise<void> {
        const summary = await this.creditService.getCreditSummary(ctx, customerId);
        const availableCredit = summary.creditLimit - summary.outstandingAmount;
        
        // Convert order total from cents to base currency units (divide by 100)
        // This matches the unit used for creditLimit and outstandingAmount (base currency units)
        const orderTotalInCents = order.totalWithTax || order.total;
        const orderTotalInBaseCurrency = orderTotalInCents / 100;

        if (orderTotalInBaseCurrency > availableCredit) {
            throw new UserInputError(
                `Credit limit exceeded. Available: ${availableCredit}, Required: ${orderTotalInBaseCurrency}. ` +
                `Order would exceed credit limit by ${orderTotalInBaseCurrency - availableCredit}.`
            );
        }

        this.logger.log(
            `Credit validation passed for customer ${customerId}: ` +
            `Available: ${availableCredit}, Order Total: ${orderTotalInBaseCurrency}, ` +
            `Remaining: ${availableCredit - orderTotalInBaseCurrency}`
        );
    }
}

