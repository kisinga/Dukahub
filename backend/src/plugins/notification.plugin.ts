import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { NotificationResolver, notificationSchema } from './notification.resolver';
import { NotificationService, Notification } from './notification.service';
import { NotificationTestController } from './notification-test.controller';
import { PushNotificationService } from './push-notification.service';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [NotificationResolver, NotificationService, PushNotificationService],
    controllers: [NotificationTestController],
    entities: [Notification],
    adminApiExtensions: {
        resolvers: [NotificationResolver],
        schema: notificationSchema,
    },
})
export class NotificationPlugin { }
