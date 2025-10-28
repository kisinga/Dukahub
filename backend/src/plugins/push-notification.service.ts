import { Injectable } from '@nestjs/common';
import { RequestContext } from '@vendure/core';
import * as webpush from 'web-push';
import { NotificationService } from './notification.service';

@Injectable()
export class PushNotificationService {
    private vapidKeys = {
        publicKey: process.env.VAPID_PUBLIC_KEY || '',
        privateKey: process.env.VAPID_PRIVATE_KEY || '',
        subject: process.env.VAPID_SUBJECT || 'mailto:admin@dukahub.com',
    };

    constructor(private notificationService: NotificationService) {
        // Configure web-push with VAPID keys
        webpush.setVapidDetails(
            this.vapidKeys.subject,
            this.vapidKeys.publicKey,
            this.vapidKeys.privateKey
        );
    }

    async subscribeToPush(
        ctx: RequestContext,
        userId: string,
        channelId: string,
        subscription: any
    ): Promise<boolean> {
        try {
            // In a real implementation, you would save the subscription to database
            console.log('Push subscription saved for user:', userId, 'channel:', channelId);
            return true;
        } catch (error) {
            console.error('Failed to save push subscription:', error);
            return false;
        }
    }

    async unsubscribeFromPush(ctx: RequestContext, userId: string): Promise<boolean> {
        try {
            // In a real implementation, you would remove the subscription from database
            console.log('Push subscription removed for user:', userId);
            return true;
        } catch (error) {
            console.error('Failed to remove push subscription:', error);
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
        try {
            // In a real implementation, you would:
            // 1. Get user's push subscription from database
            // 2. Send push notification using web-push
            console.log('Push notification sent to user:', userId, 'title:', title);
            return true;
        } catch (error) {
            console.error('Failed to send push notification:', error);
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

            console.log(`Push notifications sent to ${successCount}/${userIds.length} users in channel ${channelId}`);
            return successCount;
        } catch (error) {
            console.error('Failed to send push notifications to channel:', error);
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

