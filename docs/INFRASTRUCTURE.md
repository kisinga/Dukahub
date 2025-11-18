# Infrastructure & Deployment

Complete guide for local development and production deployment.

---

## Table of Contents

- [Environment Variables](#environment-variables)
- [Fresh Setup](#fresh-setup)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Docker Containers](#docker-containers)
- [Database Operations](#database-operations)
- [Troubleshooting](#troubleshooting)

---

## Environment Variables

All configuration is managed via environment variables.

### Backend & Database

| Variable              | Example           | Default   | Notes                                             |
| --------------------- | ----------------- | --------- | ------------------------------------------------- |
| `DB_NAME`             | `vendure`         | `vendure` | Database name                                     |
| `DB_USER`             | `vendure`         | `vendure` | Database user (used in Docker Compose)            |
| `DB_USERNAME`         | `vendure`         | `vendure` | Database username (used by backend)               |
| `DB_PASSWORD`         | `secure-password` | `vendure` | Database password **[CHANGE IN PRODUCTION]**      |
| `DB_SCHEMA`           | `public`          | `public`  | PostgreSQL schema                                 |
| `POSTGRES_PORT`       | `5432`            | `5432`    | Database port (exposed to host)                   |
| `REDIS_HOST`          | `redis`           | —         | Redis hostname                                    |
| `REDIS_PORT`          | `6379`            | —         | Redis port                                        |
| `SUPERADMIN_USERNAME` | `superadmin`      | —         | Initial admin login                               |
| `SUPERADMIN_PASSWORD` | `secure-password` | —         | Initial admin password **[CHANGE IN PRODUCTION]** |
| `COOKIE_SECRET`       | `random-32-chars` | —         | Session encryption key **[CHANGE IN PRODUCTION]** |

### Frontend (Docker Only)

| Variable          | Example                        | Default   | Notes                                         |
| ----------------- | ------------------------------ | --------- | --------------------------------------------- |
| `BACKEND_HOST`    | `api.example.com`              | `backend` | Backend hostname, IP, or domain to connect to |
| `BACKEND_PORT`    | `3000`                         | `3000`    | Backend port to connect to                    |
| `FRONTEND_PORT`   | `4200`                         | `4200`    | Frontend port (exposed to host)               |
| `ENABLE_TRACING`  | `true`                         | `false`   | Enable OpenTelemetry tracing                  |
| `SIGNOZ_ENDPOINT` | `http://signoz:4318/v1/traces` | —         | SigNoz OTLP HTTP endpoint                     |

### Observability (SigNoz)

| Variable                     | Example                | Default                                      | Notes                                  |
| ---------------------------- | ---------------------- | -------------------------------------------- | -------------------------------------- |
| `SIGNOZ_ENABLED`             | `true`                 | `false`                                      | Enable backend observability           |
| `SIGNOZ_HOST`                | `signoz`               | `signoz`                                     | SigNoz service hostname                |
| `SIGNOZ_OTLP_GRPC_PORT`      | `4317`                 | `4317`                                       | OTLP gRPC port (backend)               |
| `SIGNOZ_OTLP_HTTP_PORT`      | `4318`                 | `4318`                                       | OTLP HTTP port (frontend)              |
| `SIGNOZ_SERVICE_NAME`        | `dukahub-backend`      | `dukahub-backend`                            | Backend service identifier             |
| `SIGNOZ_SERVICE_VERSION`     | `2.0.0`                | `2.0.0`                                      | Service version                        |
| `SIGNOZ_UI_PORT`             | `3301`                 | `3301`                                       | SigNoz UI port (exposed to host)       |
| `SIGNOZ_OTLP_GRPC_ENDPOINT`  | `http://signoz:4317`   | —                                            | Override OTLP gRPC endpoint (optional) |
| `SIGNOZ_OTLP_HTTP_ENDPOINT`  | `http://signoz:4318`   | —                                            | Override OTLP HTTP endpoint (optional) |
| `SIGNOZ_ENDPOINT`            | `http://signoz:4317`   | —                                            | Legacy endpoint (optional)             |
| `ENABLE_TRACING`             | `true`                 | `false`                                      | Enable frontend tracing                |
| `SIGNOZ_ENDPOINT` (frontend) | `/signoz/v1/traces`    | `/signoz/v1/traces`                          | Frontend SigNoz endpoint (nginx proxy) |
| `CLICKHOUSE_DB`              | `signoz`               | `signoz`                                     | ClickHouse database name               |
| `CLICKHOUSE_USER`            | `default`              | `default`                                    | ClickHouse user                        |
| `CLICKHOUSE_PASSWORD`        | `secure-password`      | —                                            | ClickHouse password                    |
| `CLICKHOUSE_HOST`            | `clickhouse`           | `clickhouse`                                 | ClickHouse hostname (for SigNoz)       |
| `CLICKHOUSE_PORT`            | `9000`                 | `9000`                                       | ClickHouse port (for SigNoz)           |
| `OTEL_RESOURCE_ATTRIBUTES`   | `service.name=dukahub` | `service.name=dukahub,service.version=2.0.0` | OpenTelemetry resource attributes      |

**Flexible Backend Connection:** The frontend can connect to backends anywhere:

- **Same Docker network:** Use service name (e.g., `backend`)
- **Different server:** Use IP address (e.g., `192.168.1.100`)
- **Different cloud provider:** Use domain name (e.g., `api.railway.app`)
- **Local dev from container:** Use `host.docker.internal`

The nginx configuration supports both Docker internal DNS and public DNS resolution.

### Optional Settings

| Variable           | Example                   | Default       | Notes                             |
| ------------------ | ------------------------- | ------------- | --------------------------------- |
| `NODE_ENV`         | `production`              | `development` | Runtime mode                      |
| `PORT`             | `3000`                    | `3000`        | Backend port                      |
| `COOKIE_SECURE`    | `true` / `false`          | `false`       | HTTPS-only cookies                |
| `FRONTEND_URL`     | `http://example.com`      | —             | CORS origins (comma-separated)    |
| `ASSET_URL_PREFIX` | `https://cdn.example.com` | —             | CDN URL for assets                |

### Security

**Security Warning:** Always change `DB_PASSWORD`, `SUPERADMIN_PASSWORD`, and `COOKIE_SECRET` before production deployment!

**Generate secure values:**

```bash
# Cookie secret (32 chars)
openssl rand -base64 32

# Passwords (20 chars)
openssl rand -base64 24 | tr -d "=+/" | cut -c1-20
```

### Usage by Environment

**Local Development:**

- Backend loads from `configs/.env` via dotenv
- Frontend uses `proxy.conf.json` for backend URL
- Services connect via `localhost` ports

**Docker:**

- Backend requires all database/Redis variables
- Frontend only needs `BACKEND_HOST` and `BACKEND_PORT`
- All configuration at container runtime

---

## Fresh Setup (Production Docker)

This section covers setting up a completely fresh **production Docker** installation of Dukahub, including the database initialization process.

### The Problem

When setting up a fresh production Docker installation, you might encounter this error:

```
ERROR: relation "channel" does not exist
STATEMENT: ALTER TABLE "channel" DROP CONSTRAINT IF EXISTS "FK_94e272d93bd32e4930f534bf1f9"
```

This happens because migrations try to run before the database schema is properly initialized.

### The Solution

The issue has been fixed by implementing **automatic database detection and initialization**. The system now automatically:

1. **Detects if the database is empty** (no tables exist)
2. **Populates the database** if empty (creates base Vendure schema + sample data)
3. **Runs migrations** (adds custom fields to existing tables)
4. **Starts the application** normally

**No manual flags or restarts required!**

### What Happens During Automatic Initialization

1. **Database Detection:**

   - System checks if database is completely empty (no tables)
   - Waits for database to be available (with retries)
   - Only proceeds with population if database is empty

2. **Database Population (if empty):**

   - PostgreSQL starts and creates the database
   - Vendure creates the base schema using `synchronize: true`
   - Sample data is populated (channels, products, etc.)

3. **Migration Application:**

   - Custom fields are added to existing tables
   - ML training fields are added to Channel
   - Customer/Supplier fields are added to Customer
   - Only pending migrations are executed (idempotent)

4. **Application Startup:**
   - Application starts normally with all data and custom fields
   - All initialization happens automatically on first run

### Expected Behavior

**On First Run (Empty Database):**

- Container detects empty database
- Automatically runs populate + migrations
- Starts Vendure server with all data and custom fields
- No manual intervention required

**On Subsequent Runs (Existing Database):**

- Container detects existing database
- Skips population (database already has data)
- Runs any pending migrations
- Starts Vendure server normally

### Verification

After setup, verify everything is working:

1. **Check backend health:**

   ```bash
   curl http://localhost:3000/health
   ```

2. **Check frontend:**

   ```bash
   curl http://localhost:4200
   ```

3. **Access admin UI:**
   - Open http://localhost:3000/admin
   - Login with credentials from .env file

### Fresh Setup Troubleshooting

#### Database Connection Issues

```bash
# Check database logs
docker compose logs postgres_db

# Check if database is ready
docker compose exec postgres_db pg_isready -U vendure -d vendure
```

#### Migration Issues

```bash
# Check migration status
docker compose exec backend npm run migration:show

# Reset database (DESTRUCTIVE)
docker compose down -v
docker compose up -d
```

#### Population Issues

```bash
# Check populate logs
docker compose logs backend | grep -E "(populate|error|✅|❌)"

# Force re-populate
docker compose exec backend npm run populate
```

---

## Local Development

Run frontend and backend manually on your machine for fastest iteration.

### Prerequisites

- Node.js 20+
- Docker (for Postgres and Redis)
- npm

### Setup

```bash
# 1. Start dependencies only
docker compose -f docker-compose.dev.yml up -d

# 2. Configure environment
cp configs/env.example configs/.env
nano configs/.env
```

**Required changes in `.env`:**

```bash
POSTGRES_PORT=5433
REDIS_PORT=6479
```

```bash
# 3. Install and run backend
cd backend
npm install
npm run dev      # Runs on http://localhost:3000

# 4. Install and run frontend (separate terminal)
cd frontend
npm install
npm start        # Runs on http://localhost:4200

# 5. Populate database (first-time only)
cd backend
npm run populate
```

### Service Ports

| Service    | Host Port | Container Port |
| ---------- | --------- | -------------- |
| Frontend   | 4200      | —              |
| Backend    | 3000      | —              |
| PostgreSQL | 5433      | 5432           |
| Redis      | 6479      | 6379           |

### Frontend Development

**Backend Proxy:**  
Edit `frontend/proxy.conf.json` to point to your backend:

```json
{
  "/admin-api": {
    "target": "http://localhost:3000"
  }
}
```

This solves cross-origin cookie issues by making everything same-origin.

### Stop Services

```bash
# Stop dependencies
docker compose -f docker-compose.dev.yml down

# Stop dependencies and delete data
docker compose -f docker-compose.dev.yml down -v
```

---

## Production Deployment

Deploy using Docker Compose with hosted images for a complete, self-contained setup.

### Architecture

| Service      | Image/Version                             | Port | Requirements         |
| ------------ | ----------------------------------------- | ---- | -------------------- |
| **Frontend** | `ghcr.io/kisinga/dukahub/frontend:latest` | 4200 | Backend API          |
| **Backend**  | `ghcr.io/kisinga/dukahub/backend:latest`  | 3000 | Postgres 17, Redis 7 |
| **Postgres** | `postgres:17-alpine`                      | 5432 | Persistent storage   |
| **Redis**    | `redis:7-alpine`                          | 6379 | Persistent storage   |

### Quick Start

### Docker Compose Deployment

This is the recommended deployment method for production environments.

#### Prerequisites

- Docker and Docker Compose installed
- At least 4GB RAM available
- At least 10GB disk space for data volumes

#### Configuration

1. **Environment Setup:**

```bash
cp env.example .env
```

2. **Edit `.env` file with your production values:**

```bash
# Database
DB_PASSWORD=your_secure_database_password
SUPERADMIN_PASSWORD=your_secure_admin_password
COOKIE_SECRET=your-32-character-secret-key

# URLs (update with your domain)
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

3. **Deploy:**

```bash
docker compose up -d
```

#### Management Commands

```bash
# Check status
docker compose ps

# View logs
docker compose logs -f
docker compose logs -f backend  # specific service

# Update services
docker compose pull
docker compose up -d --force-recreate

# Restart services
docker compose restart

# Stop services
docker compose down

# Database operations
docker compose exec backend npm run populate    # populate with sample data
docker compose exec postgres_db pg_dump -U vendure vendure > backup.sql  # backup
```

#### Service Discovery

The Docker Compose setup automatically handles service discovery:

- Frontend connects to backend using service name `backend`
- Backend connects to database using service name `postgres_db`
- Backend connects to Redis using service name `redis`
- All services are on the same Docker network for secure communication

### New Components

#### 1. ML Model Plugin (`backend/src/plugins/ml-model.plugin.ts`)

- **Custom Fields**: Adds `mlModelJson`, `mlModelBin`, `mlMetadata`, `mlModelVersion`, `mlModelStatus` to Channel entity
- **GraphQL API**: Provides queries and mutations for model management
- **File Serving**: Serves ML model files through authenticated API endpoints
- **Admin UI**: Angular component for model upload/management in admin panel

#### 2. Updated Frontend Service (`frontend/src/app/core/services/ml-model.service.ts`)

- **API Integration**: Uses GraphQL queries instead of direct file fetching
- **Model Loading**: Loads models from `/admin-api/ml-models/{channelId}/` endpoints
- **Error Handling**: Improved error handling for API failures
- **Caching**: Maintains IndexedDB caching for offline operation

### Admin UI Integration

#### Custom Fields in Channel Settings

The ML model custom fields appear in the Channel detail page in the Admin UI:

- **ML Model JSON File**: Dropdown to select uploaded model.json asset
- **ML Model Binary Files**: Dropdown to select uploaded binary files
- **ML Model Metadata**: Dropdown to select uploaded metadata.json asset
- **ML Model Version**: Text field for version tracking
- **ML Model Status**: Text field for status (active/inactive)

#### Upload Workflow

1. Go to **Assets** section in Admin UI
2. Upload ML model files (model.json, metadata.json, binary files)
3. Tag files appropriately (e.g., "ml-model", "model-json", "metadata")
4. Go to **Settings → Channels**
5. Select the appropriate channel
6. Use the custom fields dropdowns to associate uploaded files with the channel

### API Endpoints

#### GraphQL Queries

```graphql
query GetMlModelInfo($channelId: ID!) {
  mlModelInfo(channelId: $channelId) {
    hasModel
    version
    status
    trainedAt
    productCount
    imageCount
    labels
  }
}
```

#### GraphQL Mutations

```graphql
mutation UploadMlModelFiles(
  $channelId: ID!
  $modelJson: Upload!
  $metadata: Upload!
) {
  uploadMlModelFiles(
    channelId: $channelId
    modelJson: $modelJson
    metadata: $metadata
  )
}
```
