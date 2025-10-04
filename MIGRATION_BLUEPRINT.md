# Dukahub v2 Migration Blueprint: PocketBase to MedusaJS

## Executive Summary

This document outlines the comprehensive migration from Dukahub v1 (built on PocketBase) to Dukahub v2 (built on MedusaJS v2). The migration preserves all existing functionality while modernizing the architecture for better scalability, maintainability, and commerce-focused features.

## Current Architecture Analysis (v1)

### Core Components

#### 1. Backend (PocketBase)

- **Framework**: PocketBase (Go-based backend-as-a-service)
- **Database**: SQLite/PostgreSQL with auto-generated models
- **Authentication**: Built-in user management with role-based access
- **File Storage**: Built-in file management for product images/models
- **Real-time**: WebSocket support for live updates

#### 2. Frontend

- **Framework**: Vanilla JavaScript with HTMX
- **Templates**: Go HTML templates (`.templ` files)
- **Styling**: Custom CSS with responsive design
- **UI Components**: Custom JavaScript components for modals, forms, etc.

#### 3. AI/ML Integration

- **Model Training**: Custom AI models for product recognition
- **Image Processing**: Product photo upload and processing
- **Prediction Service**: Real-time product identification via camera

### Data Model Deep Dive

#### Core Entities

**1. Users & Companies**

```go
type Users struct {
    Username string
    Name string
    Avatar string
    Company []*Companies  // Multi-company support
    Level float64        // Permission level
}

type Companies struct {
    Name string
    Logo string
    Location string
    Phone string
    CompanyType CompanyTypeSelectType  // HQ/Branch/Store
    ParentCompany *Companies          // Hierarchical structure
    TaxId string
    Industry string
}
```

**2. Product Management**

```go
type Products struct {
    Name string
    Photos []string
    Category []*ProductCategories
    Barcode string
    TaxRate float64
    Inventory *Inventory
}

type Skus struct {
    Name string
    Initials string
}

type Inventory struct {
    CurrentQuantity float64
    ReorderPoint float64
    CostPrice float64
    RetailPrice float64
}
```

**3. Sales & Transactions**

```go
type SalesTransactions struct {
    Company *Companies
    Salesperson *Users
    TotalAmount float64
    PaymentStatus PaymentStatusSelectType
    Customer *Partners
    TransactionType TransactionTypeSelectType
    SalesDetails []*SalesDetails
}

type SalesDetails struct {
    Product *Products
    Sku *Skus
    Quantity float64
    UnitPrice float64
}
```

**4. Financial Management**

```go
type CompanyAccounts struct {
    Name string
    Type *AccountTypes
    Balance float64
    TotalRevenue float64
    TotalExpenses float64
    NetProfit float64
}

type Transactions struct {
    Company *Companies
    Account *CompanyAccounts
    Type TypeSelectType2  // Debit/Credit
    Amount float64
    ReferenceType ReferenceTypeSelectType  // Sale/Purchase/Expense
    ReferenceId string
}
```

**5. Partners & Invoices**

```go
type Partners struct {
    Name string
    Phone string
    Company *Companies
    Balance float64
}

type Invoices struct {
    Partner *Partners
    Amount float64
    Status StatusSelectType  // Paid/Partial/Pending
    Balance float64
    Company *Companies
    Type TypeSelectType     // Sale/Purchase
}
```

### Business Logic Flow

#### 1. Product Creation & Inventory Setup

```go
// 1. Define company structure
companies → branches → stores

// 2. Create product catalog
products → skus → categories

// 3. Set up inventory per company
inventory_records → reorder_points → cost_pricing
```

#### 2. Purchase Flow

```go
// 1. Create purchase record
purchase → link to supplier (partner)

// 2. Generate invoice
invoice (type: purchase) → link to partner

// 3. Record payment transaction
transaction (type: debit) → update account balance

// 4. Update inventory
inventory_transaction (reason: purchase) → increase quantity
```

#### 3. Sales Flow

```go
// 1. Create sales transaction
sales_transaction → link salesperson & customer

// 2. Add sales details
sales_details → product, sku, quantity, unit_price

// 3. Calculate totals & taxes
total_amount = sum(sales_details) + tax

// 4. Process payment
transaction (type: credit) → update account balance

// 5. Update inventory
inventory_transaction (reason: sale) → decrease quantity
```

#### 4. Financial Reporting

```go
// Daily summaries
daily_accounts → opening/closing balances
daily_summaries → sales, purchases, expenses, profit

// Analytics
product_analytics → revenue, cost, profit by period
company_stats → overall performance metrics
```

### AI/ML Integration Architecture

#### Model Training Pipeline

```go
// 1. Product photo upload
upload_photos → store in file system

// 2. Model creation
models → metadata, weights, training data

// 3. Training jobs
job_queue → status tracking → completion notifications
```

#### Real-time Recognition

```go
// 1. Camera capture
mobile_camera → image capture

// 2. Prediction service
ai_service → classify product → return sku + confidence

// 3. POS integration
recognized_product → auto-fill sale form
```

### Multi-tenant Architecture

#### Company Isolation

```go
// Row-level security
all_records.company_id = current_user.company_id

// Hierarchical permissions
users → companies → branches → stores

// Data segregation
company-specific: products, inventory, transactions
shared: global users, system settings
```

### Frontend Architecture

#### Dashboard Structure

```javascript
// Main dashboard
/dashboard/{companyId}/ → company-specific data

// Core modules
- /sell → POS interface
- /inventory → stock management
- /reports → analytics & reporting
- /settings → company configuration
```

#### UI Components

```javascript
// Modal system
ModalStore → centralized modal management

// Sale management
SaleStore → cart, items, totals

// Scanner integration
ScannerStore → camera, recognition, validation
```

## Target Architecture (v2) - MedusaJS

### MedusaJS v2 Overview

- **Framework**: Node.js/TypeScript headless commerce platform
- **License**: MIT (permissive, commercial-friendly)
- **Database**: PostgreSQL with TypeORM
- **API**: REST + GraphQL
- **Architecture**: Modular plugin system

### Core Modules Migration

#### 1. Product Module

**PocketBase → Medusa Mapping:**

```typescript
// Products
PocketBase: Products → Medusa: Product

// Variants
PocketBase: Skus → Medusa: ProductVariant

// Categories
PocketBase: ProductCategories → Medusa: ProductCategory

// Inventory
PocketBase: Inventory → Medusa: InventoryItem
```

#### 2. Order Module

**PocketBase → Medusa Mapping:**

```typescript
// Sales Transactions
PocketBase: SalesTransactions → Medusa: Order

// Sales Details
PocketBase: SalesDetails → Medusa: LineItem

// Customers
PocketBase: Partners → Medusa: Customer
```

#### 3. Customer Module

**PocketBase → Medusa Mapping:**

```typescript
// Partners (Customers)
PocketBase: Partners → Medusa: Customer

// Partner balance tracking
PocketBase: Balance field → Medusa: Custom entity or metadata
```

#### 4. Store Module (Multi-tenancy)

**PocketBase → Medusa Mapping:**

```typescript
// Companies
PocketBase: Companies → Medusa: Store

// Company hierarchy
PocketBase: ParentCompany → Medusa: Store parent relationship

// Store-specific data
All entities → Store-scoped via store_id
```

### Migration Strategy

#### Phase 1: Foundation Setup

1. **Create v2 directory structure**
2. **Initialize MedusaJS project**
3. **Set up Docker configuration**
4. **Configure PostgreSQL + Redis**

#### Phase 2: Data Model Migration

1. **Migrate core entities** (Products, Orders, Customers)
2. **Implement store isolation** (multi-tenancy)
3. **Create custom entities** for non-standard fields
4. **Set up relationships and constraints**

#### Phase 3: Business Logic Migration

1. **Inventory management logic**
2. **Sales transaction processing**
3. **Financial calculation logic**
4. **Reporting and analytics**

#### Phase 4: AI Integration

1. **Preserve existing AI service**
2. **Create Medusa plugin for AI integration**
3. **Maintain model training pipeline**
4. **Update prediction endpoints**

#### Phase 5: Frontend Migration

1. **Create React-based POS**
2. **Implement offline capability**
3. **Migrate UI components**
4. **Set up build and deployment**

### Technical Implementation Details

#### Medusa Configuration

```typescript
// medusa-config.js
module.exports = {
  projectConfig: {
    database_url: process.env.DATABASE_URL,
    redis_url: process.env.REDIS_URL,
    store_cors: process.env.STORE_CORS,
    admin_cors: process.env.ADMIN_CORS,
  },
  plugins: [
    // Core plugins
    "@medusajs/medusa-plugin-sendgrid",
    "@medusajs/medusa-plugin-stripe",
    // Custom plugins
    "./plugins/dukahub-ai",
    "./plugins/dukahub-pos",
  ],
  modules: {
    // Custom modules
    dukahubStore: "./modules/dukahub-store",
    dukahubAnalytics: "./modules/dukahub-analytics",
  },
};
```

#### Custom Entities & Services

```typescript
// Custom services
- DukahubStoreService (multi-tenant logic)
- DukahubInventoryService (extended inventory)
- DukahubAIService (AI integration)
- DukahubAnalyticsService (reporting)

// Custom entities
- DailySummary
- InventoryTransaction
- CompanyAccount
- ProductAnalytics
```

#### Database Schema Extensions

```sql
-- Store-specific extensions
ALTER TABLE store ADD COLUMN tax_id VARCHAR(255);
ALTER TABLE store ADD COLUMN industry VARCHAR(255);
ALTER TABLE store ADD COLUMN company_type VARCHAR(50);

-- Custom tables
CREATE TABLE daily_summaries (
  id VARCHAR(255) PRIMARY KEY,
  store_id VARCHAR(255) REFERENCES store(id),
  date DATE NOT NULL,
  total_sales DECIMAL(10,2),
  total_purchases DECIMAL(10,2),
  -- ... other fields
);

CREATE TABLE inventory_transactions (
  id VARCHAR(255) PRIMARY KEY,
  inventory_item_id VARCHAR(255) REFERENCES inventory_item(id),
  quantity_change DECIMAL(10,2),
  reason_code VARCHAR(50),
  -- ... other fields
);
```

### API Migration Strategy

#### REST Endpoints Mapping

```typescript
// PocketBase endpoints → Medusa endpoints
GET /api/collections/products → GET /store/products
POST /api/collections/products → POST /admin/products
GET /api/collections/sales_transactions → GET /store/orders
POST /api/collections/sales_transactions → POST /store/orders
```

#### GraphQL Integration

```graphql
# Custom queries for POS
query GetPOSData($storeId: String!) {
  products(store_id: $storeId) {
    id
    title
    variants {
      id
      title
      inventory_quantity
      prices {
        amount
        currency_code
      }
    }
  }
  orders(store_id: $storeId, status: "pending") {
    id
    total
    items {
      product_id
      quantity
      unit_price
    }
  }
}
```

### Frontend Architecture (React)

#### Component Structure

```typescript
// POS Components
-POSLayout -
  ProductScanner -
  CartManager -
  PaymentProcessor -
  ReceiptPrinter -
  // Dashboard Components
  DashboardLayout -
  InventoryTable -
  SalesReports -
  AnalyticsCharts -
  CompanySettings;
```

#### State Management

```typescript
// Zustand stores
- usePOSStore (cart, products, totals)
- useScannerStore (camera, recognition)
- useOfflineStore (sync queue, local data)
- useCompanyStore (current company, settings)
```

#### Offline Capability

```typescript
// IndexedDB integration
- Product cache
- Transaction queue
- Image storage
- Sync management
```

### Deployment Architecture

#### Docker Configuration

```dockerfile
# Multi-service setup
- medusa-backend (Node.js)
- postgres (database)
- redis (cache)
- dukahub-pos (React frontend)
- dukahub-ai (Go/Python service)
```

#### Environment Configuration

```bash
# Medusa environment
DATABASE_URL=postgres://...
REDIS_URL=redis://...
STORE_CORS=http://localhost:3000
ADMIN_CORS=http://localhost:7000

# AI Service
AI_SERVICE_URL=http://ai-service:8080
MODEL_STORAGE_PATH=/app/models

# POS Frontend
REACT_APP_MEDUSA_BACKEND_URL=http://localhost:9000
REACT_APP_AI_SERVICE_URL=http://localhost:8080
```

### Migration Checklist

#### Pre-Migration

- [ ] Backup existing database
- [ ] Document all custom business logic
- [ ] Test existing functionality
- [ ] Set up Medusa development environment

#### Data Migration

- [ ] Migrate companies to stores
- [ ] Migrate products and variants
- [ ] Migrate inventory data
- [ ] Migrate customer data
- [ ] Migrate historical transactions

#### Feature Migration

- [ ] Implement multi-tenant logic
- [ ] Rebuild sales flow
- [ ] Implement inventory management
- [ ] Set up financial reporting
- [ ] Integrate AI services

#### Testing & Validation

- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Offline functionality testing
- [ ] Multi-tenant isolation testing

### Success Metrics

#### Functional Requirements

- [ ] All existing POS features working
- [ ] AI recognition preserved
- [ ] Multi-company support maintained
- [ ] Offline capability working
- [ ] Financial reporting accurate

#### Performance Requirements

- [ ] Faster page loads
- [ ] Better mobile performance
- [ ] Improved API response times
- [ ] Reduced server resource usage

#### Developer Experience

- [ ] Easier feature development
- [ ] Better testing capabilities
- [ ] Improved debugging
- [ ] Modern development tools

### Risk Mitigation

#### Technical Risks

1. **Data Loss**: Comprehensive backup and testing strategy
2. **Downtime**: Staged migration with rollback capability
3. **Performance**: Load testing and optimization
4. **Compatibility**: Thorough testing of all features

#### Business Risks

1. **Feature Parity**: Detailed requirement mapping
2. **User Training**: Documentation and training materials
3. **Support**: Migration support and troubleshooting
4. **Timeline**: Realistic timeline with buffers

### Timeline & Milestones

#### Week 1-2: Foundation

- Set up Medusa environment
- Create basic data models
- Implement store isolation

#### Week 3-4: Core Migration

- Migrate products and inventory
- Implement sales flow
- Set up basic POS interface

#### Week 5-6: Advanced Features

- AI integration
- Offline capability
- Reporting and analytics

#### Week 7-8: Testing & Launch

- Comprehensive testing
- Performance optimization
- Production deployment

This blueprint provides the comprehensive roadmap for migrating Dukahub from PocketBase to MedusaJS while preserving all existing functionality and improving the overall architecture.
