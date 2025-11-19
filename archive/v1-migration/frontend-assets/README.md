# V1 Frontend Assets & Client-Side Logic

## Architecture Overview

V1's frontend was built with **vanilla JavaScript** and **Alpine.js** for reactivity, using a modular store-based architecture.

## Technology Stack

### Core Libraries

- **Alpine.js**: Reactive component framework and state management
- **TensorFlow.js**: Machine learning model inference
- **Teachable Machine**: Pre-trained image classification models
- **Bootstrap 5**: Responsive UI components and grid system
- **PocketBase JS SDK**: Backend communication

### Asset Organization

```
public/
├── js/
│   ├── stores/           # Alpine.js stores (global state)
│   ├── components/       # Reusable component logic
│   ├── pages/           # Page-specific logic
│   └── pb.js            # PocketBase client setup
├── styles/
│   ├── main.css         # Global styles
│   ├── dashboard-*.css  # Dashboard-specific styles
│   └── components/      # Component-specific styles
└── assets/
    └── site.webmanifest # PWA manifest
```

## State Management Architecture

### Store Pattern (Alpine.js Stores)

```javascript
// Global stores registered on Alpine initialization
Alpine.store('sale', saleStoreLogic); // Cart and transaction state
Alpine.store('scanner', scannerStoreLogic); // ML model and camera state
Alpine.store('modal', modalStoreLogic); // Modal management
```

### Store Interdependencies

- **Scanner Store**: ML model loading, camera control, product detection
- **Sale Store**: Cart management, pricing, tax calculations
- **Modal Store**: UI modal state and customer management

## Machine Learning Integration

### Model Management (`scannerStore.js`)

**Key Features**:

- **Dynamic Model Loading**: Company-specific ML models from backend
- **Real-time Classification**: Live camera feed with product recognition
- **Confidence Thresholding**: Configurable prediction accuracy requirements
- **Error Handling**: Graceful fallbacks when models fail to load

**Workflow**:

```javascript
// 1. Load company-specific model
config.modelUrl = `/api/files/models/${modelId}/model.json`;
// 2. Initialize TensorFlow.js model
model = await tmImage.load(modelUrl, metadataUrl);
// 3. Start camera stream and classification loop
// 4. Process predictions and trigger product lookup
```

### Product Recognition Pipeline

1. **Camera Capture**: Real-time video feed
2. **Model Inference**: TensorFlow.js prediction on video frames
3. **Confidence Filtering**: Only high-confidence predictions processed
4. **Product Lookup**: Database query for matching products
5. **Cart Addition**: Automatic or manual product addition to sale

## Sales Management System

### Cart Logic (`saleStore.js`)

**Core Functionality**:

- **Item Management**: Add, remove, update quantities
- **Price Calculations**: Subtotal, tax, and total computations
- **Tax Handling**: Per-item tax rates with fallback to default
- **Validation**: Input sanitization and error prevention

**Data Structure**:

```javascript
{
  items: [
    {
      id: "product_id",
      name: "Product Name",
      price: 10.99,
      quantity: 2,
      taxRate: 0.08 // 8% tax
    }
  ],
  taxRate: 0.08, // Default tax rate
  subtotal: 21.98,
  tax: 1.76,
  total: 23.74
}
```

### Transaction Processing

- **Real-time Updates**: Cart totals update reactively
- **Payment Methods**: Cash, credit, and mixed payments
- **Receipt Generation**: Transaction recording and printing
- **Inventory Updates**: Stock reduction on sale completion

## Component Architecture

### Credit Modal (`creditModalComponent.js`)

**Purpose**: Customer selection for credit sales
**Features**:

- **Customer Search**: Real-time search with debouncing
- **Customer Profiles**: Avatar, contact info, credit history
- **Credit Terms**: Payment terms and credit limits
- **Async Operations**: Loading states and error handling

### New Sale Component (`newSaleComponent.js`)

**Purpose**: Main sales interface coordination
**Features**:

- **Store Integration**: Coordinates scanner, sale, and modal stores
- **Event Handling**: Camera toggles, search triggers, payment processing
- **State Synchronization**: Keeps UI state aligned with stores

## CSS Architecture

### Styling Strategy

- **Component Isolation**: Each component has dedicated CSS file
- **Responsive Design**: Mobile-first with breakpoint utilities
- **Design System**: Consistent color scheme and typography
- **Performance**: Minimal custom CSS, leveraging Bootstrap

### Key Stylesheets

- **Dashboard Layout**: Navigation, sidebar, responsive grid
- **Stats Cards**: Metric displays with trend indicators
- **Sales Interface**: Product scanner, cart, payment sections
- **Modal Components**: Credit modal, product confirmation overlays

## JavaScript Modules

### PocketBase Integration (`pb.js`)

- **Client Setup**: Authenticated API client configuration
- **Real-time Subscriptions**: Live data updates via WebSockets
- **File Handling**: Image and model file URL generation
- **Error Handling**: Network error management and retry logic

### Page Controllers

- **Login Logic**: Authentication flow and session management
- **Dashboard Logic**: Company switching and navigation
- **Admin Logic**: Multi-company management interface

## Performance Optimizations

### Asset Loading Strategy

- **CDN Dependencies**: External libraries loaded from CDN
- **Module Imports**: ES6 modules for better bundling
- **Lazy Loading**: Components loaded on-demand
- **Caching**: Browser caching for static assets

### Memory Management

- **Store Cleanup**: Proper state reset between operations
- **Camera Management**: Stream cleanup on component unmount
- **Model Unloading**: TensorFlow.js model cleanup

## Security Considerations

### Client-Side Security

- **Input Validation**: All user inputs validated before processing
- **XSS Prevention**: HTML escaping and sanitization
- **CSRF Protection**: Token-based request validation
- **Secure Cookies**: HTTP-only authentication cookies

## Migration Considerations

### Framework Transition

- **Current**: Alpine.js + vanilla JS stores
- **Target**: Angular services and RxJS observables
- **Preservation**: State management patterns and data flow

### ML Integration Evolution

- **Current**: TensorFlow.js direct integration
- **Target**: Service-based ML model management
- **Preservation**: Model loading and prediction workflows

### Asset Organization

- **Current**: File-based module system
- **Target**: Angular module and component structure
- **Preservation**: Component boundaries and responsibilities
