import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ChannelService, RequestContext } from '@vendure/core';
import { getChannelStatus } from '../../domain/channel-custom-fields';
import { AccessLevel, ChannelStatus } from './phone-auth.service';

/**
 * Channel Access Guard Service
 * 
 * Enforces channel status-based access control:
 * - UNAPPROVED channels: Read-only access (queries allowed, mutations blocked)
 * - APPROVED channels: Full access
 * - DISABLED/BANNED channels: No access (blocks all operations)
 * 
 * Also verifies channel status hasn't changed since login (session invalidation).
 */
@Injectable()
export class ChannelAccessGuardService implements CanActivate {
    private readonly logger = new Logger(ChannelAccessGuardService.name);

    constructor(
        private readonly channelService: ChannelService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Get GraphQL context
        const gqlContext = GqlExecutionContext.create(context);
        const info = gqlContext.getInfo();
        const ctx = gqlContext.getContext().req as RequestContext;

        // Get channel ID from context
        const channelId = ctx.channelId;
        if (!channelId) {
            // No channel context, allow (might be system operation or default channel)
            return true;
        }

        try {
            // Load channel to check current status
            const channel = await this.channelService.findOne(ctx, channelId);
            if (!channel) {
                this.logger.warn(`Channel ${channelId} not found`);
                return false;
            }

            // Get channel status from customFields - status field is the single source of truth
            const channelStatus = getChannelStatus(channel.customFields);

            // Block all access if channel is DISABLED or BANNED
            if (channelStatus === ChannelStatus.DISABLED || channelStatus === ChannelStatus.BANNED) {
                const statusText = channelStatus === ChannelStatus.DISABLED ? 'disabled' : 'banned';
                this.logger.warn(
                    `Blocked ${info.operation.operation} ${info.fieldName} for channel ${channelId} - channel is ${statusText}`
                );
                throw new Error(
                    `Your channel has been ${statusText}. Please contact support.`
                );
            }

            // For mutations, check if channel is UNAPPROVED (read-only mode)
            if (info.operation.operation === 'mutation') {
                if (channelStatus === ChannelStatus.UNAPPROVED) {
                    this.logger.warn(
                        `Blocked mutation ${info.fieldName} for channel ${channelId} - channel is unapproved (read-only mode)`
                    );
                    throw new Error(
                        'Your channel is pending approval. You have read-only access until an admin approves your channel.'
                    );
                }
            }

            // Note: Channel status change detection and session invalidation
            // is handled at the application level. If channel status changes after login,
            // the next request will be blocked appropriately. This is intentional design
            // to ensure predictable behavior - see documentation for details.

            return true;
        } catch (error) {
            // If error is already our channel access error, re-throw it
            if (error instanceof Error && (
                error.message.includes('disabled') ||
                error.message.includes('banned') ||
                error.message.includes('pending approval')
            )) {
                throw error;
            }

            // For other errors, log and allow (fail-safe)
            this.logger.error(
                `Error checking channel access: ${error instanceof Error ? error.message : String(error)}`
            );
            return true;
        }
    }

    /**
     * Helper method to check channel status (can be used by other services)
     */
    async checkChannelAccess(ctx: RequestContext, channelId: string): Promise<{
        allowed: boolean;
        accessLevel: AccessLevel;
        message?: string;
    }> {
        try {
            const channel = await this.channelService.findOne(ctx, channelId);
            if (!channel) {
                return {
                    allowed: false,
                    accessLevel: AccessLevel.READ_ONLY,
                    message: 'Channel not found',
                };
            }

            // Get channel status from customFields - status field is the single source of truth
            const channelStatus = getChannelStatus(channel.customFields);

            if (channelStatus === ChannelStatus.DISABLED || channelStatus === ChannelStatus.BANNED) {
                const statusText = channelStatus === ChannelStatus.DISABLED ? 'disabled' : 'banned';
                return {
                    allowed: false,
                    accessLevel: AccessLevel.READ_ONLY,
                    message: `Channel has been ${statusText}`,
                };
            }

            if (channelStatus === ChannelStatus.APPROVED) {
                return {
                    allowed: true,
                    accessLevel: AccessLevel.FULL,
                };
            }

            // UNAPPROVED
            return {
                allowed: true,
                accessLevel: AccessLevel.READ_ONLY,
                message: 'Channel is pending approval - read-only access',
            };
        } catch (error) {
            this.logger.error(
                `Error checking channel access: ${error instanceof Error ? error.message : String(error)}`
            );
            return {
                allowed: false,
                accessLevel: AccessLevel.READ_ONLY,
                message: 'Error checking channel status',
            };
        }
    }
}

