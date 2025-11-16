import { Injectable, Logger, Optional } from '@nestjs/common';
import {
    ID,
    OrderService,
    PaymentService,
    RequestContext,
    UserInputError
} from '@vendure/core';
import { FinancialService } from '../financial/financial.service';

/**
 * Order Payment Service
 * 
 * Handles payment processing for orders.
 * Separated for single responsibility and testability.
 */
@Injectable()
export class OrderPaymentService {
    private readonly logger = new Logger('OrderPaymentService');

    constructor(
        private readonly orderService: OrderService,
        private readonly paymentService: PaymentService,
        @Optional() private readonly financialService?: FinancialService, // Optional for migration period
    ) { }

    /**
     * Add manual payment to order and settle it if needed
     * Posts to ledger if FinancialService is available
     */
    async addPayment(
        ctx: RequestContext,
        orderId: ID,
        paymentMethodCode: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        const paymentResult = await this.orderService.addManualPaymentToOrder(
            ctx,
            {
                orderId,
                method: paymentMethodCode,
                metadata: metadata || {},
            }
        );

        if (paymentResult && 'errorCode' in paymentResult) {
            throw new UserInputError(
                `Failed to add payment: ${paymentResult.message || paymentResult.errorCode}`
            );
        }

        // Get the order with payments to find the newly added payment
        const order = await this.orderService.findOne(ctx, orderId);
        if (!order || !order.payments || order.payments.length === 0) {
            return;
        }

        // Find the payment that was just added
        const newPayment = order.payments.find(
            p => p.method === paymentMethodCode
        );

        if (!newPayment) {
            return;
        }

        // Settle the payment if not already settled (cash/mpesa are already settled)
        if (newPayment.state !== 'Settled') {
            const settleResult = await this.paymentService.settlePayment(ctx, newPayment.id);
            if (!settleResult) {
                return;
            }
        }

        // Post to ledger (single source of truth) - must be in same transaction
        if (this.financialService) {
            const updatedOrder = await this.orderService.findOne(ctx, orderId);
            if (updatedOrder) {
                const settledPayment = updatedOrder.payments?.find(p => p.id === newPayment.id);
                if (settledPayment && settledPayment.state === 'Settled') {
                    await this.financialService.recordPayment(ctx, settledPayment, updatedOrder);
                }
            }
        }
    }
}

