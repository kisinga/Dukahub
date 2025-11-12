import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { NotificationService } from '../notification.service';
import { PushNotificationService } from '../push-notification.service';
import { SmsProviderFactory } from '../sms/sms-provider.factory';
import { SmsService } from '../sms/sms.service';
import { ChannelActionTrackingService } from './channel-action-tracking.service';
import { ChannelCommunicationService } from './channel-communication.service';
import { ChannelCommunicationSubscriber } from './channel-communication.subscriber';
import { ChannelEventRouterService } from './channel-event-router.service';
import { ChannelSmsService } from './channel-sms.service';
import { InAppActionHandler } from './handlers/in-app-action.handler';
import { PushActionHandler } from './handlers/push-action.handler';
import { SmsActionHandler } from './handlers/sms-action.handler';
import { NotificationPreferenceService } from './notification-preference.service';

/**
 * Channel Events Plugin
 * 
 * Provides a centralized, event-driven framework for channel-specific actions.
 * Handles SMS, email, push notifications, and in-app notifications with per-channel
 * configuration and user subscription preferences.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        // Core services
        ChannelActionTrackingService,
        ChannelEventRouterService,
        SmsProviderFactory, // Required by SmsService
        SmsService, // Required by ChannelSmsService
        ChannelSmsService,
        NotificationPreferenceService,

        // Required services for action handlers
        NotificationService, // Required by InAppActionHandler
        PushNotificationService, // Required by PushActionHandler

        // Action handlers
        InAppActionHandler,
        PushActionHandler,
        SmsActionHandler,

        // Communication services
        ChannelCommunicationService,
        ChannelCommunicationSubscriber,
    ],
    exports: [
        ChannelEventRouterService,
        ChannelActionTrackingService,
        ChannelSmsService,
        NotificationPreferenceService,
    ],
})
export class ChannelEventsPlugin { }

