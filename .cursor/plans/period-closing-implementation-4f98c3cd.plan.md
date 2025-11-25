<!-- 4f98c3cd-eda7-4c72-a16b-9bd5c9299f2b f2b41106-1895-469d-8ad6-212497e288cf -->
# Cashier Flow Period Closing Integration Plan

## Overview

Integrate the existing cashier flow into the period closing system. Cashiers will approve both payment collection (cash/mpesa) and credit sales, with orders linked to cashier sessions. Cashier sessions will be reconciled during period end closing by comparing declared closing amounts and order totals against ledger balances.

## Architecture

- **Order-Cashier Link**: Add `cashierSessionId` field to Order entity
- **Cashier Approval**: Service to handle payment and credit approval workflows
- **Cashier Reconciliation**: Service to reconcile cashier sessions (declared vs ledger, orders vs ledger)
- **Period Integration**: Update reconciliation validator to require cash-session reconciliations
- **GraphQL API**: Expose cashier session management and approval operations
- **Frontend UI**: Cashier approval interface and session reconciliation UI

## Backend Implementation

### Phase 1: Database Schema Changes

**File**: `backend/src/domain/order/order.entity.ts` (or Vendure Order customFields)

Add `cashierSessionId` field to link orders to cashier sessions:

```typescript
// In Order customFields (via Vendure customFields mechanism)
cashierSessionId?: string; // UUID reference to CashierSession
```

**Migration**: `backend/src/migrations/8000000000008-AddOrderCashierSessionLink.ts`

- Add `cashierSessionId` column to `order` table (if using direct column)
- Or extend Order customFields schema to include `cashierSessionId`
- Add index on `cashierSessionId` for efficient queries

### Phase 2: Cashier Session Management Service

**File**: `backend/src/services/cashier/cashier-session.service.ts` (new)

Service for managing cashier sessions:

1. **Methods**:

   - `openSession(ctx, channelId, cashierUserId, openingFloat)` - Open new cashier session
   - `closeSession(ctx, sessionId, closingDeclared)` - Close session with declared amount
   - `getActiveSession(ctx, channelId, cashierUserId)` - Get active session for cashier
   - `getSessionOrders(ctx, sessionId)` - Get all orders linked to session
   - `getSessionBalance(ctx, sessionId)` - Calculate session balance from orders
   - `getSessionLedgerBalance(ctx, sessionId)` - Get ledger CASH balance for session period

2. **Business Logic**:

   - Only one active session per cashier per channel at a time
   - Session must be open before orders can be linked
   - Closing session validates all orders are approved

### Phase 3: Cashier Approval Service

**File**: `backend/src/services/cashier/cashier-approval.service.ts` (new)

Service for cashier approval of payments and credit sales:

1. **Methods**:

   - `approvePayment(ctx, orderId, sessionId, paymentMethodCode)` - Approve cash/mpesa payment
   - `approveCreditSale(ctx, orderId, sessionId)` - Approve credit sale
   - `getPendingApprovals(ctx, sessionId)` - Get orders pending approval in session

2. **Business Logic**:

   - Orders with `isCashierFlow=true` require cashier approval
   - Payment approval: Creates/settles payment, links order to session, posts to ledger
   - Credit approval: Validates credit limit, links order to session, posts to ledger
   - Both approvals link order to cashier session via `cashierSessionId`

3. **Integration Points**:

   - Uses `OrderPaymentService` to add/settle payments
   - Uses `FinancialService` to post ledger entries
   - Uses `OrderStateService` to transition order states

### Phase 4: Cashier Reconciliation Service

**File**: `backend/src/services/cashier/cashier-reconciliation.service.ts` (new)

Service for reconciling cashier sessions:

1. **Methods**:

   - `calculateSessionExpectedBalance(ctx, sessionId)` - Sum of all orders in session
   - `getSessionLedgerBalance(ctx, sessionId)` - CASH account balance from ledger for session period
   - `reconcileSession(ctx, sessionId, periodEndDate)` - Create reconciliation record
   - `getSessionReconciliationStatus(ctx, channelId, periodEndDate)` - Get reconciliation status for all sessions in period

2. **Reconciliation Logic**:

   - **Expected Balance**: Sum of all order totals in session (from orders table)
   - **Actual Balance (Ledger)**: CASH account balance from ledger for session period (openedAt to closedAt)
   - **Declared Balance**: Cashier's declared closing amount (from `closingDeclared` field)
   - **Variance**: Compare declared vs ledger, and orders vs ledger

3. **Integration**:

   - Uses `AccountBalanceService` to query ledger balances
   - Creates `Reconciliation` records with scope `'cash-session'`
   - Uses `CashierSession.id` as `scopeRefId`

### Phase 5: Update Reconciliation Validator

**File**: `backend/src/services/financial/reconciliation-validator.service.ts`

Update to include cash-session reconciliations:

1. **Changes**:

   - Add cash-session scope to required scopes when cashier flow is enabled
   - Check for verified cash-session reconciliations for all closed sessions in period
   - Validate that all sessions closed in period have reconciliations

2. **Logic**:
   ```typescript
   // In getRequiredScopes method
   if (cashierFlowEnabled) {
     scopes.push('cash-session');
   }
   
   // In validatePeriodReconciliation
   // Check all cashier sessions closed in period have verified reconciliations
   ```


### Phase 6: GraphQL Schema and Resolvers

**File**: `backend/src/plugins/cashier/cashier.schema.ts` (new)

GraphQL schema for cashier operations:

1. **Types**:

   - `CashierSession` - Session entity with orders, balances
   - `CashierSessionBalance` - Calculated balances (orders, ledger, declared)
   - `PendingApproval` - Order pending cashier approval

2. **Queries**:

   - `getActiveCashierSession(channelId, cashierUserId)` - Get active session
   - `getCashierSession(sessionId)` - Get session details
   - `getPendingApprovals(sessionId)` - Get orders pending approval
   - `getSessionReconciliationStatus(channelId, periodEndDate)` - Get reconciliation status

3. **Mutations**:

   - `openCashierSession(input)` - Open new session
   - `closeCashierSession(input)` - Close session with declared amount
   - `approvePayment(input)` - Approve payment for order
   - `approveCreditSale(input)` - Approve credit sale
   - `createCashierSessionReconciliation(input)` - Create reconciliation record

**File**: `backend/src/plugins/cashier/cashier.resolver.ts` (new)

GraphQL resolver implementing schema operations.

**File**: `backend/src/plugins/cashier/cashier.plugin.ts` (new)

Plugin registration for cashier operations.

### Phase 7: Permissions

**File**: `backend/src/plugins/cashier/permissions.ts` (new)

Define permissions:

- `ManageCashierSessionPermission` - Open/close sessions
- `ApproveCashierPaymentPermission` - Approve payments
- `ApproveCashierCreditPermission` - Approve credit sales
- `ReconcileCashierSessionPermission` - Create reconciliations

## Frontend Implementation

### Phase 8: GraphQL Operations

**File**: `frontend/src/app/core/graphql/operations.graphql.ts`

Add cashier operations:

- `GET_ACTIVE_CASHIER_SESSION`
- `GET_CASHIER_SESSION`
- `GET_PENDING_APPROVALS`
- `GET_SESSION_RECONCILIATION_STATUS`
- `OPEN_CASHIER_SESSION`
- `CLOSE_CASHIER_SESSION`
- `APPROVE_PAYMENT`
- `APPROVE_CREDIT_SALE`
- `CREATE_CASHIER_SESSION_RECONCILIATION`

### Phase 9: Cashier Service

**File**: `frontend/src/app/core/services/cashier/cashier.service.ts` (new)

Service following existing patterns:

1. **Signals**:

   - `activeSession` - Current active session
   - `pendingApprovals` - Orders pending approval
   - `sessionBalance` - Calculated balances

2. **Methods**:

   - `openSession(openingFloat)`
   - `closeSession(closingDeclared)`
   - `approvePayment(orderId, paymentMethodCode)`
   - `approveCreditSale(orderId)`
   - `loadPendingApprovals(sessionId)`
   - `createReconciliation(sessionId, periodEndDate)`

### Phase 10: Cashier Approval UI

**File**: `frontend/src/app/dashboard/pages/cashier/cashier-approval.component.ts` (new)

Component for cashier to approve orders:

1. **Features**:

   - List of orders pending approval
   - Approve payment button (cash/mpesa)
   - Approve credit button
   - Order details (items, total, customer)
   - Session status (open/closed, current balance)

2. **UI Elements**:

   - Session header (open/close session, opening float, current balance)
   - Pending approvals list (order code, customer, total, actions)
   - Approve payment modal (select payment method, confirm)
   - Approve credit modal (confirm credit approval)

### Phase 11: Cashier Session Management UI

**File**: `frontend/src/app/dashboard/pages/cashier/session-management.component.ts` (new)

Component for managing cashier sessions:

1. **Features**:

   - Open session form (opening float input)
   - Close session form (declared closing amount)
   - Session history (past sessions with reconciliation status)
   - Current session balance display

2. **UI Elements**:

   - Open session button/modal
   - Close session button/modal
   - Session balance card (orders total, ledger balance, declared)
   - Session history table

### Phase 12: Cashier Reconciliation UI

**File**: `frontend/src/app/dashboard/pages/ledger/components/cashier-reconciliation.component.ts` (new)

Component for reconciling cashier sessions:

1. **Integration**:

   - Add to reconciliation tab alongside method, inventory, bank reconciliations
   - Show cash-session scope in reconciliation status table

2. **Features**:

   - List of cashier sessions closed in period
   - For each session: orders total, ledger balance, declared amount, variance
   - Create reconciliation button
   - Verify reconciliation action

3. **UI Elements**:

   - Cashier sessions table (session ID, cashier, dates, balances, variance, status)
   - Create reconciliation modal (expected balance auto-filled, actual balance input)
   - Reconciliation status indicators (draft, verified, missing)

### Phase 13: Order List Integration

**File**: `frontend/src/app/dashboard/pages/orders/orders.component.ts`

Update order list to show cashier session link:

1. **Changes**:

   - Display `cashierSessionId` if present
   - Show "Pending Cashier Approval" badge for cashier flow orders
   - Filter by cashier session

## Key Implementation Details

1. **Order State Flow**:

   - Salesperson creates order with `isCashierFlow=true` → Order in `ArrangingPayment` state
   - Cashier approves payment/credit → Order transitions to `PaymentSettled` → `Fulfilled`
   - Order is linked to cashier session via `cashierSessionId`

2. **Session Balance Calculation**:

   - **Orders Total**: Sum of `order.totalWithTax` for all orders in session
   - **Ledger Balance**: Query `CASH` account balance from ledger for session period
   - **Declared Balance**: Cashier's `closingDeclared` amount

3. **Reconciliation Variance**:

   - **Declared vs Ledger**: `closingDeclared - ledgerBalance` (cashier's count vs system)
   - **Orders vs Ledger**: `ordersTotal - ledgerBalance` (should match if all orders posted)

4. **Period Closing Integration**:

   - All cashier sessions closed in period must have verified reconciliations
   - Reconciliation validator checks for `cash-session` scope when cashier flow enabled
   - Missing reconciliations block period closing

5. **Permissions**:

   - Cashiers need `ApproveCashierPaymentPermission` and `ApproveCashierCreditPermission`
   - Managers need `ReconcileCashierSessionPermission` and `ManageCashierSessionPermission`

## File Structure

```
backend/src/
├── domain/
│   └── cashier/
│       └── cashier-session.entity.ts (existing)
├── migrations/
│   └── 8000000000008-AddOrderCashierSessionLink.ts (new)
├── services/
│   └── cashier/
│       ├── cashier-session.service.ts (new)
│       ├── cashier-approval.service.ts (new)
│       └── cashier-reconciliation.service.ts (new)
└── plugins/
    └── cashier/
        ├── cashier.schema.ts (new)
        ├── cashier.resolver.ts (new)
        ├── cashier.plugin.ts (new)
        └── permissions.ts (new)

frontend/src/app/
├── core/
│   ├── graphql/
│   │   └── operations.graphql.ts (UPDATE)
│   └── services/
│       └── cashier/
│           └── cashier.service.ts (new)
└── dashboard/
    └── pages/
        ├── cashier/
        │   ├── cashier-approval.component.ts (new)
        │   ├── cashier-approval.component.html (new)
        │   ├── session-management.component.ts (new)
        │   └── session-management.component.html (new)
        └── ledger/
            └── components/
                └── cashier-reconciliation.component.ts (new)
                └── cashier-reconciliation.component.html (new)
```

## Dependencies

- Existing: `OrderService`, `FinancialService`, `AccountBalanceService`, `ReconciliationService`
- New: `CashierSessionService`, `CashierApprovalService`, `CashierReconciliationService`
- Frontend: `OrderService`, `PeriodManagementService` (from period closing plan)

## Notes

- Cashier sessions are channel-specific (one per channel)
- Only one active session per cashier per channel
- Orders can only be linked to open sessions
- Session must be closed before reconciliation can be created
- Reconciliation uses ledger as single source of truth for balances
- Period closing requires all cash-session reconciliations to be verified