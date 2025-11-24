import { Injectable, Logger } from '@nestjs/common';
import {
  Administrator,
  Channel,
  ID,
  RequestContext,
  Seller,
  TransactionalConnection,
} from '@vendure/core';
import { withChannel } from '../../utils/request-context.util';
import { withSellerFromChannel } from '../../utils/seller-access.util';

/**
 * Provisioning Context Adapter
 *
 * Provides composable helpers for building seller-aware RequestContext during provisioning.
 * Ensures Vendure services receive properly configured contexts that pass permission checks.
 *
 * Key Features:
 * - Validates seller/channel/admin existence before operations
 * - Builds seller-scoped contexts for service calls
 * - Provides structured debug logging (feature-flag friendly)
 * - Ensures transactional consistency
 */
@Injectable()
export class ProvisioningContextAdapter {
  private readonly logger = new Logger(ProvisioningContextAdapter.name);

  constructor(private readonly connection: TransactionalConnection) {}

  /**
   * Execute a function with seller-scoped RequestContext.
   * Gets seller from channel, validates existence, sets on context, then executes function.
   *
   * This is the primary method for calling Vendure services during provisioning.
   * It ensures that permission checks (e.g., getPermittedChannels()) can see the channel
   * by setting the channel's seller on the RequestContext.
   *
   * @param ctx - RequestContext (may be in a transaction)
   * @param channelId - Channel ID to get seller from
   * @param fn - Function to execute with seller-scoped context
   * @param options - Optional configuration
   * @returns Result of the function execution
   */
  async withSellerScope<T>(
    ctx: RequestContext,
    channelId: ID,
    fn: (ctx: RequestContext) => Promise<T>,
    options?: {
      enableDebugLogging?: boolean;
      operationName?: string;
    }
  ): Promise<T> {
    const enableDebug = options?.enableDebugLogging ?? false;
    const operationName = options?.operationName ?? 'operation';

    if (enableDebug) {
      this.logger.debug(
        `[${operationName}] Preparing seller-scoped context for channel ${channelId}`
      );
    }

    try {
      // Validate channel exists before proceeding and load it
      const channel = await this.loadChannelWithSeller(ctx, channelId, enableDebug);

      // Execute with both channel and seller set on context
      const result = await withChannel(ctx, channel, async ctxWithChannel => {
        return await withSellerFromChannel(
          ctxWithChannel,
          channelId,
          this.connection,
          async ctxWithSeller => {
            if (enableDebug) {
              const seller = (ctxWithSeller as any).seller as Seller | undefined;
              this.logger.debug(
                `[${operationName}] Context prepared: channel=${channelId}, seller=${seller?.id ?? 'none'}, user=${ctxWithSeller.activeUserId ?? 'none'}`
              );
            }

            return await fn(ctxWithSeller);
          }
        );
      });

      if (enableDebug) {
        this.logger.debug(`[${operationName}] Completed successfully for channel ${channelId}`);
      }

      return result;
    } catch (error: any) {
      this.logger.error(
        `[${operationName}] Failed for channel ${channelId}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Load channel with seller relation.
   * Throws an error if channel is not found or has no seller.
   *
   * @param ctx - RequestContext
   * @param channelId - Channel ID to load
   * @param enableDebug - Enable debug logging
   * @returns Channel with seller relation
   */
  private async loadChannelWithSeller(
    ctx: RequestContext,
    channelId: ID,
    enableDebug = false
  ): Promise<Channel> {
    const channelRepo = this.connection.getRepository(ctx, Channel);
    const channel = await channelRepo.findOne({
      where: { id: channelId },
      relations: ['seller'],
    });

    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    if (enableDebug) {
      this.logger.debug(`Channel ${channelId} loaded: seller=${channel.seller?.id ?? 'none'}`);
    }

    if (!channel.seller) {
      throw new Error(`Channel ${channelId} has no seller associated`);
    }

    return channel;
  }

  /**
   * Validate that a channel exists and is accessible.
   * Throws an error if channel is not found.
   *
   * @param ctx - RequestContext
   * @param channelId - Channel ID to validate
   * @param enableDebug - Enable debug logging
   */
  async validateChannelExists(
    ctx: RequestContext,
    channelId: ID,
    enableDebug = false
  ): Promise<void> {
    await this.loadChannelWithSeller(ctx, channelId, enableDebug);
  }

  /**
   * Validate that a seller exists.
   * Throws an error if seller is not found.
   *
   * @param ctx - RequestContext
   * @param sellerId - Seller ID to validate
   * @param enableDebug - Enable debug logging
   */
  async validateSellerExists(
    ctx: RequestContext,
    sellerId: ID,
    enableDebug = false
  ): Promise<Seller> {
    const sellerRepo = this.connection.getRepository(ctx, Seller);
    const seller = await sellerRepo.findOne({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new Error(`Seller ${sellerId} not found`);
    }

    if (enableDebug) {
      this.logger.debug(`Seller ${sellerId} validated: name=${seller.name}`);
    }

    return seller;
  }

  /**
   * Validate that an administrator exists.
   * Throws an error if administrator is not found.
   *
   * @param ctx - RequestContext
   * @param adminId - Administrator ID to validate
   * @param enableDebug - Enable debug logging
   */
  async validateAdministratorExists(
    ctx: RequestContext,
    adminId: ID,
    enableDebug = false
  ): Promise<Administrator> {
    const adminRepo = this.connection.getRepository(ctx, Administrator);
    const administrator = await adminRepo.findOne({
      where: { id: adminId },
      relations: ['user'],
    });

    if (!administrator) {
      throw new Error(`Administrator ${adminId} not found`);
    }

    if (enableDebug) {
      this.logger.debug(
        `Administrator ${adminId} validated: email=${administrator.emailAddress}, user=${administrator.user?.id ?? 'none'}`
      );
    }

    return administrator;
  }

  /**
   * Get structured context information for logging.
   * Useful for debugging permission failures and context issues.
   *
   * @param ctx - RequestContext to inspect
   * @returns Structured context information
   */
  getContextInfo(ctx: RequestContext): {
    channelId: ID | undefined;
    activeUserId: ID | undefined;
    sellerId: ID | undefined;
    apiType: string | undefined;
    isAuthorized: boolean;
  } {
    const seller = (ctx as any).seller as Seller | undefined;

    return {
      channelId: ctx.channelId,
      activeUserId: ctx.activeUserId,
      sellerId: seller?.id,
      apiType: ctx.apiType,
      isAuthorized: ctx.isAuthorized,
    };
  }
}
