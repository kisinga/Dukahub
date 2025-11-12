import { Injectable, Logger } from '@nestjs/common';
import {
    Channel,
    ChannelService,
    RequestContext,
    TransactionalConnection,
} from '@vendure/core';
import { PaystackService } from '../payments/paystack.service';
import { SubscriptionTier } from '../../plugins/subscriptions/subscription.entity';

export interface SubscriptionStatus {
    isValid: boolean;
    status: 'trial' | 'active' | 'expired' | 'cancelled';
    daysRemaining?: number;
    expiresAt?: Date;
    trialEndsAt?: Date;
    canPerformAction: boolean;
}

export interface InitiatePurchaseResult {
    success: boolean;
    reference?: string;
    authorizationUrl?: string;
    message?: string;
}

@Injectable()
export class SubscriptionService {
    private readonly logger = new Logger(SubscriptionService.name);
    private readonly trialDays = parseInt(process.env.SUBSCRIPTION_TRIAL_DAYS || '30', 10);

    constructor(
        private channelService: ChannelService,
        private connection: TransactionalConnection,
        private paystackService: PaystackService,
    ) { }

    /**
     * Check subscription status for a channel
     */
    async checkSubscriptionStatus(ctx: RequestContext, channelId: string): Promise<SubscriptionStatus> {
        const channel = await this.channelService.findOne(ctx, channelId);
        if (!channel) {
            throw new Error(`Channel ${channelId} not found`);
        }

        const customFields = channel.customFields as any;
        const status = customFields.subscriptionStatus || 'trial';

        // Check if in trial
        if (status === 'trial') {
            const trialEndsAt = customFields.trialEndsAt ? new Date(customFields.trialEndsAt) : null;
            if (trialEndsAt && trialEndsAt > new Date()) {
                const daysRemaining = Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return {
                    isValid: true,
                    status: 'trial',
                    daysRemaining,
                    trialEndsAt: trialEndsAt ?? undefined,
                    canPerformAction: true,
                };
            } else {
                // Trial expired, mark as expired
                await this.handleExpiredSubscription(ctx, channelId);
                return {
                    isValid: false,
                    status: 'expired',
                    canPerformAction: false,
                };
            }
        }

        // Check if subscription is active
        if (status === 'active') {
            const expiresAt = customFields.subscriptionExpiresAt ? new Date(customFields.subscriptionExpiresAt) : null;
            if (expiresAt && expiresAt > new Date()) {
                const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return {
                    isValid: true,
                    status: 'active',
                    daysRemaining,
                    expiresAt: expiresAt ?? undefined,
                    canPerformAction: true,
                };
            } else {
                // Subscription expired
                await this.handleExpiredSubscription(ctx, channelId);
                return {
                    isValid: false,
                    status: 'expired',
                    expiresAt: expiresAt ?? undefined,
                    canPerformAction: false,
                };
            }
        }

        // Cancelled or expired
        return {
            isValid: false,
            status: status as 'expired' | 'cancelled',
            canPerformAction: false,
        };
    }

    /**
     * Check if channel is in trial period
     */
    async isInTrial(ctx: RequestContext, channel: Channel): Promise<boolean> {
        const customFields = channel.customFields as any;
        if (customFields.subscriptionStatus !== 'trial') {
            return false;
        }

        const trialEndsAt = customFields.trialEndsAt ? new Date(customFields.trialEndsAt) : null;
        return trialEndsAt ? trialEndsAt > new Date() : false;
    }

    /**
     * Check if subscription is active
     */
    async isSubscriptionActive(ctx: RequestContext, channel: Channel): Promise<boolean> {
        const customFields = channel.customFields as any;
        if (customFields.subscriptionStatus !== 'active') {
            return false;
        }

        const expiresAt = customFields.subscriptionExpiresAt ? new Date(customFields.subscriptionExpiresAt) : null;
        return expiresAt ? expiresAt > new Date() : false;
    }

    /**
     * Initiate subscription purchase
     */
    async initiatePurchase(
        ctx: RequestContext,
        channelId: string,
        tierId: string,
        billingCycle: 'monthly' | 'yearly',
        phoneNumber: string,
        email: string
    ): Promise<InitiatePurchaseResult> {
        try {
            // Get channel and tier
            const channel = await this.channelService.findOne(ctx, channelId);
            if (!channel) {
                return { success: false, message: 'Channel not found' };
            }

            const tierRepo = this.connection.rawConnection.getRepository(SubscriptionTier);
            const tier = await tierRepo.findOne({ where: { id: tierId } });
            if (!tier) {
                return { success: false, message: 'Subscription tier not found' };
            }

            const amount = billingCycle === 'monthly' ? tier.priceMonthly : tier.priceYearly;
            const amountInKes = amount / 100; // Convert from cents to KES

            // Create or get Paystack customer
            let customerCode = (channel.customFields as any).paystackCustomerCode;
            if (!customerCode) {
                try {
                    const customer = await this.paystackService.createCustomer(
                        email,
                        undefined,
                        undefined,
                        phoneNumber,
                        { channelId, tierId, billingCycle }
                    );
                    customerCode = customer.data.customer_code;

                    // Update channel with customer code
                    await this.channelService.update(ctx, {
                        id: channelId,
                        customFields: {
                            paystackCustomerCode: customerCode,
                        },
                    });
                } catch (error) {
                    this.logger.error(`Failed to create Paystack customer: ${error instanceof Error ? error.message : String(error)}`);
                    return { success: false, message: 'Failed to create customer in Paystack' };
                }
            }

            // Generate reference
            const reference = `SUB-${channelId}-${Date.now()}`;

            // Initialize transaction with STK push
            try {
                const chargeResponse = await this.paystackService.chargeMobile(
                    amountInKes,
                    phoneNumber,
                    email,
                    reference,
                    {
                        channelId,
                        tierId,
                        billingCycle,
                        type: 'subscription',
                    }
                );

                return {
                    success: true,
                    reference: chargeResponse.data.reference,
                    message: 'Payment initiated. Please check your phone for STK push prompt.',
                };
            } catch (error) {
                // Fallback to payment link if STK push fails
                this.logger.warn(`STK push failed, falling back to payment link: ${error instanceof Error ? error.message : String(error)}`);

                const transactionResponse = await this.paystackService.initializeTransaction(
                    amountInKes,
                    email,
                    phoneNumber,
                    {
                        channelId,
                        tierId,
                        billingCycle,
                        type: 'subscription',
                        reference,
                    }
                );

                return {
                    success: true,
                    reference: transactionResponse.data.reference,
                    authorizationUrl: transactionResponse.data.authorization_url,
                    message: 'Payment link generated. Please complete payment.',
                };
            }
        } catch (error) {
            this.logger.error(`Failed to initiate purchase: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to initiate purchase',
            };
        }
    }

    /**
     * Process successful payment
     */
    async processSuccessfulPayment(
        ctx: RequestContext,
        channelId: string,
        paystackData: {
            reference: string;
            amount: number;
            customerCode?: string;
            subscriptionCode?: string;
        }
    ): Promise<void> {
        const channel = await this.channelService.findOne(ctx, channelId);
        if (!channel) {
            throw new Error(`Channel ${channelId} not found`);
        }

        const customFields = channel.customFields as any;
        const subscriptionTierRef = customFields.subscriptionTier ?? null;
        const tierId =
            (typeof subscriptionTierRef === 'string' && subscriptionTierRef) ||
            (typeof subscriptionTierRef === 'object' && subscriptionTierRef?.id) ||
            customFields.subscriptionTierId ||
            customFields.subscriptionTierId?.id ||
            customFields.subscriptiontierid ||
            null;
        if (!tierId) {
            throw new Error('No subscription tier associated with channel');
        }

        const tierRepo = this.connection.rawConnection.getRepository(SubscriptionTier);
        const tier = await tierRepo.findOne({ where: { id: tierId } });
        if (!tier) {
            throw new Error('Subscription tier not found');
        }

        // Calculate expiration date based on billing cycle
        const billingCycle = customFields.billingCycle || 'monthly';
        const expiresAt = new Date();
        if (billingCycle === 'monthly') {
            expiresAt.setMonth(expiresAt.getMonth() + 1);
        } else {
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        }

        // Update channel subscription fields
        const updateData: any = {
            subscriptionStatus: 'active',
            subscriptionStartedAt: customFields.subscriptionStartedAt || new Date(),
            subscriptionExpiresAt: expiresAt,
            lastPaymentDate: new Date(),
            lastPaymentAmount: paystackData.amount,
        };

        if (paystackData.customerCode) {
            updateData.paystackCustomerCode = paystackData.customerCode;
        }

        if (paystackData.subscriptionCode) {
            updateData.paystackSubscriptionCode = paystackData.subscriptionCode;
        }

        await this.channelService.update(ctx, {
            id: channelId,
            customFields: updateData,
        });

        this.logger.log(`Subscription activated for channel ${channelId}`);
    }

    /**
     * Handle expired subscription
     */
    async handleExpiredSubscription(ctx: RequestContext, channelId: string): Promise<void> {
        const channel = await this.channelService.findOne(ctx, channelId);
        if (!channel) {
            return;
        }

        const customFields = channel.customFields as any;
        if (customFields.subscriptionStatus === 'expired') {
            return; // Already expired
        }

        await this.channelService.update(ctx, {
            id: channelId,
            customFields: {
                subscriptionStatus: 'expired',
            },
        });

        this.logger.log(`Subscription expired for channel ${channelId}`);
    }

    /**
     * Check if channel can perform action (not expired/cancelled)
     */
    async canPerformAction(ctx: RequestContext, channelId: string, action: string): Promise<boolean> {
        const status = await this.checkSubscriptionStatus(ctx, channelId);

        // Allow subscription-related actions even if expired
        if (action.includes('subscription') || action.includes('payment')) {
            return true;
        }

        return status.canPerformAction;
    }

    /**
     * Get subscription tier
     */
    async getSubscriptionTier(tierId: string): Promise<SubscriptionTier | null> {
        const tierRepo = this.connection.rawConnection.getRepository(SubscriptionTier);
        return tierRepo.findOne({ where: { id: tierId } });
    }

    /**
     * Get all active subscription tiers
     */
    async getAllSubscriptionTiers(): Promise<SubscriptionTier[]> {
        const tierRepo = this.connection.rawConnection.getRepository(SubscriptionTier);
        return tierRepo.find({ where: { isActive: true }, order: { priceMonthly: 'ASC' } });
    }
}

