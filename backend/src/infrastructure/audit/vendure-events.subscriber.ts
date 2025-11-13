import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
    EventBus,
    FulfillmentStateTransitionEvent,
    Order,
    OrderStateTransitionEvent,
    Payment,
    PaymentStateTransitionEvent,
    TransactionalConnection,
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
    ) {
        this.logger.log('VendureEventAuditSubscriber: Constructor called');
    }

    onModuleInit(): void {
        this.logger.log('VendureEventAuditSubscriber: Initializing event subscriptions...');
        this.logger.log(`EventBus available: ${!!this.eventBus}`);

        // Subscribe to order state transitions
        const subscription = this.eventBus.ofType(OrderStateTransitionEvent).subscribe(async (event) => {
            this.logger.log('OrderStateTransitionEvent received');
            try {
                const order = event.order;
                if (!order) {
                    return;
                }

                const orderId = order.id.toString();

                // Get channel ID - try multiple sources
                let channelId = event.ctx.channelId;

                // If not in context, try to get from order (may need to load relation)
                if (!channelId) {
                    if (order.channels && order.channels.length > 0) {
                        channelId = order.channels[0].id;
                    } else {
                        // Load order with channels relation if not loaded
                        try {
                            const orderWithChannels = await this.connection.getRepository(event.ctx, Order).findOne({
                                where: { id: orderId },
                                relations: ['channels'],
                                select: ['id'],
                            });
                            if (orderWithChannels?.channels && orderWithChannels.channels.length > 0) {
                                channelId = orderWithChannels.channels[0].id;
                            }
                        } catch (loadError) {
                            this.logger.warn(
                                `Failed to load order channels for audit: ${loadError instanceof Error ? loadError.message : String(loadError)}`
                            );
                        }
                    }
                }

                if (!channelId) {
                    this.logger.debug(
                        `OrderStateTransitionEvent: Order ${orderId} has no channel, cannot log audit event`
                    );
                    return;
                }

                // Detect order creation: transition from Draft to any other state
                // Note: Some orders might be created directly in ArrangingPayment state
                // So we check if fromState is Draft OR if this is the first state transition
                const isOrderCreation = event.fromState === 'Draft' ||
                    (event.fromState === 'AddingItems' && event.toState === 'ArrangingPayment');

                this.logger.log(
                    `OrderStateTransitionEvent: Order ${orderId}, fromState: ${event.fromState}, toState: ${event.toState}, channelId: ${channelId}, isOrderCreation: ${isOrderCreation}`
                );

                if (isOrderCreation) {
                    // Set custom fields for order creation
                    const userId = event.ctx.activeUserId;
                    if (userId) {
                        try {
                            const orderRepo = this.connection.getRepository(event.ctx, Order);
                            const existingOrder = await orderRepo.findOne({
                                where: { id: orderId },
                                select: ['id', 'customFields'],
                            });

                            if (existingOrder) {
                                const customFields = (existingOrder.customFields as any) || {};
                                const updatedFields: any = {};

                                // Set createdByUserId if not already set
                                if (!customFields.createdByUserId) {
                                    updatedFields.createdByUserId = userId;
                                }

                                // Always update lastModifiedByUserId
                                updatedFields.lastModifiedByUserId = userId;

                                // Set auditCreatedAt if not already set
                                if (!customFields.auditCreatedAt) {
                                    updatedFields.auditCreatedAt = new Date();
                                }

                                if (Object.keys(updatedFields).length > 0) {
                                    await orderRepo.update(
                                        { id: orderId },
                                        { customFields: { ...customFields, ...updatedFields } }
                                    );
                                }
                            }
                        } catch (updateError) {
                            this.logger.warn(
                                `Failed to update order custom fields: ${updateError instanceof Error ? updateError.message : String(updateError)}`
                            );
                        }
                    }

                    // Log order creation event
                    this.logger.debug(
                        `Logging order.created event for order ${orderId} in channel ${channelId}`
                    );
                    await this.auditService.logSystemEvent(
                        event.ctx,
                        'order.created',
                        'Order',
                        orderId,
                        {
                            fromState: event.fromState,
                            toState: event.toState,
                            orderCode: order.code,
                            channelId: channelId,
                            userId: userId || null,
                        }
                    );
                }

                // Always log state change
                await this.auditService.logSystemEvent(
                    event.ctx,
                    'order.state_changed',
                    'Order',
                    orderId,
                    {
                        fromState: event.fromState,
                        toState: event.toState,
                        orderCode: order.code,
                        channelId: channelId, // Pass the numeric channel ID
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

                // Get channel ID from order (numeric ID)
                const channelId = order.channels?.[0]?.id || event.ctx.channelId;

                if (!channelId) {
                    this.logger.debug(
                        `PaymentStateTransitionEvent: Order ${orderId} has no channel, cannot log audit event`
                    );
                    return;
                }

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
                if (userId) {
                    try {
                        // Update payment custom fields via repository
                        const paymentRepo = this.connection.getRepository(event.ctx, Payment);
                        const updatedFields: any = {};

                        if (!customFields?.addedByUserId) {
                            updatedFields.addedByUserId = userId;
                        }

                        // Set auditCreatedAt if not already set (first state transition indicates creation)
                        if (!customFields?.auditCreatedAt && event.fromState === 'Created') {
                            updatedFields.auditCreatedAt = new Date();
                        }

                        if (Object.keys(updatedFields).length > 0) {
                            await paymentRepo.update(
                                { id: paymentId },
                                { customFields: { ...customFields, ...updatedFields } }
                            );
                        }
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

                // Get channel ID from order (numeric ID)
                const channelId = order.channels?.[0]?.id || event.ctx.channelId;

                if (!channelId) {
                    this.logger.debug(
                        `FulfillmentStateTransitionEvent: Order ${orderId} has no channel, cannot log audit event`
                    );
                    return;
                }

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

