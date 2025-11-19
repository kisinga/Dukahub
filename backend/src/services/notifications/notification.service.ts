import { Injectable } from '@nestjs/common';
import { RequestContext, TransactionalConnection } from '@vendure/core';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

@Entity()
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  channelId: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column()
  message: string;

  @Column('jsonb', { nullable: true })
  data: NotificationData;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn()
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
  constructor(private connection: TransactionalConnection) {}

  async createNotification(
    ctx: RequestContext,
    input: CreateNotificationInput
  ): Promise<Notification> {
    const notification = new Notification();
    notification.userId = input.userId;
    notification.channelId = input.channelId;
    notification.type = input.type;
    notification.title = input.title;
    notification.message = input.message;
    notification.data = input.data || {};
    notification.read = false;
    notification.createdAt = new Date();

    // Save to database
    const savedNotification = await this.connection.rawConnection
      .getRepository(Notification)
      .save(notification);

    return savedNotification;
  }

  async getUserNotifications(
    ctx: RequestContext,
    userId: string,
    channelId: string,
    options: { skip?: number; take?: number } = {}
  ): Promise<{ items: Notification[]; totalItems: number }> {
    const skip = options.skip || 0;
    const take = options.take || 20;

    const [items, totalItems] = await this.connection.rawConnection
      .getRepository(Notification)
      .findAndCount({
        where: {
          userId,
          channelId,
        },
        order: {
          createdAt: 'DESC',
        },
        skip,
        take,
      });

    return {
      items,
      totalItems,
    };
  }

  async getUnreadCount(ctx: RequestContext, userId: string, channelId: string): Promise<number> {
    const count = await this.connection.rawConnection.getRepository(Notification).count({
      where: {
        userId,
        channelId,
        read: false,
      },
    });

    return count;
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
