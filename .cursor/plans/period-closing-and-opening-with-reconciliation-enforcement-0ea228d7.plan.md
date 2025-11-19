<!-- 0ea228d7-f994-45b6-a209-3710c883ec34 16ad05d9-88c7-43f8-9b12-b1c85863179b -->
# Period End Closing and Opening with Reconciliation Enforcement

## Overview

Implement a robust period end closing system that enforces reconciliation of payment method accounts before closing accounting periods. Additionally, support reconciliation sessions that allow inter-account transfers (adjusting journal entries) while enforcing reconciliation completion. This ensures ledger accuracy and prevents deviations from operational reality.

## Architecture

### Core Components

1. **PeriodEndClosingService** - Orchestrates period end closing and opening operations
2. **ReconciliationService** - Manages reconciliation records and validation
3. **ReconciliationSessionService** - Manages reconciliation sessions for inter-account transfers
4. **PeriodLockService** - Manages period locks (extends existing PeriodLock entity)
5. **ReconciliationValidator** - Validates reconciliation completeness

### Key Design Decisions

- **Period Granularity**: Daily periods (extensible to monthly/quarterly)
- **Reconciliation Scope**: Payment method accounts (CASH_ON_HAND, CLEARING_MPESA, CLEARING_CREDIT, CLEARING_GENERIC)
- **Workflow**: Draft → Verified → Period can be closed
- **Reconciliation Sessions**: Allow inter-account transfers during reconciliation with enforced completion
- **Extensibility**: Plugin-based account reconciliation rules for future expansion

## Implementation Plan

### Phase 1: Permissions and Security

#### 1.1 Define Custom Permissions

**Location**: `backend/src/plugins/ledger/permissions.ts`

**Permissions**:

```typescript
export const ManageReconciliationPermission = new PermissionDefinition({
    name: 'ManageReconciliation',
    description: 'Allows creating and verifying reconciliations for accounts.',
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

### Phase 2: Core Services

#### 2.1 PeriodEndClosingService

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

#### 2.2 ReconciliationService

**Location**: `backend/src/services/financial/reconciliation.service.ts`

**Responsibilities**:

- Create reconciliation records for payment method accounts
- Verify reconciliations (draft → verified)
- Calculate account balances for reconciliation period
- Validate reconciliation completeness

**Key Methods**:

```typescript
@RequiresPermissions(ManageReconciliationPermission.Permission)
async createReconciliation(ctx: RequestContext, input: CreateReconciliationInput): Promise<Reconciliation>

@RequiresPermissions(ManageReconciliationPermission.Permission)
async verifyReconciliation(ctx: RequestContext, reconciliationId: string): Promise<Reconciliation>

async getReconciliationStatus(ctx: RequestContext, channelId: number, periodEndDate: string): Promise<ReconciliationStatus>

async calculateAccountBalanceForPeriod(ctx: RequestContext, accountCode: string, channelId: number, startDate: string, endDate: string): Promise<AccountBalance>
```

**Security**:

- Validate user has `ManageReconciliationPermission`
- Validate reconciliation belongs to user's channel
- Prevent modification of verified reconciliations

#### 2.3 ReconciliationSessionService

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

- Reconciliation session must be active to create transfers
- Transfers are adjusting entries between payment method accounts
- Session must have all required reconciliations verified before closing
- Closing session validates all accounts are reconciled

#### 2.4 ReconciliationValidator

**Location**: `backend/src/services/financial/reconciliation-validator.service.ts`

**Responsibilities**:

- Validate all required accounts are reconciled for a period
- Check reconciliation status (must be verified)
- Identify missing reconciliations
- Validate reconciliation session completeness
- Extensible validation rules

**Key Methods**:

```typescript
async validatePeriodReconciliation(ctx: RequestContext, channelId: number, periodEndDate: string): Promise<ValidationResult>

async validateReconciliationSession(ctx: RequestContext, sessionId: string): Promise<ValidationResult>

getRequiredAccountsForReconciliation(): AccountCode[] // Payment method accounts
```

### Phase 3: Domain Models and Configuration

#### 3.1 Reconciliation Configuration

**Location**: `backend/src/services/financial/reconciliation-config.ts`

**Purpose**: Centralized configuration for which accounts require reconciliation

```typescript
export const RECONCILIATION_CONFIG = {
  REQUIRED_ACCOUNTS: [
    ACCOUNT_CODES.CASH_ON_HAND,
    ACCOUNT_CODES.CLEARING_MPESA,
    ACCOUNT_CODES.CLEARING_CREDIT,
    ACCOUNT_CODES.CLEARING_GENERIC,
  ],
  // Future: Add rules for other accounts
};
```

#### 3.2 Period Status Types

**Location**: `backend/src/services/financial/period-management.types.ts`

**Types**:

- `PeriodStatus` - Current period state (open, closing, closed)
- `PeriodEndCloseResult` - Result of period end closing operation
- `ValidationResult` - Reconciliation validation result
- `ReconciliationStatus` - Status of reconciliations for a period
- `ReconciliationSessionStatus` - Status of reconciliation session (active, closed)

### Phase 4: Database Entities

#### 4.1 ReconciliationSession Entity

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

#### 4.2 Enhance Reconciliation Entity

**Location**: `backend/src/domain/recon/reconciliation.entity.ts`

**Additions**:

- `sessionId: uuid?` - Optional link to reconciliation session
- `expectedBalance: string` - Expected balance from ledger (in smallest currency unit)
- `actualBalance: string` - Actual balance from reconciliation (in smallest currency unit)
- `varianceAmount: string` - Already exists, ensure it's calculated correctly (expected - actual)

#### 4.3 AccountingPeriod Entity (Optional)

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

### Phase 5: GraphQL API

#### 5.1 Schema Extensions

**Location**: `backend/src/plugins/ledger/period-management.schema.ts`

**Queries**:

```graphql
currentPeriodStatus(channelId: Int!): PeriodStatus!
periodReconciliationStatus(channelId: Int!, periodEndDate: Date!): ReconciliationStatus!
closedPeriods(channelId: Int!, limit: Int, offset: Int): [AccountingPeriod!]!
reconciliationSession(sessionId: ID!): ReconciliationSession
activeReconciliationSessions(channelId: Int!): [ReconciliationSession!]!
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
```

#### 5.2 Resolvers

**Location**: `backend/src/plugins/ledger/period-management.resolver.ts`

**Security**:

- All mutations require appropriate permissions
- All queries validate channel access
- Use `@Allow()` decorator with permission checks

### Phase 6: Enhanced Period Lock Logic

#### 6.1 Update PostingService

**Location**: `backend/src/ledger/posting.service.ts`

**Enhancement**: Improve period lock validation to check if entry date falls within a locked period more precisely. Allow adjusting entries during reconciliation sessions.

#### 6.2 Period Lock Service

**Location**: `backend/src/services/financial/period-lock.service.ts`

**Responsibilities**:

- Create period locks (called by PeriodEndClosingService)
- Query period lock status
- Validate if date range is locked
- Check if reconciliation session allows entry creation

### Phase 7: Business Logic

#### 7.1 Period End Closing Workflow

1. Validate user has `CloseAccountingPeriodPermission`
2. Validate period end date is not in the future
3. Check all required accounts have verified reconciliations for the period
4. Validate no pending reconciliation sessions
5. Validate no pending transactions in the period
6. Create period lock with `lockEndDate = periodEndDate`
7. Create accounting period record (if using AccountingPeriod entity)
8. Log audit trail entry
9. Return success with reconciliation summary

#### 7.2 Opening New Period Workflow

1. Validate user has `CloseAccountingPeriodPermission`
2. Validate previous period is closed
3. Validate period start date is after last closed period end date
4. Create new accounting period record (if using AccountingPeriod entity)
5. Log audit trail entry
6. Return period information

#### 7.3 Reconciliation Workflow

1. Validate user has `ManageReconciliationPermission`
2. Create reconciliation in draft status
3. Calculate expected balance from ledger for the period
4. User provides actual balance
5. Calculate variance (expected - actual)
6. User verifies reconciliation (draft → verified)
7. Verified reconciliations can be used for period end closing

#### 7.4 Reconciliation Session Workflow

1. Validate user has `ManageReconciliationPermission`
2. Create reconciliation session (status: active)
3. User can create inter-account transfers (adjusting entries)
4. User creates reconciliations for accounts (can be linked to session)
5. User verifies all required reconciliations
6. User closes session (validates all reconciliations are verified)
7. Session status changes to closed

#### 7.5 Inter-Account Transfer Workflow

1. Validate user has `CreateInterAccountTransferPermission`
2. Validate reconciliation session is active
3. Validate both accounts are payment method accounts
4. Create adjusting journal entry (debit one account, credit another)
5. Link entry to reconciliation session
6. Return journal entry

### Phase 8: Error Handling and Validation

#### 8.1 Validation Rules

- Cannot close period if any required account is unreconciled
- Cannot close period if reconciliations are in draft status
- Cannot close period if active reconciliation sessions exist
- Cannot create entries in locked periods (except during reconciliation sessions)
- Cannot open period if previous period is not closed
- Period end date must be >= period start date
- Inter-account transfers only allowed during active reconciliation sessions
- Inter-account transfers only between payment method accounts

#### 8.2 Error Messages

- Clear, actionable error messages
- Identify which accounts need reconciliation
- Show reconciliation status for each account
- Indicate which permissions are required

#### 8.3 Security Validation

- All operations validate user permissions
- All operations validate channel access
- Audit trail for all period closing/opening operations
- Audit trail for reconciliation verification
- Audit trail for inter-account transfers

### Phase 9: Database Migrations

#### 9.1 Create ReconciliationSession Table

**Location**: `backend/src/migrations/[timestamp]-CreateReconciliationSession.ts`

#### 9.2 Enhance Reconciliation Table

**Location**: `backend/src/migrations/[timestamp]-EnhanceReconciliation.ts`

Add fields: `sessionId`, `expectedBalance`, `actualBalance`

#### 9.3 Create AccountingPeriod Table (Optional)

**Location**: `backend/src/migrations/[timestamp]-CreateAccountingPeriod.ts`

### Phase 10: Extensibility for Future Features

#### 10.1 Reconciliation Rule Plugin System

**Location**: `backend/src/services/financial/reconciliation-rules/`

**Purpose**: Allow plugins to define custom reconciliation requirements

**Interface**:

```typescript
interface ReconciliationRule {
  getRequiredAccounts(channelId: number): Promise<AccountCode[]>;
  validateReconciliation(ctx: RequestContext, reconciliation: Reconciliation): Promise<ValidationResult>;
}
```

#### 10.2 Account Reconciliation Strategies

**Location**: `backend/src/services/financial/reconciliation-strategies/`

**Purpose**: Different reconciliation strategies for different account types

**Examples**:

- Payment method accounts: Balance reconciliation
- Bank accounts: Statement reconciliation (future)
- Inventory accounts: Physical count reconciliation (future)

## Files to Create

1. `backend/src/plugins/ledger/permissions.ts` - Custom permissions
2. `backend/src/services/financial/period-end-closing.service.ts`
3. `backend/src/services/financial/reconciliation.service.ts`
4. `backend/src/services/financial/reconciliation-session.service.ts`
5. `backend/src/services/financial/reconciliation-validator.service.ts`
6. `backend/src/services/financial/period-lock.service.ts`
7. `backend/src/services/financial/reconciliation-config.ts`
8. `backend/src/services/financial/period-management.types.ts`
9. `backend/src/domain/recon/reconciliation-session.entity.ts`
10. `backend/src/domain/period/accounting-period.entity.ts` (optional)
11. `backend/src/plugins/ledger/period-management.schema.ts`
12. `backend/src/plugins/ledger/period-management.resolver.ts`
13. `backend/src/migrations/[timestamp]-CreateReconciliationSession.ts`
14. `backend/src/migrations/[timestamp]-EnhanceReconciliation.ts`
15. `backend/src/migrations/[timestamp]-CreateAccountingPeriod.ts` (optional)

## Files to Modify

1. `backend/src/ledger/posting.service.ts` - Enhance period lock validation, allow reconciliation session entries
2. `backend/src/domain/recon/reconciliation.entity.ts` - Add sessionId and balance fields
3. `backend/src/plugins/ledger/ledger.plugin.ts` - Register new resolvers, entities, and permissions

## Testing Strategy

1. Unit tests for each service
2. Integration tests for period end closing/opening workflows
3. Integration tests for reconciliation session workflows
4. Validation tests for reconciliation requirements
5. Security tests for permission enforcement
6. Edge case tests (concurrent operations, invalid dates, etc.)

## Future Enhancements

1. Bank statement reconciliation
2. Inventory reconciliation
3. Automated reconciliation suggestions
4. Reconciliation variance analysis
5. Multi-period reconciliation reports
6. Reconciliation approval workflows
7. Automated inter-account transfer suggestions based on variance

### To-dos

- [ ] Create custom permissions file (ManageReconciliationPermission, CloseAccountingPeriodPermission, CreateInterAccountTransferPermission)
- [ ] Register custom permissions in ledger plugin configuration
- [ ] Create reconciliation configuration file defining required accounts for reconciliation (payment method accounts)
- [ ] Create TypeScript types for period management (PeriodStatus, PeriodEndCloseResult, ValidationResult, ReconciliationSessionStatus, etc.)
- [ ] Create ReconciliationSession entity to track reconciliation sessions for inter-account transfers
- [ ] Enhance Reconciliation entity with sessionId, expectedBalance, and actualBalance fields
- [ ] Create AccountingPeriod entity (optional) to track period metadata and create migration
- [ ] Implement ReconciliationService with methods for creating, verifying, and querying reconciliations with permission checks
- [ ] Implement ReconciliationValidatorService to validate reconciliation completeness before period closing and session closing
- [ ] Implement ReconciliationSessionService for managing reconciliation sessions and inter-account transfers with permission checks
- [ ] Implement PeriodLockService for managing period locks (create, query, validate) with reconciliation session awareness
- [ ] Implement PeriodEndClosingService orchestrating period end closing/opening operations with reconciliation validation and permission checks
- [ ] Enhance PostingService period lock validation to work with new period management system and allow entries during reconciliation sessions
- [ ] Create database migrations for ReconciliationSession, enhanced Reconciliation, and AccountingPeriod entities
- [ ] Create GraphQL schema for period management, reconciliation, and reconciliation session queries and mutations
- [ ] Implement GraphQL resolvers for period management operations with permission decorators
- [ ] Register new resolvers, services, entities, and permissions in ledger plugin