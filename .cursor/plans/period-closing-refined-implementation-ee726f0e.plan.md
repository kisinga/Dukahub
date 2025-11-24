<!-- ee726f0e-6eeb-454c-a77e-24c277d0a116 527c2676-ecfb-41a5-983e-f8704bc687d7 -->
# Period End Closing with Hierarchical Account Structure

## Overview

Implement a robust period end closing system that enforces reconciliation across multiple scopes (payment methods, inventory, bank) before closing accounting periods. The system integrates hierarchical account structure where all cash-based payment methods are sub-accounts under a `CASH` parent account. Reconciliation occurs at the sub-account level (payment method level), ensuring clear separation while maintaining simplicity.

### Key Integration: Hierarchical Account Structure with Dynamic Discovery

**Account Hierarchy:**

- **Parent Accounts**: Logical groupings (e.g., `CASH`, `ACCOUNTS_RECEIVABLE`, `INVENTORY`)
- **Sub-Accounts**: Payment method-specific accounts (e.g., `CASH.CASH_ON_HAND`, `CASH.MPESA`) - all cash-based payment methods are sub-accounts under `CASH` parent
- **Posting**: Transactions post to sub-accounts only; parent balances are computed via rollup
- **Reconciliation**: Performed at sub-account level (payment method level), ensuring clear separation
- **Credit Payments**: Use standalone `ACCOUNTS_RECEIVABLE` account (not a sub-account)

**Dynamic Discovery Framework:**

- **Dynamically discovers payment method sub-accounts** by querying active payment methods and their linked accounts
- **Adapts to changes** - when new payment methods are registered, they automatically become part of reconciliation requirements
- **Maintains extensibility** - uses Strategy pattern so future scope types can be added easily
- **Ensures completeness** - period closing validation uses discovery framework to ensure all registered payment methods are reconciled

**Key Benefits:**

- **Clear organization**: Payment methods logically grouped under parent accounts
- **Natural reconciliation boundaries**: Each sub-account = one reconciliation unit
- **Dual-level reporting**: Both parent (aggregate) and sub-account (detailed) balances available
- **Accounting standards alignment**: Follows standard hierarchical chart of accounts practices
- **Simplicity**: Minimal hierarchy implementation - only `parentAccountId` and `isParent` fields added

## Architecture

### Core Components

1. **PeriodEndClosingService** - Orchestrates period end closing and opening operations
2. **ReconciliationService** - Manages reconciliation records using scope-based model
3. **ReconciliationSessionService** - Manages reconciliation sessions for inter-account transfers
4. **PeriodLockService** - Manages period locks (extends existing PeriodLock entity)
5. **ReconciliationValidatorService** - Validates reconciliation completeness across all required scopes using dynamic discovery
6. **InventoryReconciliationService** - Handles inventory-specific reconciliation logic
7. **ReconciliationScopeDiscoveryService** - Orchestrates dynamic discovery of reconciliation scopes and items
8. **PaymentMethodDiscoveryStrategy** - Discovers payment method sub-accounts dynamically
9. **AccountBalanceService** - Handles balance queries with parent rollup support

### Key Design Decisions

- **Account Hierarchy**: Parent accounts group related sub-accounts. All cash-based payment methods are sub-accounts under `CASH` parent. Credit payments use standalone `ACCOUNTS_RECEIVABLE` account (no sub-accounts).
- **Posting Rules**: Transactions post to sub-accounts only. Parent balances computed via rollup (never posted to directly).
- **Period Granularity**: Flexible - periods can be closed at any time, but ideally enforced at end of day.
- **Reconciliation Scope**: Multi-scope model (method, inventory, bank, cash-session). Method scope reconciles at sub-account level (payment method level).
- **Dynamic Discovery**: Payment method sub-accounts discovered at runtime based on registered payment methods and their linked accounts
- **Workflow**: Draft → Verified → Period can be closed
- **Reconciliation Sessions**: Allow inter-account transfers during reconciliation with enforced completion
- **Composability**: Discovery framework uses Strategy pattern for extensibility
- **Inventory Integration**: Leverage existing inventory framework for valuation reconciliation
- **Simplicity**: Minimal hierarchy implementation - only `parentAccountId` and `isParent` fields added to Account entity. No complex hierarchies or deep nesting.

## Implementation Plan

### Phase 0: Account Hierarchy Foundation (Prerequisite)

#### 0.1 Enhance Account Entity for Hierarchy

**Location**: `backend/src/ledger/account.entity.ts`

**Changes**: Add minimal hierarchy support

```typescript
@Entity('ledger_account')
@Index(['channelId', 'code'], { unique: true })
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  channelId!: number;

  @Column({ type: 'varchar', length: 64 })
  code!: string; // e.g., 'CASH', 'CASH.CASH_ON_HAND', 'CASH.MPESA'

  @Column({ type: 'varchar', length: 256 })
  name!: string;

  @Column({ type: 'varchar', length: 16 })
  type!: AccountType;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // NEW: Hierarchy support
  @Column({ type: 'uuid', nullable: true })
  parentAccountId?: string; // FK to parent account (self-referencing)

  @Column({ type: 'boolean', default: false })
  isParent!: boolean; // True if account can have children (for validation)
}
```

**Migration**: `[timestamp]-AddAccountHierarchy.ts`

- Add `parentAccountId` column (nullable UUID, FK to ledger_account)
- Add `isParent` column (boolean, default false)
- Add index on `parentAccountId` for fast parent queries
- Add constraint: parent account must have `isParent = true`

**Validation Rules:**

- Cannot post to parent account (`isParent = true`)
- Parent account must have `isParent = true` before children can reference it
- Circular references prevented (parent cannot be its own child)

#### 0.2 Account Balance Service with Rollup Support

**Location**: `backend/src/services/financial/account-balance.service.ts` (new)

**Purpose**: Handle balance queries with parent account rollup support

**Key Methods**:

```typescript
/**
 * Get account balance - handles both parent and sub-accounts
 * If account is parent, returns rolled-up balance of all children
 * If account is sub-account, returns direct balance from journal lines
 */
async getAccountBalance(
  query: BalanceQuery
): Promise<AccountBalance>

/**
 * Get balance for parent account by rolling up all sub-accounts
 */
async getParentAccountBalance(
  ctx: RequestContext,
  channelId: number,
  parentAccountCode: string,
  startDate?: string,
  endDate?: string
): Promise<AccountBalance>

/**
 * Get all sub-accounts for a parent account
 */
async getSubAccounts(
  ctx: RequestContext,
  channelId: number,
  parentAccountId: string
): Promise<Account[]>

/**
 * Check if account is a parent account
 */
async isParentAccount(
  ctx: RequestContext,
  channelId: number,
  accountCode: string
): Promise<boolean>
```

**Implementation Details:**

- For sub-accounts: Query journal lines directly (same as current implementation)
- For parent accounts: Sum balances of all sub-accounts with matching `parentAccountId`
- Cache parent balances separately from sub-account balances
- Invalidate parent cache when any child account balance changes

**Integration**: Update `LedgerQueryService.getAccountBalance()` to delegate to `AccountBalanceService`

#### 0.3 Update Chart of Accounts for Hierarchy

**Location**: `backend/src/services/financial/chart-of-accounts.service.ts`

**Changes**:

- Create parent accounts first (`CASH`, `ACCOUNTS_RECEIVABLE`, etc.)
- Create sub-accounts under parent accounts
- Set `isParent = true` for parent accounts
- Set `parentAccountId` for sub-accounts

**Account Structure**:

```
CASH (parent, isParent: true)
├── CASH.CASH_ON_HAND (sub, parentAccountId: CASH.id)
├── CASH.MPESA (sub, parentAccountId: CASH.id)
└── CASH.BANK_MAIN (sub, parentAccountId: CASH.id)

ACCOUNTS_RECEIVABLE (standalone, no parent)
INVENTORY (standalone, no parent)
SALES (standalone, no parent)
```

**Account Code Naming:**

- Parent accounts: Use existing codes (e.g., `CASH`)
- Sub-accounts: Use dot notation (e.g., `CASH.CASH_ON_HAND`, `CASH.MPESA`)
- **Migration Strategy**: Keep existing account codes for sub-accounts initially, link via `parentAccountId`. Can migrate codes to dot notation later if desired.

**Provisioning Logic**:

1. Create `CASH` parent account (`isParent: true`)
2. Create sub-accounts with `parentAccountId` pointing to `CASH`
3. Ensure `ACCOUNTS_RECEIVABLE` is standalone (no parent)
4. All other accounts remain standalone (INVENTORY, SALES, etc.)

#### 0.4 Update Posting Policy for Sub-Accounts

**Location**: `backend/src/services/financial/posting-policy.ts`

**Changes**:

- Ensure all payment postings go to sub-accounts, not parent accounts
- Validation: Cannot post to parent account (`isParent = true`)
- Payment method mapping returns sub-account codes (e.g., `CASH.CASH_ON_HAND`, `CASH.MPESA`)

**Validation Rule**: Throw error if attempting to post to account with `isParent = true`

**Payment Method Mapping** (Updated):

- Cash → `CASH.CASH_ON_HAND` (sub-account)
- M-Pesa → `CASH.MPESA` (sub-account)
- Credit → `ACCOUNTS_RECEIVABLE` (standalone account, not under CASH)

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

#### 2.1 Discovery Framework Infrastructure

**Location**: `backend/src/services/financial/reconciliation/discovery/`

**Purpose**: Composable framework for dynamically discovering reconciliation scopes at runtime.

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
  scopeRefId: string; // e.g., sub-account code 'CASH.CASH_ON_HAND', location ID, session ID
  displayName?: string; // Optional human-readable name
  metadata?: Record<string, any>; // Optional additional context
}

export interface ReconciliationScopeDiscoveryStrategy {
  getScope(): ReconciliationScope;
  discover(ctx: RequestContext): Promise<DiscoveryResult>;
  isRequired(ctx: RequestContext): Promise<boolean>;
}
```

#### 2.2 Payment Method Discovery Strategy

**Location**: `backend/src/services/financial/reconciliation/discovery/payment-method-discovery-strategy.ts`

**Purpose**: Discovers payment method sub-accounts dynamically.

**Implementation**:

- Query all active payment methods for the channel using `PaymentMethodService`
- Extract handler codes from payment methods
- Map each handler code to ledger sub-account code using `mapPaymentMethodToAccount()`
- Filter to only sub-accounts (accounts with `parentAccountId` set) - ensures we only reconcile sub-accounts, not parent accounts
- Return `DiscoveryResult` with sub-account codes as `scopeRefId`

**Key Methods**:

```typescript
async discover(ctx: RequestContext): Promise<DiscoveryResult> {
  // Query active payment methods for channel
  // Map to ledger sub-accounts (accounts with parentAccountId set)
  // Return sub-accounts that need reconciliation
}

async isRequired(ctx: RequestContext): Promise<boolean> {
  return true; // Payment method reconciliation is always required
}
```

**Integration with Account Hierarchy:**

- Only discovers accounts that have `parentAccountId` set (sub-accounts)
- Parent accounts like `CASH` are not discovered for reconciliation
- Each payment method sub-account requires separate reconciliation

#### 2.3 Reconciliation Scope Discovery Service

**Location**: `backend/src/services/financial/reconciliation/discovery/reconciliation-scope-discovery.service.ts`

**Purpose**: Orchestrates all discovery strategies and provides unified interface.

**Key Methods**:

```typescript
async discoverScope(
  ctx: RequestContext,
  scope: ReconciliationScope
): Promise<DiscoveryResult | null>

async discoverAllRequiredScopes(
  ctx: RequestContext
): Promise<DiscoveryResult[]>

async getRequiredScopes(
  ctx: RequestContext
): Promise<ReconciliationScope[]>

registerStrategy(strategy: ReconciliationScopeDiscoveryStrategy): void
```

**Strategy Registration**: Service registers `PaymentMethodDiscoveryStrategy` by default.

#### 2.4 Reconciliation Configuration

**Location**: `backend/src/services/financial/reconciliation-config.ts`

**Purpose**: Minimal static configuration for scope requirements.

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

#### 3.2 ReconciliationService

**Location**: `backend/src/services/financial/reconciliation.service.ts`

**Responsibilities**:

- Create reconciliation records for all scopes (method, inventory, bank, cash-session)
- Verify reconciliations (draft → verified)
- Calculate account balances for reconciliation period (uses AccountBalanceService for hierarchy support)
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

**Integration with Hierarchy:**

- Uses `AccountBalanceService.getAccountBalance()` which handles both parent and sub-accounts
- For method scope: scopeRefId = sub-account code (e.g., 'CASH.CASH_ON_HAND', 'CASH.MPESA')
- Reconciliation happens at sub-account level, not parent level

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

**Business Logic**:

- Inter-account transfers are between sub-accounts only (not parent accounts)
- Transfers must be between payment method sub-accounts under the same parent (e.g., `CASH.CASH_ON_HAND` ↔ `CASH.MPESA`)

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
): Promise<ReconciliationScope[]>
```

**Integration with Discovery Framework**:

- Uses `ReconciliationScopeDiscoveryService` to discover what needs reconciliation
- For method scope: Discovers all payment method sub-accounts (accounts with `parentAccountId` set)
- Validates that each discovered sub-account has a verified reconciliation for the period

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

#### 7.1 PostingService (No Changes Required)

**Location**: `backend/src/ledger/posting.service.ts`

**No modifications needed** - existing period lock validation is correct and follows accounting best practices.

**Additional Validation**:

- Cannot post to parent account (`isParent = true`) - throw error

#### 7.2 Period Lock Service

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

#### 8.1 Period End Closing Workflow

1. Validate user has `CloseAccountingPeriodPermission`
2. Validate period end date is not in the future
3. Validate period end date is not before last closed period end date (if any)
4. Check all required scopes have verified reconciliations for the period (using dynamic discovery):

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - **method scope**: Discover payment method sub-accounts dynamically, verify all are reconciled (each sub-account requires separate reconciliation)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - **inventory scope**: Inventory valuation reconciled (if required)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - **bank scope**: Bank accounts reconciled (if required and configured)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - **cash-session scope**: Cashier sessions reconciled (if required and configured)

5. **Reconciliation Session Check**: 

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - No **active** reconciliation sessions for this period
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Any reconciliation sessions for this period must be **closed** (completed)

6. Validate no pending transactions in the period (optional warning, not blocking)
7. Create period lock with `lockEndDate = periodEndDate` (inclusive)
8. Create accounting period record (if using AccountingPeriod entity)
9. Log audit trail entry with period end date and reconciliation summary
10. Return success with reconciliation summary by scope

**Note**: **Once a period is closed, it is immutable** - all reconciliations and adjustments must be completed before closure.

#### 8.2 Opening New Period Workflow

1. Validate user has `CloseAccountingPeriodPermission`
2. Validate previous period is closed
3. Validate period start date is after last closed period end date
4. Create new accounting period record (if using AccountingPeriod entity)
5. Log audit trail entry
6. Return period information

#### 8.3 Reconciliation Workflow (Scope-Based)

1. Validate user has `ManageReconciliationPermission`
2. Create reconciliation in draft status with appropriate scope:

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - **method**: scopeRefId = sub-account code (e.g., 'CASH.CASH_ON_HAND', 'CASH.MPESA'), calculate expected balance from ledger using AccountBalanceService
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - **inventory**: scopeRefId = location ID or 'ALL', calculate expected balance from inventory_batch
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - **bank**: scopeRefId = bank account ID, calculate expected balance from ledger
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - **cash-session**: scopeRefId = session ID, calculate expected balance from session

3. User provides actual balance
4. Calculate variance (expected - actual)
5. User verifies reconciliation (draft → verified)
6. Verified reconciliations can be used for period end closing

#### 8.4 Inventory Reconciliation Workflow

1. Validate user has `ManageReconciliationPermission`
2. Calculate inventory valuation from inventory_batch table (using FIFO costing)
3. Get ledger INVENTORY account balance for the period (using AccountBalanceService)
4. Calculate variance (ledger balance - inventory valuation)
5. Create reconciliation record with scope='inventory'
6. User verifies reconciliation (draft → verified)
7. Verified inventory reconciliation can be used for period end closing

#### 8.5 Reconciliation Session Workflow

1. Validate user has `ManageReconciliationPermission`
2. **Validate period is still open** (not locked) - throw error if locked
3. Create reconciliation session (status: active) for a specific period end date
4. User creates reconciliations for sub-accounts/scopes (can be linked to session via sessionId)
5. If variances found, user can create inter-account transfers (adjusting entries):

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Entry date: Current period date (or last day of period being reconciled if still open)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Uses `PostingService.post()` - **no bypass**, period must be open for entry date
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Transfers must be between payment method sub-accounts (validated)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Memo includes reference to reconciliation session and original period

6. User verifies all required reconciliations
7. User closes session:

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Validate all required reconciliations are verified (via `ReconciliationValidatorService`)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Update status='closed', set `closedBy`, `closedAt`

8. **Session must be closed before period can be closed**

#### 8.6 Inter-Account Transfer Workflow

1. Validate user has `CreateInterAccountTransferPermission`
2. Validate reconciliation session is active
3. Validate session belongs to channel
4. **Period Validation**: Period being reconciled must still be open (not locked) - throw error if locked
5. Validate both accounts are payment method sub-accounts (sub-accounts under CASH parent)
6. **Determine Entry Date**:

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - If period being reconciled is still open: Use last day of that period (for backdating)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Otherwise: Use current date (adjustment entry in current period)

7. Create adjusting journal entry:

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Use `PostingService.post()` - **standard call, no bypass**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Source type: `'inter-account-transfer'`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Source ID: `${sessionId}:transfer-${Date.now()}`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Entry date: Determined in step 6
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Entry: Debit one sub-account, Credit another sub-account (balanced)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - **Memo**: `"Inter-account transfer for reconciliation session ${sessionId}, adjusting period ending ${periodEndDate}"`

8. **Period Lock Check**: If entry date falls in locked period, `PostingService` will throw error
9. Return journal entry

### Phase 9: Error Handling and Validation

#### 9.1 Validation Rules

- Cannot close period if any required scope is unreconciled
- Cannot close period if reconciliations are in draft status
- Cannot close period if active reconciliation sessions exist (all sessions must be closed)
- **Cannot create entries in locked periods** (absolute rule - no exceptions)
- **Cannot post to parent accounts** (`isParent = true`) - only sub-accounts receive transactions
- Cannot open period if previous period is not closed
- Period end date must be >= period start date
- Reconciliation sessions can only be created for open (unlocked) periods
- Inter-account transfers only allowed during active reconciliation sessions
- Inter-account transfers only between payment method sub-accounts (not parent accounts)
- Inter-account transfers must be dated to open periods (current period or last day of target period if still open)
- Inventory reconciliation must match ledger INVENTORY account within tolerance
- Parent account must have `isParent = true` before children can reference it
- Circular references in account hierarchy prevented

#### 9.2 Error Messages

- Clear, actionable error messages
- Identify which scopes need reconciliation
- Show reconciliation status for each scope
- Indicate which permissions are required
- Show inventory variance details when inventory reconciliation fails
- Indicate when attempting to post to parent account

#### 9.3 Security Validation

- All operations validate user permissions
- All operations validate channel access
- Audit trail for all period closing/opening operations
- Audit trail for reconciliation verification
- Audit trail for inter-account transfers

### Phase 10: Database Migrations

#### 10.1 Add Account Hierarchy

**Location**: `backend/src/migrations/[timestamp]-AddAccountHierarchy.ts`

**Actions**:

- Add `parentAccountId` column (nullable UUID, FK to ledger_account)
- Add `isParent` column (boolean, default false)
- Add index on `parentAccountId`
- Add check constraint: parent account must have `isParent = true`

#### 10.2 Migrate Existing Accounts to Hierarchy

**Location**: `backend/src/migrations/[timestamp]-MigrateAccountsToHierarchy.ts` (if needed for existing channels)

**Logic**:

1. Create `CASH` parent account for each channel (if not exists, `isParent: true`)
2. For each channel, migrate existing accounts:

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `CASH_ON_HAND` → sub-account under `CASH` parent
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `CLEARING_MPESA` → sub-account under `CASH` parent (rename to `CASH.MPESA` or keep code and link via `parentAccountId`)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `BANK_MAIN` → sub-account under `CASH` parent
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Keep other accounts standalone (`ACCOUNTS_RECEIVABLE`, `INVENTORY`, etc.)

**Migration Strategy Options**:

- **Option A**: Update account codes to dot notation (`CASH_ON_HAND` → `CASH.CASH_ON_HAND`)
- **Option B**: Keep existing codes, link via `parentAccountId` only (simpler migration, less breaking)

**Recommendation**: Option B for minimal disruption - keep existing codes, add hierarchy via `parentAccountId`

#### 10.3 Create ReconciliationSession Table

**Location**: `backend/src/migrations/[timestamp]-CreateReconciliationSession.ts`

#### 10.4 Enhance Reconciliation Table

**Location**: `backend/src/migrations/[timestamp]-EnhanceReconciliation.ts`

Add fields: `sessionId` (nullable FK to reconciliation_session), `expectedBalance` (nullable bigint), `actualBalance` (nullable bigint)

#### 10.5 Create AccountingPeriod Table (Optional)

**Location**: `backend/src/migrations/[timestamp]-CreateAccountingPeriod.ts`

### Phase 11: Extensibility for Future Features

#### 11.1 Reconciliation Rule Plugin System

**Location**: `backend/src/services/financial/reconciliation-rules