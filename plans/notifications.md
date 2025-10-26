# PWA Notification System Implementation

## Backend: Notification Infrastructure

### 1. Create Notification Plugin (`backend/src/plugins/notification.plugin.ts`)

- Define `Notification` entity with fields: id, userId, type, title, message, data, read, createdAt
- Create NotificationService for CRUD operations and event emission
- Implement GraphQL resolvers for: queries (getUserNotifications, markAsRead) and mutations (createNotification, markAllAsRead)
- Add custom event emitters decoupled from Vendure events

### 2. Create Notification Event Handler (`backend/src/plugins/notification-handler.service.ts`)

- Listen to Vendure events: OrderStateTransitionEvent, StockMovementEvent, etc.
- Transform Vendure events into generic notification events
- Emit to NotificationService to persist and broadcast
- Handle ML training progress events from existing ml-training.service.ts

### 3. Add WebPush Support (`backend/src/plugins/notification-push.service.ts`)

- Install web-push library
- Store push subscriptions in database (PushSubscription entity)
- Create endpoints for registering/unregistering push subscriptions
- Send push notifications when new notifications are created

## Frontend: Service Worker & PWA

### 4. Install Angular PWA Package

- Run: `ng add @angular/pwa`
- This adds @angular/service-worker dependency and ngsw-config.json

### 5. Configure Service Worker (`frontend/ngsw-config.json`)

- Configure caching strategies for static assets
- Add data groups for API calls
- Configure push notification handling

### 6. Update PWA Manifest (`frontend/public/manifest.webmanifest`)

- Update name to "DukaHub" (from simplestock)
- Add proper description and categories
- Configure icon references to existing icons
- Add shortcuts for key app functions (Sell, Inventory, Products)
- Set proper display mode, orientation, and scope

### 7. Enhance HTML Meta Tags (`frontend/src/index.html`)

- Add theme-color meta tag
- Add apple-mobile-web-app-capable and status-bar-style
- Link manifest.webmanifest
- Add iOS specific meta tags

### 8. Generate Missing PWA Icons

- Verify existing icons in `frontend/public/` (192x192 and 512x512 exist)
- Create additional icon sizes if needed: 72x72, 96x96, 128x128, 144x144, 152x152, 384x384
- Ensure maskable and any purpose variants

## Frontend: Notification System

### 9. Create Notification Service (`frontend/src/app/core/services/notification.service.ts`)

- Use signals for notification state: notifications$, unreadCount$
- Integrate with Apollo GraphQL for backend queries/mutations
- Request and store push notification permissions
- Subscribe to push notifications via service worker
- Handle incoming notifications from push events
- Provide methods: showNotification(), markAsRead(), getNotifications()

### 10. Create Toast Component (`frontend/src/app/core/layout/toast/toast.component.ts`)

- Use daisyUI toast classes for styling
- Display notification title, message, and icon based on type
- Auto-dismiss after 5 seconds (configurable)
- Support different notification types: info, success, warning, error
- Stack multiple toasts vertically
- Use signals for reactive state management
- Implement OnPush change detection

### 11. Add GraphQL Operations (`frontend/src/app/core/graphql/operations.graphql.ts`)

- Add queries: GetUserNotifications, GetUnreadCount
- Add mutations: CreateNotification, MarkNotificationAsRead, MarkAllAsRead, RegisterPushSubscription, UnregisterPushSubscription
- Run codegen to generate TypeScript types

### 12. Integrate Toast in App Root (`frontend/src/app/app.ts` and `app.html`)

- Inject NotificationService
- Add toast-container div in template
- Render active toasts using @for loop
- Position toasts in top-right corner using daisyUI toast classes

### 13. Update App Config (`frontend/src/app/app.config.ts`)

- Add provideServiceWorker for production builds
- Configure service worker update strategy
- Add notification service initialization in APP_INITIALIZER

## Testing & Documentation

### 14. Test Notification Flow

- Test push notification permissions
- Verify notifications appear as toasts
- Test notification persistence across sessions
- Verify service worker caches assets correctly
- Test offline functionality
- Verify PWA installability on mobile/desktop

### 15. Update Documentation

- Document notification types and their triggers
- Add instructions for testing PWA features
- Document push notification setup for developers

## Key Files Modified

- `backend/src/plugins/notification.plugin.ts` (new)
- `backend/src/plugins/notification-handler.service.ts` (new)
- `backend/src/plugins/notification-push.service.ts` (new)
- `backend/src/vendure-config.ts` (add notification plugin)
- `frontend/ngsw-config.json` (new/generated)
- `frontend/public/manifest.webmanifest` (update)
- `frontend/src/index.html` (enhance meta tags)
- `frontend/src/app/core/services/notification.service.ts` (new)
- `frontend/src/app/core/layout/toast/toast.component.ts` (new)
- `frontend/src/app/core/graphql/operations.graphql.ts` (add operations)
- `frontend/src/app/app.config.ts` (add service worker)
- `frontend/src/app/app.html` (add toast container)
- `frontend/package.json` (add dependencies)
- `backend/package.json` (add web-push)
