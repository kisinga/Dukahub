import { Injectable } from '@nestjs/common';
import { RequestContext, TransactionalConnection } from '@vendure/core';

export interface NotificationData {
    [key: string]: any;
}

export interface CreateNotificationInput {
    userId: string;
    channelId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: NotificationData;
}

export enum NotificationType {
    ORDER = 'order',
    STOCK = 'stock',
    ML_TRAINING = 'ml_training',
    PAYMENT = 'payment',
}

export class Notification {
    id: string;
    userId: string;
    channelId: string;
    type: NotificationType;
    title: string;
    message: string;
    data: NotificationData;
    read: boolean;
    createdAt: Date;
}

export class PushSubscription {
    id: string;
    userId: string;
    channelId: string;
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    createdAt: Date;
}

@Injectable()
export class NotificationService {
    constructor(
        private connection: TransactionalConnection,
    ) { }

    async createNotification(ctx: RequestContext, input: CreateNotificationInput): Promise<Notification> {
        const notification = new Notification();
        notification.userId = input.userId;
        notification.channelId = input.channelId;
        notification.type = input.type;
        notification.title = input.title;
        notification.message = input.message;
        notification.data = input.data || {};
        notification.read = false;
        notification.createdAt = new Date();

        // In a real implementation, you would save to database
        // For now, we'll simulate the creation
        return notification;
    }

    async getUserNotifications(
        ctx: RequestContext,
        userId: string,
        channelId: string,
        options: { skip?: number; take?: number } = {}
    ): Promise<{ items: Notification[]; totalItems: number }> {
        // In a real implementation, you would query the database
        // For now, return empty array
        return {
            items: [],
            totalItems: 0,
        };
    }

    async getUnreadCount(ctx: RequestContext, userId: string, channelId: string): Promise<number> {
        // In a real implementation, you would count unread notifications
        return 0;
    }

    async markAsRead(ctx: RequestContext, notificationId: string): Promise<boolean> {
        // In a real implementation, you would update the notification
        return true;
    }

    async markAllAsRead(ctx: RequestContext, userId: string, channelId: string): Promise<number> {
        // In a real implementation, you would mark all notifications as read
        return 0;
    }

    async deleteOldNotifications(daysOld: number = 30): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        // In a real implementation, you would delete old notifications
        return 0;
    }

    async getChannelUsers(channelId: string): Promise<string[]> {
        // In a real implementation, you would get all users for a channel
        // For now, return empty array
        return [];
    }
}

