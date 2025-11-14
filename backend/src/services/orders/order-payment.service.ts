import { Injectable, Logger } from '@nestjs/common';
import {
    ID,
    PaymentService,
    RequestContext,
    UserInputError
} from '@vendure/core';

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
        private readonly paymentService: PaymentService,
    ) { }

    /**
     * Add manual payment to order
     */
    async addPayment(
        ctx: RequestContext,
        orderId: ID,
        paymentMethodCode: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        const paymentResult = await (this.paymentService as any).addManualPaymentToOrder(
            ctx,
            orderId,
            {
                method: paymentMethodCode,
                metadata: metadata || {},
            }
        );

        if (paymentResult && 'errorCode' in paymentResult) {
            throw new UserInputError(
                `Failed to add payment: ${paymentResult.message || paymentResult.errorCode}`
            );
        }
    }
}

