# V1 UI Components & Templates

## Template Engine Architecture

V1 used **Go templates** (templ library) with a hierarchical component structure:

```
views/
├── layouts/          # Base layout templates
│   ├── base.templ    # Root HTML structure
│   ├── dashboard.templ # Dashboard-specific layout
│   └── admin_dashboard.templ # Admin layout
├── pages/           # Page-level templates
│   ├── dashboard/   # User dashboard pages
│   └── adminDashboard/ # Admin pages
└── components/      # Reusable UI components
```

## Key UI Patterns

### 1. Layout System

- **Base Layout**: Root HTML structure with head, body, and asset loading
- **Dashboard Layout**: Company-specific layout with navigation
- **Admin Layout**: Multi-company admin interface
- **Responsive Design**: Bootstrap-based responsive grid system

### 2. Component Architecture

- **Modular Components**: Credit modals, product confirmations, tables
- **Alpine.js Integration**: Reactive components for dynamic behavior
- **Bootstrap Styling**: Consistent design system

## Core UI Workflows

### 1. Sales Interface (`sell.templ`)

**Technology Stack**:

- **Alpine.js**: State management and reactivity
- **TensorFlow.js**: ML model for product recognition
- **Teachable Machine**: Pre-trained image classification
- **Bootstrap**: Responsive layout and components

**Key Features**:

```html
<!-- ML Model Integration -->
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8.3/dist/teachablemachine-image.min.js"></script>

<!-- Product Scanning Interface -->
<div x-data="newSale()" class="sale-page">
  <!-- Camera/Scanner Component -->
  <!-- Product Search -->
  <!-- Cart Management -->
  <!-- Payment Processing -->
</div>
```

**Business Logic**:

- **Product Recognition**: Real-time image classification
- **Inventory Management**: Live stock updates
- **Credit Sales**: Customer-based credit transactions
- **Multi-modal Input**: Camera scanning + manual search

### 2. Dashboard Analytics (`dashboard.templ`)

**Visualization Components**:

- **Category Pills**: Purchases, Sales, Expenses navigation
- **Stats Cards**: Today's performance metrics
- **Period Selection**: Today, This Week, This Month filters
- **Trend Indicators**: Visual progress indicators

### 3. Admin Management (`admin_dashboard.templ`)

**Management Interface**:

- **Company Grid**: Paginated company overview
- **Statistics Dashboard**: Per-company metrics
- **Bulk Operations**: Export functionality
- **Model Status Tracking**: ML model training status

## Component Library

### Credit Modal (`credit_modal.templ`)

**Purpose**: Customer selection for credit sales
**Features**:

- **Search Functionality**: Real-time customer lookup
- **Loading States**: Async search indicators
- **Customer Profiles**: Avatar and contact information
- **Credit Terms**: Payment terms and limits

### Product Confirmation (`product_confirm.templ`)

**Purpose**: Product verification before sale
**Features**:

- **Product Details**: Name, price, photos
- **Quantity Selection**: Stock management
- **Price Modification**: Custom pricing options
- **Inventory Validation**: Stock availability checks

### Company Management (`companies_table.templ`, `company_selector.templ`)

**Purpose**: Multi-company navigation and management
**Features**:

- **Company Switching**: Context switching between companies
- **Company Information**: Logo, name, description
- **User Association**: Company-user relationships

## Technology Integration

### 1. Machine Learning Integration

- **Model Loading**: Company-specific ML models
- **Real-time Classification**: Live product recognition
- **Model Status Tracking**: Training and deployment states
- **Fallback Mechanisms**: Manual product search when ML fails

### 2. State Management (Alpine.js)

```javascript
// Store pattern for global state
x-data="newSale()"

// Component state management
@click="$store.scanner.toggle()"
@input.debounce.350ms="searchCustomers"

// Reactive data binding
x-model="creditSearchTerm"
x-show="isSearchingCustomers"
```

### 3. Asset Management

**CSS Architecture**:

- **Component-specific**: `sell.css`, `product_confirm.css`
- **Layout styles**: `dashboard-layout.css`, `dashboard-stats.css`
- **Global styles**: `main.css` for base styling

**JavaScript Architecture**:

- **Page-specific**: `newSale.js` for sales interface
- **Component logic**: `creditModalComponent.js`, `newSaleComponent.js`
- **Store management**: `modalStore.js`, `saleStore.js`, `scannerStore.js`

## Responsive Design Patterns

### Mobile-First Approach

- **Breakpoint Strategy**: `sm:`, `md:`, `lg:` responsive prefixes
- **Touch-friendly**: Large touch targets for mobile
- **Adaptive Layouts**: Column stacking on smaller screens

### Performance Considerations

- **Lazy Loading**: Assets loaded on-demand
- **CDN Dependencies**: External libraries from CDN
- **Bundle Optimization**: Minimal custom JavaScript

## Migration Considerations

### Template System Evolution

- **Current**: Go templates with Alpine.js reactivity
- **Target**: Angular components with reactive forms
- **Preservation**: UI patterns and user experience flows

### State Management Migration

- **Current**: Alpine.js stores and component state
- **Target**: Angular services and RxJS observables
- **Preservation**: Complex state relationships and data flow

### ML Integration

- **Current**: TensorFlow.js + Teachable Machine
- **Target**: Potential Angular ML libraries or service integration
- **Preservation**: Model loading and prediction workflows

### Component Reusability

- **Current**: Template-based component library
- **Target**: Angular component architecture
- **Preservation**: Credit modal, product confirmation, and table patterns
