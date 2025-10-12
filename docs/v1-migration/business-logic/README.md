# V1 Business Logic Overview

## Core Architecture

V1 was built on **PocketBase** (Go backend with SQLite) with a clear separation of concerns:

### Key Components

- **Database Helper** (`DbHelper`): Central database operations wrapper
- **Authentication**: HTTP-only cookies for both users and admins
- **Multi-tenancy**: Company-based data isolation
- **File Management**: Image/photo handling with thumbnail generation
- **ML Integration**: Model file management (`.bin`, `.json` files)

## Core Workflows

### 1. Authentication & Authorization

```go
// Dual authentication system
- Users: Regular company users with dashboard access
- Admins: Super admin users with company management capabilities
- HTTP-only cookies with secure flags
```

### 2. Company Management

- **Multi-tenancy**: Users belong to companies, data is company-scoped
- **CRUD Operations**: Create, read, update, soft-delete companies
- **Relationships**: Companies ↔ Users, Companies ↔ Products, Companies ↔ Partners
- **Statistics**: Product counts, user counts, account counts per company

### 3. Product Management

- **Product Lifecycle**: Creation, inventory tracking, photo management
- **Image Processing**: Automatic thumbnail generation (100x100 default)
- **Bulk Export**: Photo export functionality for entire company inventory
- **Company Association**: Products are scoped to specific companies

### 4. Dashboard & Analytics

- **User Dashboard**: Company-specific dashboard with stats
- **Admin Dashboard**: Multi-company overview and analytics
- **Data Aggregation**: Company statistics and performance metrics

### 5. File Management

- **Image URLs**: Dynamic URL generation for images with thumbnails
- **File Storage**: PocketBase filesystem integration
- **Export Features**: ZIP file creation for photo exports

### 6. ML Model Integration

- **Model Files**: `.bin`, `.json`, and metadata file handling
- **Company Association**: ML models are linked to specific companies
- **File Serving**: Dynamic URL generation for model files

## Key Data Models

- **Users**: Auth collection with company relationships
- **Admins**: Auth collection for super admin users
- **Companies**: Business entities with user and product relationships
- **Products**: Inventory items with photos and company association
- **Partners**: Business partners associated with companies
- **Company Accounts**: Financial accounts per company
- **Models**: ML models with file attachments per company
- **Transactions**: Business transactions (referenced in products)

## Important Patterns

1. **Soft Deletes**: Companies use `deleted_at` timestamp instead of hard deletion
2. **Record Wrapping**: Custom model structs wrap PocketBase records
3. **Error Handling**: Consistent error patterns across all operations
4. **File URL Generation**: Centralized URL creation for all file types

## Migration Considerations

- **Authentication**: Need to preserve user sessions during migration
- **File Assets**: All images and ML model files need migration
- **Relationships**: Maintain all company-user-product relationships
- **Business Logic**: Core workflows should be preserved in v2
