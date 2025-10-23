# Shop Setup Guide

> **AI-powered point-of-sale system for modern small businesses**

This guide covers the complete setup process for Dukahub, including system configuration, company provisioning, and POS workflow.

## Table of Contents

- [System Overview](#system-overview)
- [POS System Configuration](#pos-system-configuration)
- [Company Provisioning](#company-provisioning)
- [Order Process Configuration](#order-process-configuration)
- [Testing & Verification](#testing--verification)
- [Troubleshooting](#troubleshooting)

---

## System Overview

Dukahub is an AI-powered POS system that helps shopkeepers:

- Use phone cameras to recognize products instantly
- Process sales without expensive barcode scanners
- Manage inventory with real-time tracking
- Handle multiple shop locations

### Tech Stack

| Component    | Technology                          |
| ------------ | ----------------------------------- |
| **Frontend** | Angular 19 + daisyUI + Tailwind CSS |
| **Backend**  | Vendure (NestJS) + TypeScript       |
| **Database** | PostgreSQL 16                       |
| **Cache**    | Redis 7                             |
| **ML**       | TensorFlow.js (client-side)         |

---

## POS System Configuration

### Order Process

This POS system is configured for **in-store sales** without shipping:

- **No shipping methods required**: Orders complete without shipping setup
- **Walk-in customers**: Items handed over immediately at checkout
- **Simple flow**: Customer → Items → Payment → Complete

### Order Flow

```
1. Create draft order
2. Add items to cart (via AI camera, barcode, or search)
3. Set customer (walk-in or registered)
4. Set minimal address (store location)
5. Transition to ArrangingPayment
6. Add payment (Cash, M-Pesa, etc.)
7. Complete order ✅
```

### Product Entry Methods

1. **📷 AI Camera** - Auto-detects product at 90% confidence
2. **📱 Barcode** - Direct SKU scan (Chrome/Edge)
3. **🔍 Search** - Manual name/SKU lookup

### Configuration

**Backend** (`backend/src/vendure-config.ts`):

```typescript
const customOrderProcess = configureDefaultOrderProcess({
  arrangingPaymentRequiresShipping: false, // Disabled for POS
  arrangingPaymentRequiresCustomer: true,
});

export const config: VendureConfig = {
  orderOptions: {
    process: [customOrderProcess],
  },
  // ... rest of config
};
```

---

## Company Provisioning

**Complete ALL steps for each new company. Missing any step will break order creation.**

### Step 1: Create Channel

- Navigate: Settings → Channels
- Click: "Create new channel"
- Fill:
  - **Name:** Company name (e.g., "Downtown Groceries")
  - **Code/Token:** Lowercase, no spaces (e.g., "downtown-groceries")
  - **Currency:** Default currency
- Save channel
- **Note:** Copy channel ID for reference

### Step 2: Create Stock Location

- Navigate: Settings → Stock Locations
- Click: "Create new stock location"
- Fill:
  - **Name:** "{Company Name} - Main Store" (e.g., "Downtown Groceries - Main Store")
  - **Description:** Optional
- Assign: Channel from Step 1
- Save location

**Why this matters:** Orders CANNOT be created without a stock location. Vendure uses it for inventory allocation.

### Step 3: Create Payment Methods

- Navigate: Settings → Payment Methods
- Create **Cash Payment:**
  - Name: "Cash Payment"
  - Code: Auto-generated
  - Handler: Select `cash-payment` from dropdown
  - Enabled: YES
  - Channels: Assign the channel from Step 1
- Create **M-Pesa Payment:**
  - Name: "M-Pesa Payment"
  - Code: Auto-generated
  - Handler: Select `mpesa-payment` from dropdown
  - Enabled: YES
  - Channels: Assign the channel from Step 1

**Why this matters:** No payment methods = no checkout options in POS.

### Step 4: Create Admin Role

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

### Step 5: Create Admin User

- Navigate: Settings → Administrators
- Click: "Create new administrator"
- Fill:
  - **Email:** admin@{company-domain}.com
  - **First name:** Admin first name
  - **Last name:** Admin last name
  - **Password:** Generate strong password
- Assign: Role from Step 4
- Save user
- **IMPORTANT:** Send credentials to company admin securely

### Step 6: Verification Checklist

Before handing off to customer, verify:

- [ ] Channel exists and is active
- [ ] Stock location created and assigned to channel
- [ ] Payment methods (Cash + M-Pesa) created and assigned to channel
- [ ] Admin role created with all required permissions
- [ ] Admin user created and assigned to role
- [ ] Test login: Admin can access frontend with their credentials
- [ ] Test visibility: Admin sees ONLY their channel's data

---

## Order Process Configuration

### System-Wide Configuration

The system is configured to disable shipping requirements globally:

```typescript
// backend/src/vendure-config.ts
const customOrderProcess = configureDefaultOrderProcess({
  arrangingPaymentRequiresShipping: false, // Disabled system-wide for POS
  arrangingPaymentRequiresCustomer: true, // Keep customer requirement
});
```

### Benefits

1. **Simplicity**: No shipping configuration needed for POS
2. **Performance**: Faster order creation (no shipping lookup)
3. **Flexibility**: Can enable shipping per channel if needed
4. **Maintainability**: Less code, fewer edge cases
5. **User Experience**: Faster checkout for walk-in customers

### Future Shipping Features

When shipping features are needed:

1. Keep `arrangingPaymentRequiresShipping: false` (no enforcement)
2. Add shipping methods to specific channels
3. Update frontend to optionally collect shipping info
4. Orders work with or without shipping (graceful degradation)

---

## Testing & Verification

### Order Flow Testing

Test order completion:

- [ ] Create order without shipping method
- [ ] Add customer and minimal address
- [ ] Process payment
- [ ] Verify order completes successfully
- [ ] Check order state is PaymentSettled

### POS Testing

- [ ] AI camera product recognition works
- [ ] Barcode scanning works (Chrome/Edge)
- [ ] Product search works
- [ ] Payment methods appear at checkout
- [ ] Orders complete successfully

### ML Model Testing

- [ ] ML models load for the channel
- [ ] Product recognition works with camera
- [ ] Confidence scores are accurate
- [ ] Fallback to manual entry works

---

## Troubleshooting

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

### Order Process Issues

**"No shipping methods available" error:**

- **Cause:** System trying to set shipping method (now disabled)
- **Solution:** Verify `arrangingPaymentRequiresShipping: false` in config

**Order state transition errors:**

- **Cause:** Missing customer or address information
- **Solution:** Ensure customer and addresses are set before state transition

### ML Model Issues

**Product recognition not working:**

- **Cause:** ML model not uploaded or configured
- **Solution:** Upload ML model files to channel assets

**Camera not working:**

- **Cause:** Browser permissions or HTTPS required
- **Solution:** Enable camera permissions and use HTTPS

---

## Fulfillment Process

### In-Store Orders

For walk-in customers:

1. Customer purchases items at POS
2. Payment is processed (Cash, M-Pesa, etc.)
3. Order is automatically fulfilled
4. Items handed to customer immediately
5. Order complete

### Manual Fulfillment

Orders are fulfilled manually:

- Customer pays at POS
- Staff hands over items
- Order marked as fulfilled
- No shipping tracking needed

---

## Future Enhancements

### Cashier Role (Planned)

Two-step flow: Salesperson creates order → Cashier validates payment

**States:** `DRAFT` → `PENDING_PAYMENT` → `PAID`

### Advanced Features

- Multi-location inventory tracking
- Advanced analytics and reporting
- Integration with accounting systems
- Mobile app for field sales

---

## Support

For issues or questions:

1. Check the main documentation: [README.md](./README.md)
2. Review infrastructure setup: [INFRASTRUCTURE.md](./INFRASTRUCTURE.md)
3. Check Vendure configuration: [VENDURE.md](./VENDURE.md)
4. Review ML training setup: [ML_TRAINING_SETUP.md](./ML_TRAINING_SETUP.md)

---

**Built with ❤️ for African small businesses**
