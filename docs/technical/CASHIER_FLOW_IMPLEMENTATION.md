# Cashier Flow - Location-Based Two-Step Payment

## What It Does

Enables a two-step sales process at specific locations:

1. **Salesperson** adds items to cart and sends order to cashier (no customer required)
2. **Cashier** receives order with PENDING_PAYMENT status and collects payment

## Configuration

### Enable Cashier Flow (Per Location)

In Vendure Admin:

1. Go to Settings → Stock Locations
2. Select your location (e.g., "Main Store")
3. Check "Enable Cashier Flow"
4. Check "Cashier Open" when ready to accept orders
5. Save

**Result:** Sell page will show "Send to Cashier" button for that location.

### Location Status

Two toggles per location:

- **`cashierFlowEnabled`** - Feature toggle (rarely changes)
- **`cashierOpen`** - Status toggle (open/close shifts)

## Implementation

### Data Flow

```typescript
// StockLocation custom fields (both required)
{
  cashierFlowEnabled: boolean,  // Enable feature at this location
  cashierOpen: boolean          // Currently accepting orders
}

// Frontend reads from active location
readonly cashierFlowEnabled = stockLocationService.cashierFlowEnabled;
readonly cashierOpen = stockLocationService.cashierOpen;
```

### UI Behavior

**Sell Page:**

- Shows "Send to Cashier" when `cashierFlowEnabled = true`
- Hides button when `false`
- No customer required for cashier orders

**Dashboard:**

- Shows "Cash Register Open" badge when both `true`
- Shows "Cash Register Closed" when enabled but closed
- No badge when feature disabled

### Order Creation (Stub)

```typescript
async handleCompleteCashier(): Promise<void> {
  // Creates order with PENDING_PAYMENT status
  // No customer data required
  // Order sent to cashier station
  // Cart clears for next customer
}
```

## Session Persistence

All location data persists to `localStorage`:

```typescript
localStorage.setItem('company_session', JSON.stringify({
  companies: [...],
  activeCompanyId: '1',
  channelData: { mlModelJsonId: '...' },  // Channel level
  // Location data fetched separately
}));
```

## Files Modified

**Backend:**

- `backend/src/migrations/1760505873000-AddCashierCustomFields.ts`
- `backend/src/vendure-config.ts` - Both fields on StockLocation

**Frontend:**

- `frontend/src/app/core/services/stock-location.service.ts` - Added `cashierFlowEnabled` + `cashierOpen`
- `frontend/src/app/core/graphql/product.graphql.ts` - Query both fields
- `frontend/src/app/dashboard/pages/sell/sell.component.ts` - Use location setting
- `frontend/src/app/dashboard/pages/overview/overview.component.ts` - Status badge from location

## Next Steps

1. **Restart Backend** - Pick up new StockLocation custom fields
2. **Backend Order Creation** - Implement Vendure mutation for PENDING_PAYMENT
3. **Cashier Station** - Interface to view and complete pending orders
4. **MPESA Integration** - Auto-detect payments

## Summary

✅ Location-specific cashier flow toggle  
✅ Conditional UI based on active location  
✅ Status badge on dashboard  
✅ Session persistence  
🔲 Backend order creation (stub)  
🔲 Cashier station interface  
🔲 Payment integrations
