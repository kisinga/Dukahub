<!-- 6526cb1a-945a-48a4-8358-bc2c32265476 318fe5a5-c33b-4fa8-a357-b21f308052d1 -->
# Paystack Subscription & Trial Integration Plan

## Problem

We need to integrate Paystack subscriptions focusing on MPESA (STK Push) while handling trial periods intelligently. The current Paystack Plans do not natively support "extend trial" logic or auto-recurring MPESA well. We want to avoid "Paystack Plans" sync and handle everything via backend logic ("Prepaid" model), leveraging our existing "Robust Channel Events" system for notifications.

## Solution Architecture

1.  **"Prepaid Time" Model**: Payment = Purchasing Time.

    -   **Extension Logic**: `New Expiry = MAX(Current Expiry, Trial End, Now) + Billing Cycle`.
    -   **Single Source of Truth**: `SubscriptionTier` entity (no Paystack Plan sync).

2.  **Notifications via ChannelEventRouter**:

    -   We will **not** manually create notifications in the worker.
    -   Instead, we will define new **Channel Events** (e.g., `SUBSCRIPTION_EXPIRING_SOON`).
    -   The Worker/Service simply emits these events. The `ChannelEventRouter` handles delivery (In-App, Push, Email).
    -   **Critical Fix**: We will update `ChannelEventRouterService` to use **Default System Config** for critical events (like subscriptions) so they work even if the channel's custom config is missing/outdated.

3.  **Email Strategy**:

    -   **Payment Receipt**: We send a branded email from *our* system (via `SUBSCRIPTION_RENEWED` event) upon success.
    -   **Paystack Email**: We collect it (using fallback `[phone]@placeholder...` if needed) purely to satisfy the API requirement.

4.  **Trial Logic**:

    -   **Registration**: System automatically assigns `trialEndsAt` = Now + 30 Days (configurable) upon channel creation.
    -   **Status**: Initial subscription status set to `trial`.

## Implementation Steps

### 1. Backend: Trial Period Assignment (Registration)

-   **File**: `backend/src/services/auth/provisioning/channel-provisioner.service.ts`
    -   **Update `createChannel`**:
        -   Read `SUBSCRIPTION_TRIAL_DAYS` from env (default 30).
        -   Calculate `trialEndsAt = new Date() + trialDays`.
        -   Set `customFields`:
            -   `subscriptionStatus: 'trial'`
            -   `trialEndsAt: [Calculated Date]`
            -   `status: 'UNAPPROVED'` (Keep existing)

### 2. Backend: Event System Hardening

-   **File**: `backend/src/infrastructure/events/types/event-type.enum.ts`
    -   Add new Enum values: `SUBSCRIPTION_EXPIRING_SOON`, `SUBSCRIPTION_EXPIRED`, `SUBSCRIPTION_RENEWED`.
-   **File**: `backend/src/infrastructure/events/config/event-metadata.ts`
    -   Register metadata (Category: `SYSTEM_NOTIFICATIONS`).
-   **File**: `backend/src/infrastructure/events/channel-event-router.service.ts`
    -   **Refactor**: Update `getChannelConfig` to merge `channel.customFields.eventConfig` with a `DEFAULT_CRITICAL_EVENTS_CONFIG` constant.
    -   **Documentation**: Add JSDoc explaining the config merging strategy.
-   **File**: `backend/src/infrastructure/events/handlers/in-app-action.handler.ts`
    -   **Update**: Add titles/messages for the new subscription events.

### 3. Backend: Subscription Service Logic

-   **File**: `backend/src/services/subscriptions/subscription.service.ts`
-   **Update `processSuccessfulPayment`**:
    -   Implement "Prepaid Extension" logic.
    -   **Emit Event**: `this.channelEventRouter.routeEvent({ type: SUBSCRIPTION_RENEWED ... })`.
-   **Update `initiatePurchase`**:
    -   Add **Email Fallback**: `email = user.email || ${phone}@placeholder.dukarun.com`.

### 4. Backend: Subscription Scheduler (Job Queue)

-   **File**: `backend/src/workers/subscription.worker.ts` (New)
-   **Logic**:
    -   `onApplicationBootstrap`: Start `setInterval` (Daily Clock).
    -   `process`: Define `JobQueueStrategy`.
    -   **Job Logic**:
        -   Query channels expiring in 7, 3, 1 days.
        -   For each, **Emit Event**: `SUBSCRIPTION_EXPIRING_SOON`.

### 5. Backend: Integration Tests

-   **File**: `backend/spec/services/subscriptions/subscription-flow.spec.ts` (New)
-   **Scope**:
    -   Mock `PaystackService` & `ChannelEventRouterService`.
    -   **Test Case 1**: Early/Late Renewal logic.
    -   **Test Case 2**: Email Fallback generation.
    -   **Test Case 3**: Verify `SUBSCRIPTION_RENEWED` event is emitted on success.
    -   **Test Case 4**: Verify Scheduler emits `SUBSCRIPTION_EXPIRING_SOON` events.
    -   **Test Case 5**: Verify default config merge works (event fires even with empty channel config).
    -   **Test Case 6**: Verify registration sets correct trial expiry date.

### 6. Frontend: UI Updates

-   **File**: `frontend/src/app/dashboard/pages/settings/components/billing...`
-   Update visuals for "Extend Subscription".

## Verification

-   Run `npm run test` to verify the event emission flow.

### To-dos

- [ ] Update ChannelEventType enum and EventMetadata
- [ ] Harden ChannelEventRouterService with default config merging
- [ ] Update InAppActionHandler with subscription messages
- [ ] Update SubscriptionService with prepaid logic and email fallback
- [ ] Create SubscriptionWorker for scheduled checks
- [ ] Create integration tests for subscription flow