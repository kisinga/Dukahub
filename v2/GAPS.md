# Vendure GAPS

## Architectural

### Multi-Tenancy Model

Vendure's multi-tenancy uses a two-tier system:

**Channel** = Independent customer company (e.g., "Downtown Groceries Inc.")

- Provides complete data isolation between different POS customers
- Each company gets their own: products, orders, customers, permissions

**Stock Location** = Individual shop within a company (shares inventory)

- Multiple shops under one company share the same product catalog
- Inventory is tracked per location
- Example: Company has 3 shops (Downtown, Mall, Airport)

### ⚠️ Critical: Channel Setup Requirements

**For every Channel created, you MUST manually provision:**

1. **At least ONE Stock Location** (required for inventory tracking)
   - Inventory cannot be tracked without a Stock Location
   - Sales cannot be processed without a Stock Location
   - Even single-shop companies need a Stock Location
2. **Payment Method** (required for sales)
   - Each company needs its own payment configuration
3. **Role(s)** (required for user access)
   - Users are scoped to channels via roles
   - Unless intentional, each channel must have its own roles
   - Users belonging to a role can see all companies associated with that role

**Setup Order:** Channel → Stock Location → Payment Method → Roles → Assign Users

### User Context & UX Flow

**Login Flow:**

1. User logs in → First channel (company) is automatically selected
2. User selects their current shop (stock location)
3. All operations are scoped to: Channel (company) + Stock Location (shop)

**Navigation Hierarchy:**

- **Shop Selector**: Primary action in navigation bar (frequent use)
  - Switches active shop context for POS and stats
  - Most common daily operation
- **Company Selector**: Extended menu, first item (rare use)
  - Only for users managing multiple customer companies
  - Forces shop re-selection after switch

**Scoping Rules:**

- POS operations are shop-specific only
- Dashboard stats default to shop-specific, with option to view aggregate
- Future: Side-by-side shop comparison
