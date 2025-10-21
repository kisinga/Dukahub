# V1 Data Models & Schema

## Database Architecture

V1 used **PocketBase** (SQLite backend) with the following key collections:

## Core Collections

### 1. Authentication Collections

#### `admins` (Auth Collection)

- **Purpose**: Super admin users with company management capabilities
- **Key Fields**:
  - `id`: Auto-generated 15-char alphanumeric ID
  - `password`: Hashed password (bcrypt cost 0 - should be increased)
  - Standard auth fields (email, verified, etc.)

#### `users` (Auth Collection)

- **Purpose**: Regular company users with dashboard access
- **Key Fields**:
  - `id`: Auto-generated 15-char alphanumeric ID
  - `password`: Hashed password (bcrypt cost 10)
  - `company`: Relation to companies collection (many-to-many via junction)
  - `avatar`: File field for user profile pictures
  - Standard auth fields (email, verified, etc.)

### 2. Business Entity Collections

#### `companies` (Base Collection)

- **Purpose**: Business entities/organizations
- **Key Fields**:
  - `id`: Auto-generated 15-char alphanumeric ID
  - `logo`: Required image file (PNG/JPEG/AVIF, max 5MB)
  - `name`: Company name (required)
  - `description`: Company description
  - `users_via_company`: Junction relation to users (many-to-many)
  - `deleted_at`: Timestamp for soft deletes
  - Standard audit fields (created, updated)

#### `partners` (Base Collection)

- **Purpose**: Business partners associated with companies
- **Key Fields**:
  - `id`: Auto-generated 15-char alphanumeric ID
  - `company`: Required relation to companies
  - `name`: Partner name (required)
  - Standard audit fields

#### `company_accounts` (Base Collection)

- **Purpose**: Financial accounts for companies
- **Key Fields**:
  - `id`: Auto-generated 15-char alphanumeric ID
  - `company`: Required relation to companies
  - `account_number`: Optional account identifier
  - `balance`: Current account balance (default 0)
  - Standard audit fields

### 3. Inventory & Product Collections

#### `products` (Base Collection)

- **Purpose**: Inventory items with photos and company association
- **Key Fields**:
  - `id`: Auto-generated 15-char alphanumeric ID
  - `name`: Product name (required, presentable)
  - `description`: Product description
  - `price`: Product price (required, default 0)
  - `photos`: Multiple file field for product images (PNG/JPEG/AVIF, max 5MB each)
  - `company`: Required relation to companies
  - `transactions`: Optional relation to transactions
  - `inventory`: Optional relation to inventory records
  - `date`: Required date field
  - Standard audit fields

#### `inventory` (Base Collection)

- **Purpose**: Inventory tracking records
- **Key Fields**:
  - `id`: Auto-generated 15-char alphanumeric ID
  - `company`: Required relation to companies
  - `quantity`: Inventory quantity (default 0)
  - `product`: Optional relation to products
  - Standard audit fields

### 4. ML Model Collection

#### `models` (Base Collection)

- **Purpose**: Machine learning model files and metadata
- **Key Fields**:
  - `id`: Auto-generated 15-char alphanumeric ID
  - `company`: Required relation to companies
  - `model`: Required file field for model binary (.bin files)
  - `metadata`: Required file field for model metadata (.json files)
  - `weights`: Required file field for model weights (.bin files)
  - Standard audit fields

### 5. Transaction Collection

#### `transactions` (Base Collection)

- **Purpose**: Business transactions and financial records
- **Key Fields**:
  - `id`: Auto-generated 15-char alphanumeric ID
  - `amount`: Transaction amount (required, default 0)
  - `type`: Transaction type (required)
  - `description`: Transaction description
  - `company`: Required relation to companies
  - `date`: Required date field
  - Standard audit fields

## Key Relationships

### Many-to-Many Relationships

- **Users ↔ Companies**: Via `users_via_company` junction field
- **Companies ↔ Users**: Bidirectional relationship for multi-user companies

### One-to-Many Relationships

- **Companies → Products**: Each product belongs to one company
- **Companies → Partners**: Each partner belongs to one company
- **Companies → Company Accounts**: Each account belongs to one company
- **Companies → Models**: Each ML model belongs to one company
- **Companies → Transactions**: Each transaction belongs to one company
- **Products → Inventory**: Each inventory record relates to products

### Optional Relationships

- **Products → Transactions**: Products can be linked to transactions
- **Products → Inventory**: Products can have inventory tracking

## Data Patterns & Conventions

### ID Generation

- All collections use auto-generated 15-character alphanumeric IDs
- Pattern: `^[a-z0-9]+$` (lowercase letters and numbers only)

### File Handling

- **Images**: Support for PNG, JPEG, AVIF formats
- **File Size**: Maximum 5MB per file
- **Multiple Files**: Products support multiple photos
- **File Types**: Specific file types for ML models (.bin, .json)

### Soft Deletes

- Companies implement soft delete via `deleted_at` timestamp
- Other collections use standard deletion

### Audit Fields

- All collections have `created` and `updated` auto-date fields
- System fields are generally hidden from API responses

## Migration Considerations

### Data Volume

- **File Assets**: All images and ML model files need migration
- **Relationships**: Maintain all foreign key relationships
- **Authentication**: Preserve user credentials and sessions

### Schema Evolution

- **ID Strategy**: 15-char IDs vs potential UUID migration in v2
- **File Storage**: Ensure file paths and URLs remain accessible
- **Authentication**: Password hashing strength (bcrypt cost differences)

### Business Logic Dependencies

- **Multi-tenancy**: Company-based data isolation is core to the business model
- **File Management**: Image and ML model file handling is critical
- **Audit Trail**: Created/updated timestamps for compliance
