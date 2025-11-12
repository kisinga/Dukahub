import { Injectable, Logger } from '@nestjs/common';
import { RequestContext } from '@vendure/core';
import { NotificationService, NotificationType } from '../../notification.service';
import { ActionCategory } from '../types/action-category.enum';
import { ChannelActionType } from '../types/action-type.enum';
import { ActionConfig, ActionResult, ChannelEvent } from '../types/channel-event.interface';
import { IChannelActionHandler } from './action-handler.interface';

/**
 * In-App Notification Action Handler
 * 
 * Creates in-app notifications using the existing NotificationService.
 */
@Injectable()
export class InAppActionHandler implements IChannelActionHandler {
    type = ChannelActionType.IN_APP_NOTIFICATION;
    category = ActionCategory.SYSTEM_NOTIFICATIONS; // Can be any category
    private readonly logger = new Logger('InAppActionHandler');

    constructor(
        private readonly notificationService: NotificationService,
    ) { }

    async execute(
        ctx: RequestContext,
        event: ChannelEvent,
        config: ActionConfig
    ): Promise<ActionResult> {
        try {
            if (!event.targetUserId) {
                return {
                    success: false,
                    actionType: this.type,
                    error: 'No target user ID provided for in-app notification',
                };
            }

            // Map event type to notification type
            const notificationType = this.mapEventTypeToNotificationType(event.type);

            // Create notification
            await this.notificationService.createNotification(ctx, {
                userId: event.targetUserId,
                channelId: event.channelId,
                type: notificationType,
                title: this.getTitleForEvent(event),
                message: this.getMessageForEvent(event),
                data: event.data || {},
            });

            return {
                success: true,
                actionType: this.type,
            };
        } catch (error) {
            this.logger.error(
                `Failed to create in-app notification for event ${event.type}: ${error instanceof Error ? error.message : String(error)}`,
                error
            );
            return {
                success: false,
                actionType: this.type,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    canHandle(event: ChannelEvent): boolean {
        return true; // Can handle any event type
    }

    private mapEventTypeToNotificationType(eventType: string): NotificationType {
        // Map channel event types to notification types
        if (eventType.includes('ORDER')) {
            return NotificationType.ORDER;
        }
        if (eventType.includes('STOCK')) {
            return NotificationType.STOCK;
        }
        if (eventType.includes('ML_TRAINING')) {
            return NotificationType.ML_TRAINING;
        }
        if (eventType.includes('PAYMENT') || eventType.includes('CREDIT')) {
            return NotificationType.PAYMENT;
        }
        return NotificationType.ORDER; // Default
    }

    private getTitleForEvent(event: ChannelEvent): string {
        const titleMap: Record<string, string> = {
            'order_payment_settled': 'Payment Received',
            'order_fulfilled': 'Order Fulfilled',
            'order_cancelled': 'Order Cancelled',
            'customer_credit_approved': 'Credit Approved',
            'customer_balance_changed': 'Balance Updated',
            'customer_repayment_deadline': 'Repayment Reminder',
            'ml_training_completed': 'ML Training Completed',
            'ml_training_failed': 'ML Training Failed',
        };
        return titleMap[event.type] || 'Notification';
    }

    private getMessageForEvent(event: ChannelEvent): string {
        const messageMap: Record<string, (data: any) => string> = {
            'order_payment_settled': (data) => `Order #${data.orderCode || 'N/A'} payment has been settled`,
            'order_fulfilled': (data) => `Order #${data.orderCode || 'N/A'} has been fulfilled`,
            'order_cancelled': (data) => `Order #${data.orderCode || 'N/A'} has been cancelled`,
            'customer_credit_approved': (data) => `Your credit account has been approved. Credit limit: ${data.creditLimit || 'N/A'}`,
            'customer_balance_changed': (data) => `Your outstanding balance has changed to: ${data.outstandingAmount || 'N/A'}`,
            'customer_repayment_deadline': (data) => `Reminder: Your repayment deadline is approaching. Outstanding: ${data.outstandingAmount || 'N/A'}`,
            'ml_training_completed': () => 'Machine learning model training has completed successfully',
            'ml_training_failed': (data) => `Training failed: ${data.error || 'Unknown error'}`,
        };

        const messageFn = messageMap[event.type];
        if (messageFn) {
            return messageFn(event.data || {});
        }

        return `Event: ${event.type}`;
    }
}

