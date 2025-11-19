# 📚 DukaRun Notification System Documentation

## 🏗️ Architecture Overview

The notification system is built with a **server-side event-driven architecture** that supports both **in-app notifications** and **push notifications** across all connected clients.

## 🔧 Backend Components

### 1. **NotificationPlugin** (`/backend/src/plugins/notification.plugin.ts`)
- **Purpose**: Core Vendure plugin that registers all notification services
- **Components**: Integrates resolver, services, and test controller
- **GraphQL Schema**: Exposes notification queries and mutations

### 2. **NotificationService** (`/backend/src/plugins/notification.service.ts`)
- **Purpose**: CRUD operations for notifications
- **Key Methods**:
  - `createNotification()` - Creates new notifications
  - `getUserNotifications()` - Fetches user's notifications
  - `markAsRead()` - Marks notifications as read
  - `getChannelUsers()` - Gets all users in a channel

### 3. **PushNotificationService** (`/backend/src/plugins/push-notification.service.ts`)
- **Purpose**: Web Push API integration
- **Features**:
  - VAPID key management
  - Push subscription handling
  - Cross-platform push notifications

### 4. **NotificationHandlerService** (`/backend/src/plugins/notification-handler.service.ts`)
- **Purpose**: Event-driven notification creation
- **Event Listeners**:
  - `OrderStateTransitionEvent` - Order status changes
  - `StockMovementEvent` - Low stock alerts
  - `MLTrainingEvent` - ML model updates

### 5. **NotificationTestController** (`/backend/src/plugins/notification-test.controller.ts`)
- **Purpose**: Testing and manual notification triggering
- **Endpoints**:
  - `GET /test-notifications/status` - System status
  - `GET /test-notifications/trigger?type=ORDER` - Single notification
  - `POST /test-notifications/trigger-all` - All notification types

## 🎨 Frontend Components

### 1. **NotificationService** (`/frontend/src/app/core/services/notification.service.ts`)
- **Purpose**: Frontend notification state management
- **Features**:
  - Real-time GraphQL integration
  - Push subscription management
  - Toast notification handling
  - Development mode fallback

### 2. **ToastService** (`/frontend/src/app/core/services/toast.service.ts`)
- **Purpose**: In-app toast notifications
- **Features**:
  - Signal-based state management
  - Auto-dismiss timers
  - Multiple notification types

### 3. **ToastComponent** (`/frontend/src/app/core/layout/toast/toast.component.ts`)
- **Purpose**: UI component for displaying toasts
- **Features**:
  - DaisyUI styling
  - Responsive design
  - Dismiss functionality

### 4. **NotificationTestComponent** (`/frontend/src/app/dashboard/pages/settings/components/notification-test.component.ts`)
- **Purpose**: Testing interface for notifications
- **Features**:
  - Server-side triggering
  - System status monitoring
  - Activity logging

## 🔄 Notification Flow

```
Vendure Event → NotificationHandlerService → NotificationService.createNotification
                                                      ↓
Database Storage ← PushNotificationService → Web Push API → Client Browser
                                                      ↓
Service Worker → Toast Notification + Notification Bell Update
```

## 🧪 Testing the Notification System

### **Quick Test Commands**

#### 1. Trigger All Notification Types
```bash
curl -X POST "http://localhost:3000/test-notifications/trigger-all"
```

#### 2. Trigger Individual Notification Types
```bash
# Order notifications
curl "http://localhost:3000/test-notifications/trigger?type=ORDER"

# Stock alerts
curl "http://localhost:3000/test-notifications/trigger?type=STOCK"

# ML training updates
curl "http://localhost:3000/test-notifications/trigger?type=ML_TRAINING"

# Payment confirmations
curl "http://localhost:3000/test-notifications/trigger?type=PAYMENT"
```

#### 3. Check System Status
```bash
curl "http://localhost:3000/test-notifications/status"
```

#### 4. Trigger with Custom Message
```bash
curl "http://localhost:3000/test-notifications/trigger?type=ORDER&title=Custom%20Title&message=Custom%20Message"
```

### **Frontend Testing Interface**

1. **Access the Test Interface**:
   - Go to `http://localhost:4200`
   - Navigate to **Settings** → **Test Notifications** tab

2. **Monitor Real-time Updates**:
   - Watch the notification bell for unread count updates
   - Check toast notifications appearing
   - Monitor the activity log

3. **Test Push Notifications**:
   - Click "📱 Test Push" to enable push notifications
   - Grant browser permission when prompted
   - Notifications will appear even when the tab is not active

### **Notification Types**

| Type | Description | Trigger Event | Example Message |
|------|-------------|---------------|-----------------|
| `ORDER` | Order status changes | Order state transitions | "Order #12345 has been placed" |
| `STOCK` | Low stock alerts | Stock movement events | "Product 'X' is running low (3 remaining)" |
| `ML_TRAINING` | ML model updates | Training completion | "Demand forecasting model updated" |
| `PAYMENT` | Payment confirmations | Payment events | "Payment of KES 1,500 confirmed" |

## 🔧 Configuration

### **Environment Variables**

Add these to your `.env` file:

```bash
# Web Push Notifications (VAPID Keys)
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_EMAIL=mailto:admin@dukarun.com
```

### **VAPID Key Generation**

```bash
# Generate VAPID keys
npx web-push generate-vapid-keys

# Add the generated keys to your .env file
```

## 🚀 Deployment

### **Backend Setup**

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install web-push @types/web-push
   ```

2. **Configure Environment**:
   - Add VAPID keys to `.env` file
   - Ensure database is running

3. **Start Backend**:
   ```bash
   npm run dev
   ```

### **Frontend Setup**

1. **Install Dependencies**:
   ```bash
   cd frontend
   npm install @angular/service-worker
   ```

2. **Configure PWA**:
   - Service worker is configured in `ngsw-config.json`
   - Manifest is in `public/manifest.webmanifest`

3. **Start Frontend**:
   ```bash
   npm run start
   ```

## 📱 PWA Features

### **Service Worker Configuration**
- **Caching Strategy**: App shell with network-first for API calls
- **Push Notifications**: Enabled with VAPID key support
- **Offline Support**: Cached resources available offline

### **Web App Manifest**
- **App Name**: DukaRun
- **Theme Color**: #3b82f6
- **Display Mode**: Standalone
- **Shortcuts**: Quick access to Sell, Inventory, Products

## 🔍 Troubleshooting

### **Common Issues**

1. **"You must wrap the query string in a 'gql' tag"**
   - **Solution**: Use `apolloService.getClient().query()` instead of `apolloService.query()`
   - **Cause**: Incorrect Apollo Client usage pattern

2. **Push notifications not working**
   - **Check**: VAPID keys are configured in environment
   - **Check**: Service worker is registered
   - **Check**: Browser permissions are granted

3. **GraphQL type errors**
   - **Solution**: Run `npm run codegen` to generate types
   - **Check**: Backend is running when generating types

### **Debug Commands**

```bash
# Check backend status
curl "http://localhost:3000/test-notifications/status"

# Test GraphQL endpoint
curl -X POST "http://localhost:3000/admin-api" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { getUnreadCount }"}'

# Check frontend build
cd frontend && npm run build
```

## 🏆 System Benefits

✅ **Real-time Updates**: GraphQL subscriptions for instant notifications  
✅ **Cross-platform**: Works on desktop, mobile, and PWA  
✅ **Offline Support**: Service worker caches notifications  
✅ **Type Safety**: Full TypeScript integration  
✅ **Scalable**: Event-driven architecture supports high volume  
✅ **Testable**: Comprehensive testing endpoints and UI  
✅ **Production Ready**: Proper error handling and fallbacks  

## 📊 Performance Considerations

- **Notification Persistence**: 30 days retention
- **Push Subscription**: Automatic cleanup of invalid subscriptions
- **Rate Limiting**: Built-in throttling for high-volume events
- **Caching**: Service worker caches for offline access
- **Type Safety**: Compile-time type checking prevents runtime errors

---

*Last updated: October 28, 2025*
*Version: 1.0.0*
