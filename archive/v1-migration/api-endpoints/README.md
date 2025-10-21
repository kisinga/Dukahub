# V1 API Endpoints & Business Logic

## Architecture Overview

V1 used a **PocketBase-based API** with custom resolvers organized by feature domains. The system implemented a clear separation between admin and user functionalities.

## Authentication System

### Dual Authentication Strategy

```go
// Two separate authentication systems:
1. Users (Company Users): pb_users_auth cookie
2. Admins (Super Admins): pb_admins_auth cookie

// Both use HTTP-only cookies with security flags:
// - HttpOnly: true
// - Secure: true
// - SameSite: Lax
```

### Route Protection

- **Middleware Pattern**: `AuthCheck` functions validate tokens before route execution
- **Context Injection**: User/Admin IDs injected into request context for downstream use
- **Redirect Strategy**: Unauthorized requests redirected to appropriate login pages

## Route Structure

### Public Routes

```go
GET  /                    → pages.Home()
GET  /login               → pages.Login(models.Dashboard)
GET  /admin-login         → pages.Login(models.AdminDashboard)
```

### Admin Routes (`/admin-dashboard/*`)

**Protected by**: `resolvers.Admin.AuthCheck`

```go
GET  /                    → Admin.Home()           // Company listing with stats
GET  /analytics           → Admin.Analytics()      // Analytics dashboard
GET  /export/{companyID}  → Admin.Export()        // Photo export as ZIP
```

### Company Dashboard Routes (`/dashboard/{companyID}/*`)

**Protected by**: `resolvers.Dashboard.AuthCheck`

```go
GET  /                    → Dashboard.Home()       // Company dashboard
GET  /sell                → Dashboard.Sell()       // Sales interface
GET  /company-settings    → Dashboard.CompanySettings()
GET  /cash-register       → Dashboard.Register()   // Point of sale
```

## Key API Endpoints & Business Logic

### 1. Admin Dashboard (`admin/main.go`)

#### Company Management

- **Pagination**: 10 companies per page
- **Statistics Aggregation**:
  - Products count per company
  - Users count per company
  - Accounts count per company
  - Partners count per company

#### Photo Export Feature

```go
// Export all product photos for a company as ZIP file
func (r *Resolvers) Export(c *core.RequestEvent) error {
    companyID := c.Request.PathValue("companyID")

    buf, err := r.helper.ExportPhotos(companyID) // From lib/export_photos.go
    // Sets headers for downloadable ZIP
    // Streams ZIP content directly to response
}
```

#### Analytics Dashboard

- **Real-time Metrics**: Company performance indicators
- **Model Status Tracking**: ML model training status and metadata

### 2. User Dashboard (`dashboard/main.go`)

#### Company Selection Logic

```go
// Automatic company selection for users with multiple companies
func (r *Resolvers) Root(e *core.RequestEvent) error {
    // Gets first company from user's company list
    companies := record.GetStringSlice("company")
    if len(companies) > 0 {
        return e.Redirect(307, fmt.Sprintf("/dashboard/%s", companies[0]))
    }
}
```

#### Dashboard Data Aggregation

- **User Context**: Full user profile with company relationships
- **Company Stats**: Performance metrics and counts
- **Active Company**: Currently selected company context

### 3. Sales Interface (`dashboard/sell.go`)

#### Point of Sale Workflow

- **Product Scanning**: Integration with product catalog
- **Transaction Processing**: Real-time sales recording
- **Inventory Updates**: Automatic stock management
- **Company Context**: Sales scoped to specific companies

## Business Logic Patterns

### 1. Error Handling Strategy

```go
// Consistent error handling across all resolvers:
if err != nil {
    return c.Redirect(http.StatusFound, "/login") // Graceful fallback
}

// Logging for debugging:
r.helper.Logger.Printf("Error message: %v", err)
```

### 2. Data Flow Architecture

```
Request → Auth Check → Business Logic → Template Rendering
    ↓         ↓            ↓              ↓
Cookie → Token Validation → Data Fetch → HTML Response
```

### 3. Multi-tenancy Implementation

- **Company-based Isolation**: All data operations scoped to companies
- **User-Company Relationships**: Many-to-many user-company associations
- **Context Injection**: Company ID passed through request context

### 4. File Management

- **Dynamic URL Generation**: Automatic thumbnail and file URL creation
- **Export Functionality**: Bulk photo export for backup/migration
- **ML Model Files**: Specialized handling for `.bin`, `.json` files

## Template Integration

### Rendering Pattern

```go
// All endpoints use the same rendering pattern:
return lib.Render(c, template.Component(data))

// Where:
// - c: PocketBase RequestEvent (request/response context)
// - template.Component: Pre-compiled HTML template
// - data: Structured data for template rendering
```

### Template Data Structures

- **DashboardData**: User, company, and statistics information
- **CompanyDashboardData**: Aggregated company metrics and status
- **ModelDetails**: ML model status and metadata

## Security Considerations

### Authentication Security

- **HTTP-only Cookies**: Prevents XSS token theft
- **Secure Flag**: HTTPS-only cookie transmission
- **Token-based Auth**: No session fixation vulnerabilities

### Authorization Patterns

- **Role-based Access**: Separate admin vs user permission levels
- **Company Scoping**: Users can only access their company's data
- **Admin Oversight**: Admins can access all company data

## Performance Characteristics

### Database Operations

- **Efficient Queries**: Optimized PocketBase queries with filtering
- **Pagination**: Built-in pagination for large datasets
- **Caching Strategy**: Minimal caching (rely on database performance)

### File Operations

- **Streaming**: ZIP export streams content (no memory bloat)
- **Thumbnail Generation**: On-demand image processing
- **File Validation**: Size and type restrictions enforced

## Migration Considerations

### API Compatibility

- **Route Structure**: Current REST-like routes may need GraphQL adaptation in v2
- **Authentication**: Cookie-based auth may need token-based evolution
- **Error Handling**: Consistent error response patterns to maintain

### Business Logic Preservation

- **Multi-tenancy**: Core company-based architecture must be preserved
- **File Handling**: Image and ML model management workflows are critical
- **Export Features**: Photo export functionality may need equivalent in v2

### Template Dependencies

- **Rendering Engine**: Current template system may need replacement
- **Data Structures**: Template data models should be preserved
- **Component Architecture**: UI component structure for reference
