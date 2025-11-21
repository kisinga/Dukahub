import { Injectable, Logger } from '@nestjs/common';
import { RequestContext, Role, TransactionalConnection, User } from '@vendure/core';

@Injectable()
export class ChannelUserService {
  private readonly logger = new Logger(ChannelUserService.name);

  constructor(private connection: TransactionalConnection) {}

  /**
   * Get all user IDs that have admin access to a channel.
   * This includes:
   * 1. Users with roles explicitly assigned to the channel
   * 2. SuperAdmins (global roles) if includeSuperAdmins is true (default)
   */
  async getChannelAdminUserIds(
    ctx: RequestContext,
    channelId: string,
    options: { includeSuperAdmins?: boolean } = {}
  ): Promise<string[]> {
    const includeSuperAdmins = options.includeSuperAdmins ?? true;

    try {
      // 1. Find Users who have Roles for this Channel
      const users = await this.connection.rawConnection
        .getRepository(User)
        .createQueryBuilder('user')
        .innerJoin('user.roles', 'role')
        .innerJoin('role.channels', 'channel')
        .where('channel.id = :channelId', { channelId })
        .andWhere('user.deletedAt IS NULL')
        .getMany();

      const userIds = new Set(users.map(u => u.id.toString()));

      // 2. Find SuperAdmins (roles with no specific channel or explicit superadmin role)
      // In Vendure, SuperAdmin role usually has no channel restrictions (channels list might be empty or contain all)
      // Standard convention: SuperAdmin role is not restricted to specific channels in the join table in a way that filters them out,
      // but for our query, we look for users with roles that are NOT bound to this channel but have global access?
      // Actually, existing logic in ChannelEventRouterService looked for 'channel.id IS NULL' on the left join
      // which implies roles that are not linked to ANY channel (Global Roles).

      if (includeSuperAdmins) {
        const superAdmins = await this.connection.rawConnection
          .getRepository(User)
          .createQueryBuilder('user')
          .innerJoin('user.roles', 'role')
          .leftJoin('role.channels', 'channel')
          .where('channel.id IS NULL')
          .andWhere('user.deletedAt IS NULL')
          .getMany();

        superAdmins.forEach(u => userIds.add(u.id.toString()));
      }

      return Array.from(userIds);
    } catch (error) {
      this.logger.error(
        `Failed to get channel admin users for channel ${channelId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined
      );
      return [];
    }
  }
}
