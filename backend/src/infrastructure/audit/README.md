# Audit System

## Overview

The audit system provides comprehensive, channel-scoped logging of all sensitive operations in the platform. It captures user actions and system events with full attribution, creating a complete audit trail for compliance and debugging.

**Architecture:** Uses a separate TimescaleDB database for audit logs, providing clear separation of concerns and time-series optimized storage with automatic retention policies (2 years).

## Core Principle

**Simple API, clear pattern, related code together.** Inject `AuditService`, call `log()`. That's it.

## Architecture

### Components

1. **AuditLog Entity** - Time-series table storing all audit events (TimescaleDB hypertable)
2. **AuditDbConnection** - Separate database connection to TimescaleDB
3. **AuditService** - Simple service with intuitive API for logging events
4. **UserContextResolver** - Helper to resolve user context from RequestContext or entity custom fields
5. **VendureEventAuditSubscriber** - Subscribes to Vendure events and logs them

### Database

- **Separate TimescaleDB instance** - Dedicated database for audit logs
- **Hypertable** - Partitioned by timestamp (7-day chunks) for efficient time-series queries
- **Automatic Retention** - Data older than 2 years (730 days) is automatically purged
- **Clear Separation** - Audit logs are completely separate from main application database

### Key Features

- **Channel-Scoped:** All audit records are associated with a channel
- **User Attribution:** Tracks who performed each action
- **Single Source of Truth:** User actions store attribution immediately; system events inherit
- **Non-Blocking:** Audit logging failures don't prevent operations
- **Time-Series Optimized:** Efficient querying with proper indexes

## Usage

### Basic Pattern

```typescript
@Injectable()
export class MyService {
  constructor(
    private readonly auditService: AuditService,
    // ... other dependencies
  ) {}

  async performAction(ctx: RequestContext, input: SomeInput): Promise<Result> {
    const result = await this.doWork(ctx, input);
    
    // Log user action
    await this.auditService.log(ctx, 'my_action.performed', {
      entityType: 'MyEntity',
      entityId: result.id.toString(),
      data: { /* relevant data */ }
    });
    
    return result;
  }
}
```

### When to Use `log()` vs `logSystemEvent()`

**Use `log()` for:**
- Direct user actions (order creation, payment addition, settings changes)
- Operations triggered by user requests
- Any action where `RequestContext.activeUserId` is available

**Use `logSystemEvent()` for:**
- Vendure events (OrderStateTransitionEvent, PaymentStateTransitionEvent)
- System-triggered events that inherit user context from entities
- Events where user context comes from entity custom fields

### Updating Entity Custom Fields

For entities that need quick user lookups (Order, Payment, Customer), update custom fields when actions occur:

```typescript
// Update order custom fields
await this.orderService.update(ctx, {
  id: orderId,
  customFields: {
    createdByUserId: ctx.activeUserId,
    lastModifiedByUserId: ctx.activeUserId
  }
});

// Then log audit event
await this.auditService.log(ctx, 'order.created', {
  entityType: 'Order',
  entityId: orderId.toString(),
  data: { orderCode: order.code, total: order.total }
});
```

## Event Types

Use string-based event types with namespaces:

- `order.created` - Order creation
- `order.payment.added` - Payment addition
- `order.state_changed` - Order state transition
- `customer.credit.approved` - Credit approval
- `customer.credit.limit_changed` - Credit limit change
- `user.created` - User creation
- `admin.created` - Admin creation
- `admin.invited` - Admin invitation
- `channel.settings.updated` - Channel settings change
- `channel.payment_method.created` - Payment method creation
- `channel.payment_method.updated` - Payment method update

Convention: `{entity}.{action}` or `{entity}.{category}.{action}`

## Querying Audit Log

```typescript
// Get all events for an entity
const events = await this.auditService.getAuditTrail(ctx, {
  entityType: 'Order',
  entityId: orderId.toString()
});

// Get events by user
const userEvents = await this.auditService.getAuditTrail(ctx, {
  userId: userId.toString()
});

// Get events by type
const orderEvents = await this.auditService.getAuditTrail(ctx, {
  eventType: 'order.created'
});

// Get events in time range
const recentEvents = await this.auditService.getAuditTrail(ctx, {
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31')
});
```

## Integration Guidelines

### 1. Inject AuditService

Add `AuditService` to your service constructor:

```typescript
constructor(
  // ... existing dependencies
  private readonly auditService: AuditService
) {}
```

### 2. Log After Actions

Log immediately after performing the action:

```typescript
async createSomething(ctx: RequestContext, input: Input): Promise<Entity> {
  const entity = await this.createEntity(ctx, input);
  
  // Update custom fields if needed
  await this.updateEntityCustomFields(ctx, entity.id, {
    createdByUserId: ctx.activeUserId
  });
  
  // Log audit event
  await this.auditService.log(ctx, 'entity.created', {
    entityType: 'Entity',
    entityId: entity.id.toString(),
    data: { /* relevant data */ }
  });
  
  return entity;
}
```

### 3. Handle Errors Gracefully

Wrap audit logging in try-catch or use `.catch()` to prevent failures:

```typescript
await this.auditService.log(ctx, 'action', options).catch(err => {
  this.logger.warn(`Failed to log audit: ${err.message}`);
});
```

### 4. Include Relevant Data

Store all relevant information in the `data` field:

```typescript
await this.auditService.log(ctx, 'order.created', {
  entityType: 'Order',
  entityId: order.id.toString(),
  data: {
    orderCode: order.code,
    total: order.total,
    customerId: order.customer?.id.toString(),
    paymentMethod: input.paymentMethodCode,
    itemCount: order.lines.length
  }
});
```

## Best Practices

1. **Log Immediately:** Log right after the action, not later
2. **Include Context:** Store all relevant data in the `data` field
3. **Use Descriptive Event Types:** Follow the `entity.action` convention
4. **Update Custom Fields:** For Order, Payment, Customer - update custom fields for quick lookups
5. **Non-Blocking:** Never let audit logging failures break operations
6. **Channel-Scoped:** Always ensure `channelId` is available in RequestContext

## Entity Custom Fields

Only these entities have user tracking custom fields:

- **Order:** `createdByUserId`, `lastModifiedByUserId`
- **Payment:** `addedByUserId`
- **Customer:** `creditApprovedByUserId`

These are updated by services when actions occur and used by system events to inherit user context.

## System Events

System events (from VendureEventAuditSubscriber) automatically:
1. Look up user context from entity custom fields
2. Fall back to `event.ctx.activeUserId` if available
3. Store as `null` with metadata if no user context found

This ensures system events inherit user attribution from the original user action.

## Future Enhancements

- GraphQL queries for audit log retrieval
- Admin UI for viewing audit trails
- Real-time audit log streaming
- Retention policies and archival
- TimescaleDB migration for better performance

