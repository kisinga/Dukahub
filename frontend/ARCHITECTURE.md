# Frontend Architecture

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
