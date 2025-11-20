import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelService,
  RequestContext,
  TransactionalConnection,
  User,
  UserService,
} from '@vendure/core';
import { ChannelEventConfig, UserNotificationPreferences } from './types/channel-event.interface';
import { EVENT_METADATA_MAP } from './config/event-metadata';
import { ChannelEventType } from './types/event-type.enum';

/**
 * Notification Preference Service
 *
 * Manages user notification preferences for subscribable events.
 * Handles loading channel defaults and user-specific overrides.
 */
@Injectable()
export class NotificationPreferenceService {
  private readonly logger = new Logger('NotificationPreferenceService');
  private eventMetadataCache: Map<string, any> | null = null;

  constructor(
    private readonly connection: TransactionalConnection,
    private readonly channelService: ChannelService,
    private readonly userService: UserService
  ) {}

  /**
   * Get user's notification preferences with channel defaults
   */
  async getUserPreferences(
    ctx: RequestContext,
    userId: string,
    channelId: string
  ): Promise<UserNotificationPreferences> {
    try {
      // Load user preferences
      const user = await this.userService.getUserById(ctx, userId);
      if (!user) {
        return {};
      }

      const userPrefs = (user.customFields as any)?.notificationPreferences;
      let preferences: UserNotificationPreferences = {};

      if (userPrefs) {
        try {
          preferences = typeof userPrefs === 'string' ? JSON.parse(userPrefs) : userPrefs;
        } catch (error) {
          this.logger.warn(`Failed to parse user preferences for user ${userId}: ${error}`);
          preferences = {};
        }
      }

      // Load channel defaults for subscribable events
      const channelDefaults = await this.getDefaultPreferences(channelId);

      // Merge: user preferences override channel defaults
      const merged: UserNotificationPreferences = {};
      const subscribableEvents = this.getSubscribableEvents();

      for (const eventType of subscribableEvents) {
        merged[eventType] = {
          ...channelDefaults[eventType],
          ...(preferences[eventType] || {}),
        };
      }

      return merged;
    } catch (error) {
      this.logger.error(
        `Failed to get user preferences for user ${userId}, channel ${channelId}: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
      return {};
    }
  }

  /**
   * Update user's notification preferences
   */
  async updateUserPreferences(
    ctx: RequestContext,
    userId: string,
    channelId: string,
    preferences: UserNotificationPreferences
  ): Promise<void> {
    try {
      const user = await this.userService.getUserById(ctx, userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const customFields = (user.customFields as any) || {};
      customFields.notificationPreferences = JSON.stringify(preferences);

      // Update user using repository directly since UserService doesn't have update method
      const userRepo = this.connection.getRepository(ctx, User);
      await userRepo.update({ id: userId }, { customFields: customFields as any });

      this.logger.log(
        `Updated notification preferences for user ${userId} in channel ${channelId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to update user preferences for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get channel default preferences for an event type
   */
  async getDefaultPreferences(channelId: string): Promise<Record<string, Record<string, boolean>>> {
    try {
      const channel = await this.channelService.findOne(RequestContext.empty(), channelId);
      if (!channel) {
        return {};
      }

      const eventConfig = (channel.customFields as any)?.eventConfig;
      if (!eventConfig) {
        return {};
      }

      let config: ChannelEventConfig = {};
      try {
        config = typeof eventConfig === 'string' ? JSON.parse(eventConfig) : eventConfig;
      } catch (error) {
        this.logger.warn(`Failed to parse channel event config for channel ${channelId}: ${error}`);
        return {};
      }

      // Extract defaultForUsers values
      const defaults: Record<string, Record<string, boolean>> = {};
      for (const [eventType, actions] of Object.entries(config)) {
        defaults[eventType] = {};
        for (const [actionType, actionConfig] of Object.entries(actions)) {
          if (actionConfig.defaultForUsers !== undefined) {
            defaults[eventType][actionType] = actionConfig.defaultForUsers;
          }
        }
      }

      return defaults;
    } catch (error) {
      this.logger.error(
        `Failed to get default preferences for channel ${channelId}: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
      return {};
    }
  }

  /**
   * Determine if a notification should be sent based on user preferences and channel config
   */
  shouldSendNotification(
    userPreferences: UserNotificationPreferences,
    channelConfig: ChannelEventConfig,
    eventType: ChannelEventType,
    actionType: string
  ): boolean {
    // Check if event is subscribable
    const metadata = this.getEventMetadata(eventType);
    if (!metadata?.subscribable) {
      // System events: check channel config only
      const eventConfig = channelConfig[eventType];
      if (!eventConfig) {
        return false;
      }
      const actionConfig = eventConfig[actionType];
      return actionConfig?.enabled === true;
    }

    // Subscribable events: check user preferences first, then channel defaults
    const userPref = userPreferences[eventType]?.[actionType];
    if (userPref !== undefined) {
      return userPref;
    }

    // Fall back to channel default
    const eventConfig = channelConfig[eventType];
    if (!eventConfig) {
      return false;
    }
    const actionConfig = eventConfig[actionType];
    return actionConfig?.defaultForUsers === true;
  }

  /**
   * Get event metadata (cached)
   */
  private getEventMetadata(eventType: ChannelEventType): any {
    if (!this.eventMetadataCache) {
      this.loadEventMetadata();
    }
    return this.eventMetadataCache?.get(eventType);
  }

  /**
   * Load event metadata from JSON file
   */
  private loadEventMetadata(): void {
    this.eventMetadataCache = new Map(EVENT_METADATA_MAP);
  }

  /**
   * Get list of subscribable event types
   */
  private getSubscribableEvents(): ChannelEventType[] {
    if (!this.eventMetadataCache) {
      this.loadEventMetadata();
    }

    const subscribable: ChannelEventType[] = [];
    for (const [eventType, metadata] of this.eventMetadataCache?.entries() || []) {
      if (metadata.subscribable) {
        subscribable.push(eventType as ChannelEventType);
      }
    }
    return subscribable;
  }
}
