# Cashier Flow - Two-Step Payment Process

## What It Does

Enables a two-step sales process where:

1. **Salesperson** adds items to cart and sends order to cashier (no customer required)
2. **Cashier** receives order with PENDING_PAYMENT status and collects payment

## How It Works

### Enabling Cashier Flow

Set `cashierFlowEnabled` to `true` in Vendure Admin:

1. Go to Settings → Channels
2. Select your channel
3. Go to "Cashier" tab
4. Check "Enable Cashier Flow"
5. Save

### Creating Orders

When enabled, the Sell page shows "Send to Cashier" option:

```typescript
// frontend/src/app/dashboard/pages/sell/sell.component.ts

// Cashier flow is automatically enabled/disabled based on channel setting
readonly cashierFlowEnabled = this.companyService.cashierFlowEnabled;

async handleCompleteCashier(): Promise<void> {
  // Creates order with PENDING_PAYMENT status
  // No customer required for cash sales
  // Order sent to cashier station for payment collection
}
```

### UI Flow

1. **Add items** to cart via barcode scanner or search
2. **Open cart** → Shows "Send to Cashier" button if `cashierFlowEnabled = true`
3. **Click "Send to Cashier"** → Order created with `PENDING_PAYMENT` status
4. **Cart clears** → Salesperson can process next customer
5. **Cashier receives** order → Collects payment and completes order

## Channel Data Architecture

**Single Source of Truth:** `CompanyService` holds all channel settings

```typescript
// All channel custom fields fetched once on boot
GET_ACTIVE_CHANNEL = graphql(`
  query GetActiveChannel {
    activeChannel {
      customFields {
        cashierFlowEnabled    # Enables cashier flow
        mlModelJsonId         # ML model assets
        mlModelBinId
        mlMetadataId
      }
    }
  }
`);

// Exposed as computed signals
readonly cashierFlowEnabled = computed(() =>
  channelData()?.customFields?.cashierFlowEnabled ?? false
);
```

## Persistence

Complete session stored in `localStorage` under one key:

```typescript
localStorage.setItem('company_session', JSON.stringify({
  companies: [...],           // Available channels
  activeCompanyId: '1',       // Selected channel
  channelData: {              // All custom fields
    customFields: {
      cashierFlowEnabled: true,
      mlModelJsonId: '...'
    }
  }
}));
```

**Benefits:**

- Page reload restores all state instantly
- No loading spinners on refresh
- Background sync keeps cache fresh

## Cashier Status Badge

Dashboard shows real-time cashier status when `cashierFlowEnabled = true`:

```typescript
// frontend/src/app/dashboard/pages/overview/overview.component.html

@if (cashierFlowEnabled() && cashierOpen()) {
  <div class="badge badge-success">Cash Register Open</div>
}
@if (cashierFlowEnabled() && !cashierOpen()) {
  <div class="badge badge-neutral">Cash Register Closed</div>
}
```

## Next Steps (Not Implemented)

1. **Backend Order Creation**: Implement actual Vendure order mutation with PENDING_PAYMENT
2. **Cashier Station**: Build interface to view pending orders and collect payments
3. **MPESA Integration**: Auto-detect payments via STK push or paybill
4. **Receipt Printing**: Generate pro-forma invoice when sending to cashier

## Files Modified

**Backend:**

- `backend/src/migrations/1760505873000-AddCashierCustomFields.ts`
- `backend/src/vendure-config.ts` - Added `cashierFlowEnabled` custom field

**Frontend:**

- `frontend/src/app/core/services/company.service.ts` - Centralized channel data + persistence
- `frontend/src/app/core/services/stock-location.service.ts` - Added `cashierOpen` status
- `frontend/src/app/core/graphql/auth.graphql.ts` - Consolidated channel query
- `frontend/src/app/dashboard/pages/sell/sell.component.ts` - Connected to `cashierFlowEnabled`
- `frontend/src/app/dashboard/pages/overview/overview.component.html` - Status badge

## Summary

✅ Cashier flow toggle via channel custom field  
✅ Conditional UI rendering based on setting  
✅ Session persistence for instant page loads  
✅ Status badge on dashboard  
🔲 Backend order creation (stub only)  
🔲 Cashier station interface  
🔲 Payment integrations
