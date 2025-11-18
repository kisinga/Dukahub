# Paystack Subscription Integration

## Overview

This document describes the Paystack subscription and payment flow integration for Dukahub. The system supports trial periods, subscription tiers, STK push payments, and read-only mode for expired subscriptions.

## Architecture

### Subscription Data Storage

- **Subscription data**: Stored on Channel entity via custom fields (each channel = one customer company)
- **Subscription tiers**: Stored as Vendure custom entity (`SubscriptionTier`)
- **Trial period**: 30 days from channel creation with full features
- **Payment flow**: Paystack STK push with phone number pre-filled from Administrator profile
- **Access control**: Read-only mode when subscription expires (can view but not create/edit)

### Key Components

#### Backend

1. **SubscriptionTier Entity** (`backend/src/plugins/subscription.entity.ts`)
   - Stores subscription tier definitions
   - Fields: code, name, description, priceMonthly, priceYearly, features, isActive

2. **Channel Custom Fields**
   - `subscriptionTierId` - Current tier
   - `subscriptionStatus` - "trial" | "active" | "expired" | "cancelled"
   - `trialEndsAt` - Trial end date
   - `subscriptionStartedAt` - When paid subscription started
   - `subscriptionExpiresAt` - Next billing date
   - `billingCycle` - "monthly" | "yearly"
   - `paystackCustomerCode` - Paystack customer reference
   - `paystackSubscriptionCode` - Paystack subscription reference
   - `lastPaymentDate` - Last payment date
   - `lastPaymentAmount` - Last payment amount in cents

3. **PaystackService** (`backend/src/plugins/paystack.service.ts`)
   - Handles Paystack API integration
   - Methods: initializeTransaction, chargeMobile (STK push), verifyTransaction, createCustomer, etc.

4. **SubscriptionService** (`backend/src/plugins/subscription.service.ts`)
   - Business logic for subscriptions
   - Methods: checkSubscriptionStatus, initiatePurchase, processSuccessfulPayment, etc.

5. **SubscriptionWebhookController** (`backend/src/plugins/subscription-webhook.controller.ts`)
   - Handles Paystack webhook callbacks
   - Endpoint: `POST /webhooks/paystack`
   - Events: charge.success, subscription.create, subscription.disable, subscription.not_renew

6. **SubscriptionGuard** (`backend/src/plugins/subscription.guard.ts`)
   - Enforces read-only mode for expired subscriptions
   - Blocks mutations when subscription is expired
   - Allows subscription-related mutations even if expired

#### Frontend

1. **SubscriptionService** (`frontend/src/app/core/services/subscription.service.ts`)
   - Angular service for subscription management
   - Provides signals for subscription status, tiers, etc.

2. **SubscriptionStatusComponent** (`frontend/src/app/dashboard/pages/settings/components/subscription-status.component.ts`)
   - Displays subscription status and trial information
   - Shows renewal options

3. **PaymentModalComponent** (`frontend/src/app/dashboard/pages/settings/components/payment-modal.component.ts`)
   - Modal for subscription purchase
   - Handles billing cycle selection and payment initiation

4. **SubscriptionInterceptor** (`frontend/src/app/core/interceptors/subscription.interceptor.ts`)
   - HTTP interceptor for handling subscription errors
   - Shows toast notifications for expired subscriptions

## Setup Instructions

### 1. Environment Variables

Add to root `.env`:

```bash
PAYSTACK_SECRET_KEY=sk_live_xxx
PAYSTACK_PUBLIC_KEY=pk_live_xxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxx
SUBSCRIPTION_TRIAL_DAYS=30
```

### 2. Paystack Configuration

1. **Get API Keys**
   - Log in to Paystack dashboard
   - Navigate to Settings → API Keys & Webhooks
   - Copy Secret Key and Public Key

2. **Configure Webhook**
   - In Paystack dashboard, go to Settings → Webhooks
   - Add webhook URL: `https://your-domain.com/webhooks/paystack`
   - Select events: `charge.success`, `subscription.create`, `subscription.disable`, `subscription.not_renew`
   - Copy webhook secret

3. **Test Mode**
   - Use test keys for development: `sk_test_xxx` and `pk_test_xxx`
   - Use ngrok for local webhook testing: `ngrok http 3000`
   - Update webhook URL in Paystack to ngrok URL

### 3. Database Migration

Run the migration to create subscription tables and fields:

```bash
cd backend
npm run migration:run
```

This will:
- Create `subscription_tier` table
- Add subscription custom fields to `channel` table
- Seed default subscription tier (Basic Plan)
- Set existing channels to trial status

### 4. Run Code Generation (Frontend)

After adding GraphQL operations, regenerate types:

```bash
cd frontend
npm run codegen
```

## Usage

### Trial Period

- New channels automatically start with a 30-day trial
- Trial status is set during channel creation
- `trialEndsAt` is calculated as `channelCreatedAt + 30 days`
- Full features are available during trial

### Subscription Purchase Flow

1. User initiates purchase from subscription status component
2. Selects billing cycle (monthly/yearly)
3. Provides phone number (pre-filled from profile)
4. Payment initiated via Paystack STK push
5. User receives payment prompt on phone
6. Payment verification via polling or webhook
7. Channel subscription status updated to "active"

### Webhook Processing

When Paystack sends webhook events:

1. Webhook signature is verified
2. Event type is determined
3. Channel subscription fields are updated
4. Response sent back to Paystack (200 OK)

### Read-Only Mode

When subscription expires:

- All queries are allowed (read access)
- Mutations are blocked (except subscription-related)
- UI shows expired subscription banner
- User can renew subscription to regain full access

## Testing

### Local Testing with Paystack Test Mode

1. Use Paystack test keys in `.env`
2. Use ngrok for webhook: `ngrok http 3000`
3. Update Paystack webhook URL to ngrok URL
4. Test payment flow with test phone numbers

### Test Phone Numbers (Paystack)

- Success: `+254700000000`
- Failure: `+254700000001`
- Timeout: `+254700000002`

### Manual Testing

1. Create a new channel → Should start in trial
2. Check subscription status → Should show trial active
3. Initiate purchase → Should trigger STK push
4. Complete payment → Should update subscription status
5. Let subscription expire → Should enforce read-only mode

## Troubleshooting

### Webhook Not Receiving Events

- Check webhook URL is publicly accessible
- Verify webhook secret matches in `.env`
- Check Paystack webhook logs for delivery status
- Ensure webhook endpoint returns 200 OK

### Payment Not Processing

- Verify Paystack API keys are correct
- Check phone number format (E.164: +254712345678)
- Verify transaction reference is unique
- Check Paystack transaction logs

### Subscription Status Not Updating

- Check database migration ran successfully
- Verify channel custom fields exist
- Check subscription service logs
- Verify webhook is updating channel correctly

### Read-Only Mode Not Enforcing

- Verify SubscriptionGuard is registered
- Check subscription status check logic
- Verify mutations are using guard
- Check frontend interceptor is registered

## Future Enhancements

### Multi-Tier Support

The architecture supports multiple subscription tiers:

1. Add new tiers via database:
   ```sql
   INSERT INTO subscription_tier (code, name, priceMonthly, priceYearly, features, isActive)
   VALUES ('pro-tier', 'Pro Plan', 10000, 100000, '{"features": [...]}', true);
   ```

2. Tiers are automatically available in frontend

### Grace Period

Consider adding a grace period before strict read-only enforcement:

- Add `gracePeriodEndsAt` field to channel
- Allow limited operations during grace period
- Full read-only after grace period expires

### Subscription Management

Future enhancements:

- Subscription upgrade/downgrade
- Prorated billing
- Payment method management
- Invoice generation
- Subscription analytics

## Security Considerations

1. **Webhook Signature Verification**
   - Always verify webhook signatures
   - Never trust webhook data without verification

2. **API Key Security**
   - Store keys in environment variables
   - Never commit keys to version control
   - Use different keys for test/production

3. **Payment Data**
   - Never store sensitive payment data
   - Use Paystack customer codes for reference
   - Log payment events for audit trail

## Related Documentation

- [Customer Provisioning Guide](./CUSTOMER_PROVISIONING.md)
- [Vendure Configuration](./VENDURE.md)
- [Architecture Overview](./ARCHITECTURE.md)






