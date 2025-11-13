import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
    EventBus,
    OrderStateTransitionEvent,
    PaymentStateTransitionEvent,
    FulfillmentStateTransitionEvent,
    TransactionalConnection,
    Payment,
} from '@vendure/core';
import { AuditService } from './audit.service';
import { UserContextResolver } from './user-context.resolver';

/**
 * Vendure Event Audit Subscriber
 * 
 * Subscribes to Vendure events and logs them to the audit system.
 * System events inherit user context from entity custom fields.
 */
@Injectable()
export class VendureEventAuditSubscriber implements OnModuleInit {
    private readonly logger = new Logger(VendureEventAuditSubscriber.name);

    constructor(
        private readonly eventBus: EventBus,
        private readonly auditService: AuditService,
        private readonly userContextResolver: UserContextResolver,
        private readonly connection: TransactionalConnection,
    ) {}

    onModuleInit(): void {
        // Subscribe to order state transitions
        this.eventBus.ofType(OrderStateTransitionEvent).subscribe(async (event) => {
            try {
                const order = event.order;
                if (!order) {
                    return;
                }

                const orderId = order.id.toString();
                const channelId = order.channels?.[0]?.id?.toString();

                // Create a context with the channel if available
                const ctx = event.ctx;
                if (channelId && !ctx.channelId) {
                    // Note: We can't modify RequestContext, but we can pass channelId in data
                }

                await this.auditService.logSystemEvent(
                    event.ctx,
                    'order.state_changed',
                    'Order',
                    orderId,
                    {
                        fromState: event.fromState,
                        toState: event.toState,
                        orderCode: order.code,
                        channelId: channelId || null,
                    }
                );
            } catch (error) {
                this.logger.error(
                    `Failed to log OrderStateTransitionEvent: ${error instanceof Error ? error.message : String(error)}`,
                    error instanceof Error ? error.stack : undefined
                );
            }
        });

        // Subscribe to payment state transitions
        this.eventBus.ofType(PaymentStateTransitionEvent).subscribe(async (event) => {
            try {
                const payment = event.payment;
                const order = event.order;
                if (!payment || !order) {
                    return;
                }

                const paymentId = payment.id.toString();
                const orderId = order.id.toString();
                const channelId = order.channels?.[0]?.id?.toString();

                // Try to get userId from payment metadata (stored by payment handlers)
                let userId = (payment.metadata as any)?.userId || null;
                
                // If not in metadata, try to get from entity custom fields
                if (!userId) {
                    userId = await this.userContextResolver.getUserIdFromEntity(
                        event.ctx,
                        'Payment',
                        paymentId
                    );
                }

                // If we have userId from metadata and payment doesn't have custom field set, update it
                const customFields = payment.customFields as any;
                if (userId && !customFields?.addedByUserId) {
                    try {
                        // Update payment custom field via repository
                        const paymentRepo = this.connection.getRepository(event.ctx, Payment);
                        await paymentRepo.update(
                            { id: paymentId },
                            { customFields: { ...customFields, addedByUserId: userId } }
                        );
                    } catch (updateError) {
                        this.logger.warn(
                            `Failed to update payment custom field: ${updateError instanceof Error ? updateError.message : String(updateError)}`
                        );
                    }
                }

                await this.auditService.logSystemEvent(
                    event.ctx,
                    'payment.state_changed',
                    'Payment',
                    paymentId,
                    {
                        fromState: event.fromState,
                        toState: event.toState,
                        orderId,
                        amount: payment.amount,
                        method: payment.method,
                        channelId: channelId || null,
                        userId: userId || null,
                    }
                );
            } catch (error) {
                this.logger.error(
                    `Failed to log PaymentStateTransitionEvent: ${error instanceof Error ? error.message : String(error)}`,
                    error instanceof Error ? error.stack : undefined
                );
            }
        });

        // Subscribe to fulfillment state transitions
        this.eventBus.ofType(FulfillmentStateTransitionEvent).subscribe(async (event) => {
            try {
                const fulfillment = event.fulfillment;
                // Fulfillment has orders (plural) - get the first one
                const order = fulfillment.orders?.[0];
                if (!fulfillment || !order) {
                    return;
                }

                const fulfillmentId = fulfillment.id.toString();
                const orderId = order.id.toString();
                const channelId = order.channels?.[0]?.id?.toString();

                await this.auditService.logSystemEvent(
                    event.ctx,
                    'fulfillment.state_changed',
                    'Fulfillment',
                    fulfillmentId,
                    {
                        fromState: event.fromState,
                        toState: event.toState,
                        orderId,
                        channelId: channelId || null,
                    }
                );
            } catch (error) {
                this.logger.error(
                    `Failed to log FulfillmentStateTransitionEvent: ${error instanceof Error ? error.message : String(error)}`,
                    error instanceof Error ? error.stack : undefined
                );
            }
        });
    }
}

