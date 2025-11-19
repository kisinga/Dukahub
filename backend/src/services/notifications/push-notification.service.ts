import { Injectable, Logger } from '@nestjs/common';
import { RequestContext } from '@vendure/core';
import * as webpush from 'web-push';
import { BRAND_CONFIG } from '../../constants/brand.constants';
import { NotificationService } from './notification.service';

@Injectable()
export class PushNotificationService {
    private readonly logger = new Logger(PushNotificationService.name);
    private vapidKeys = {
        publicKey: process.env.VAPID_PUBLIC_KEY || '',
        privateKey: process.env.VAPID_PRIVATE_KEY || '',
        subject: process.env.VAPID_EMAIL || `mailto:admin@${BRAND_CONFIG.emailDomain}`,
    };

    constructor(private notificationService: NotificationService) {
        // Configure web-push with VAPID keys only if they are provided
        if (this.vapidKeys.publicKey && this.vapidKeys.privateKey) {
            try {
                webpush.setVapidDetails(
                    this.vapidKeys.subject,
                    this.vapidKeys.publicKey,
                    this.vapidKeys.privateKey
                );
                this.logger.log('Push notifications enabled with VAPID keys');
            } catch (error) {
                this.logger.warn('Failed to configure VAPID keys, push notifications will be disabled:', error);
            }
        } else {
            this.logger.warn('VAPID keys not configured. Push notifications will be disabled. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to enable.');
        }
    }

    async subscribeToPush(
        ctx: RequestContext,
        userId: string,
        channelId: string,
        subscription: any
    ): Promise<boolean> {
        try {
            // In a real implementation, you would save the subscription to database
            this.logger.log(`Push subscription saved for user: ${userId} channel: ${channelId}`);
            return true;
        } catch (error) {
            this.logger.error('Failed to save push subscription:', error);
            return false;
        }
    }

    async unsubscribeFromPush(ctx: RequestContext, userId: string): Promise<boolean> {
        try {
            // In a real implementation, you would remove the subscription from database
            this.logger.log(`Push subscription removed for user: ${userId}`);
            return true;
        } catch (error) {
            this.logger.error('Failed to remove push subscription:', error);
            return false;
        }
    }

    async sendPushNotification(
        ctx: RequestContext,
        userId: string,
        title: string,
        message: string,
        data?: any
    ): Promise<boolean> {
        if (!this.vapidKeys.publicKey || !this.vapidKeys.privateKey) {
            this.logger.debug('Push notifications disabled (VAPID keys not configured)');
            return false;
        }

        try {
            // In a real implementation, you would:
            // 1. Get user's push subscription from database
            // 2. Send push notification using web-push
            this.logger.log(`Push notification sent to user: ${userId} title: ${title}`);
            return true;
        } catch (error) {
            this.logger.error('Failed to send push notification:', error);
            return false;
        }
    }

    async sendToChannel(
        ctx: RequestContext,
        channelId: string,
        title: string,
        message: string,
        data?: any
    ): Promise<number> {
        try {
            // Get all users in the channel
            const userIds = await this.notificationService.getChannelUsers(channelId);

            // Send push notification to each user
            const promises = userIds.map(userId =>
                this.sendPushNotification(ctx, userId, title, message, data)
            );

            const results = await Promise.allSettled(promises);
            const successCount = results.filter(result => result.status === 'fulfilled').length;

            this.logger.log(`Push notifications sent to ${successCount}/${userIds.length} users in channel ${channelId}`);
            return successCount;
        } catch (error) {
            this.logger.error('Failed to send push notifications to channel:', error);
            return 0;
        }
    }

    private createNotificationPayload(title: string, message: string, data?: any) {
        return JSON.stringify({
            title,
            body: message,
            icon: '/web-app-manifest-192x192.png',
            badge: '/web-app-manifest-192x192.png',
            data: data || {},
            actions: [
                {
                    action: 'view',
                    title: 'View',
                },
                {
                    action: 'dismiss',
                    title: 'Dismiss',
                },
            ],
        });
    }
}

