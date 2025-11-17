## Customers, Suppliers & Onboarding

This guide explains how Dukahub models **customers and suppliers**, and how you onboard new businesses and staff.

---

## What Problems This Solves

- Keep a **clean, unified list of people and organisations** you deal with.
- Avoid duplication between **customers and suppliers**.
- Onboard new **businesses and their admin users** in a repeatable way.
- Prepare the ground for **credit, balances and future automations**.

---

## Key Capabilities (with Origins)

- **Unified customers & suppliers** – Every supplier is also a customer with additional fields, so you can treat the same party as buyer or seller.  
  **Origin:** Dukahub-Exclusive (on top of Vendure Customer).

- **Mobile-first customer and supplier forms** – Simple, phone-friendly forms with validation tuned for Kenyan phone formats.  
  **Origin:** Dukahub-Exclusive.

- **Customer provisioning checklist** – A documented, repeatable process to bring a new business (channel) live, including stock location, payment methods, roles and admin users.  
  **Origin:** Dukahub-Exclusive (see `CUSTOMER_PROVISIONING.md`).

- **Basic credit fields** – Flags and limits that mark who may buy on credit and up to how much, ready for enforcement by the ledger.  
  **Origin:** Dukahub-Exclusive (see `CUSTOMER_SUPPLIER_INTEGRATION.md`, `VENDURE_CUSTOM_FIELDS.md`).

- **Outstanding amount tracking** – Each customer or supplier has a single outstanding balance, driven by the ledger.  
  **Origin:** Dukahub-Exclusive (ledger integration).

---

## Unified Customers & Suppliers

### 1. Single Entity Approach

Instead of separate “Customer” and “Supplier” records, Dukahub:

- Extends the Vendure **Customer** entity with additional custom fields.
- Uses one record for both roles:
  - `isSupplier` – Marks a customer as also being a supplier.
  - `supplierType`, `paymentTerms`, `notes`, etc. – Capture supplier-specific details.

This means:

- You don’t maintain duplicate records for the same business.
- A supplier can also place orders as a customer if needed.

**Origin:** Dukahub-Exclusive design on top of Vendure (see `CUSTOMER_SUPPLIER_INTEGRATION.md`).

---

### 2. Financial Fields

The same customer/supplier record also carries financial fields (see `VENDURE_CUSTOM_FIELDS.md` and `LEDGER_ARCHITECTURE.md`):

- `isCreditApproved` – Whether the customer is allowed to buy on credit.
- `creditLimit` – How much credit they can use (in currency units).
- `outstandingAmount` – Running balance:
  - Positive value: you owe them (typical for suppliers).
  - Negative value: they owe you (typical for customers on credit).

These values are **driven by the ledger**; the custom fields store a convenient snapshot that the frontend can read.

---

## Customer & Supplier Forms (UI)

### 1. Customer Creation

The **Customer Create** screen is designed for speed on mobile:

- **Required fields:**
  - Business name / person name.
  - Phone number (Kenyan pattern `0XXXXXXXXX`).
- **Optional fields:**
  - Email address.

Validation:

- Phone numbers must match a 10-digit format starting with `0`.
- Emails are validated but optional.

**Origin:** Dukahub-Exclusive mobile-first UI (see frontend architecture).

---

### 2. Supplier Creation (Two-Step)

Suppliers use a **two-step form**:

1. **Step 1 – Basic details** (same as customers):
   - Business name, contact person, phone, email.
2. **Step 2 – Supplier details**:
   - Supplier type (Manufacturer, Distributor, etc.).
   - Payment terms (Net 30, COD, etc.).
   - Tax ID, notes, and other optional details.

This maps directly onto the custom fields used in the backend.

**Origin:** Dukahub-Exclusive.

---

### 3. Editing Existing Records

Both customers and suppliers share a **Person Edit** form:

- Same validation and layout across both flows.
- Makes it easy to standardise data quality.

---

## Channel Provisioning & Onboarding (New Businesses)

Beyond individual customers and suppliers, Dukahub provides a **Customer Provisioning Guide** for onboarding whole businesses (channels) – see `CUSTOMER_PROVISIONING.md`.

### 1. Required Steps Per New Business

For each new customer business you onboard, you must:

1. **Create a Channel** – Represents the business.
2. **Create at least one Stock Location** – Where inventory is tracked.
3. **Create Payment Methods** – e.g. Cash, M‑Pesa.
4. **Initialise Chart of Accounts** – Required ledger accounts per channel.
5. **Create an Admin Role** – Full permissions for that business.
6. **Create an Admin User** – The business’s main login.

The provisioning guide contains SQL snippets and checklists to make this reproducible.

**Origin:** Dukahub-Exclusive operational pattern.

---

### 2. Verification & Handover

Before giving access to the customer, Dukahub recommends verifying:

- Channel exists and is active.
- Stock location and payment methods are correctly assigned.
- Ledger accounts are initialised.
- Admin role and user are set up and scoped to the correct channel.

Then you provide:

- Login URL.
- Admin email and initial password (via a secure channel).
- Quick start instructions (add products, process first sale, etc.).

---

## How This Connects to Credit & Balances

Customer and supplier onboarding is tightly linked to the **ledger** (see `LEDGER_ARCHITECTURE.md` and the `analytics-and-ledger.md` guide):

- The **outstandingAmount** field surfaces ledger-based balances at the person level.
- The ledger uses **customerId** and **supplierId** metadata on journal lines to:
  - Compute **accounts receivable** (customers who owe you).
  - Compute **accounts payable** (suppliers you owe).
- The credit plugin uses **isCreditApproved** and **creditLimit** to:
  - Allow or block credit checkout.
  - Tie credit limits directly into ledger-backed balances.

From a business perspective, this ensures that:

- Every sale on credit and payment against that balance stays in sync.
- Every supplier purchase and payment is properly tracked.

---

## How to Use & Configure (Workflows)

### A. Adding a New Named Customer

**Who:** Cashier, manager.

1. In the dashboard, go to **Customers → Add Customer**.
2. Fill in:
   - Name.
   - Phone number (0XXXXXXXXX).
   - Optional email.
3. Save.

The new customer can now:

- Be selected at checkout.
- Be assigned credit later if needed.

---

### B. Adding a New Supplier

**Who:** Owner, procurement, finance.

1. Go to **Suppliers → Add Supplier**.
2. Complete Step 1 (basic details).
3. Continue to Step 2 and, where known, set:
   - Supplier type and payment terms.
   - Tax ID and notes.
4. Save.

This supplier can now:

- Be referenced when recording purchases.
- Have their outstanding balance tracked.

---

### C. Approving Credit for a Customer

**Who:** Back-office or finance with credit permissions.

1. Open the customer record.
2. In the **Financial** or **Credit** section:
   - Set **Credit Approved** to true.
   - Set an appropriate **Credit Limit**.
3. Save.

Once set:

- The POS can allow “sell on credit” flows.
- The credit limit and ledger-backed outstanding balance are used to enforce available headroom.

---

### D. Onboarding a New Business (High-Level)

**Who:** Dukahub operator, implementation partner.

1. Follow `CUSTOMER_PROVISIONING.md` to:
   - Create channel.
   - Create stock location.
   - Create payment methods.
   - Initialise ledger accounts.
   - Create role and administrator user.
2. Confirm you can:
   - Log in as the new admin.
   - Create a test product.
   - Process a test sale.
3. Hand off login and quick instructions to the customer.

---

## Limitations & Notes

- **Filtering large lists:** Advanced backend filtering on custom fields (e.g. `isSupplier`) is partially constrained by Vendure’s current custom-field filter support. For now, some separation is done at the frontend level (see `CUSTOMER_SUPPLIER_INTEGRATION.md` “Future Optimizations”).
- **Credit policy is business-defined:** Dukahub enforces limits, but deciding who qualifies for credit is still a human decision.
- **Bulk migrations:** Moving an existing business into Dukahub (with thousands of customers/suppliers) may require tailored scripts using the Vendure admin API.

---

## Vendure vs Dukahub: What’s What

- **Vendure Core**
  - Customer entity and admin UI screens.
  - Basic groups and filtering abilities.

- **Dukahub-Enhanced**
  - Opinionated mapping of business fields (business name, contact person) to Vendure fields.
  - Mobile-first forms and validations that suit local contexts (e.g. Kenyan numbers).

- **Dukahub-Exclusive**
  - Single-entity customers + suppliers design.
  - Customer provisioning blueprint for new businesses.
  - Credit approvals, limits and outstanding balances tied to the ledger.
  - Future optimisations for large customer/supplier datasets.


