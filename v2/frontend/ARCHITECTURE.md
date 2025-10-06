# Frontend Architecture

## Multi-Tenancy Model

### Channel vs Stock Location

**Channel** = Independent customer company (e.g., "Downtown Groceries Inc.")

- Complete data isolation between POS customers
- Each gets their own: products, orders, customers, permissions

**Stock Location** = Individual shop within a company

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
User Login
  └─> Auto-select First Channel (Company)
       └─> Select Stock Location (Shop) - Primary Action
            └─> All POS operations scoped to this shop
```

### Selection Behavior

**Login Flow:**

1. User logs in → First company auto-selected
2. User selects their current shop
3. All operations scoped to: Company + Shop

**UI Placement:**

- **Shop Selector**: Primary navbar position (frequent use)
- **Company Selector**: Extended menu (rare use, multi-company users only)

### Scoping Rules

| Feature         | Scope                                 |
| --------------- | ------------------------------------- |
| POS Sales       | Shop-specific only                    |
| Inventory       | Shop-specific only                    |
| Dashboard Stats | Shop-specific (with aggregate option) |
| Product Catalog | Company-wide (shared)                 |
| Customers       | Company-wide (shared)                 |

## Layout Strategy

The app uses **route-based layouts** to support different UI structures for different sections.

### 1. Marketing Layout (Current)

**Used for**: Homepage, About, Terms, Privacy, etc.
**Location**: `src/app/core/layout/`

- Simple navbar with links
- Standard footer
- Static, marketing-focused content

```
┌─────────────────────────────────┐
│  Marketing Navbar (Simple)      │
├─────────────────────────────────┤
│                                 │
│     Page Content                │
│                                 │
├─────────────────────────────────┤
│  Footer                         │
└─────────────────────────────────┘
```

### 2. Dashboard Layout (Coming Soon)

**Used for**: Admin dashboard, POS, Inventory, Reports, Settings
**Location**: `src/app/dashboard/layout/`

- Advanced navbar with user menu, notifications, quick actions
- Sidebar navigation (collapsible on mobile)
- No footer (all screen space for app)
- Mobile-optimized with bottom navigation

```
┌─────────────────────────────────┐
│  Dashboard Navbar (Advanced)    │
├────┬────────────────────────────┤
│    │                            │
│ S  │  Dashboard Content         │
│ i  │                            │
│ d  │                            │
│ e  │                            │
│    │                            │
└────┴────────────────────────────┘
     └─ Mobile: Bottom Nav ─┘
```

## Implementation

### Current Structure (Marketing)

```typescript
// Each marketing page includes layout directly
@Component({
  selector: 'app-home',
  imports: [NavbarComponent, FooterComponent],
  template: `
    <app-navbar />
    <main><!-- content --></main>
    <app-footer />
  `
})
```

### Future Structure (Dashboard)

```typescript
// Dashboard pages use dashboard layout
@Component({
  selector: 'app-dashboard-layout',
  imports: [DashboardNavbarComponent, SidebarComponent],
  template: `
    <app-dashboard-navbar />
    <div class="drawer lg:drawer-open">
      <input id="drawer" type="checkbox" class="drawer-toggle" />
      <div class="drawer-content">
        <router-outlet /> <!-- Dashboard pages here -->
      </div>
      <div class="drawer-side">
        <app-sidebar />
      </div>
    </div>
  `
})
```

## Routing Structure

```typescript
export const routes: Routes = [
  // Marketing pages (simple layout, each includes navbar/footer)
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component'),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login.component'),
  },

  // Dashboard (complex layout with sidebar)
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/layout/dashboard-layout.component'),
    children: [
      {
        path: '',
        loadComponent: () => import('./dashboard/pages/overview/overview.component'),
      },
      {
        path: 'products',
        loadComponent: () => import('./dashboard/pages/products/products.component'),
      },
      {
        path: 'sell',
        loadComponent: () => import('./dashboard/pages/sell/sell.component'),
      },
      {
        path: 'inventory',
        loadComponent: () => import('./dashboard/pages/inventory/inventory.component'),
      },
      {
        path: 'reports',
        loadComponent: () => import('./dashboard/pages/reports/reports.component'),
      },
      {
        path: 'settings',
        loadComponent: () => import('./dashboard/pages/settings/settings.component'),
      },
    ],
  },
];
```

## Folder Structure

```
src/app/
├── core/
│   ├── layout/              # Marketing layout components
│   │   ├── navbar/          # Simple marketing navbar
│   │   └── footer/          # Standard footer
│   └── services/            # Shared services
│
├── pages/                   # Marketing pages
│   ├── home/
│   ├── auth/
│   └── ...
│
└── dashboard/               # Dashboard module (separate)
    ├── layout/              # Dashboard-specific layout
    │   ├── dashboard-layout.component.ts
    │   ├── navbar/          # Dashboard navbar (complex)
    │   └── sidebar/         # Sidebar navigation
    │
    └── pages/               # Dashboard pages
        ├── overview/
        ├── products/
        ├── sell/
        ├── inventory/
        ├── reports/
        └── settings/
```

## Key Benefits

1. **Separation of Concerns**: Marketing and dashboard are completely independent
2. **Lazy Loading**: Dashboard code only loads when user navigates to `/dashboard`
3. **Independent Styling**: Each layout can have its own design system
4. **Flexible**: Easy to add more layout types (e.g., mobile-only layouts)
5. **No Conflicts**: Marketing navbar won't interfere with dashboard navbar

## Dashboard Navbar Features (Future)

The dashboard navbar will include:

- User avatar with dropdown menu
- Notifications bell
- Quick actions (+ New Sale, + Product)
- Company/branch selector
- Search bar
- Mobile: Drawer toggle button
- Dark mode toggle
- Settings icon

## Mobile Strategy

### Marketing (Current)

- Simple hamburger menu
- Full-screen menu overlay
- CTA buttons always visible

### Dashboard (Future)

- Drawer navigation (swipe from left)
- Bottom navigation bar (dock component from daisyUI)
- Optimized for one-handed use
- Quick access to Sell/Scan

## Example: Adding Dashboard

When ready to build the dashboard:

```bash
# Create dashboard structure
mkdir -p src/app/dashboard/{layout,pages}

# Create dashboard layout component
# This component will have its own navbar + sidebar
```

Then users navigate:

- `/` → Marketing layout (simple navbar)
- `/dashboard` → Dashboard layout (complex navbar + sidebar)
- `/dashboard/sell` → Dashboard layout + Sell page
- `/login` → No layout (full-screen auth page)

This architecture keeps everything clean and modular! 🎯
