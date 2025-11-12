import { Injectable, Logger } from '@nestjs/common';
import { RequestContext } from '@vendure/core';
import { PushNotificationService } from '../../push-notification.service';
import { ActionCategory } from '../types/action-category.enum';
import { ChannelActionType } from '../types/action-type.enum';
import { ActionConfig, ActionResult, ChannelEvent } from '../types/channel-event.interface';
import { IChannelActionHandler } from './action-handler.interface';

/**
 * Push Notification Action Handler
 * 
 * Sends push notifications using the existing PushNotificationService.
 */
@Injectable()
export class PushActionHandler implements IChannelActionHandler {
    type = ChannelActionType.PUSH_NOTIFICATION;
    category = ActionCategory.SYSTEM_NOTIFICATIONS; // Can be any category
    private readonly logger = new Logger('PushActionHandler');

    constructor(
        private readonly pushNotificationService: PushNotificationService,
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
                    error: 'No target user ID provided for push notification',
                };
            }

            const title = this.getTitleForEvent(event);
            const message = this.getMessageForEvent(event);

            await this.pushNotificationService.sendPushNotification(
                ctx,
                event.targetUserId,
                title,
                message,
                event.data || {}
            );

            return {
                success: true,
                actionType: this.type,
            };
        } catch (error) {
            this.logger.error(
                `Failed to send push notification for event ${event.type}: ${error instanceof Error ? error.message : String(error)}`,
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
        return !!event.targetUserId; // Can handle if user ID is available
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
            'ml_extraction_queued': 'ML Extraction Queued',
            'ml_extraction_started': 'ML Extraction Started',
            'ml_extraction_completed': 'ML Extraction Completed',
            'ml_extraction_failed': 'ML Extraction Failed',
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
            'ml_extraction_queued': (data) => `Photo extraction has been queued for channel ${data.channelId || 'N/A'}`,
            'ml_extraction_started': (data) => `Photo extraction has started for channel ${data.channelId || 'N/A'}`,
            'ml_extraction_completed': (data) => `Photo extraction has completed successfully for channel ${data.channelId || 'N/A'}`,
            'ml_extraction_failed': (data) => `Photo extraction failed: ${data.error || 'Unknown error'}`,
        };

        const messageFn = messageMap[event.type];
        if (messageFn) {
            return messageFn(event.data || {});
        }

        return `Event: ${event.type}`;
    }
}

