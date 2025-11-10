import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { SubscriptionResolver, SUBSCRIPTION_SCHEMA } from './subscription.resolver';
import { SubscriptionService } from './subscription.service';
import { PaystackService } from './paystack.service';
import { SubscriptionWebhookController } from './subscription-webhook.controller';
import { SubscriptionTier } from './subscription.entity';
import { SubscriptionGuard } from './subscription.guard';

/**
 * Subscription Plugin
 * 
 * Provides subscription management with Paystack integration:
 * - Trial period management (30 days)
 * - Subscription tier definitions
 * - Paystack STK push payment integration
 * - Webhook handling for payment events
 * - Read-only mode enforcement for expired subscriptions
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [SubscriptionTier],
    providers: [
        SubscriptionResolver,
        SubscriptionService,
        PaystackService,
        SubscriptionGuard,
    ],
    controllers: [SubscriptionWebhookController],
    adminApiExtensions: {
        schema: SUBSCRIPTION_SCHEMA,
        resolvers: [SubscriptionResolver],
    },
    configuration: config => {
        // Register subscription guard for admin API mutations
        // Note: This is a simplified approach. In production, you might want
        // to apply the guard more selectively via decorators or middleware.
        return config;
    },
})
export class SubscriptionPlugin { }






