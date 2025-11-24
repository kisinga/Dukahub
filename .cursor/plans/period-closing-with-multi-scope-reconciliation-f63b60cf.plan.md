<!-- f63b60cf-9c7e-4a18-9e97-8816e03bc1dc f88641e3-1423-41e4-a3df-eab04c53c053 -->
# Period End Closing and Opening with Multi-Scope Reconciliation Enforcement

## Overview

Implement a robust period end closing system that enforces reconciliation across multiple scopes (payment methods, inventory, bank) before closing accounting periods. The system integrates with the existing scope-based reconciliation model and the FIFO inventory framework, maintaining composability and data integrity.

### Key Integration: Dynamic Discovery Framework

The system uses a **Dynamic Reconciliation Scope Discovery Framework** to automatically discover what needs to be reconciled based on the current channel configuration. Instead of hardcoding payment method accounts, the framework:

- **Dynamically discovers payment method accounts** by querying active payment methods and mapping them to ledger accounts
- **Adapts to changes** - when new payment methods are registered, they automatically become part of reconciliation requirements
- **Maintains extensibility** - uses Strategy pattern so future scope types (bank accounts, inventory locations) can be added easily
- **Ensures completeness** - period closing validation uses discovery framework to ensure all registered payment methods are reconciled

This approach ensures that period closing always validates against the actual payment methods in use, not a static list that can become outdated.

## Architecture

### Core Components

1. **PeriodEndClosingService** - Orchestrates period end closing and opening operations
2. **ReconciliationService** - Manages reconciliation records using scope-based model
3. **ReconciliationSessionService** - Manages reconciliation sessions for inter-account transfers
4. **PeriodLockService** - Manages period locks (extends existing PeriodLock entity)
5. **ReconciliationValidatorService** - Validates reconciliation completeness across all required scopes using dynamic discovery
6. **InventoryReconciliationService** - Handles inventory-specific reconciliation logic
7. **ReconciliationScopeDiscoveryService** - Orchestrates dynamic discovery of reconciliation scopes and items
8. **PaymentMethodDiscoveryStrategy** - Discovers payment method accounts dynamically

### Key Design Decisions

- **Period Granularity**: Flexible - periods can be closed at any time, but ideally enforced at end of day. No strict daily/monthly/quarterly requirement, allowing operational flexibility while maintaining data integrity.
- **Reconciliation Scope**: Multi-scope model (method, inventory, bank, cash-session)
- **Dynamic Discovery**: Payment method accounts discovered at runtime based on registered payment methods
- **Workflow**: Draft → Verified → Period can be closed
- **Reconciliation Sessions**: Allow inter-account transfers during reconciliation with enforced completion
- **Composability**: Discovery framework uses Strategy pattern for extensibility, plugin-based reconciliation rules
- **Inventory Integration**: Leverage existing inventory framework for valuation reconciliation

## Implementation Plan

### Phase 1: Permissions and Security

#### 1.1 Define Custom Permissions

**Location**: `backend/src/plugins/ledger/permissions.ts`

**Permissions**:

```typescript
export const ManageReconciliationPermission = new PermissionDefinition({
  name: 'ManageReconciliation',
  description: 'Allows creating and verifying reconciliations for all scopes.',
});

export const CloseAccountingPeriodPermission = new PermissionDefinition({
  name: 'CloseAccountingPeriod',
  description: 'Allows closing accounting periods after reconciliation verification.',
});

export const CreateInterAccountTransferPermission = new PermissionDefinition({
  name: 'CreateInterAccountTransfer',
  description: 'Allows creating inter-account transfers during reconciliation sessions.',
});
```

#### 1.2 Register Permissions

**Location**: `backend/src/plugins/ledger/ledger.plugin.ts`

Register all custom permissions in the plugin configuration.

### Phase 2: Dynamic Discovery Framework (Foundation)

#### 2.0 Discovery Framework Implementation

**Order**: Implement discovery framework before other services so they can use it.

1. Create base strategy interface
2. Implement `PaymentMethodDiscoveryStrategy`
3. Implement `ReconciliationScopeDiscoveryService`
4. Register strategy in discovery service

### Phase 3: Core Services

#### 3.1 PeriodEndClosingService

**Location**: `backend/src/services/financial/period-end-closing.service.ts`

**Responsibilities**:

- Close accounting period: Validate all required reconciliations are verified, create period lock
- Open new accounting period: Validate previous period is closed, create new period
- Get current period status
- List closed periods

**Key Methods**:

```typescript
@RequiresPermissions(CloseAccountingPeriodPermission.Permission)
async closeAccountingPeriod(ctx: RequestContext, channelId: number, periodEndDate: string): Promise<PeriodEndCloseResult>

@RequiresPermissions(CloseAccountingPeriodPermission.Permission)
async openAccountingPeriod(ctx: RequestContext, channelId: number, periodStartDate: string): Promise<AccountingPeriod>

async getCurrentPeriodStatus(ctx: RequestContext, channelId: number): Promise<PeriodStatus>

async canClosePeriod(ctx: RequestContext, channelId: number, periodEndDate: string): Promise<ValidationResult>
```

**Security**:

- Validate user has `CloseAccountingPeriodPermission`
- Validate user belongs to the channel
- Log all period closing/opening actions for audit trail

#### 3.2 ReconciliationService

**Location**: `backend/src/services/financial/reconciliation.service.ts`

**Responsibilities**:

- Create reconciliation records for all scopes (method, inventory, bank, cash-session)
- Verify reconciliations (draft → verified)
- Calculate account balances for reconciliation period
- Query reconciliations by scope and date range

**Key Methods**:

```typescript
@RequiresPermissions(ManageReconciliationPermission.Permission)
async createReconciliation(ctx: RequestContext, input: CreateReconciliationInput): Promise<Reconciliation>

@RequiresPermissions(ManageReconciliationPermission.Permission)
async verifyReconciliation(ctx: RequestContext, reconciliationId: string): Promise<Reconciliation>

async getReconciliationStatus(ctx: RequestContext, channelId: number, periodEndDate: string): Promise<ReconciliationStatus>

async getReconciliationsByScope(ctx: RequestContext, channelId: number, scope: ReconciliationScope, rangeStart: string, rangeEnd: string): Promise<Reconciliation[]>

async calculateAccountBalanceForPeriod(ctx: RequestContext, accountCode: string, channelId: number, startDate: string, endDate: string): Promise<AccountBalance>
```

**Integration with Existing Entity**:

- Works with existing `Reconciliation` entity structure (scope, scopeRefId, rangeStart, rangeEnd)
- For method scope: scopeRefId = account code (e.g., 'CASH_ON_HAND', 'CLEARING_MPESA')
- For inventory scope: scopeRefId = location identifier or 'ALL' for channel-wide
- For bank scope: scopeRefId = bank account identifier
- For cash-session scope: scopeRefId = cashier session ID

#### 3.3 InventoryReconciliationService

**Location**: `backend/src/services/financial/inventory-reconciliation.service.ts`

**Responsibilities**:

- Calculate inventory valuation from inventory_batch table
- Compare inventory valuation with ledger INVENTORY account balance
- Generate inventory reconciliation records
- Handle inventory-specific variance calculations

**Key Methods**:

```typescript
async calculateInventoryValuation(ctx: RequestContext, channelId: number, asOfDate: string, stockLocationId?: number): Promise<InventoryValuation>

async reconcileInventoryVsLedger(ctx: RequestContext, channelId: number, periodEndDate: string, stockLocationId?: number): Promise<InventoryReconciliationResult>

async createInventoryReconciliation(ctx: RequestContext, input: CreateInventoryReconciliationInput): Promise<Reconciliation>
```

**Integration with Inventory Framework**:

- Uses InventoryStore abstraction to query batches
- Calculates valuation using FIFO costing from inventory_batch.unitCost
- Compares with ledger INVENTORY account balance from FinancialService
- Supports per-location or channel-wide reconciliation

#### 3.4 ReconciliationSessionService

**Location**: `backend/src/services/financial/reconciliation-session.service.ts`

**Responsibilities**:

- Create reconciliation sessions (allows inter-account transfers)
- Create inter-account transfer entries (adjusting journal entries)
- Close reconciliation session (enforces reconciliation completion)
- Track transfers within a session

**Key Methods**:

```typescript
@RequiresPermissions(ManageReconciliationPermission.Permission)
async createReconciliationSession(ctx: RequestContext, input: CreateReconciliationSessionInput): Promise<ReconciliationSession>

@RequiresPermissions(CreateInterAccountTransferPermission.Permission)
async createInterAccountTransfer(ctx: RequestContext, sessionId: string, input: InterAccountTransferInput): Promise<JournalEntry>

@RequiresPermissions(ManageReconciliationPermission.Permission)
async closeReconciliationSession(ctx: RequestContext, sessionId: string): Promise<ReconciliationSession>

async getSessionTransfers(ctx: RequestContext, sessionId: string): Promise<JournalEntry[]>
```

**Business Logic** (Accounting Best Practice):

- Reconciliation session must be created for a period that is still open (not locked)
- Validate period is not locked before creating session
- Reconciliation session must be active to create transfers
- Inter-account transfers are adjusting entries between payment method accounts
- **Entry date for transfers**: Current period date (or optionally last day of period being reconciled if still open)
- Transfers use `PostingService.post()` - **no bypass** - period must be open for entry date
- Session must have all required reconciliations verified before closing
- Closing session validates all accounts are reconciled
- Session must be closed before period can be closed

#### 3.5 ReconciliationValidatorService

**Location**: `backend/src/services/financial/reconciliation-validator.service.ts`

**Responsibilities**:

- Validate all required scopes are reconciled for a period
- Check reconciliation status (must be verified)
- Identify missing reconciliations by scope
- Validate reconciliation session completeness
- Use dynamic discovery framework to determine what needs reconciliation

**Key Methods**:

```typescript
async validatePeriodReconciliation(
  ctx: RequestContext,
  channelId: number,
  periodEndDate: string
): Promise<ValidationResult>

async validateReconciliationSession(
  ctx: RequestContext,
  sessionId: string
): Promise<ValidationResult>

async getRequiredScopesForReconciliation(
  ctx: RequestContext
): Promise<ReconciliationScope[]> // Uses discovery service to get required scopes
```

**Integration with Discovery Framework**:

- Uses `ReconciliationScopeDiscoveryService` to discover what needs reconciliation
- For each required scope, uses discovery service to get list of items (e.g., account codes)
- Validates that each discovered item has a verified reconciliation for the period
- Returns detailed validation results indicating missing reconciliations

**Scope Requirements** (Discovered Dynamically):

- **method**: All payment method accounts discovered via `PaymentMethodDiscoveryStrategy`
- **inventory**: Channel-wide or per-location inventory valuation (static for now, extensible)
- **bank**: Bank accounts (if configured - future strategy)
- **cash-session**: Cashier sessions (if applicable - future strategy)

#### 2.1 Discovery Framework Infrastructure

**Location**: `backend/src/services/financial/reconciliation/discovery/`

**Purpose**: Composable framework for dynamically discovering reconciliation scopes at runtime. Replaces static account lists with runtime discovery that adapts to registered payment methods and other dynamic configurations.

**Design Principles**:

- **Composable**: Strategies can be registered and combined
- **Predictable**: Consistent interface across all scope types
- **Extensible**: Easy to add new scope discovery strategies (inventory locations, bank accounts, etc.)
- **No Caching**: Always query fresh data for accuracy
- **Type-Safe**: Full TypeScript type safety throughout

**Base Strategy Interface**:

**Location**: `backend/src/services/financial/reconciliation/discovery/reconciliation-scope-discovery-strategy.interface.ts`

```typescript
import { RequestContext } from '@vendure/core';
import { ReconciliationScope } from '../../../domain/recon/reconciliation.entity';

export interface DiscoveryResult {
  scope: ReconciliationScope;
  items: DiscoveryItem[];
}

export interface DiscoveryItem {
  scopeRefId: string; // e.g., account code 'CASH_ON_HAND', location ID, session ID
  displayName?: string; // Optional human-readable name
  metadata?: Record<string, any>; // Optional additional context
}

export interface ReconciliationScopeDiscoveryStrategy {
  /**
   * Returns the scope type this strategy handles
   */
  getScope(): ReconciliationScope;

  /**
   * Discover all items that require reconciliation for this scope in the given channel
   * @param ctx Request context (includes channelId)
   * @returns Discovery result with all items that need reconciliation
   */
  discover(ctx: RequestContext): Promise<DiscoveryResult>;

  /**
   * Check if this scope is required for the channel
   * @param ctx Request context
   * @returns true if scope requires reconciliation, false if optional
   */
  isRequired(ctx: RequestContext): Promise<boolean>;
}
```

#### 2.2 Payment Method Discovery Strategy

**Location**: `backend/src/services/financial/reconciliation/discovery/payment-method-discovery-strategy.ts`

**Purpose**: Discovers payment method accounts dynamically by querying active payment methods and mapping them to ledger accounts.

**Implementation**:

- Query all active payment methods for the channel using `PaymentMethodService`
- Extract handler codes from payment methods
- Map each handler code to ledger account using `mapPaymentMethodToAccount()`
- Collect unique account codes
- Return `DiscoveryResult` with account codes as `scopeRefId`

**Key Methods**:

```typescript
async discover(ctx: RequestContext): Promise<DiscoveryResult> {
  // Query active payment methods for channel
  // Map to ledger accounts
  // Return unique accounts that need reconciliation
}

async isRequired(ctx: RequestContext): Promise<boolean> {
  return true; // Payment method reconciliation is always required
}
```

#### 2.3 Reconciliation Scope Discovery Service

**Location**: `backend/src/services/financial/reconciliation/discovery/reconciliation-scope-discovery.service.ts`

**Purpose**: Orchestrates all discovery strategies and provides unified interface for reconciliation validation.

**Key Methods**:

```typescript
/**
 * Discover all items that require reconciliation for a specific scope
 */
async discoverScope(
  ctx: RequestContext,
  scope: ReconciliationScope
): Promise<DiscoveryResult | null>

/**
 * Discover all required scopes and their items for reconciliation
 */
async discoverAllRequiredScopes(
  ctx: RequestContext
): Promise<DiscoveryResult[]>

/**
 * Get list of required scope types for the channel
 */
async getRequiredScopes(
  ctx: RequestContext
): Promise<ReconciliationScope[]>

/**
 * Register a discovery strategy (for extensibility)
 */
registerStrategy(strategy: ReconciliationScopeDiscoveryStrategy): void
```

**Strategy Registration**: Service registers `PaymentMethodDiscoveryStrategy` by default. Other strategies (inventory, bank, cash-session) can be registered later.

#### 2.4 Reconciliation Configuration

**Location**: `backend/src/services/financial/reconciliation-config.ts`

**Purpose**: Minimal static configuration for scope requirements and optional settings. Account lists are now discovered dynamically.

```typescript
export const RECONCILIATION_CONFIG = {
  REQUIRED_SCOPES: {
    method: {
      required: true, // Payment methods always required
    },
    inventory: {
      required: true,
      valuationMode: 'channel-wide', // or 'per-location'
    },
    bank: {
      required: false, // Optional, based on channel configuration
    },
    'cash-session': {
      required: false, // Optional, based on channel configuration
    },
  },
  VARIANCE_TOLERANCE_CENTS: 1, // Default tolerance for auto-verification
};
```

### Phase 4: Domain Models and Configuration

#### 4.1 Period Status Types

**Location**: `backend/src/services/financial/period-management.types.ts`

**Types**:

- `PeriodStatus` - Current period state (open, closing, closed)
- `PeriodEndCloseResult` - Result of period end closing operation
- `ValidationResult` - Reconciliation validation result with scope details
- `ReconciliationStatus` - Status of reconciliations for a period by scope
- `ReconciliationSessionStatus` - Status of reconciliation session (active, closed)
- `InventoryValuation` - Inventory valuation snapshot
- `InventoryReconciliationResult` - Result of inventory reconciliation

### Phase 5: Database Entities

#### 5.1 ReconciliationSession Entity

**Location**: `backend/src/domain/recon/reconciliation-session.entity.ts` (new)

**Purpose**: Track reconciliation sessions for inter-account transfers

**Fields**:

- `id: uuid` - Primary key
- `channelId: number` - Channel this session belongs to
- `status: 'active' | 'closed'` - Session status
- `startedBy: number` - User who started the session
- `startedAt: timestamp` - When session was started
- `closedBy: number?` - User who closed the session
- `closedAt: timestamp?` - When session was closed
- `notes: string?` - Optional notes
- `periodEndDate: date` - Period end date this session is for

#### 5.2 Enhance Reconciliation Entity

**Location**: `backend/src/domain/recon/reconciliation.entity.ts`

**Additions**:

- `sessionId: uuid?` - Optional link to reconciliation session (nullable foreign key)
- `expectedBalance: string?` - Expected balance from ledger/inventory (in smallest currency unit, nullable)
- `actualBalance: string?` - Actual balance from reconciliation (in smallest currency unit, nullable)

**Note**: `varianceAmount` already exists and should be calculated as (expectedBalance - actualBalance)

#### 5.3 AccountingPeriod Entity (Optional)

**Location**: `backend/src/domain/period/accounting-period.entity.ts` (new)

**Purpose**: Track accounting period metadata

**Fields**:

- `id: uuid` - Primary key
- `channelId: number` - Channel this period belongs to
- `startDate: date` - Period start date (inclusive)
- `endDate: date` - Period end date (inclusive)
- `status: 'open' | 'closed'` - Period status
- `closedBy: number?` - User who closed the period
- `closedAt: timestamp?` - When period was closed

### Phase 6: GraphQL API

#### 6.1 Schema Extensions

**Location**: `backend/src/plugins/ledger/period-management.schema.ts`

**Queries**:

```graphql
currentPeriodStatus(channelId: Int!): PeriodStatus!
periodReconciliationStatus(channelId: Int!, periodEndDate: Date!): ReconciliationStatus!
closedPeriods(channelId: Int!, limit: Int, offset: Int): [AccountingPeriod!]!
reconciliationSession(sessionId: ID!): ReconciliationSession
activeReconciliationSessions(channelId: Int!): [ReconciliationSession!]!
inventoryValuation(channelId: Int!, asOfDate: Date!, stockLocationId: Int): InventoryValuation!
```

**Mutations**:

```graphql
createReconciliation(input: CreateReconciliationInput!): Reconciliation!
verifyReconciliation(reconciliationId: ID!): Reconciliation!
closeAccountingPeriod(channelId: Int!, periodEndDate: Date!): PeriodEndCloseResult!
openAccountingPeriod(channelId: Int!, periodStartDate: Date!): AccountingPeriod!
createReconciliationSession(input: CreateReconciliationSessionInput!): ReconciliationSession!
createInterAccountTransfer(sessionId: ID!, input: InterAccountTransferInput!): JournalEntry!
closeReconciliationSession(sessionId: ID!): ReconciliationSession!
createInventoryReconciliation(input: CreateInventoryReconciliationInput!): Reconciliation!
```

#### 6.2 Resolvers

**Location**: `backend/src/plugins/ledger/period-management.resolver.ts`

**Security**:

- All mutations require appropriate permissions
- All queries validate channel access
- Use `@Allow()` decorator with permission checks

### Phase 7: Enhanced Period Lock Logic

#### 6.1 PostingService (No Changes Required)

**Location**: `backend/src/ledger/posting.service.ts`

**No modifications needed** - existing period lock validation is correct and follows accounting best practices.

**Period Lock Enforcement**:

- Once a period is locked, **no entries can be made** to that period
- Period lock check in `PostingService.post()` remains absolute - no bypass mechanism
- Inter-account transfers during reconciliation must be dated in the current/open period
- This ensures data integrity and follows standard accounting practices

**Note**: Reconciliation sessions validate period is open when created, and transfers use current period dates, so no bypass is needed.

#### 6.2 Period Lock Service

**Location**: `backend/src/services/financial/period-lock.service.ts`

**Responsibilities**:

- Create period locks (called by PeriodEndClosingService)
- Query period lock status
- Validate if date range is locked
- Check if reconciliation session allows entry creation

**Key Methods**:

```typescript
async createPeriodLock(ctx: RequestContext, channelId: number, lockEndDate: string, lockedByUserId: number): Promise<PeriodLock>

async getPeriodLock(ctx: RequestContext, channelId: number): Promise<PeriodLock | null>

async isDateLocked(ctx: RequestContext, channelId: number, date: string): Promise<boolean>

async validatePeriodIsOpen(ctx: RequestContext, channelId: number, periodEndDate: string): Promise<void>
```

### Phase 8: Business Logic

#### 7.1 Period End Closing Workflow

1. Validate user has `CloseAccountingPeriodPermission`
2. Validate period end date is not in the future
3. Validate period end date is not before last closed period end date (if any)
4. Check all required scopes have verified reconciliations for the period (using dynamic discovery):

            - **method scope**: Discover payment method accounts dynamically, verify all are reconciled
            - **inventory scope**: Inventory valuation reconciled (if required)
            - **bank scope**: Bank accounts reconciled (if required and configured)
            - **cash-session scope**: Cashier sessions reconciled (if required and configured)

5. **Reconciliation Session Check**: 

                                                - No **active** reconciliation sessions for this period
                                                - Any reconciliation sessions for this period must be **closed** (completed)
                                                - This ensures all adjustments are made before period closure

6. Validate no pending transactions in the period (optional warning, not blocking)
7. Create period lock with `lockEndDate = periodEndDate` (inclusive - all entries with entryDate <= lockEndDate are locked)

                                                - **Once locked, no entries can be made to this period** (enforced by `PostingService`)

8. Create accounting period record (if using AccountingPeriod entity)
9. Log audit trail entry with period end date and reconciliation summary
10. Return success with reconciliation summary by scope

**Note**: Periods can be closed at any time (not just end of day), but ideally should be closed at end of day for operational consistency. The system enforces data integrity regardless of when the period is closed. **Once a period is closed, it is immutable** - all reconciliations and adjustments must be completed before closure.

#### 7.2 Opening New Period Workflow

1. Validate user has `CloseAccountingPeriodPermission`
2. Validate previous period is closed
3. Validate period start date is after last closed period end date
4. Create new accounting period record (if using AccountingPeriod entity)
5. Log audit trail entry
6. Return period information

#### 7.3 Reconciliation Workflow (Scope-Based)

1. Validate user has `ManageReconciliationPermission`
2. Create reconciliation in draft status with appropriate scope:

                                                - **method**: scopeRefId = account code, calculate expected balance from ledger
                                                - **inventory**: scopeRefId = location ID or 'ALL', calculate expected balance from inventory_batch
                                                - **bank**: scopeRefId = bank account ID, calculate expected balance from ledger
                                                - **cash-session**: scopeRefId = session ID, calculate expected balance from session

3. User provides actual balance
4. Calculate variance (expected - actual)
5. User verifies reconciliation (draft → verified)
6. Verified reconciliations can be used for period end closing

#### 7.4 Inventory Reconciliation Workflow

1. Validate user has `ManageReconciliationPermission`
2. Calculate inventory valuation from inventory_batch table (using FIFO costing)
3. Get ledger INVENTORY account balance for the period
4. Calculate variance (ledger balance - inventory valuation)
5. Create reconciliation record with scope='inventory'
6. User verifies reconciliation (draft → verified)
7. Verified inventory reconciliation can be used for period end closing

#### 7.5 Reconciliation Session Workflow

1. Validate user has `ManageReconciliationPermission`
2. **Validate period is still open** (not locked) - throw error if locked
3. Create reconciliation session (status: active) for a specific period end date
4. User creates reconciliations for accounts/scopes (can be linked to session via sessionId)
5. If variances found, user can create inter-account transfers (adjusting entries):

                                                - Entry date: Current period date (or last day of period being reconciled if still open)
                                                - Uses `PostingService.post()` - **no bypass**, period must be open for entry date
                                                - Transfers must be between payment method accounts (validated)
                                                - Memo includes reference to reconciliation session and original period

6. User verifies all required reconciliations
7. User closes session:

                                                - Validate all required reconciliations are verified (via `ReconciliationValidatorService`)
                                                - Update status='closed', set `closedBy`, `closedAt`

8. **Session must be closed before period can be closed**

#### 7.6 Inter-Account Transfer Workflow

1. Validate user has `CreateInterAccountTransferPermission`
2. Validate reconciliation session is active
3. Validate session belongs to channel
4. **Period Validation**: Period being reconciled must still be open (not locked) - throw error if locked
5. Validate both accounts are payment method accounts (checked via `ACCOUNT_CODES` constants)
6. **Determine Entry Date**:

                                                - If period being reconciled is still open: Use last day of that period (for backdating)
                                                - Otherwise: Use current date (adjustment entry in current period)

7. Create adjusting journal entry:

                                                - Use `PostingService.post()` - **standard call, no bypass**
                                                - Source type: `'inter-account-transfer'`
                                                - Source ID: `${sessionId}:transfer-${Date.now()}`
                                                - Entry date: Determined in step 6
                                                - Entry: Debit one account, Credit another (balanced)
                                                - **Memo**: `"Inter-account transfer for reconciliation session ${sessionId}, adjusting period ending ${periodEndDate}"`

8. **Period Lock Check**: If entry date falls in locked period, `PostingService` will throw error (accounting best practice - period lock is absolute)
9. Return journal entry

### Phase 9: Error Handling and Validation

#### 8.1 Validation Rules

- Cannot close period if any required scope is unreconciled
- Cannot close period if reconciliations are in draft status
- Cannot close period if active reconciliation sessions exist (all sessions must be closed)
- **Cannot create entries in locked periods** (absolute rule - no exceptions)
- Cannot open period if previous period is not closed
- Period end date must be >= period start date
- Reconciliation sessions can only be created for open (unlocked) periods
- Inter-account transfers only allowed during active reconciliation sessions
- Inter-account transfers only between payment method accounts
- Inter-account transfers must be dated to open periods (current period or last day of target period if still open)
- Inventory reconciliation must match ledger INVENTORY account within tolerance

#### 8.2 Error Messages

- Clear, actionable error messages
- Identify which scopes need reconciliation
- Show reconciliation status for each scope
- Indicate which permissions are required
- Show inventory variance details when inventory reconciliation fails

#### 8.3 Security Validation

- All operations validate user permissions
- All operations validate channel access
- Audit trail for all period closing/opening operations
- Audit trail for reconciliation verification
- Audit trail for inter-account transfers

### Phase 10: Database Migrations

#### 10.1 Create ReconciliationSession Table

**Location**: `backend/src/migrations/[timestamp]-CreateReconciliationSession.ts`

#### 10.2 Enhance Reconciliation Table

**Location**: `backend/src/migrations/[timestamp]-EnhanceReconciliation.ts`

Add fields: `sessionId` (nullable FK to reconciliation_session), `expectedBalance` (nullable bigint), `actualBalance` (nullable bigint)

#### 10.3 Create AccountingPeriod Table (Optional)

**Location**: `backend/src/migrations/[timestamp]-CreateAccountingPeriod.ts`

### Phase 11: Extensibility for Future Features

#### 11.1 Reconciliation Rule Plugin System

**Location**: `backend/src/services/financial/reconciliation-rules/`

**Purpose**: Allow plugins to define custom reconciliation requirements per scope

**Interface**:

```typescript
interface ReconciliationRule {
  getRequiredScopes(channelId: number): Promise<ReconciliationScope[]>;
  validateReconciliation(
    ctx: RequestContext,
    reconciliation: Reconciliation
  ): Promise<ValidationResult>;
  calculateExpectedBalance(
    ctx: RequestContext,
    scope: ReconciliationScope,
    scopeRefId: string,
    rangeStart: string,
    rangeEnd: string
  ): Promise<string>;
}
```

#### 11.2 Scope-Specific Reconciliation Strategies

**Location**: `backend/src/services/financial/reconciliation-strategies/`

**Purpose**: Different reconciliation strategies for different scopes

**Examples**:

- **method scope**: Balance reconciliation from ledger
- **inventory scope**: Valuation reconciliation from inventory_batch vs ledger
- **bank scope**: Statement reconciliation (future)
- **cash-session scope**: Session balance reconciliation

## Files to Create

1. `backend/src/plugins/ledger/permissions.ts` - Custom permissions
2. `backend/src/services/financial/period-end-closing.service.ts`
3. `backend/src/services/financial/reconciliation.service.ts`
4. `backend/src/services/financial/inventory-reconciliation.service.ts`
5. `backend/src/services/financial/reconciliation-session.service.ts`
6. `backend/src/services/financial/reconciliation-validator.service.ts`
7. `backend/src/services/financial/period-lock.service.ts`
8. `backend/src/services/financial/reconciliation-config.ts`
9. `backend/src/services/financial/period-management.types.ts`
10. `backend/src/services/financial/reconciliation/discovery/reconciliation-scope-discovery-strategy.interface.ts`
11. `backend/src/services/financial/reconciliation/discovery/payment-method-discovery-strategy.ts`
12. `backend/src/services/financial/reconciliation/discovery/reconciliation-scope-discovery.service.ts`
13. `backend/src/domain/recon/reconciliation-session.entity.ts`
14. `backend/src/domain/period/accounting-period.entity.ts` (optional)
15. `backend/src/plugins/ledger/period-management.schema.ts`
16. `backend/src/plugins/ledger/period-management.resolver.ts`
17. `backend/src/migrations/[timestamp]-CreateReconciliationSession.ts`
18. `backend/src/migrations/[timestamp]-EnhanceReconciliation.ts`
19. `backend/src/migrations/[timestamp]-CreateAccountingPeriod.ts` (optional)

## Files to Modify

1. `backend/src/ledger/posting.service.ts` - **No changes required** - existing period lock validation is correct
2. `backend/src/domain/recon/reconciliation.entity.ts` - Add sessionId, expectedBalance, and actualBalance fields
3. `backend/src/plugins/ledger/ledger.plugin.ts` - Register new resolvers, entities, and permissions

## Testing Strategy

1. Unit tests for each service
2. Integration tests for period end closing/opening workflows
3. Integration tests for reconciliation session workflows
4. Integration tests for inventory reconciliation
5. Validation tests for reconciliation requirements by scope
6. Security tests for permission enforcement
7. Edge case tests (concurrent operations, invalid dates, etc.)
8. Inventory valuation accuracy tests (FIFO costing vs ledger)

## Future Enhancements

1. Bank statement reconciliation
2. Automated reconciliation suggestions
3. Reconciliation variance analysis
4. Multi-period reconciliation reports
5. Reconciliation approval workflows
6. Automated inter-account transfer suggestions based on variance
7. Inventory physical count reconciliation
8. Per-location inventory reconciliation workflows

### To-dos

- [ ] Create custom permissions file (ManageReconciliationPermission, CloseAccountingPeriodPermission, CreateInterAccountTransferPermission) and register in ledger plugin
- [ ] Create dynamic reconciliation scope discovery framework infrastructure (base interface, discovery service)
- [ ] Implement PaymentMethodDiscoveryStrategy to dynamically discover payment method accounts
- [ ] Create reconciliation configuration file with scope requirements (account lists now discovered dynamically)
- [ ] Create TypeScript types for period management (PeriodStatus, PeriodEndCloseResult, ValidationResult, ReconciliationSessionStatus, InventoryValuation, etc.)
- [ ] Create ReconciliationSession entity to track reconciliation sessions for inter-account transfers
- [ ] Enhance Reconciliation entity with sessionId (nullable FK), expectedBalance, and actualBalance fields, and create migration
- [ ] Create AccountingPeriod entity (optional) to track period metadata and create migration
- [ ] Implement ReconciliationService with methods for creating, verifying, and querying reconciliations by scope with permission checks
- [ ] Implement InventoryReconciliationService for inventory valuation calculation and reconciliation using inventory_batch table and ledger INVENTORY account
- [ ] Implement ReconciliationValidatorService to validate reconciliation completeness by scope before period closing and session closing (integrates with discovery framework)
- [ ] Implement ReconciliationSessionService for managing reconciliation sessions and inter-account transfers with permission checks
- [ ] Implement PeriodLockService for managing period locks (create, query, validate) with reconciliation session awareness
- [ ] Implement PeriodEndClosingService orchestrating period end closing/opening operations with multi-scope reconciliation validation and permission checks
- [ ] Verify PostingService period lock validation works correctly with new period management system (no changes needed - period lock remains absolute)
- [ ] Create GraphQL schema for period management, reconciliation, and reconciliation session queries and mutations
- [ ] Implement GraphQL resolvers for period management operations with permission decorators
- [ ] Register new resolvers, services, entities, and permissions in ledger plugin