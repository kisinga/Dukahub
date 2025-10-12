# V1 Configuration & Deployment

## Application Architecture

### Technology Stack

- **Backend**: Go 1.21+ with PocketBase framework
- **Database**: SQLite (embedded in PocketBase)
- **Frontend**: Vanilla JavaScript + Alpine.js + Bootstrap 5
- **ML Integration**: TensorFlow.js + Teachable Machine
- **Deployment**: Docker containerization

### Project Structure

```
v1/
├── main.go              # Application entry point
├── lib/                 # Business logic and utilities
├── models/              # Data models and PocketBase schema
├── resolvers/           # API endpoints and route handlers
├── views/               # HTML templates and UI components
├── public/              # Static assets (JS, CSS, images)
├── go.mod/go.sum        # Go module dependencies
├── Dockerfile           # Container definition
├── docker-entry.sh     # Container startup script
└── Makefile            # Development utilities
```

## Configuration Files

### 1. Go Module Configuration (`go.mod`)

```go
module github.com/kisinga/dukahub

go 1.21

require (
    github.com/a-h/templ v0.2.543    // Template engine
    github.com/pocketbase/pocketbase v0.21.2  // Backend framework
    // ... other dependencies
)
```

**Key Dependencies**:

- **PocketBase**: Core backend framework with auth, database, file handling
- **Templ**: Go template engine for HTML generation
- **Standard Library**: HTTP, JSON, file system operations

### 2. Docker Configuration (`Dockerfile`)

**Multi-stage Build**:

```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Runtime stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
COPY --from=builder /app/public ./public
CMD ["./main", "serve", "--http=0.0.0.0:8090"]
```

**Key Features**:

- **Multi-stage Build**: Optimized for production deployment
- **Static Binary**: No runtime dependencies required
- **Embedded Assets**: Public files embedded in binary
- **Minimal Base Image**: Alpine Linux for small footprint

### 3. Container Entry Script (`docker-entry.sh`)

```bash
#!/bin/sh
# PocketBase migration runner
./main migrate up

# Start PocketBase server
exec ./main serve --http=0.0.0.0:8090
```

**Purpose**: Ensures database migrations run before server startup

## Environment Configuration

### PocketBase Settings

- **Default Port**: 8090
- **Admin UI**: Available at `/admin` endpoint
- **API Base**: `/api` for REST endpoints
- **File Storage**: Local filesystem storage

### Application Constants

```go
// Authentication cookie names
const AuthCookieName = "Auth"

// Embedded filesystem for static assets
//go:embed public
var embeddedFiles embed.FS
```

## Database Schema Configuration

### PocketBase Collections (Auto-generated from `models/pb_schema.json`)

- **Authentication Collections**: `admins`, `users` with password hashing
- **Business Collections**: `companies`, `products`, `partners`, `company_accounts`
- **Transaction Collections**: `transactions`, `inventory`
- **ML Collections**: `models` for machine learning files

### Schema Evolution Strategy

- **Migration Files**: PocketBase handles schema migrations automatically
- **Seed Data**: Initial data population via Go code
- **Version Control**: Schema changes tracked in version control

## Development Setup

### Makefile Targets

```makefile
# Build and run locally
dev: build
	./dukahub serve --http=0.0.0.0:8090

# Build binary
build:
	go build -o dukahub .

# Clean build artifacts
clean:
	rm -f dukahub

# Run tests
test:
	go test ./...

# Format code
fmt:
	go fmt ./...
```

### Local Development

1. **Dependencies**: Go modules automatically managed
2. **Database**: SQLite file created automatically by PocketBase
3. **File Storage**: Local filesystem for uploads
4. **Hot Reload**: Manual restart required for code changes

## Deployment Configuration

### Production Deployment

**Docker Compose Integration**:

```yaml
services:
  dukahub:
    build: ./v1
    ports:
      - "8090:8090"
    volumes:
      - ./data:/root/pb_data # Persistent data
    environment:
      - PB_ENCRYPTION_KEY=${PB_ENCRYPTION_KEY}
```

**Environment Variables**:

- `PB_ENCRYPTION_KEY`: PocketBase encryption key for sensitive data

### Data Persistence

- **Database**: SQLite file stored in persistent volume
- **File Storage**: Uploaded images and ML models persisted
- **Configuration**: PocketBase settings stored in database

## Security Configuration

### Authentication

- **Password Hashing**: bcrypt with appropriate cost factors
- **Session Management**: HTTP-only cookies with secure flags
- **CORS Policy**: Configurable cross-origin request handling

### File Upload Security

- **Type Validation**: Strict MIME type checking for uploads
- **Size Limits**: Maximum file size restrictions (5MB default)
- **Path Traversal Protection**: Secure file path handling

## Performance Configuration

### PocketBase Settings

- **Database Pool**: Connection pooling for SQLite
- **File Serving**: Efficient static file serving with caching headers
- **WebSocket Support**: Real-time subscriptions for live updates

### Frontend Optimization

- **Asset Embedding**: Static files embedded in binary for single deployment artifact
- **CDN Dependencies**: External libraries loaded from CDN for caching benefits
- **Lazy Loading**: Components loaded on-demand

## Monitoring & Logging

### Application Logging

- **Structured Logging**: Go standard library logging
- **Error Tracking**: Comprehensive error handling and reporting
- **Debug Information**: Detailed logging for development

### Health Checks

- **Database Connectivity**: Automatic database health monitoring
- **File System Access**: Storage system health checks
- **API Endpoints**: Route availability verification

## Migration Strategy

### Database Migration

- **PocketBase Migrations**: Automatic schema evolution
- **Data Backup**: SQLite file backup before migrations
- **Rollback Strategy**: Migration rollback capabilities

### Configuration Migration

- **Environment Variables**: Documented configuration requirements
- **Docker Compose**: Updated deployment configurations
- **Monitoring**: Updated monitoring and alerting rules

## Troubleshooting Configuration

### Common Issues

1. **Port Conflicts**: Default port 8090 conflicts with other services
2. **File Permissions**: Insufficient permissions for file operations
3. **Memory Limits**: SQLite performance issues with large datasets
4. **Network Issues**: CORS or firewall blocking requests

### Debug Configuration

- **Verbose Logging**: Enable detailed logging for troubleshooting
- **Development Mode**: Special configuration for development environment
- **Health Endpoints**: Diagnostic endpoints for system health

## Version Control Strategy

### Code Organization

- **Monorepo Structure**: Single repository for entire application
- **Component Isolation**: Clear separation between backend and frontend
- **Configuration Management**: Environment-specific configuration files

### Release Management

- **Semantic Versioning**: Version tags for releases
- **Docker Tags**: Container image versioning
- **Rollback Strategy**: Previous version deployment capabilities
