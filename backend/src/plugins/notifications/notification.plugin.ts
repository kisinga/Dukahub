import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { VENDURE_COMPATIBILITY_VERSION } from '../../constants/vendure-version.constants';
import { NotificationResolver, notificationSchema } from './notification.resolver';
import {
  NotificationService,
  Notification,
} from '../../services/notifications/notification.service';
import { NotificationTestController } from './notification-test.controller';
import { PushNotificationService } from '../../services/notifications/push-notification.service';

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [NotificationResolver, NotificationService, PushNotificationService],
  controllers: [NotificationTestController],
  entities: [Notification],
  adminApiExtensions: {
    resolvers: [NotificationResolver],
    schema: notificationSchema,
  },
  compatibility: VENDURE_COMPATIBILITY_VERSION,
})
export class NotificationPlugin {}
