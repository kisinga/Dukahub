import { Injectable, Logger } from '@nestjs/common';
import {
    Fulfillment,
    FulfillmentService,
    ID,
    Order,
    OrderLine,
    OrderService,
    RequestContext,
    TransactionalConnection,
    UserInputError
} from '@vendure/core';

/**
 * Order Fulfillment Service
 * 
 * Handles fulfillment creation and state transitions.
 * Separated for single responsibility and testability.
 */
@Injectable()
export class OrderFulfillmentService {
    private readonly logger = new Logger('OrderFulfillmentService');

    constructor(
        private readonly connection: TransactionalConnection,
        private readonly orderService: OrderService,
        private readonly fulfillmentService: FulfillmentService,
    ) { }

    /**
     * Create and complete fulfillment for an order
     * For POS handover, fulfillment is immediately delivered
     */
    async fulfillOrder(ctx: RequestContext, orderId: ID): Promise<Fulfillment> {
        const order = await this.orderService.findOne(ctx, orderId, ['lines']);
        if (!order?.lines?.length) {
            throw new UserInputError('Order not found or has no lines to fulfill');
        }

        // Prepare fulfillment input
        const fulfillmentInput = {
            lines: order.lines.map(line => ({
                orderLineId: line.id,
                quantity: line.quantity,
            })),
            handler: {
                code: 'manual-fulfillment',
                arguments: [
                    { name: 'method', value: 'POS Handover' },
                    { name: 'trackingCode', value: `POS-${Date.now()}` },
                ],
            },
        };

        // Create fulfillment using FulfillmentService.create method
        // This is the standard Vendure API for creating fulfillments
        // Method signature: create(ctx, order, items, handler)
        const fulfillment = await (this.fulfillmentService as any).create(
            ctx,
            order,
            fulfillmentInput.lines.map(line => ({
                orderLineId: line.orderLineId,
                quantity: line.quantity,
            })),
            fulfillmentInput.handler
        );

        if (!fulfillment || 'errorCode' in fulfillment) {
            const error = fulfillment as any;
            throw new UserInputError(
                `Failed to create fulfillment: ${error?.message || error?.errorCode || 'Unknown error'}`
            );
        }

        // Transition to Shipped if possible (for immediate POS delivery)
        await this.transitionToShippedIfPossible(ctx, fulfillment.id);

        this.logger.log(`Order ${order.code} fulfilled with fulfillment ${fulfillment.id}`);
        return fulfillment;
    }

    /**
     * Transition fulfillment to Shipped state if available
     */
    private async transitionToShippedIfPossible(
        ctx: RequestContext,
        fulfillmentId: ID
    ): Promise<void> {
        try {
            const result = await (this.fulfillmentService as any).transitionToState(
                ctx,
                fulfillmentId,
                'Shipped'
            );

            if (result && 'errorCode' in result) {
                this.logger.warn(`Could not transition fulfillment to Shipped: ${result.message}`);
            }
        } catch (error) {
            this.logger.warn(
                `Error transitioning fulfillment: ${error instanceof Error ? error.message : String(error)}`
            );
            // Non-fatal - fulfillment is still created
        }
    }
}

