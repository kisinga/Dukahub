import { Injectable } from '@nestjs/common';
import { Administrator, RequestContext, Role, TransactionalConnection, User } from '@vendure/core';
import { Column, CreateDateColumn, Entity, In, PrimaryGeneratedColumn } from 'typeorm';

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
    // Find roles associated with this channel
    const roles = await this.connection.rawConnection
      .getRepository(Role)
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.channels', 'channel')
      .where('channel.id = :channelId', { channelId })
      .getMany();

    const roleIds = roles.map(r => r.id);

    if (roleIds.length === 0) {
      return [];
    }

    // Find administrators with these roles
    const administrators = await this.connection.rawConnection
      .getRepository(Administrator)
      .createQueryBuilder('admin')
      .leftJoinAndSelect('admin.user', 'user')
      .leftJoin('admin.user', 'u') // Join user to access roles relation in user if needed, but Administrator usually links to User
      .where('admin.deletedAt IS NULL')
      .getMany();

    // We need to check user roles manually or via query if the relation is standard Vendure User -> Roles
    // In Vendure, User has Roles. Administrator is linked to User.

    // Better query: Find Users who have Roles for this Channel
    // But Vendure's User-Role relation is Many-to-Many.

    const users = await this.connection.rawConnection
      .getRepository(User)
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .innerJoin('role.channels', 'channel')
      .where('channel.id = :channelId', { channelId })
      .andWhere('user.deletedAt IS NULL')
      .getMany();

    // Also need to include SuperAdmins who might not be explicitly assigned to the channel but have access
    // SuperAdmins usually have a role with no channel restrictions (empty channels list)
    // But for notifications, we usually target channel admins.
    // If we want to include SuperAdmins, we'd check for roles with empty channels list.

    // Let's stick to explicit channel assignment + SuperAdmins

    const superAdmins = await this.connection.rawConnection
      .getRepository(User)
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .leftJoin('role.channels', 'channel')
      .where('channel.id IS NULL') // SuperAdmin role usually has no specific channel
      .andWhere('user.deletedAt IS NULL')
      .getMany();

    const allUserIds = new Set([
      ...users.map(u => u.id.toString()),
      ...superAdmins.map(u => u.id.toString()),
    ]);

    return Array.from(allUserIds);
  }
}
