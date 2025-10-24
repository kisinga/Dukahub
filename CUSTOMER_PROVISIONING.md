# Customer Provisioning Guide

> **Reproducible, automatable customer setup for Dukahub POS system**

This guide provides a step-by-step process for provisioning new customers in the Dukahub system. Each step is critical and must be completed in order to ensure the customer can successfully use the POS system.

## What This Guide Covers

- **Customer onboarding workflow** - Complete step-by-step process
- **Reproducible automation** - Scriptable steps for bulk provisioning
- **Testing & verification** - Ensuring customer setup works correctly
- **Troubleshooting** - Common issues and solutions
- **Customer handoff** - What to provide to new customers

## What This Guide Does NOT Cover

- **Technical system setup** - See [VENDURE.md](./VENDURE.md)
- **Infrastructure deployment** - See [INFRASTRUCTURE.md](./INFRASTRUCTURE.md)
- **ML model training** - See [ML_TRAINING_SETUP.md](./ML_TRAINING_SETUP.md)

## Table of Contents

- [Prerequisites](#prerequisites)
- [Customer Provisioning Checklist](#customer-provisioning-checklist)
- [Step-by-Step Setup](#step-by-step-setup)
- [Verification & Testing](#verification--testing)
- [Customer Handoff](#customer-handoff)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before provisioning a new customer, ensure:

- [ ] Backend system is running and accessible
- [ ] Admin UI is accessible at `http://localhost:3000/admin`
- [ ] Initial system setup is complete (see [VENDURE.md](./VENDURE.md))
- [ ] Walk-in customer exists (`walkin@pos.local`)

---

## Customer Provisioning Checklist

**Complete ALL steps for each new customer. Missing any step will break order creation.**

### Required Information

Before starting, collect:

- **Company Name:** (e.g., "Downtown Groceries")
- **Company Code:** Lowercase, no spaces (e.g., "downtown-groceries")
- **Admin Contact:** Name, email, phone
- **Currency:** Default currency for the region
- **Store Location:** Physical address for the main store

### Setup Steps

- [ ] **Step 1:** Create Channel
- [ ] **Step 2:** Create Stock Location
- [ ] **Step 3:** Create Payment Methods
- [ ] **Step 4:** Create Admin Role
- [ ] **Step 5:** Create Admin User
- [ ] **Step 6:** Verify Setup
- [ ] **Step 7:** Customer Handoff

---

## Step-by-Step Setup

### Step 1: Create Channel

**Purpose:** Creates the customer's isolated environment

1. Navigate to **Settings → Channels**
2. Click **"Create new channel"**
3. Fill in the details:
   - **Name:** `{Company Name}` (e.g., "Downtown Groceries")
   - **Code/Token:** `{company-code}` (e.g., "downtown-groceries")
   - **Currency:** Select appropriate currency
4. Click **Save**
5. **Important:** Copy the Channel ID for reference

**Why this matters:** Each customer needs their own channel for data isolation.

### Step 2: Create Stock Location

**Purpose:** Required for inventory tracking and order creation

1. Navigate to **Settings → Stock Locations**
2. Click **"Create new stock location"**
3. Fill in the details:
   - **Name:** `{Company Name} - Main Store`
   - **Description:** `Primary store location for {Company Name}`
4. **Assign Channel:** Select the channel from Step 1
5. Click **Save**

**Why this matters:** Orders CANNOT be created without a stock location. This is a Vendure requirement.

### Step 3: Create Payment Methods

**Purpose:** Enables checkout functionality in the POS system

#### 3a. Create Cash Payment

1. Navigate to **Settings → Payment Methods**
2. Click **"Create new payment method"**
3. Fill in the details:
   - **Name:** `Cash Payment`
   - **Code:** (auto-generated)
   - **Handler:** Select `cash-payment` from dropdown
   - **Enabled:** ✅ Yes
   - **Channels:** Select the channel from Step 1
4. Click **Save**

#### 3b. Create M-Pesa Payment

1. Click **"Create new payment method"** again
2. Fill in the details:
   - **Name:** `M-Pesa Payment`
   - **Code:** (auto-generated)
   - **Handler:** Select `mpesa-payment` from dropdown
   - **Enabled:** ✅ Yes
   - **Channels:** Select the channel from Step 1
3. Click **Save**

**Why this matters:** No payment methods = no checkout options in POS.

### Step 4: Create Admin Role

**Purpose:** Defines permissions for the customer's admin user

1. Navigate to **Settings → Roles**
2. Click **"Create new role"**
3. Fill in the details:
   - **Name:** `{Company Name} Admin`
   - **Description:** `Full admin access for {Company Name}`
   - **Channels:** Select the channel from Step 1
4. **Set Permissions:** Select ALL for these entities:
   - **Asset:** CreateAsset, ReadAsset, UpdateAsset, DeleteAsset
   - **Catalog:** CreateCatalog, ReadCatalog, UpdateCatalog, DeleteCatalog
   - **Customer:** CreateCustomer, ReadCustomer, UpdateCustomer, DeleteCustomer
   - **Order:** CreateOrder, ReadOrder, UpdateOrder, DeleteOrder
   - **Product:** CreateProduct, ReadProduct, UpdateProduct, DeleteProduct
   - **ProductVariant:** CreateProductVariant, ReadProductVariant, UpdateProductVariant, DeleteProductVariant
   - **StockLocation:** CreateStockLocation, ReadStockLocation, UpdateStockLocation
   - **Payment:** CreatePayment, ReadPayment, UpdatePayment, SettlePayment
   - **Fulfillment:** CreateFulfillment, ReadFulfillment, UpdateFulfillment
5. Click **Save**

**Why this matters:** Missing permissions cause 403 errors in the frontend.

### Step 5: Create Admin User

**Purpose:** Creates the customer's login credentials

1. Navigate to **Settings → Administrators**
2. Click **"Create new administrator"**
3. Fill in the details:
   - **Email:** `admin@{company-domain}.com`
   - **First name:** `{Admin First Name}`
   - **Last name:** `{Admin Last Name}`
   - **Password:** Generate strong password (save securely)
4. **Assign Role:** Select the role from Step 4
5. Click **Save**
6. **IMPORTANT:** Send credentials to customer securely

**Why this matters:** This is the customer's only way to access their system.

---

## Verification & Testing

### Pre-Handoff Checklist

Before handing off to the customer, verify:

- [ ] **Channel exists and is active**
- [ ] **Stock location created and assigned to channel**
- [ ] **Payment methods (Cash + M-Pesa) created and assigned to channel**
- [ ] **Admin role created with all required permissions**
- [ ] **Admin user created and assigned to role**
- [ ] **Walk-in customer exists** (`walkin@pos.local`)

### System Testing

#### Login Test

- [ ] Admin can access frontend with their credentials
- [ ] Admin sees ONLY their channel's data (not other companies)

#### POS Functionality Test

- [ ] Can create new orders
- [ ] Can add products to cart
- [ ] Payment methods appear at checkout
- [ ] Orders complete successfully
- [ ] Order state transitions to PaymentSettled

#### ML Model Test (if applicable)

- [ ] ML models load for the channel
- [ ] Product recognition works with camera
- [ ] Confidence scores are accurate
- [ ] Fallback to manual entry works

---

## Customer Handoff

### Information to Provide

Send the following to the customer:

1. **Login Credentials:**

   - Frontend URL: `http://your-domain.com` (or localhost:4200 for development)
   - Email: `admin@{company-domain}.com`
   - Password: `{generated-password}`

2. **Quick Start Guide:**

   - How to access the system
   - How to add products
   - How to process sales
   - How to manage inventory

3. **Support Information:**
   - Contact details for technical support
   - Documentation links
   - Training resources

### Security Notes

- **Never send passwords via email**
- Use secure communication channels
- Consider using a password manager for credential sharing
- Provide instructions for password change on first login

---

## Troubleshooting

### Common Setup Issues

#### Product Photos Fail (403 Forbidden)

**Cause:** Missing Asset permissions on role  
**Solution:**

1. Go to Settings → Roles
2. Edit the customer's role
3. Add CreateAsset, ReadAsset, UpdateAsset permissions
4. Save changes

#### Orders Fail to Create

**Cause:** No stock location assigned to channel  
**Solution:**

1. Go to Settings → Stock Locations
2. Edit the stock location
3. Ensure it's assigned to the customer's channel

#### No Payment Methods at Checkout

**Cause:** Payment methods not assigned to channel  
**Solution:**

1. Go to Settings → Payment Methods
2. Edit each payment method
3. Ensure the customer's channel is selected

#### Admin Sees All Companies

**Cause:** Role not scoped to channel  
**Solution:**

1. Go to Settings → Roles
2. Edit the customer's role
3. Ensure only their channel is selected

#### User Cannot Login

**Cause:** User not assigned to role or role not assigned to channel  
**Solution:**

1. Go to Settings → Administrators
2. Edit the user
3. Ensure they're assigned to the correct role
4. Verify the role is channel-scoped

### Order Process Issues

#### "No Shipping Methods Available" Error

**Cause:** System trying to set shipping method (now disabled)  
**Solution:** Verify `arrangingPaymentRequiresShipping: false` in backend config

#### Order State Transition Errors

**Cause:** Missing customer or address information  
**Solution:** Ensure customer and addresses are set before state transition

### ML Model Issues

#### Product Recognition Not Working

**Cause:** ML model not uploaded or configured  
**Solution:** Upload ML model files to channel assets (see [VENDURE.md](./VENDURE.md))

#### Camera Not Working

**Cause:** Browser permissions or HTTPS required  
**Solution:** Enable camera permissions and use HTTPS

---

## Automation Opportunities

### Scriptable Steps

The following steps can be automated:

1. **Channel Creation:** Via Vendure Admin API
2. **Stock Location Creation:** Via Vendure Admin API
3. **Payment Method Creation:** Via Vendure Admin API
4. **Role Creation:** Via Vendure Admin API
5. **User Creation:** Via Vendure Admin API

### Future Automation

Consider implementing:

- **Bulk customer provisioning** via API scripts
- **Template-based setup** for common configurations
- **Automated testing** of customer setups
- **Self-service customer onboarding** portal

---

## Related Documentation

- **Technical Setup:** [VENDURE.md](./VENDURE.md) - Backend configuration and technical details
- **Infrastructure:** [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) - Server setup and deployment
- **ML Training:** [ML_TRAINING_SETUP.md](./ML_TRAINING_SETUP.md) - Machine learning model setup
- **General:** [README.md](./README.md) - Project overview and getting started

---

**Built with ❤️ for African small businesses**
