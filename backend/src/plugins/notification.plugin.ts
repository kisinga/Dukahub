import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { NotificationResolver, notificationSchema } from './notification.resolver';
import { NotificationService } from './notification.service';
import { PushNotificationService } from './push-notification.service';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [NotificationResolver, NotificationService, PushNotificationService],
    adminApiExtensions: {
        resolvers: [NotificationResolver],
        schema: notificationSchema,
    },
})
export class NotificationPlugin { }
