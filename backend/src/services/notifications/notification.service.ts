import { Injectable } from '@nestjs/common';
import { Administrator, RequestContext, Role, TransactionalConnection, User } from '@vendure/core';
import { Column, CreateDateColumn, Entity, In, PrimaryGeneratedColumn } from 'typeorm';
import { ChannelUserService } from '../auth/channel-user.service';

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
  CASH_VARIANCE = 'cash_variance',
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

@Entity()
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  channelId: string;

  @Column({ type: 'text' })
  endpoint: string;

  @Column('jsonb')
  keys: {
    p256dh: string;
    auth: string;
  };

  @CreateDateColumn()
  createdAt: Date;
}

@Injectable()
export class NotificationService {
  constructor(
    private connection: TransactionalConnection,
    private channelUserService: ChannelUserService
  ) {}

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
    options: { skip?: number; take?: number; type?: NotificationType } = {}
  ): Promise<{ items: Notification[]; totalItems: number }> {
    const skip = options.skip || 0;
    const take = options.take || 20;

    const where: any = {
      userId,
      channelId,
    };

    if (options.type) {
      where.type = options.type;
    }

    const [items, totalItems] = await this.connection.rawConnection
      .getRepository(Notification)
      .findAndCount({
        where,
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
    const result = await this.connection.rawConnection
      .getRepository(Notification)
      .update({ id: notificationId }, { read: true });

    return (result.affected || 0) > 0;
  }

  async markAllAsRead(ctx: RequestContext, userId: string, channelId: string): Promise<number> {
    const result = await this.connection.rawConnection.getRepository(Notification).update(
      {
        userId,
        channelId,
        read: false,
      },
      { read: true }
    );

    return result.affected || 0;
  }

  async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.connection.rawConnection
      .getRepository(Notification)
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  async getChannelUsers(channelId: string): Promise<string[]> {
    // Delegate to centralized ChannelUserService to ensure consistent access logic
    // Pass empty RequestContext as we are likely in a background process or system context
    return this.channelUserService.getChannelAdminUserIds(RequestContext.empty(), channelId);
  }
}
