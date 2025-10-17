# Frontend Architecture

## Product Model

### Product Structure (Current Implementation)

**1 Product = Multiple SKUs** - One item with multiple pricing/quantity options.

**Structure:**

```
Product: "Tomatoes"
├── identification: barcode OR label photos (required, choose ONE)
└── SKUs (ProductVariants) - Multiple price points
    ├── SKU 1: "TOM-1KG" → 1kg @ 100/=, stock: 50
    ├── SKU 2: "TOM-2KG" → 2kg @ 180/=, stock: 30
    └── SKU 3: "TOM-5KG" → 5kg @ 400/=, stock: 10
```

**Why Multiple SKUs?**

- **Quantity pricing**: 1kg vs 2kg vs 5kg
- **Service tiers**: Regular vs Premium vs Kids haircut
- **Package sizes**: 300ml vs 500ml vs 1L Coca Cola

**Item Identification Methods (Choose ONE):**

**Method 1: Barcode** (For packaged/manufactured goods)

- Scan or manually enter product barcode
- Best for: Packaged goods, branded items, pre-printed barcodes
- Example: "012345678901" on Coca Cola bottle

**Method 2: Label Photos (5+)** (For fresh produce/bulk items)

- Take 5+ photos OF THE PRICE TAG/LABEL (not the product!)
- ML model trains on the label, not the item itself
- Best for: Fresh produce, bulk items, handwritten tags
- Example: Tomatoes with "TOMATO 10/=" tag

**Why Label Photos, Not Product Photos?**

Small-scale vendors face unique challenges:

- **Non-uniform products**: Every tomato looks different
- **False positives**: Tomatoes vs oranges vs onions
- **Environmental variance**: Lighting, angles, deterioration
- **Existing workflow**: Vendors already use handwritten price tags

**Solution**: Photograph the LABEL, not the produce

- Labels are consistent and unique
- Vendors already create them
- No workflow change needed
- ML recognition becomes reliable

**Real-World Example:**

```
Vendor sells: Tomatoes, Onions, Oranges
Each has handwritten tag: "TOMATO 10/=", "ONION 5/=", "ORANGE 15/="

At POS:
1. Cashier points camera at tag
2. ML recognizes "TOMATO 10/=" label
3. System adds tomatoes to cart
4. Fast, accurate, no typing
```

**Key Insight (KISS):**

```
Problem: Tomatoes look different every time (color, size, ripeness)
Wrong Solution: Train ML on tomato photos → False positives with oranges
Right Solution: Train ML on the "TOMATO 10/=" label → Consistent, reliable

Vendors already write labels. We just need to photograph them.
No workflow change. Maximum reliability. KISS.
```

**Target Market:**

- Small-scale vendors (markets, roadside stalls)
- Fresh produce sellers
- Non-digitized record keepers
- Bulk item retailers
- Informal economy participants

**UX Flow (CRITICAL: Multiple SKUs):**

**Step 1: Identify Item** (Choose ONE method)

- **Option A**: Scan barcode (packaged goods)
- **Option B**: Take 5+ photos of THE LABEL/CARD (fresh produce/services)

**Step 2: Name the Product**

- Enter product name: "Tomatoes" or "Haircut" or "Coca Cola"

**Step 3: Add SKUs** ⚠️ **CRITICAL - Multiple price points**

- **At least 1 SKU required, can add multiple**
- Each SKU has:
  - Name/Size (e.g., "1kg", "2kg", "5kg" OR "Kids", "Regular", "Premium")
  - Price (different for each SKU)
  - Stock quantity (for products) or infinite (for services)

**Real-World Examples:**

**Fresh Produce:**

```
Product: "Tomatoes" (1 label identifies all sizes)
└── Multiple SKUs:
    ├── 1kg @ 100/= (50 in stock)
    ├── 2kg @ 180/= (30 in stock)
    └── 5kg @ 400/= (10 in stock)
```

**Services:**

```
Product: "Haircut" (1 service card identifies all tiers)
└── Multiple SKUs:
    ├── Kids @ 300/= (infinite)
    ├── Regular @ 500/= (infinite)
    └── Premium @ 800/= (infinite)
```

**Beverages:**

```
Product: "Coca Cola" (1 barcode identifies all sizes)
└── Multiple SKUs:
    ├── 300ml @ 50/= (100 in stock)
    ├── 500ml @ 80/= (75 in stock)
    └── 1L @ 120/= (50 in stock)
```

**At POS:**

1. Camera sees label/card → Recognizes "Tomatoes"
2. Cashier selects size: "2kg"
3. System adds: Tomatoes 2kg @ 180/= to cart
4. Fast, accurate!

**Use Cases:**

**Barcode Method:**

- Retail: Packaged goods with barcodes
- Groceries: Pre-manufactured items
- Branded products

**Label Method:**

- Fresh produce markets
- Bulk item sellers
- Roadside vendors
- Non-digitized inventory

---

### Services (Same Label/Card Strategy)

**Services apply the same visual card concept for identification.**

**Real-World Example: Kinyozi (Barbershop)**

Instead of photographing the service being performed, create **service cards**:

```
Service Menu Cards:
├── "Haircut" → Printed card with ✂️ head icon
├── "Neck Massage" → Card with 💆 massage icon
├── "Retouch" → Card with touch-up icon
└── "Shave" → Card with razor icon

Setup Process:
1. Print or draw service cards (laminated paper/cardboard)
2. Take 5+ photos of EACH card (different angles)
3. System learns to recognize each card
4. Cards stay at workstation (on desk, wall, or counter)

At Checkout:
1. Cashier points camera at "Haircut" card on desk
2. System recognizes card → Adds "Haircut" to cart
3. Fast, no typing, no searching menus
```

**Why Service Cards Work (KISS):**

- **Consistent**: Card doesn't change like actual haircuts do
- **Fast**: Point camera at card sitting on desk
- **No inventory**: Services don't need stock tracking
- **Existing practice**: Shops already have service menus/price lists
- **One-time setup**: Create cards once, use forever
- **Visual**: Even image on computer screen works

**Service Examples:**

- **Salon**: Haircut card, Manicure card, Pedicure card, Coloring card
- **Spa**: Different massage types as cards
- **Repair shop**: Service types as cards (Screen Repair, Battery Replacement)
- **Consulting**: Session types as cards (1hr Session, Full Day)

**Technical (Native Vendure Support):**

**NO custom field needed!** Vendure natively distinguishes products vs services:

```typescript
ProductVariant {
  trackInventory: GlobalFlag  // Native Vendure field
}

// Values:
// - TRUE: Product (tracks stock, finite inventory)
// - FALSE: Service (no tracking, infinite "stock")
// - INHERIT: Use global channel settings
```

**Implementation:**

- **Products**: `trackInventory: GlobalFlag.TRUE`
  - Stock is tracked per location
  - `stockOnHand` decrements on sale
  - Shows "Out of Stock" when depleted
- **Services**: `trackInventory: GlobalFlag.FALSE`
  - No stock tracking (infinite availability)
  - `stockOnHand` always 0 (ignored)
  - Never "Out of Stock"

**Benefits (KISS):**

- Uses Vendure's built-in functionality
- No custom fields needed
- Semantic correctness
- Standard filtering: `productVariants(filter: { trackInventory: { eq: FALSE } })`

**Same workflow for both:**

- Same label/card photo workflow
- Same ML recognition system
- Same checkout process

**Barcode Scanner Reusability:**

The `BarcodeScannerComponent` and `BarcodeScannerService` are modular and reused across:

1. **Product Creation** (`product-create.component.ts`)

   - Scan barcode to identify packaged goods
   - Auto-fill product info if barcode exists in catalog

2. **POS Checkout** (`sell.component.ts`)

   - Scan items to add to cart
   - Fast checkout workflow

3. **Inventory Management**
   - Stock taking
   - Quick item lookup

**Usage Pattern:**

```typescript
// In any component
import { BarcodeScannerComponent } from './components/barcode-scanner.component';

// Template
<app-barcode-scanner
  #scanner
  (barcodeScanned)="handleBarcode($event)"
/>

// Component
readonly scanner = viewChild<BarcodeScannerComponent>('scanner');

async startScanner() {
  const scannerComponent = this.scanner();
  if (scannerComponent) {
    await scannerComponent.startScanning();
  }
}

handleBarcode(barcode: string) {
  // Process barcode
}
```

---

### Complex Products (Future: Phase 2)

**1 Product = Multiple SKUs** - For items with variations.

**Structure:**

```
Product: "T-Shirt"
├── ProductOptionGroup: "Size"
│   └── Options: Small, Medium, Large
├── ProductOptionGroup: "Color"
│   └── Options: Red, Blue, Green
└── SKUs (ProductVariants) - Combinations
    ├── SKU 1: "TSHIRT-S-RED" (Small + Red) → $20, stock: 10
    ├── SKU 2: "TSHIRT-S-BLUE" (Small + Blue) → $20, stock: 15
    ├── SKU 3: "TSHIRT-M-RED" (Medium + Red) → $22, stock: 20
    └── ... (9 total: 3 sizes × 3 colors)
```

**When Needed:**

- Fashion: Size/Color combinations
- Bundles: Pack sizes (6-pack vs 12-pack)
- Assembly items: Different configurations

**Assembly Example:**

```
Product: "Office Desk Set"
├── OptionGroup: "Desk Size"
│   └── Options: Small, Large
├── OptionGroup: "Chair Type"
│   └── Options: Basic, Ergonomic
└── SKUs
    ├── "DESK-SET-SM-BASIC" (Small Desk + Basic Chair) → $500
    ├── "DESK-SET-SM-ERGO" (Small Desk + Ergonomic Chair) → $650
    ├── "DESK-SET-LG-BASIC" (Large Desk + Basic Chair) → $600
    └── "DESK-SET-LG-ERGO" (Large Desk + Ergonomic Chair) → $750
```

Each SKU can track:

- Individual pricing
- Individual stock levels
- Component items (advanced: Bill of Materials)

**Note:** Not implemented yet. Current version focuses on simple products (Phase 1).

---

### Implementation Status

**Current (Phase 1):** Simple Products Only

- Component: `product-create.component.ts` ✅ Active
- Route: `/dashboard/products/create` → Simple Component
- **UX:** Clean, focused form for single SKU products
- **Code:** ~200 lines, no complex state management

**Future (Phase 2):** Complex Products

- Component: `product-create.component.ts` ⏸️ Preserved for reference
- **When to implement:** Customer requests variations/bundles
- **What unlocks:**
  - Fashion: Size/Color matrices
  - Bundles: Pack sizes
  - Assembly: Configuration options
  - **Complexity trade-off:** ~400 lines + services

**Decision Rationale (KISS):**

- 90% of inventory = simple products (1 SKU each)
- Barcode-first workflow = simple products
- Complex products add significant UI/UX complexity
- Better to nail simple case perfectly first

---

## Multi-Tenancy

**Channel** = Customer company (e.g., "Downtown Groceries")  
**Stock Location** = Physical shop within company

### Setup Requirements

Each Channel needs:

1. At least ONE Stock Location (required for sales/inventory)
2. Payment Method
3. Roles → Users

- Shares product catalog across all locations
- Tracks inventory per physical location
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

### User Context Hierarchy

```
Login → Auto-select Channel → Select Shop → Scoped Operations
```

### Scoping

| Feature   | Scope          |
| --------- | -------------- |
| Sales     | Shop-specific  |
| Inventory | Shop-specific  |
| Products  | Company-wide   |
| Customers | Company-wide   |
| Stats     | Shop (default) |

## Layouts

### Marketing

- Simple navbar + footer
- Static pages (home, login)

### Dashboard

- Advanced navbar (user menu, notifications)
- Sidebar (desktop) + Bottom nav (mobile)
- Lazy-loaded routes

## Structure

```
src/app/
├── core/              # Shared (services, guards)
├── pages/             # Marketing (home, auth)
└── dashboard/         # Admin area
    ├── layout/        # Dashboard layout
    └── pages/         # Feature pages
```

## Mobile-First

- Drawer sidebar (mobile)
- Bottom navigation (4 actions)
- Touch targets ≥ 44px
- OnPush change detection
- Signal-based state

## Offline-First POS Architecture

### Overview

The POS implements offline-first design by pre-fetching all critical data on dashboard boot.

### Core Services

#### ProductCacheService

In-memory cache for instant product lookup:

- Pre-fetches ALL channel products on boot
- O(1) lookup by ID (for ML detection)
- Fast search by name
- Status tracking via signals

#### AppInitService

Orchestrates boot-time initialization:

- Triggered on company selection
- Parallel prefetch: products + ML model
- Graceful degradation (works without ML)

#### Enhanced Services

- **ProductSearchService**: Cache-first for all operations
- **MlModelService**: IndexedDB caching via TensorFlow.js
- **DashboardLayoutComponent**: Auto-init on company change

### Data Flow

```
Login → Dashboard → Company Selected
  ↓
AppInitService.initializeDashboard()
  ├─→ Prefetch products → Memory
  └─→ Load ML model → IndexedDB
  ↓
✅ Offline-Ready
```

### ML Detection (Offline)

```
Camera → ML predicts product ID
  ↓
ProductCacheService.getProductById() ← O(1), no network
  ↓
✅ Instant result
```

### Cache Strategy

- **Products**: Memory (refreshed on reload)
- **ML Model**: IndexedDB (persists across reloads)
- **Apollo**: Used for mutations only

### Performance

- Product search: 300ms → <10ms (**30x faster**)
- ML lookup: 300ms → <5ms (**60x faster**)
- Model load (2nd+): 2s → 500ms (**4x faster**)

### Offline Capabilities

✅ Product search, ML scanning, cart operations, navigation  
⚠️ Requires network: checkout, inventory sync

## Channel-Based Dashboard (Nov 2025)

### Simplified Architecture

Dashboard is **channel-specific** by default. Users with multi-company access can switch between companies via navbar dropdown.

### Mental Model

- **Channel** = Company + Default Stock Location (primary context)
- All operations scoped to active channel
- Stock location shown as metadata, not as user-selectable filter

### Architectural Rationale

**Why channel-scoped, not location-scoped?**

1. **Native Vendure Support:** Orders, products, payments naturally scoped to channels
2. **No Custom Plugin Needed:** Location filtering requires custom Vendure plugin
3. **Business Logic:** Payment accounts owned at company level, not per-location
4. **Simplicity:** 90% of businesses have one primary location per channel

**Location-based filtering:** Deferred to Phase 2 (requires custom plugin - see Priority 1 below)

### State Management

**CompanyService:**

- `activeCompanyId()` - Single source of truth for current context
- `activeCompany()` - Full company details including custom fields
- `selectCompany(id)` - Switch between companies (rare for single-company users)

**StockLocationService (Simplified):**

- `locations()` - All locations for active channel
- `getDefaultLocation()` - Returns channel's default stock location
- Removed: `activeLocationId` signal (no longer needed)
- Removed: `selectLocation()` method (no multi-location support yet)
- Removed: localStorage persistence for location

**DashboardService:**

- `fetchDashboardData()` - Fetches channel-scoped stats
- No location parameter (orders already channel-scoped by Vendure)

### Data Flow

**Application Boot:**

```
1. Login → Company restored from localStorage
2. StockLocationService.fetchLocations()
3. Default location identified (first location or from channel.customFields.defaultStockLocationId)
4. Dashboard fetches channel-scoped data
5. Orders/products filtered by channel (native Vendure)
```

**Company Switch (Multi-Company Users):**

```
6. User clicks company dropdown in navbar
7. selectCompany(id) → Channel activated in context
8. Locations refetched for new channel
9. Dashboard reinitialized with new channel data
10. All data now scoped to new channel
```

### UI Structure

**Navbar:**

- Company selector dropdown (for multi-company users)
- Notifications
- User menu

**Removed from UI:**

- Location switcher dropdown (no longer needed)
- Location-based filtering options

### Component Architecture

**DashboardLayoutComponent:**

- Renders navbar with company switcher (not location switcher)
- Manages company selection only
- Initializes dashboard on company change
- No location-specific logic

**OverviewComponent:**

- No location-specific effects
- Fetches data on company change only
- Stats naturally scoped to channel (Vendure native)

**Effect pattern:**

```typescript
effect(
  () => {
    const companyId = this.companyService.activeCompanyId();
    if (companyId) {
      this.dashboardService.fetchDashboardData();
    }
  },
  { allowSignalWrites: true }
);
```

### Backend Custom Fields

#### Channel (Company)

```typescript
customFields: {
  companyLogoId: string | null; // Asset ID for logo
  cashierFlowEnabled: boolean;
  defaultStockLocationId: string | null; // NEW: Default location for orders
  mlModelJsonId: string | null;
  mlModelBinId: string | null;
  mlMetadataId: string | null;
}
```

**Migrations**:

- `1760510000000-AddCompanyLogoCustomField.ts`
- `1760525000000-AddDefaultLocationToChannel.ts` (NEW)

### Known Limitations

**1. Single Location Per Channel**

- Current architecture supports one stock location per channel
- Multi-location requires custom plugin (see Future Enhancements)
- Location shown as metadata only, not as user-selectable filter
- Sufficient for 90% of use cases (single-location businesses)

**2. Revenue Reporting**

- Reports are channel-scoped (native Vendure)
- No per-location breakdowns (requires custom plugin)
- Dashboard shows aggregated channel data

### Future Enhancements

**Priority 1: Multi-Location Support (Phase 2)**

Requires custom Vendure plugin to:

- Add `stockLocationId` to Order custom fields
- Filter orders query by location
- Query products with stock at specific location

**Implementation:**

1. Create custom Vendure plugin
2. Restore location switcher UI
3. Add location parameter to dashboard queries
4. Per-location inventory reporting

**Priority 2: Advanced Reporting**

- Revenue by location (requires Priority 1)
- Stock transfer between locations
- Location-specific pricing
- Multi-location order fulfillment

#### Priority 3: Stock Conversion Module (Fresh Produce)

**Problem:** Vendors buy bulk (100kg tomatoes), then package into different sizes.

**Current:** Vendor manually calculates and enters stock per SKU:

```
Bought: 100kg bulk
Packaged: 50x1kg, 25x2kg bags
Manual entry: SKU1=50, SKU2=25
```

**Future Enhancement:** Stock conversion tool:

```
1. Enter bulk purchase: 100kg tomatoes @ 500/=
2. Choose conversion:
   - 40kg → 40x 1kg bags (SKU: TOM-1KG)
   - 40kg → 20x 2kg bags (SKU: TOM-2KG)
   - 20kg → 4x 5kg bags (SKU: TOM-5KG)
3. System auto-updates stock:
   - TOM-1KG: +40 units
   - TOM-2KG: +20 units
   - TOM-5KG: +4 units
4. Tracks cost basis for profit calculation
```

**Benefits:**

- ✅ No manual calculation errors
- ✅ Tracks COGS per SKU for profit margins
- ✅ History of bulk purchases vs packaged sales
- ✅ Waste tracking (100kg bought, only 95kg sold)

**Implementation:**

- New route: `/dashboard/inventory/convert`
- Select product with multiple SKUs
- Enter bulk quantity and cost
- Drag-drop or input to allocate to SKUs
- Saves as InventoryAdjustment with conversion metadata

**Use Cases:**

- Fresh produce (tomatoes, onions, rice, sugar)
- Bulk liquids (oil, milk) bottled on-site
- Fabric sold by meters → converted to standard lengths
- Any bulk-to-retail conversion

### Files Changed (Architecture Simplification)

**Services:**

- `core/services/stock-location.service.ts` - Removed active location state, added getDefaultLocation()
- `core/services/dashboard.service.ts` - Removed location parameter from fetchDashboardData()
- `core/services/order.service.ts` - NEW: Order creation and payment processing
- `core/graphql/order.graphql.ts` - NEW: Order mutations

**Components:**

- `dashboard/layout/dashboard-layout.component.ts` - Removed location switcher logic
- `dashboard/layout/dashboard-layout.component.html` - Removed location dropdown UI
- `dashboard/pages/overview/overview.component.ts` - Simplified to company-only effects
- `dashboard/pages/sell/sell.component.ts` - Integrated OrderService for checkout
- `dashboard/pages/sell/components/checkout-modal.component.ts` - Simplified payment methods

**Backend:**

- `backend/src/plugins/payment-handlers.ts` - NEW: Cash and M-Pesa payment handlers
- `backend/src/vendure-config.ts` - Registered payment handlers, added defaultStockLocationId custom field
- `backend/src/migrations/1760525000000-AddDefaultLocationToChannel.ts` - NEW: Migration for default location

**Benefits:**

- Simpler codebase (less state management)
- Aligned with Vendure's native scoping
- No custom filtering logic needed
- Faster dashboard load times

---

## Products Page - Component Architecture

### Overview

The products page has been refactored from a monolithic component (~930 lines HTML + ~195 lines TS) into a composable architecture with focused, reusable components following SOLID principles and Angular best practices.

### Component Structure

```
dashboard/pages/products/
├── products.component.ts           # Main orchestrator (~175 lines)
├── products.component.html         # Clean template (~245 lines)
├── products.component.scss         # Styles
└── components/
    ├── product-card.component.ts         # Mobile collapsible card
    ├── product-card.component.html
    ├── product-stats.component.ts        # Statistics grid (4 cards)
    ├── product-stats.component.html
    ├── product-search-bar.component.ts   # Search input + filter toggle
    ├── product-search-bar.component.html
    ├── product-table-row.component.ts    # Desktop table row
    ├── product-table-row.component.html
    ├── pagination.component.ts           # Responsive pagination
    └── pagination.component.html
```

### Component Responsibilities

#### ProductsComponent (Main)

**Role:** Orchestrator - manages state, handles actions, coordinates child components

**State:**

- Products list (from service)
- Search query (local signal)
- Pagination state (current page, items per page)
- Computed: filtered products, paginated products, total pages, statistics

**Actions:**

- `onProductAction()` - Routes view/edit/purchase actions
- `loadProducts()` - Fetches products from service
- `goToPage()` - Pagination navigation
- `changeItemsPerPage()` - Update page size

#### ProductCardComponent

**Role:** Mobile view of product with expandable details

**Features:**

- Summary: image, name, status badge, variants count, stock level, price range
- Collapsible details (native `<details>` element):
  - Full description
  - Detailed info grid (variants, stock with icons)
  - Action buttons: Purchase (primary), Edit (ghost)
- Stock color coding: success (>20), warning (1-20), error (0)
- Touch-optimized: large tap targets, clear visual hierarchy

#### ProductStatsComponent

**Role:** Display key metrics in responsive grid

**Stats Displayed:**

- Total Products (primary color)
- Total Variants (secondary color)
- Total Stock (success color)
- Low Stock Alert (warning color)

**Design:**

- Gradient backgrounds with subtle borders
- Icon + number display
- Responsive: 2-column (mobile) → 4-column (desktop)

#### ProductSearchBarComponent

**Role:** Search and filter controls

**Features:**

- Search input with two-way binding (`model()` signal)
- Clear button (shows when search active)
- Filter drawer toggle button
- Responsive sizing: `btn-lg` (mobile), `btn-md` (desktop)

#### ProductTableRowComponent

**Role:** Compact row for desktop table view

**Features:**

- Product thumbnail (12x12 rounded)
- Name with truncated description
- Variant count badge
- Price range (formatted)
- Stock badge (color-coded)
- Status badge (Active/Disabled)
- Action buttons: Purchase, Edit (icon-only, with tooltips)

#### PaginationComponent

**Role:** Navigate through paginated results

**Features:**

- First/Previous/Next/Last buttons
- Page numbers (desktop: up to 5 visible)
- Current page badge (mobile: single number)
- Page info: "Showing X-Y of Z items"
- Configurable: items per page, item label

### Type Safety

**Shared Interfaces:**

```typescript
// Product data passed to card/row components
interface ProductCardData {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  featuredAsset?: { preview?: string };
  variants?: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    stockOnHand: number;
  }>;
}

// Actions emitted from product components
type ProductAction = 'view' | 'edit' | 'purchase';

// Statistics data
interface ProductStats {
  totalProducts: number;
  totalVariants: number;
  totalStock: number;
  lowStock: number;
}
```

### Product Actions

**Action Flow:**

```
User clicks action button
    ↓
Child component emits: { action: ProductAction, productId: string }
    ↓
Parent catches via: (action)="onProductAction($event)"
    ↓
Switch on action type:
    - 'view'     → (Future) Navigate to detail page
    - 'edit'     → Navigate to /products/edit/:id
    - 'purchase' → (Future) Navigate to supplier purchase flow
```

**Edit Mode:**

- Route: `/dashboard/products/edit/:id`
- **Separate component:** `ProductEditComponent` (not reusing create component)
- Loads product data via `productService.getProductById(id)`
- Pre-fills form with existing values
- Clean, focused interface for editing:
  - Product name
  - SKU names and prices
  - Stock displayed as read-only
- No identification fields (barcode/photos - set during creation only)
- No creation-specific validation
- Clear "Save Changes" button (not "Create Product")
- Prices converted from cents to decimal for editing

**Purchase Hook:**

- Ready for supplier integration
- Current: Console log (placeholder)
- Future: Navigate to `/dashboard/purchases/create?productId=X`
- Accessible from both mobile card and desktop table

### Mobile Optimization (KISS)

**Principles Applied:**

1. **Single column layout** - No complex multi-column grids
2. **Native collapsible** - `<details>` element for expand/collapse
3. **Touch-friendly** - Large buttons (btn-lg), generous tap areas
4. **Simplified pagination** - Show only current page number badge
5. **FAB for primary action** - Floating "+" button for create
6. **Clear hierarchy** - Bold headings, ample spacing
7. **Responsive sizing** - Larger UI elements on mobile

**Mobile-Specific Features:**

- Collapsible product cards (summary + expandable details)
- Ring-bordered thumbnails (visual depth without shadows)
- 2-column info grid in expanded view
- Full-width action buttons (easy thumb access)
- Status badges with dot indicators
- FAB positioned above bottom nav bar

### Performance Optimizations

**Change Detection:**

- All components use `OnPush` strategy
- State managed via signals (fine-grained reactivity)
- Computed signals for derived state (auto-memoized)

**Rendering:**

- `trackBy` functions for list rendering
- Conditional rendering via `@if` / `@for`
- Lazy component loading (route-level code splitting)

**Bundle Size:**

- Separated concerns = better tree-shaking
- Smaller components = smaller chunks
- Reusable code = less duplication

### Key Improvements

**Before Refactoring:**

- Single 930-line HTML file
- Mixed concerns (stats, search, cards, table, pagination)
- Difficult to maintain and test
- Monolithic component logic

**After Refactoring:**

- 6 focused components (avg ~50 lines each)
- Clear separation of concerns
- Easy to test in isolation
- Reusable across application
- Better type safety
- Improved mobile UX
- 60% reduction in main component size

### Future Enhancements

**Ready for Implementation:**

1. **View Details Page** - Product detail view with variant management
2. **Supplier Purchase Flow** - Complete purchase action integration
3. **Advanced Filtering** - Status, stock level, price range filters
4. **Batch Operations** - Select multiple products for bulk actions
5. **Export/Import** - CSV/Excel export of product list
6. **Bulk Edit** - Update multiple products simultaneously

**Extensibility Points:**

- Add new actions via `ProductAction` type union
- Custom stat cards via props injection
- Alternative view modes (grid, compact list)
- Advanced search with filters sidebar
- Real-time updates via WebSocket/polling

### Files Structure

**Main Component:**

- `products.component.ts` - State management, action handling
- `products.component.html` - Layout orchestration
- `products.component.scss` - Custom styles (minimal)

**Reusable Components (all in `components/`):**

- `product-card.*` - Mobile collapsible card view
- `product-stats.*` - Statistics cards grid
- `product-search-bar.*` - Search input + filter button
- `product-table-row.*` - Desktop table row
- `pagination.*` - Pagination controls

**Shared:**

- Types exported from components (ProductCardData, ProductAction, etc.)
- Utility functions (price formatting, stock calculation) in component classes
- No shared services needed (all props-based communication)

### Price Handling

**IMPORTANT: All prices in the app are inclusive of tax** (KISS - no tax calculations needed)

**Storage Format:**

- Backend stores prices in cents (integer): `1050` = 10.50
- Prevents floating-point precision issues

**Display Format:**

- Form inputs show decimal: `10.50`
- Price lists show decimal: `$10.50`

**Conversion Flow:**

```typescript
// Edit mode: Load from backend (cents → decimal)
const priceDecimal = priceInCents / 100; // 1050 → 10.50

// Save: Convert to cents (decimal → cents)
const priceInCents = Math.round(price * 100); // 10.50 → 1050
```

**Why Cents?**

- ✅ No floating-point errors (0.1 + 0.2 ≠ 0.3)
- ✅ Accurate arithmetic for financial calculations
- ✅ Database stores as integer (faster, smaller)
- ✅ Industry standard for monetary values

### Stock Management in Edit Mode

**Philosophy:** Edit form is for product metadata, not inventory

**Behavior:**

- Existing SKUs: Show current stock (read-only)
- New SKUs: Locked to 0 stock
- Message: "Use inventory adjustments to modify stock"

**Why Read-Only?**

- ✅ Prevents accidental stock changes
- ✅ Maintains audit trail via inventory adjustments
- ✅ Clear separation: Edit form = metadata, Inventory module = stock
- ✅ Follows accounting best practices

**Stock Modification Flow:**

```
Edit Product → Change prices/names → Save
                                      ↓
                            Stock unchanged
                                      ↓
Inventory Module → Adjustment → Track reason/date → Update stock
```
