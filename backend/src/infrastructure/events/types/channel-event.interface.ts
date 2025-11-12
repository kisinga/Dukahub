import { RequestContext } from '@vendure/core';
import { ActionCategory } from './action-category.enum';
import { ChannelActionType } from './action-type.enum';
import { ChannelEventType } from './event-type.enum';

/**
 * Channel Event
 * 
 * Represents an event that occurred in the system and needs to be processed
 * by the channel events framework.
 */
export interface ChannelEvent {
    type: ChannelEventType;
    channelId: string;
    category: ActionCategory;
    context: RequestContext;
    data: Record<string, any>;
    targetUserId?: string; // For customer-facing events
    targetCustomerId?: string; // For customer-facing events
    metadata?: Record<string, any>;
}

/**
 * Action Configuration
 * 
 * Configuration for a specific action type for an event.
 */
export interface ActionConfig {
    enabled: boolean;
    defaultForUsers?: boolean; // Only for subscribable events
    template?: string; // Optional template for the action
    [key: string]: any; // Additional action-specific config
}

/**
 * Event Configuration
 * 
 * Configuration for an event type, mapping to action configurations.
 */
export interface EventConfig {
    [actionType: string]: ActionConfig;
}

/**
 * Channel Event Configuration
 * 
 * Complete configuration for a channel, mapping event types to their action configs.
 */
export interface ChannelEventConfig {
    [eventType: string]: EventConfig;
}

/**
 * User Notification Preferences
 * 
 * User's preferences for subscribable events.
 */
export interface UserNotificationPreferences {
    [eventType: string]: {
        [actionType: string]: boolean;
    };
}

/**
 * Action Result
 * 
 * Result of executing an action handler.
 */
export interface ActionResult {
    success: boolean;
    actionType: ChannelActionType;
    error?: string;
    metadata?: Record<string, any>;
}

