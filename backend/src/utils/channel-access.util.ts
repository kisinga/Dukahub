import {
  Channel,
  ChannelService,
  ID,
  RequestContext,
  TransactionalConnection,
} from '@vendure/core';

/**
 * Channel Access Utilities
 *
 * Utilities for accessing channels, with option to bypass seller filtering.
 * Use repository directly when seller filtering is not needed (e.g., guards, auth flows).
 */

/**
 * Find channel by ID, optionally bypassing seller filtering.
 * Use repository directly when seller filtering not needed.
 *
 * @param ctx - RequestContext
 * @param channelId - Channel ID to find
 * @param connection - TransactionalConnection for repository access
 * @param channelService - ChannelService (for normal access with seller filtering)
 * @param bypassSellerFilter - If true, use repository directly to bypass seller filtering
 * @returns Channel or null if not found
 */
export async function findChannelById(
  ctx: RequestContext,
  channelId: ID,
  connection: TransactionalConnection,
  channelService: ChannelService,
  bypassSellerFilter = false
): Promise<Channel | null> {
  if (bypassSellerFilter) {
    // Use repository directly to bypass seller filtering
    // This is needed when RequestContext doesn't have seller association
    // but we still need to access the channel (e.g., in guards, auth flows)
    const channelRepo = connection.getRepository(ctx, Channel);
    const channel = await channelRepo.findOne({
      where: { id: channelId },
    });
    return channel ?? null; // Convert undefined to null
  } else {
    // Use ChannelService for normal access with seller filtering
    const channel = await channelService.findOne(ctx, channelId);
    return channel ?? null; // Convert undefined to null if needed
  }
}
