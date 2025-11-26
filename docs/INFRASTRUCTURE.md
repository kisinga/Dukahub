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

## Docker Network Architecture

Dukarun uses a shared Docker network to enable service discovery and secure communication between containers.

### Network Configuration

**Network Name:** `dukarun_services_network`

**How it works:**

1. **Manual Network Creation:** Create the external network before starting services:
   ```bash
   docker network create dukarun_services_network
   ```
2. **Services Compose** (`docker-compose.services.yml`):
   - Uses `dukarun_services_network` as an external network
   - All infrastructure services connect to this network
3. **App Compose** (`docker-compose.yml`):
   - Joins `dukarun_services_network` as an external network
   - All application services connect to this network

**Why this matters:**

- Consistent network naming for both local development and production
- Enables service discovery via service names (not IPs)
- Allows services to communicate securely within the network
- Required for proper service-to-service communication
- Works identically in local Docker and Coolify deployments

### Service Communication

All services communicate using Docker service names (not `localhost`):

| Service         | Hostname            | Port      | Notes                          |
| --------------- | ------------------- | --------- | ------------------------------ |
| **PostgreSQL**  | `postgres_db`       | 5432      | Main database                  |
| **TimescaleDB** | `timescaledb_audit` | 5432      | Audit logs database            |
| **Redis**       | `redis`             | 6379      | Cache and OTP storage          |
| **Backend**     | `backend`           | 3000      | Vendure API server             |
| **SigNoz**      | `signoz`            | 4317/4318 | Observability platform         |
| **ClickHouse**  | `clickhouse`        | 9000      | SigNoz storage (internal only) |

**Example:** Backend connects to database using `DB_HOST=postgres_db` (not `localhost`)

### Network Setup (Required for All Deployments)

**Step 1: Create the external network (one-time)**

```bash
docker network create dukarun_services_network
```

**Step 2: Start infrastructure services**

```bash
docker compose -f docker-compose.services.yml up -d
```

**Step 3: Start application services**

```bash
docker compose up -d
```

**Note:** Both compose files are already configured to use `dukarun_services_network` as an external network. The network must be created manually before starting services.

**For Coolify Deployments:** Follow the same network setup steps above. Create the network via SSH or Coolify terminal before deploying services. If using Coolify's "Connect to Predefined Network" feature, change the network name from `dukarun_services_network` to `coolify` in both compose files.

---

## Environment Variables

All configuration is managed via environment variables. See `.env.example` in the project root for a complete template.

### Backend & Database

| Variable              | Example           | Default     | Notes                                             |
| --------------------- | ----------------- | ----------- | ------------------------------------------------- |
| `DB_NAME`             | `vendure`         | `vendure`   | Database name                                     |
| `DB_USER`             | `vendure`         | `vendure`   | Database user (used in Docker Compose)            |
| `DB_USERNAME`         | `vendure`         | `vendure`   | Database username (used by backend)               |
| `DB_PASSWORD`         | `secure-password` | `vendure`   | Database password **[CHANGE IN PRODUCTION]**      |
| `DB_SCHEMA`           | `public`          | `public`    | PostgreSQL schema                                 |
| `DB_HOST`             | `postgres_db`     | `localhost` | Database hostname (use service name in Docker)    |
| `DB_PORT`             | `5432`            | `5432`      | Database port                                     |
| `POSTGRES_PORT`       | `5432`            | `5432`      | Database port (exposed to host)                   |
| `REDIS_HOST`          | `redis`           | `localhost` | Redis hostname (use service name in Docker)       |
| `REDIS_PORT`          | `6379`            | `6379`      | Redis port                                        |
| `REDIS_PASSWORD`      | `secure-password` | —           | Redis password (optional)                         |
| `SUPERADMIN_USERNAME` | `superadmin`      | —           | Initial admin login                               |
| `SUPERADMIN_PASSWORD` | `secure-password` | —           | Initial admin password **[CHANGE IN PRODUCTION]** |
| `COOKIE_SECRET`       | `random-32-chars` | —           | Session encryption key **[CHANGE IN PRODUCTION]** |
| `COOKIE_SECURE`       | `true` / `false`  | `false`     | HTTPS-only cookies                                |

### Audit Database (TimescaleDB)

| Variable               | Example             | Default             | Notes                                 |
| ---------------------- | ------------------- | ------------------- | ------------------------------------- |
| `AUDIT_DB_NAME`        | `audit_logs`        | `audit_logs`        | Audit database name                   |
| `AUDIT_DB_USER`        | `audit_user`        | `audit_user`        | Audit database user (Docker Compose)  |
| `AUDIT_DB_USERNAME`    | `audit_user`        | `audit_user`        | Audit database username (backend)     |
| `AUDIT_DB_PASSWORD`    | `secure-password`   | `audit_password`    | Audit database password **[CHANGE]**  |
| `AUDIT_DB_HOST`        | `timescaledb_audit` | `timescaledb_audit` | Audit DB hostname (service name)      |
| `AUDIT_DB_PORT`        | `5432`              | `5432`              | Audit database port                   |
| `AUDIT_DB_PORT` (host) | `5433`              | `5433`              | Audit database port (exposed to host) |

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
| `SIGNOZ_SERVICE_NAME`        | `dukarun-backend`      | `dukarun-backend`                            | Backend service identifier             |
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
| `OTEL_RESOURCE_ATTRIBUTES`   | `service.name=dukarun` | `service.name=dukarun,service.version=2.0.0` | OpenTelemetry resource attributes      |

**Flexible Backend Connection:** The frontend can connect to backends anywhere:

- **Same Docker network:** Use service name (e.g., `backend`)
- **Different server:** Use IP address (e.g., `192.168.1.100`)
- **Different cloud provider:** Use domain name (e.g., `api.railway.app`)
- **Local dev from container:** Use `host.docker.internal`

The nginx configuration supports both Docker internal DNS and public DNS resolution.

### SMS Provider Configuration

| Variable                     | Example           | Default      | Notes                                  |
| ---------------------------- | ----------------- | ------------ | -------------------------------------- |
| `SMS_PROVIDER`               | `textsms`         | `textsms`    | Provider: 'textsms', 'africastalking'  |
| `TEXTSMS_API_KEY`            | `your-api-key`    | —            | TextSMS API key (required)             |
| `TEXTSMS_PARTNER_ID`         | `your-partner-id` | —            | TextSMS Partner ID (required)          |
| `TEXTSMS_SHORTCODE`          | `YOURCODE`        | —            | TextSMS Sender ID/Shortcode (required) |
| `AFRICASTALKING_USERNAME`    | `your-username`   | —            | AfricasTalking username                |
| `AFRICASTALKING_API_KEY`     | `your-api-key`    | —            | AfricasTalking API key                 |
| `AFRICASTALKING_SENDER_ID`   | `YOURCODE`        | —            | AfricasTalking Sender ID               |
| `AFRICASTALKING_ENVIRONMENT` | `production`      | `production` | Environment: 'sandbox' or 'production' |

### Push Notification Configuration (VAPID)

| Variable            | Example                    | Default                    | Notes                                      |
| ------------------- | -------------------------- | -------------------------- | ------------------------------------------ |
| `VAPID_PUBLIC_KEY`  | `your-public-key`          | —                          | VAPID public key (generate with web-push)  |
| `VAPID_PRIVATE_KEY` | `your-private-key`         | —                          | VAPID private key (generate with web-push) |
| `VAPID_EMAIL`       | `mailto:admin@dukarun.com` | `mailto:admin@dukarun.com` | VAPID subject/email                        |
| `VAPID_SUBJECT`     | `mailto:admin@dukarun.com` | —                          | VAPID subject (alternative)                |

### Payment Provider Configuration

| Variable              | Example       | Default | Notes               |
| --------------------- | ------------- | ------- | ------------------- |
| `PAYSTACK_SECRET_KEY` | `sk_live_...` | —       | Paystack secret key |
| `PAYSTACK_PUBLIC_KEY` | `pk_live_...` | —       | Paystack public key |

### Email Configuration (Optional)

| Variable         | Example               | Default | Notes                  |
| ---------------- | --------------------- | ------- | ---------------------- |
| `MAIL_TRANSPORT` | `SMTP`                | `SMTP`  | Email transport method |
| `SMTP_HOST`      | `smtp.example.com`    | —       | SMTP server hostname   |
| `SMTP_PORT`      | `587`                 | `587`   | SMTP server port       |
| `SMTP_USER`      | `user@example.com`    | —       | SMTP username          |
| `SMTP_PASS`      | `secure-password`     | —       | SMTP password          |
| `SMTP_FROM`      | `noreply@example.com` | —       | From email address     |

### Asset Storage Configuration

| Variable                 | Example                     | Default                     | Notes                         |
| ------------------------ | --------------------------- | --------------------------- | ----------------------------- |
| `ASSET_STORAGE_STRATEGY` | `LocalAssetStorageStrategy` | `LocalAssetStorageStrategy` | Storage strategy              |
| `ASSET_UPLOAD_DIR`       | `/app/static/assets`        | `/app/static/assets`        | Asset upload directory        |
| `ASSET_URL_PREFIX`       | `https://cdn.example.com`   | —                           | CDN URL for assets (optional) |

### Optional Settings

| Variable            | Example                 | Default                 | Notes                           |
| ------------------- | ----------------------- | ----------------------- | ------------------------------- |
| `NODE_ENV`          | `production`            | `development`           | Runtime mode                    |
| `PORT`              | `3000`                  | `3000`                  | Backend port                    |
| `BACKEND_PORT`      | `3000`                  | `3000`                  | Backend port (exposed to host)  |
| `FRONTEND_PORT`     | `4200`                  | `4200`                  | Frontend port (exposed to host) |
| `FRONTEND_URL`      | `http://example.com`    | —                       | CORS origins (comma-separated)  |
| `CORS_ORIGIN`       | `http://localhost:4200` | `http://localhost:4200` | CORS allowed origin             |
| `LOG_LEVEL`         | `info`                  | `info`                  | Logging level                   |
| `ML_WEBHOOK_SECRET` | `secure-secret`         | —                       | ML webhook secret (optional)    |

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

- Backend loads from root `.env` via EnvironmentConfig (single source of truth)
- Frontend uses `proxy.conf.json` for backend URL
- Services connect via `localhost` ports

**Docker:**

- Backend requires all database/Redis variables
- Frontend only needs `BACKEND_HOST` and `BACKEND_PORT`
- All configuration at container runtime via environment variables
- Use service names for hostnames (e.g., `postgres_db`, `redis`, `backend`)
- Network: Services communicate via `dukarun_services_network` (must be created manually)

**Creating .env File:**

```bash
# Copy the example file
cp .env.example .env

# Edit with your values
nano .env
```

**Required for Docker Compose:**

1. Create network: `docker network create dukarun_services_network` (one-time)
2. All database credentials
3. Superadmin credentials
4. Cookie secret

**Service Hostnames in Docker:**

Always use service names (not `localhost`):

- Database: `postgres_db`
- Redis: `redis`
- Backend: `backend`
- TimescaleDB: `timescaledb_audit`
- SigNoz: `signoz`

---

## Fresh Setup (Production Docker)

This section covers setting up a completely fresh **production Docker** installation of Dukarun, including the database initialization process.

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

### Required Database State

For user registration and core functionality to work, the following database state must be present:

#### 1. Zones & Countries

Registration requires a specific zone for setting default shipping and tax configurations for new channels.

- **Country**: Kenya (`KE`)
- **Zone**: "Kenya"
- **Zone Members**: Kenya (`KE`) must be a member of the "Kenya" zone.

#### 2. Tax Configuration

A default tax structure is required for accurate pricing and tax calculations.

- **Tax Category**: "Standard Tax"
- **Tax Rate**: "Kenya VAT" (16%)
  - **Category**: Standard Tax
  - **Zone**: Kenya
  - **Value**: 16%

#### 3. Default Channel

The default channel serves as the template for creating new channels during registration.

- **Default Shipping Zone**: Must be set to "Kenya".
- **Default Tax Zone**: Must be set to "Kenya".
- **Default Currency**: Must be set to `KES` (Kenya Shilling).
- **Currency Code**: Must be set to `KES`.

#### Automatic Seeding

These requirements are automatically provisioned during bootstrap by the Kenya seeding utility (`ensureKenyaContext`) which reuses Vendure's official `Populator` flow.

> **Bootstrap safeguard:** `initializeVendureBootstrap()` verifies Vendure core tables before running migrations. Once migrations finish, `ensureKenyaContext` bootstraps a lightweight Vendure instance, seeds the Kenya country/zone/tax configuration via Vendure services, and updates the default channel currency to `KES`.

If seeding needs to be skipped (e.g., for alternative regions), set `AUTO_SEED_KENYA=false` in the environment and create the required entities manually.

#### Validation

The `RegistrationValidatorService` checks for these requirements before allowing a new user to register:

- `getKenyaZone()` ensures the "Kenya" zone exists.
- `validateDefaultZones()` ensures the default channel has shipping and tax zones configured.

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

#### Missing Zone/Country Configuration

If registration fails with zone-related errors:

```bash
# Check if Kenya zone exists
docker compose exec backend npm run populate

# Verify zone configuration
docker compose exec postgres_db psql -U vendure -d vendure -c "SELECT name FROM zone WHERE name = 'Kenya';"
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
cp .env.example .env
nano .env
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

**Architecture:** Dukarun uses a two-file Docker Compose structure:

- **`docker-compose.services.yml`** - Infrastructure services (PostgreSQL, Redis, TimescaleDB, SigNoz, ClickHouse)
- **`docker-compose.yml`** - Application services (Backend, Frontend)

**Deployment Order:** Create network → Start infrastructure services → Start application services. See [Docker Network Architecture](#docker-network-architecture) for details.

### Service Overview

| Service        | Image/Version                             | Port | Requirements         |
| -------------- | ----------------------------------------- | ---- | -------------------- |
| **Frontend**   | `ghcr.io/kisinga/dukarun/frontend:latest` | 4200 | Backend API          |
| **Backend**    | `ghcr.io/kisinga/dukarun/backend:latest`  | 3000 | Postgres 17, Redis 7 |
| **Postgres**   | `postgres:17`                             | 5432 | Persistent storage   |
| **Redis**      | `redis:7-alpine`                          | 6379 | Persistent storage   |
| **SigNoz**     | `signoz/signoz:latest`                    | 3301 | ClickHouse           |
| **ClickHouse** | `clickhouse/clickhouse-server:latest`     | —    | Internal only        |

### Docker Compose Deployment

This is the recommended deployment method for production environments.

#### Prerequisites

- Docker and Docker Compose installed
- At least 4GB RAM available
- At least 10GB disk space for data volumes

#### Configuration

1. **Create the external network (one-time):**

```bash
docker network create dukarun_services_network
```

2. **Environment Setup:**

```bash
cp .env.example .env
```

3. **Edit `.env` file with your production values:**

```bash
# Database
DB_PASSWORD=your_secure_database_password
SUPERADMIN_PASSWORD=your_secure_admin_password
COOKIE_SECRET=your-32-character-secret-key

# URLs (update with your domain)
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

4. **Deploy:**

```bash
# Start infrastructure services first
docker compose -f docker-compose.services.yml up -d

# Then start application services
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

All services communicate via Docker service names on the shared `dukarun_services_network`:

- Frontend → Backend: `backend:3000`
- Backend → PostgreSQL: `postgres_db:5432`
- Backend → Redis: `redis:6379`
- Backend → TimescaleDB: `timescaledb_audit:5432`
- Backend → SigNoz: `signoz:4317` (gRPC) or `signoz:4318` (HTTP)
- Frontend → SigNoz: `signoz:4318` (via nginx proxy at `/signoz/`)

**Important:** Never use `localhost` in Docker containers. Always use service names for inter-container communication.

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
mutation UploadMlModelFiles($channelId: ID!, $modelJson: Upload!, $metadata: Upload!) {
  uploadMlModelFiles(channelId: $channelId, modelJson: $modelJson, metadata: $metadata)
}
```
