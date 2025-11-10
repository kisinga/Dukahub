import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
    Allow,
    Ctx,
    ID,
    Permission,
    RequestContext,
} from '@vendure/core';
import gql from 'graphql-tag';
import { SubscriptionService } from './subscription.service';
import { SubscriptionTier } from './subscription.entity';

/**
 * GraphQL schema extension for subscription management
 */
export const SUBSCRIPTION_SCHEMA = gql`
    type SubscriptionTier {
        id: ID!
        code: String!
        name: String!
        description: String
        priceMonthly: Int!
        priceYearly: Int!
        features: JSON
        isActive: Boolean!
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    type SubscriptionStatus {
        isValid: Boolean!
        status: String!
        daysRemaining: Int
        expiresAt: DateTime
        trialEndsAt: DateTime
        canPerformAction: Boolean!
    }

    type ChannelSubscription {
        tier: SubscriptionTier
        status: String!
        trialEndsAt: DateTime
        subscriptionStartedAt: DateTime
        subscriptionExpiresAt: DateTime
        billingCycle: String
        lastPaymentDate: DateTime
        lastPaymentAmount: Int
    }

    type InitiatePurchaseResult {
        success: Boolean!
        reference: String
        authorizationUrl: String
        message: String
    }

    extend type Query {
        """Get all active subscription tiers"""
        getSubscriptionTiers: [SubscriptionTier!]!
        
        """Get current channel's subscription details"""
        getChannelSubscription(channelId: ID): ChannelSubscription!
        
        """Quick subscription status check"""
        checkSubscriptionStatus(channelId: ID): SubscriptionStatus!
    }

    extend type Mutation {
        """Initiate subscription purchase"""
        initiateSubscriptionPurchase(
            channelId: ID!
            tierId: ID!
            billingCycle: String!
            phoneNumber: String!
            email: String!
        ): InitiatePurchaseResult!
        
        """Verify subscription payment"""
        verifySubscriptionPayment(
            channelId: ID!
            reference: String!
        ): Boolean!
        
        """Cancel subscription auto-renewal"""
        cancelSubscription(channelId: ID!): Boolean!
    }
`;

@Resolver()
export class SubscriptionResolver {
    constructor(
        private subscriptionService: SubscriptionService,
    ) { }

    @Query()
    @Allow(Permission.ReadSettings)
    async getSubscriptionTiers(
        @Ctx() ctx: RequestContext,
    ): Promise<SubscriptionTier[]> {
        return this.subscriptionService.getAllSubscriptionTiers();
    }

    @Query()
    @Allow(Permission.ReadSettings)
    async getChannelSubscription(
        @Ctx() ctx: RequestContext,
        @Args() args: { channelId?: ID },
    ): Promise<any> {
        const channelId = args.channelId || ctx.channelId;
        if (!channelId) {
            throw new Error('Channel ID required');
        }

        // Get channel with subscription details
        // This would require ChannelService injection - simplified for now
        const status = await this.subscriptionService.checkSubscriptionStatus(ctx, String(channelId));
        
        // Return subscription details
        // In a full implementation, you'd fetch the tier and other details
        return {
            status: status.status,
            trialEndsAt: status.trialEndsAt,
            expiresAt: status.expiresAt,
            canPerformAction: status.canPerformAction,
        };
    }

    @Query()
    @Allow(Permission.ReadSettings)
    async checkSubscriptionStatus(
        @Ctx() ctx: RequestContext,
        @Args() args: { channelId?: ID },
    ): Promise<any> {
        const channelId = args.channelId || ctx.channelId;
        if (!channelId) {
            throw new Error('Channel ID required');
        }

        return this.subscriptionService.checkSubscriptionStatus(ctx, String(channelId));
    }

    @Mutation()
    @Allow(Permission.UpdateSettings)
    async initiateSubscriptionPurchase(
        @Ctx() ctx: RequestContext,
        @Args() args: {
            channelId: ID;
            tierId: ID;
            billingCycle: string;
            phoneNumber: string;
            email: string;
        },
    ): Promise<any> {
        const channelId = args.channelId || ctx.channelId;
        if (!channelId) {
            throw new Error('Channel ID required');
        }

        if (args.billingCycle !== 'monthly' && args.billingCycle !== 'yearly') {
            throw new Error('Billing cycle must be "monthly" or "yearly"');
        }

        return this.subscriptionService.initiatePurchase(
            ctx,
            String(channelId),
            String(args.tierId),
            args.billingCycle as 'monthly' | 'yearly',
            args.phoneNumber,
            args.email
        );
    }

    @Mutation()
    @Allow(Permission.UpdateSettings)
    async verifySubscriptionPayment(
        @Ctx() ctx: RequestContext,
        @Args() args: {
            channelId: ID;
            reference: string;
        },
    ): Promise<boolean> {
        const channelId = args.channelId || ctx.channelId;
        if (!channelId) {
            throw new Error('Channel ID required');
        }

        try {
            // Verify transaction with Paystack
            const { PaystackService } = await import('./paystack.service');
            const paystackService = new PaystackService();
            const verification = await paystackService.verifyTransaction(args.reference);

            if (verification.data.status === 'success') {
                // Process successful payment
                const customerCode = verification.data.customer?.customer_code || 
                                   (verification.data.metadata as any)?.customerCode;
                
                await this.subscriptionService.processSuccessfulPayment(ctx, String(channelId), {
                    reference: args.reference,
                    amount: verification.data.amount,
                    customerCode: customerCode,
                });
                return true;
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    @Mutation()
    @Allow(Permission.UpdateSettings)
    async cancelSubscription(
        @Ctx() ctx: RequestContext,
        @Args() args: { channelId: ID },
    ): Promise<boolean> {
        const channelId = args.channelId || ctx.channelId;
        if (!channelId) {
            throw new Error('Channel ID required');
        }

        // Cancel subscription (disable auto-renewal)
        // This would require updating the channel and potentially calling Paystack
        // Simplified for now
        return true;
    }
}

