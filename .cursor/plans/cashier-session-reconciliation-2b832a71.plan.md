<!-- 2b832a71-29c5-4ed1-9271-f21afb97d3a2 00befcee-d08d-4b82-b671-efca994d1963 -->
# Cashier Session Reconciliation - Revised Plan

## Architecture: Extend Established Patterns

The codebase has a scalable pattern for ledger filtering:

- `JournalLine.meta` stores context (customerId, supplierId, orderId)
- `LedgerQueryService` filters via `meta @>` with GIN indexes
- `PaymentPostingContext` passes context to ledger entries

**The gap**: `cashierSessionId` isn't flowing through this pipeline.

---

## Phase 1: Extend Posting Pipeline

### 1.1 Add cashierSessionId to PaymentPostingContext

**File**: `backend/src/services/financial/posting-policy.ts`

- Add `cashierSessionId?: string` to `PaymentPostingContext`
- Update `createPaymentEntry()` to include in meta

### 1.2 Extend LedgerQueryService  

**File**: `backend/src/services/financial/ledger-query.service.ts`

- Add `cashierSessionId?: string` to `BalanceQuery`
- Add filter logic in `getAccountBalance()`
- Add `getSessionBalance()` convenience method

### 1.3 Add GIN Index Migration

**File**: `backend/src/migrations/XXXXXXX-AddCashierSessionMetaIndex.ts`

- Create GIN index for `meta->>'cashierSessionId'`

---

## Phase 2: CashierSessionService

### 2.1 Create Service

**File**: `backend/src/services/cashier/cashier-session.service.ts`

- Session lifecycle: `openSession`, `closeSession`, `getActiveSession`
- Balance queries: `getSessionLedgerBalance` (composes LedgerQueryService)
- Period queries: `getClosedSessionsForPeriod`

---

## Phase 3: GraphQL Integration

### 3.1 Extend Period Management Schema

**File**: `backend/src/plugins/ledger/period-management.schema.ts`

- Add CashierSession type, CashierSessionBalance type
- Add queries and mutations

### 3.2 Extend Resolver

**File**: `backend/src/plugins/ledger/period-management.resolver.ts`

- Add cashier session operations

### 3.3 Update ReconciliationValidatorService

**File**: `backend/src/services/financial/reconciliation-validator.service.ts`

- Complete TODO for cash-session scope validation

---

## Phase 4: Frontend

### 4.1 CashierSessionService

**File**: `frontend/src/app/core/services/cashier/cashier-session.service.ts`

- Signal-based service following LedgerService pattern

### 4.2 Reconciliation Tab Integration

- Add cash-session tab to existing reconciliation UI

---

## Files Summary

**New**:

- `backend/src/services/cashier/cashier-session.service.ts`
- `backend/src/migrations/XXXXXXX-AddCashierSessionMetaIndex.ts`
- `frontend/src/app/core/services/cashier/cashier-session.service.ts`

**Modified**:

- `backend/src/services/financial/posting-policy.ts`
- `backend/src/services/financial/ledger-query.service.ts`
- `backend/src/plugins/ledger/period-management.schema.ts`
- `backend/src/plugins/ledger/period-management.resolver.ts`
- `backend/src/services/financial/reconciliation-validator.service.ts`

### To-dos

- [ ] Add cashierSessionId to PaymentPostingContext and createPaymentEntry
- [ ] Extend LedgerQueryService with cashierSessionId filtering
- [ ] Create migration for cashierSessionId GIN index
- [ ] Create CashierSessionService composing existing infrastructure
- [ ] Extend period-management schema and resolver
- [ ] Update ReconciliationValidatorService for cash-session scope
- [ ] Create frontend CashierSessionService