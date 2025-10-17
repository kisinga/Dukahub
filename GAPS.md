# Vendure Implementation Gaps & Workarounds

This document tracks known limitations and required manual steps when working with Vendure.

## System Setup & Company Provisioning

### Phase 1: Initial System Setup (One-Time)

**Prerequisites:**

- PostgreSQL running
- Backend started
- Migrations auto-run on startup (`migrationsRun: true` in config)

**Steps (via Vendure Admin UI - http://localhost:3002/admin):**

1. **Tax Configuration** (Required - all prices tax-inclusive)

   - Navigate: Settings → Tax Categories
   - Create: "Standard Tax" category
   - Navigate: Settings → Tax Rates
   - Create: Tax rate (e.g., "VAT 0%" or appropriate rate)
   - Set: "Tax included in price" = YES
   - Navigate: Settings → Zones
   - Create: Zone for your country/region
   - Assign: Tax rate to zone
   - **Note:** Complex tax systems NOT supported. All prices are tax-inclusive.

2. **Verify Payment Handlers** (After backend deployment)
   - Navigate: Settings → Payment Methods
   - Verify: `cash-payment` and `mpesa-payment` handlers available in dropdown
   - If missing: Check backend logs, ensure handlers registered in vendure-config.ts

### Phase 2: Company Provisioning (Per Customer/Tenant)

**Complete ALL steps for each new company. Missing any step will break order creation.**

#### Step 1: Create Channel

- Navigate: Settings → Channels
- Click: "Create new channel"
- Fill:
  - **Name:** Company name (e.g., "Downtown Groceries")
  - **Code/Token:** Lowercase, no spaces (e.g., "downtown-groceries")
  - **Currency:** Default currency
- Save channel
- **Note:** Copy channel ID for reference

#### Step 2: Create Stock Location

- Navigate: Settings → Stock Locations
- Click: "Create new stock location"
- Fill:
  - **Name:** "{Company Name} - Main Store" (e.g., "Downtown Groceries - Main Store")
  - **Description:** Optional
- Assign: Channel from Step 1
- Save location

**Why this matters:** Orders CANNOT be created without a stock location. Vendure uses it for inventory allocation. The system will automatically use the first stock location assigned to the channel.

#### Step 3: Create Payment Methods

- Navigate: Settings → Payment Methods
- Create **Cash Payment:**
  - Name: "Cash Payment"
  - Code: Auto-generated
  - Handler: Select `cash-payment` from dropdown
  - Enabled: YES
  - Channels: Assign the channel from Step 1
  - Save
- Create **M-Pesa Payment:**
  - Name: "M-Pesa Payment"
  - Code: Auto-generated
  - Handler: Select `mpesa-payment` from dropdown
  - Enabled: YES
  - Channels: Assign the channel from Step 1
  - Save

**Why this matters:** No payment methods = no checkout options in POS.

#### Step 4: Create Admin Role

- Navigate: Settings → Roles
- Click: "Create new role"
- Fill:
  - **Name:** "{Company Name} Admin" (e.g., "Downtown Groceries Admin")
  - **Description:** "Full admin access for {Company Name}"
  - **Channels:** Select the channel from Step 1
- Permissions: Select ALL for these entities:
  - **Asset:** CreateAsset, ReadAsset, UpdateAsset, DeleteAsset
  - **Catalog:** CreateCatalog, ReadCatalog, UpdateCatalog, DeleteCatalog
  - **Customer:** CreateCustomer, ReadCustomer, UpdateCustomer, DeleteCustomer
  - **Order:** CreateOrder, ReadOrder, UpdateOrder, DeleteOrder
  - **Product:** CreateProduct, ReadProduct, UpdateProduct, DeleteProduct
  - **ProductVariant:** CreateProductVariant, ReadProductVariant, UpdateProductVariant, DeleteProductVariant
  - **StockLocation:** CreateStockLocation, ReadStockLocation, UpdateStockLocation
  - **Payment:** CreatePayment, ReadPayment, UpdatePayment, SettlePayment
  - **Fulfillment:** CreateFulfillment, ReadFulfillment, UpdateFulfillment
- Save role

**Permission Notes:**

- Asset permissions REQUIRED for product photo uploads (CreateAsset, UpdateAsset)
- Payment permissions REQUIRED for checkout flow (CreatePayment, SettlePayment)
- Missing permissions = 403 errors in frontend

#### Step 5: Create Admin User

- Navigate: Settings → Administrators
- Click: "Create new administrator"
- Fill:
  - **Email:** admin@{company-domain}.com
  - **First name:** Admin first name
  - **Last name:** Admin last name
  - **Password:** Generate strong password
- Assign: Role from Step 4
- Save user
- **IMPORTANT:** Send credentials to company admin securely (do NOT send via email unencrypted)

#### Step 6: Verification Checklist

Before handing off to customer, verify:

- [ ] Channel exists and is active
- [ ] Stock location created and assigned to channel (first location will be used for orders)
- [ ] Payment methods (Cash + M-Pesa) created and assigned to channel
- [ ] Admin role created with all required permissions
- [ ] Admin user created and assigned to role
- [ ] Test login: Admin can access frontend with their credentials
- [ ] Test visibility: Admin sees ONLY their channel's data

### Common Setup Issues

**Product photos fail (403 Forbidden):**

- **Cause:** Missing Asset permissions on role
- **Solution:** Edit role → Add CreateAsset, ReadAsset, UpdateAsset permissions → Save

**Orders fail to create:**

- **Cause:** No stock location assigned to channel
- **Solution:** Complete Step 2, ensure at least one stock location is assigned to the channel

**No payment methods at checkout:**

- **Cause:** Payment methods not assigned to channel
- **Solution:** Edit payment methods → Ensure channel is selected in "Channels" field

**Admin sees all companies (not just theirs):**

- **Cause:** Role not scoped to channel
- **Solution:** Edit role → Ensure channel is selected in "Channels" field

**User cannot login to frontend:**

- **Cause:** User not assigned to any role, or role not assigned to channel
- **Solution:** Edit user → Assign role → Ensure role is channel-scoped

## Known Limitations

### User Permissions

- Users are scoped to Channels via Roles
- Stock Location permissions require custom implementation
- No native "shop-level" user scoping

### Stock Locations

- Not automatically created with Channels
- Must be manually provisioned for each new customer
- Cannot track inventory without at least one Stock Location

### Multi-Channel Management

- Each Channel requires separate payment method setup
- Roles must be created per Channel unless explicitly shared
- Users in shared roles can see all associated Channels

## Product Creation - Current vs Future

### Current State (Frontend Direct Upload)

**What Works:**

- ✅ Product and variants created transactionally
- ✅ Photos uploaded directly from browser to admin-api
- ✅ Uses cookie-based authentication (no tokens needed)
- ✅ Simple implementation, no backend code required

**Points of Failure:**

1. **Network Issues**: Large photo uploads can fail on slow/unreliable connections
2. **Browser Timeouts**: Long uploads may timeout in browser
3. **No Retry Logic**: Failed uploads require manual retry
4. **Progress Tracking**: Limited feedback during upload

**Mitigation:**

- Product/variants are saved FIRST (Phase 1 - blocking)
- Photos uploaded AFTER (Phase 2 - non-blocking)
- If photos fail, product still exists (can add photos later)

### Future State (Backend Batch Processor)

**Architecture Plan:**

```
Frontend → Temp Storage → Backend Queue → Worker Process
                              ↓
                         Progress Updates
                              ↓
                         Retry Logic (3x)
                              ↓
                         Asset Creation
```

**Benefits:**

- Resilient to network failures
- Real-time progress updates via websocket
- Automatic retry on failure (3 attempts)
- No browser timeout limits
- Cleaner error recovery

**Implementation TODO:**

1. Add temp file storage endpoint (S3/local)
2. Implement Redis/BullMQ job queue
3. Create worker process for asset creation
4. Add websocket for progress updates
5. Update frontend to use new flow

**Priority:** Medium (current solution works, but not robust)

---

## Recent Improvements

### Products Page Refactoring (Completed)

**Status:** ✅ Complete

The products page has been refactored into a composable, maintainable architecture:

**Improvements:**

- 60% reduction in main component size (930→245 lines HTML, 195→175 lines TS)
- 6 focused, reusable components with clear responsibilities
- Enhanced mobile experience with KISS principles
- Product edit functionality (reuses create form)
- Purchase action hook (ready for supplier flow integration)
- Better type safety with shared interfaces
- Performance optimizations (OnPush, signals, computed)

**See:** `frontend/ARCHITECTURE.md` → "Products Page - Component Architecture" section for full details.
