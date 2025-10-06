# Dashboard UX Design

## Mobile-First Design Philosophy

The dashboard is designed with a **mobile-first approach** optimized for Kenyan SME owners who primarily use phones.

## Multi-Tenancy UX Model

### Two-Tier Context Selection

The dashboard operates with a two-tier context system:

**Tier 1: Company (Channel)**

- Represents the customer's business (e.g., "Downtown Groceries Inc.")
- Automatically selected on login (first company by default)
- Changed rarely, only by users managing multiple businesses
- Located in: Extended menu (first item)

**Tier 2: Shop (Stock Location)**

- Represents individual shop within the company (e.g., "Mall Branch")
- Must be selected after login
- Changed frequently throughout the day
- Located in: Primary position in navigation bar

### Selection Behavior

```
Login → Company Auto-Selected → Choose Shop → Ready to Sell
         └─ Rare change          └─ Frequent change
         └─ Extended menu         └─ Main navbar
```

**Why this hierarchy?**

- **Shop selector is primary** because cashiers/managers work at one location but need to switch context when covering different shops
- **Company selector is hidden** because most users only manage one business
- Optimizes for the 95% use case (shop switching) while supporting the 5% case (multi-company management)

### Scoping Rules

All dashboard operations respect the selected shop context:

| Feature              | Scope                               |
| -------------------- | ----------------------------------- |
| **POS Sales**        | Shop-specific only                  |
| **Inventory Counts** | Shop-specific only                  |
| **Dashboard Stats**  | Shop-specific by default            |
| **Reports**          | Shop-specific with aggregate option |
| **Product Catalog**  | Company-wide (shared across shops)  |
| **Customer List**    | Company-wide (shared across shops)  |

**Stats View Options:**

1. **Default**: Current shop only
2. **Option**: Aggregate across all shops
3. **Future**: Side-by-side shop comparison

## Navigation System

### 🖥️ Desktop (> 1024px)

- **Persistent sidebar** on the left with full navigation
- **Top navbar** with notifications, profile, and quick actions
- Content area takes remaining space
- No bottom navigation (not needed with sidebar)

### 📱 Mobile (< 1024px)

- **Drawer sidebar** - Swipe from left or tap hamburger
- **Bottom navigation bar** - Fixed at bottom with 4 key actions:
  1. 📦 Purchase - Product management
  2. 📊 Overview - Dashboard home
  3. 💰 Sell - Quick access to POS
- **Top navbar** - Compact with hamburger, notifications, profile
- Content area fills screen
- **Bottom padding (pb-20)** - Prevents content from hiding under bottom nav

## Key Mobile Optimizations

### 1. Touch Targets

- All buttons and interactive elements are **minimum 44x44px**
- Adequate spacing between clickable elements
- Large, tappable notification and profile dropdowns

### 2. One-Handed Use

- Bottom navigation within thumb reach
- Most common actions (Sell, Products) in bottom nav
- Minimal need to reach top of screen

### 3. Performance

- **Lazy-loaded routes** - Dashboard code only loads when needed
- **OnPush change detection** - Minimal re-renders
- **Signal-based state** - Efficient reactivity

### 4. Visual Hierarchy

- **Card-based layout** - Clear separation of content
- **Icon + text labels** - Easy to scan
- **Color coding** - Success (green), Warning (orange), Error (red)
- **Badges** - Notification counts clearly visible

## Component Breakdown

### Dashboard Layout Component

```
┌─────────────────────────────────────┐
│  Top Navbar (Sticky)                │ ← Hamburger, Brand, Notifs, Profile
├──────┬──────────────────────────────┤
│      │                              │
│  S   │  Content Area                │ ← Router outlet for child pages
│  i   │  (Scrollable)                │
│  d   │                              │
│  e   │                              │
│      │                              │
├──────┴──────────────────────────────┤
│  Bottom Nav (Mobile Only)           │ ← 4 quick actions
└─────────────────────────────────────┘
```

### Drawer Sidebar (Mobile)

- Slides in from left
- Overlay dims background
- Full navigation menu
- Auto-closes on link click
- Can swipe or tap overlay to close

## Color & Theme

### Using daisyUI Colors

- `primary` - Main actions (Sell button, active states)
- `secondary` - Supporting actions
- `accent` - Highlights
- `base-100` - Cards and content areas
- `base-200` - Page backgrounds
- `success` - Positive trends, completed actions
- `warning` - Low stock, alerts
- `error` - Critical issues

### Dark Mode Ready

- Using daisyUI semantic colors
- Automatically adapts to system preference
- Future: Theme toggle in settings

## Interaction Patterns

### Navigation Flow

1. User opens `/dashboard` → Sees overview
2. Taps bottom nav "Sell" → Goes to POS
3. Taps hamburger → Drawer opens with full menu
4. Selects "Inventory" → Drawer closes, navigates to inventory
5. Notification bell shows badge → Taps → Dropdown with alerts

### Notification System

- **Badge** shows unread count
- **Dropdown** with categorized notifications:
  - ⚠️ Warnings (low stock)
  - ✅ Success (sale completed)
  - ℹ️ Info (system updates)
- Click notification → Navigate to relevant page
- "View All" → Full notifications page

### Profile Menu

- Avatar/initials in circle
- Dropdown with:
  - **Company selector** (first item)
  - Email display (non-clickable)
  - Profile settings
  - Help & support
  - Logout

### Shop Selector (Primary Navbar)

- Shop icon + current shop name
- Dropdown with list of all shops user has access to
- Selecting a shop immediately updates:
  - POS inventory availability
  - Dashboard statistics
  - Sales records shown
- Persists across sessions (saved to localStorage)

## Accessibility

- ✅ Keyboard navigation support
- ✅ ARIA labels on interactive elements
- ✅ Focus indicators
- ✅ Semantic HTML
- ✅ Screen reader friendly
- ✅ Touch-friendly tap targets

## Performance Metrics

### Target Performance

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse Score**: > 90

### Optimization Strategies

- Lazy-loaded routes
- OnPush change detection
- Signal-based reactivity
- Minimal dependencies
- Code splitting by route

## Future Enhancements

### Phase 2

- [ ] Offline mode with service worker
- [ ] Push notifications
- [ ] Biometric login (fingerprint)
- [ ] Voice commands for POS
- [ ] Gesture navigation (swipe between pages)

### Phase 3

- [ ] Progressive Web App (PWA) with install prompt
- [ ] Haptic feedback on actions
- [ ] Advanced analytics dashboard
- [ ] Multi-language support (Swahili, English)
- [ ] Custom theme colors per business

## Design Inspiration

Drawing from:

- **Shopify Mobile** - Simple, action-focused
- **Square POS** - Clean, efficient
- **WhatsApp Business** - Familiar patterns for African users
- **M-Pesa** - Trust through simplicity

## Testing on Target Devices

Optimized for:

- **Android phones** (most Kenyan SMEs use Android)
- **Screen sizes**: 360px - 430px width (most common)
- **Network**: Works on 3G/4G (optimized bundle size)
- **RAM**: Efficient for mid-range phones (2-4GB)
