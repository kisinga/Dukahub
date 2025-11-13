import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
    ChannelService,
    EventBus,
    OrderStateTransitionEvent,
    RequestContext,
    StockMovementEvent,
    UserService
} from '@vendure/core';
import * as fs from 'fs';
import * as path from 'path';
import { ChannelActionTrackingService } from './channel-action-tracking.service';
import { IChannelActionHandler } from './handlers/action-handler.interface';
import { InAppActionHandler } from './handlers/in-app-action.handler';
import { PushActionHandler } from './handlers/push-action.handler';
import { SmsActionHandler } from './handlers/sms-action.handler';
import { NotificationPreferenceService } from './notification-preference.service';
import { ActionCategory } from './types/action-category.enum';
import { ChannelActionType } from './types/action-type.enum';
import { ActionConfig, ChannelEvent, ChannelEventConfig } from './types/channel-event.interface';
import { ChannelEventType } from './types/event-type.enum';

/**
 * Channel Event Router Service
 * 
 * Central router that receives events and routes them to appropriate action handlers.
 * Handles both system events (channel-level) and customer-facing events (user-subscribable).
 */
@Injectable()
export class ChannelEventRouterService implements OnModuleInit {
    private readonly logger = new Logger('ChannelEventRouterService');
    private eventMetadataCache: Map<string, any> | null = null;
    private handlers: Map<ChannelActionType, IChannelActionHandler> = new Map();

    constructor(
        private readonly eventBus: EventBus,
        private readonly channelService: ChannelService,
        private readonly userService: UserService,
        private readonly actionTrackingService: ChannelActionTrackingService,
        private readonly notificationPreferenceService: NotificationPreferenceService,
        private readonly inAppHandler: InAppActionHandler,
        private readonly pushHandler: PushActionHandler,
        private readonly smsHandler: SmsActionHandler,
    ) {
        // Register handlers
        this.handlers.set(ChannelActionType.IN_APP_NOTIFICATION, inAppHandler);
        this.handlers.set(ChannelActionType.PUSH_NOTIFICATION, pushHandler);
        this.handlers.set(ChannelActionType.SMS, smsHandler);
    }

    onModuleInit(): void {
        // Subscribe to Vendure events
        // CRITICAL: Wrap async callbacks in try-catch to prevent unhandled promise rejections
        // that can crash the server process
        this.eventBus.ofType(OrderStateTransitionEvent).subscribe(async (event) => {
            try {
                await this.handleOrderStateTransition(event);
            } catch (error) {
                this.logger.error(
                    `Unhandled error in OrderStateTransitionEvent subscription: ${error instanceof Error ? error.message : String(error)}`,
                    error instanceof Error ? error.stack : undefined
                );
                // Don't rethrow - prevent server crash
            }
        });

        this.eventBus.ofType(StockMovementEvent).subscribe(async (event) => {
            try {
                await this.handleStockMovement(event);
            } catch (error) {
                this.logger.error(
                    `Unhandled error in StockMovementEvent subscription: ${error instanceof Error ? error.message : String(error)}`,
                    error instanceof Error ? error.stack : undefined
                );
                // Don't rethrow - prevent server crash
            }
        });

        // Load event metadata
        this.loadEventMetadata();
    }

    /**
     * Handle order state transition events
     */
    private async handleOrderStateTransition(event: OrderStateTransitionEvent): Promise<void> {
        try {
            const { order, toState } = event;

            // Validate order exists
            if (!order) {
                this.logger.warn('OrderStateTransitionEvent received with no order data');
                return;
            }

            // Safely access channels array with proper optional chaining
            const channelId = order.channels?.[0]?.id?.toString();

            if (!channelId) {
                this.logger.debug(
                    `Skipping order state transition event: order ${order.id?.toString() || order.code || 'unknown'} has no channels loaded`
                );
                return;
            }

            let eventType: ChannelEventType | null = null;
            const toStateStr = String(toState);

            switch (toStateStr) {
                case 'PaymentSettled':
                    eventType = ChannelEventType.ORDER_PAYMENT_SETTLED;
                    break;
                case 'Fulfilled':
                    eventType = ChannelEventType.ORDER_FULFILLED;
                    break;
                case 'Cancelled':
                    eventType = ChannelEventType.ORDER_CANCELLED;
                    break;
                default:
                    return; // Don't handle other states
            }

            if (eventType) {
                await this.routeEvent({
                    type: eventType,
                    channelId,
                    category: ActionCategory.SYSTEM_NOTIFICATIONS,
                    context: event.ctx,
                    data: {
                        orderId: order.id?.toString() || 'unknown',
                        orderCode: order.code || 'unknown',
                        toState: toStateStr,
                    },
                    targetCustomerId: order.customer?.id?.toString(),
                    targetUserId: order.customer?.user?.id?.toString(),
                });
            }
        } catch (error) {
            // This catch is a safety net - the subscription wrapper should catch most errors
            // but we log here for additional context
            this.logger.error(
                `Error in handleOrderStateTransition for order ${event.order?.id?.toString() || event.order?.code || 'unknown'}: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined
            );
            // Don't rethrow - let the subscription wrapper handle it
        }
    }

    /**
     * Handle stock movement events
     */
    private async handleStockMovement(event: StockMovementEvent): Promise<void> {
        // For now, skip stock movement notifications
        // Can be implemented later if needed
        this.logger.debug('Stock movement event received (not yet implemented)');
    }

    /**
     * Route a channel event to appropriate handlers
     */
    async routeEvent(event: ChannelEvent): Promise<void> {
        try {
            // Load channel configuration
            const channelConfig = await this.getChannelConfig(event.channelId);
            if (!channelConfig) {
                this.logger.warn(`No channel config found for channel ${event.channelId}`);
                return;
            }

            // Get event metadata
            const metadata = this.getEventMetadata(event.type);
            if (!metadata) {
                this.logger.warn(`No metadata found for event type ${event.type}`);
                return;
            }

            // Get enabled actions from channel config
            const eventConfig = channelConfig[event.type];
            if (!eventConfig) {
                this.logger.debug(`No config found for event type ${event.type} in channel ${event.channelId}`);
                return;
            }

            // Determine target users
            let targetUserIds: string[] = [];

            if (metadata.subscribable && metadata.customerFacing) {
                // Customer-facing event: use target customer/user
                if (event.targetUserId) {
                    targetUserIds = [event.targetUserId];
                }
            } else {
                // System event: get all channel admins
                targetUserIds = await this.getChannelAdminUserIds(event.context, event.channelId);
            }

            if (targetUserIds.length === 0) {
                this.logger.debug(`No target users found for event ${event.type} in channel ${event.channelId}`);
                return;
            }

            // For each target user, check preferences and route to handlers
            for (const userId of targetUserIds) {
                await this.routeEventForUser(event, userId, eventConfig, metadata);
            }
        } catch (error) {
            this.logger.error(
                `Failed to route event ${event.type} for channel ${event.channelId}: ${error instanceof Error ? error.message : String(error)}`,
                error
            );
        }
    }

    /**
     * Route event for a specific user
     */
    private async routeEventForUser(
        event: ChannelEvent,
        userId: string,
        eventConfig: any,
        metadata: any
    ): Promise<void> {
        // Get user preferences if event is subscribable
        let userPreferences = {};
        if (metadata.subscribable) {
            userPreferences = await this.notificationPreferenceService.getUserPreferences(
                event.context,
                userId,
                event.channelId
            );
        }

        // Create user-specific event
        const userEvent: ChannelEvent = {
            ...event,
            targetUserId: userId,
        };

        // Route to each enabled action
        for (const [actionType, actionConfig] of Object.entries(eventConfig)) {
            const config = actionConfig as ActionConfig;

            // Check if action should be sent
            const shouldSend = this.notificationPreferenceService.shouldSendNotification(
                userPreferences as any,
                { [event.type]: eventConfig } as any,
                event.type as ChannelEventType,
                actionType
            );

            if (!shouldSend || !config.enabled) {
                continue;
            }

            // Get handler
            const handler = this.handlers.get(actionType as ChannelActionType);
            if (!handler || !handler.canHandle(userEvent)) {
                continue;
            }

            // Execute handler
            try {
                const result = await handler.execute(event.context, userEvent, config);
                if (!result.success) {
                    this.logger.warn(
                        `Handler ${actionType} failed for event ${event.type}: ${result.error}`
                    );
                }
            } catch (error) {
                this.logger.error(
                    `Handler ${actionType} threw error for event ${event.type}: ${error instanceof Error ? error.message : String(error)}`,
                    error
                );
            }
        }
    }

    /**
     * Get channel configuration
     */
    private async getChannelConfig(channelId: string): Promise<ChannelEventConfig | null> {
        try {
            const channel = await this.channelService.findOne(
                RequestContext.empty(),
                channelId
            );
            if (!channel) {
                return null;
            }

            const eventConfig = (channel.customFields as any)?.eventConfig;
            if (!eventConfig) {
                return null;
            }

            return typeof eventConfig === 'string' ? JSON.parse(eventConfig) : eventConfig;
        } catch (error) {
            this.logger.error(
                `Failed to get channel config for channel ${channelId}: ${error instanceof Error ? error.message : String(error)}`
            );
            return null;
        }
    }

    /**
     * Get channel admin user IDs
     */
    private async getChannelAdminUserIds(ctx: RequestContext, channelId: string): Promise<string[]> {
        // TODO: Implement getting channel admin users
        // For now, return empty array
        this.logger.debug(`Getting channel admin users for channel ${channelId} (not yet implemented)`);
        return [];
    }

    /**
     * Get event metadata (cached)
     */
    private getEventMetadata(eventType: ChannelEventType): any {
        if (!this.eventMetadataCache) {
            this.loadEventMetadata();
        }
        return this.eventMetadataCache?.get(eventType);
    }

    /**
     * Load event metadata from JSON file
     */
    private loadEventMetadata(): void {
        try {
            const metadataPath = path.join(__dirname, 'config/event-metadata.json');
            const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
            const metadata = JSON.parse(metadataContent);

            this.eventMetadataCache = new Map();
            for (const [eventType, meta] of Object.entries(metadata)) {
                this.eventMetadataCache.set(eventType, meta);
            }
        } catch (error) {
            this.logger.error(`Failed to load event metadata: ${error instanceof Error ? error.message : String(error)}`);
            this.eventMetadataCache = new Map();
        }
    }
}

