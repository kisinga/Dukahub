<!-- 87e1655c-894b-469d-a011-e1cc643c8948 420f6b4d-e825-4b27-8b02-4503ba5f16db -->
# Revised Paystack Subscription Integration

## Critical Assessment of Original Plan

The original plan proposes sound architecture but overcomplicates in three areas:

1. **Unnecessary config hardening** - Proposes merging channel config with "default critical events config" when the real issue is an architectural gap in `routeEvent`
2. **New worker file** - Proposes `subscription.worker.ts` when the established pattern (`MlExtractionQueueSubscriber`) shows interval-based processing belongs in a subscriber class
3. **Premature test specification** - Lists 6 test cases before implementation shape is known

## Revised Architecture (Fix the Core, Compose the Rest)

### Core Issue: `routeEvent` conflates subscribable and system events

Looking at [channel-event-router.service.ts](backend/src/infrastructure/events/channel-event-router.service.ts) lines 210-230:

```typescript
const channelConfig = await this.getChannelConfig(event.channelId);
if (!channelConfig) { return; }  // <-- System events fail here

const eventConfig = channelConfig[event.type];
if (!eventConfig) { return; }    // <-- System events fail here too
```

System events (non-subscribable, non-customer-facing) should NOT require per-channel configuration. They should always fire to channel admins with default settings.

---

## Phase 1: Fix Event Router Architecture

**File**: [backend/src/infrastructure/events/channel-event-router.service.ts](backend/src/infrastructure/events/channel-event-router.service.ts)

Refactor `routeEvent` to check metadata FIRST, then branch:

```typescript
async routeEvent(event: ChannelEvent): Promise<void> {
  // ...existing audit logging...

  // Get metadata FIRST to determine routing strategy
  const metadata = this.getEventMetadata(event.type);
  if (!metadata) {
    this.logger.warn(`No metadata for event type ${event.type}`);
    return;
  }

  const isSystemEvent = !metadata.subscribable && !metadata.customerFacing;

  let effectiveConfig: any;
  if (isSystemEvent) {
    // System events use default config - no channel setup required
    effectiveConfig = this.getDefaultSystemEventConfig();
  } else {
    // Subscribable events require channel config
    const channelConfig = await this.getChannelConfig(event.channelId);
    if (!channelConfig?.[event.type]) {
      this.logger.debug(`No config for ${event.type} in channel ${event.channelId}`);
      return;
    }
    effectiveConfig = channelConfig[event.type];
  }

  // ...rest of routing logic with effectiveConfig...
}

private getDefaultSystemEventConfig(): Record<string, ActionConfig> {
  return {
    [ChannelActionType.IN_APP_NOTIFICATION]: { enabled: true },
  };
}
```

This is ~20 lines changed but fixes the root cause. All future system events "just work".

---

## Phase 2: Add Event Types (Standard Extension)

### 2.1 Event Type Enum

**File**: [backend/src/infrastructure/events/types/event-type.enum.ts](backend/src/infrastructure/events/types/event-type.enum.ts)

```typescript
// Add to enum:
SUBSCRIPTION_EXPIRING_SOON = 'subscription_expiring_soon',
SUBSCRIPTION_EXPIRED = 'subscription_expired',
SUBSCRIPTION_RENEWED = 'subscription_renewed',
```

### 2.2 Event Metadata

**File**: [backend/src/infrastructure/events/config/event-metadata.ts](backend/src/infrastructure/events/config/event-metadata.ts)

```typescript
[ChannelEventType.SUBSCRIPTION_EXPIRING_SOON]: {
  subscribable: false,
  customerFacing: false,
  defaultEnabled: true,
  category: ActionCategory.SYSTEM_NOTIFICATIONS,
},
// ... similar for EXPIRED and RENEWED
```

### 2.3 Handler Messages

**File**: [backend/src/infrastructure/events/handlers/in-app-action.handler.ts](backend/src/infrastructure/events/handlers/in-app-action.handler.ts)

Add title/message mappings for the three new event types.

---

## Phase 2: Trial Assignment on Registration

**File**: [backend/src/services/auth/provisioning/channel-provisioner.service.ts](backend/src/services/auth/provisioning/channel-provisioner.service.ts)

In `createChannel`, set trial fields in `customFields`:

```typescript
const trialDays = parseInt(process.env.SUBSCRIPTION_TRIAL_DAYS || '30', 10);
const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

customFields: {
  status: 'UNAPPROVED',
  subscriptionStatus: 'trial',
  trialEndsAt: trialEndsAt.toISOString(),
}
```

---

## Phase 3: Prepaid Extension Logic

**File**: [backend/src/services/subscriptions/subscription.service.ts](backend/src/services/subscriptions/subscription.service.ts)

### 3.1 Fix `processSuccessfulPayment` 

Current implementation (line 289-294) calculates from `new Date()`. Change to prepaid logic:

```typescript
const currentExpiry = customFields.subscriptionExpiresAt 
  ? new Date(customFields.subscriptionExpiresAt) 
  : null;
const trialEnd = customFields.trialEndsAt 
  ? new Date(customFields.trialEndsAt) 
  : null;
const baseDate = new Date(Math.max(
  currentExpiry?.getTime() || 0,
  trialEnd?.getTime() || 0,
  Date.now()
));
// Add billing period to baseDate
```

### 3.2 Add Email Fallback

In `initiatePurchase`, before Paystack calls:

```typescript
const effectiveEmail = email || `${phoneNumber.replace(/\+/g, '')}@placeholder.dukarun.com`;
```

### 3.3 Emit Renewal Event

Inject `ChannelEventRouterService`, call `emitSystemAlert` after successful payment update.

---

## Phase 4: Expiry Scheduler (Follow Existing Pattern)

**File**: [backend/src/plugins/subscriptions/subscription-expiry.subscriber.ts](backend/src/plugins/subscriptions/subscription-expiry.subscriber.ts) (New)

Follow the `MlExtractionQueueSubscriber` pattern exactly:

```typescript
@Injectable()
export class SubscriptionExpirySubscriber implements OnApplicationBootstrap {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // Daily

  constructor(
    private subscriptionService: SubscriptionService,
    private eventRouter: ChannelEventRouterService,
    private connection: TransactionalConnection
  ) {}

  onApplicationBootstrap() {
    this.intervalId = setInterval(() => this.checkExpiringSubscriptions(), this.CHECK_INTERVAL_MS);
    // Run once on startup
    setTimeout(() => this.checkExpiringSubscriptions(), 5000);
  }

  private async checkExpiringSubscriptions() {
    // Query channels where subscriptionExpiresAt is within 7, 3, 1 days
    // For each, call eventRouter.emitSystemAlert({ type: SUBSCRIPTION_EXPIRING_SOON, ... })
  }
}
```

Register in `SubscriptionPlugin` providers.

---

## Phase 5: Integration Tests

**File**: [backend/spec/services/subscriptions/subscription-flow.spec.ts](backend/spec/services/subscriptions/subscription-flow.spec.ts) (New)

Focus on:

- Prepaid extension calculates correctly (early renewal, late renewal, from trial)
- System alert fires on renewal
- Scheduler finds expiring channels

Mock `PaystackService` and verify `ChannelEventRouterService.emitSystemAlert` calls.

---

## Diff from Original Plan

| Aspect | Original | Revised |

|--------|----------|---------|

| Config hardening | Merge default config into channel config | Direct `emitSystemAlert` bypasses config |

| Worker file | New `subscription.worker.ts` | Subscriber following existing pattern |

| Lines of code | ~300+ | ~150 |

| Blast radius | Touches core event routing | Isolated to subscription domain |

---

## Files Changed Summary

| File | Change Type |

|------|-------------|

| `event-type.enum.ts` | Add 3 enum values |

| `event-metadata.ts` | Add 3 entries |

| `in-app-action.handler.ts` | Add 3 title/message pairs |

| `channel-event-router.service.ts` | Add `emitSystemAlert()` helper (~10 lines) |

| `channel-provisioner.service.ts` | Add trial fields (~5 lines) |

| `subscription.service.ts` | Fix expiry calc, add email fallback, emit event |

| `subscription-expiry.subscriber.ts` | New file (~60 lines) |

| `subscription.plugin.ts` | Register subscriber |