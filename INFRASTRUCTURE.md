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

| Variable        | Example           | Default   | Notes                                         |
| --------------- | ----------------- | --------- | --------------------------------------------- |
| `BACKEND_HOST`  | `api.example.com` | `backend` | Backend hostname, IP, or domain to connect to |
| `BACKEND_PORT`  | `3000`            | `3000`    | Backend port to connect to                    |
| `FRONTEND_PORT` | `4200`            | `4200`    | Frontend port (exposed to host)               |

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
| `FIRST_RUN`        | `true` / `false`          | `false`       | First-time initialization process |

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

The issue has been fixed by introducing a **FIRST_RUN** environment flag that handles the complete initialization process sequentially:

1. **Step 1: Populate database** - Creates base Vendure schema + sample data
2. **Step 2: Run migrations** - Adds custom fields to existing tables
3. **Step 3: Shutdown gracefully** - Allows you to toggle off and restart normally

### Quick Setup

#### Option 1: Automated Setup (Recommended)

```bash
# Run the setup script
./setup-fresh.sh

# Start the application
docker compose up -d

# Monitor the setup process
docker compose logs -f backend
```

#### Option 2: Manual Setup

1. **Create data directories:**

   ```bash
   mkdir -p data/{postgres,redis,assets,uploads}
   ```

2. **Set FIRST_RUN flag:**

   ```bash
   export FIRST_RUN=true
   ```

3. **Start the application:**

   ```bash
   docker compose up -d
   ```

4. **Monitor the setup:**

   ```bash
   docker compose logs -f backend
   ```

5. **After initialization completes, disable FIRST_RUN:**
   ```bash
   export FIRST_RUN=false
   docker compose restart backend
   ```

### What Happens During FIRST_RUN Setup

1. **Step 1: Database Population:**

   - PostgreSQL starts and creates the database
   - Vendure creates the base schema using `synchronize: true`
   - Sample data is populated (channels, products, etc.)

2. **Step 2: Migration Application:**

   - Custom fields are added to existing tables
   - ML training fields are added to Channel
   - Customer/Supplier fields are added to Customer

3. **Step 3: Graceful Shutdown:**
   - Container exits after successful initialization
   - You set `FIRST_RUN=false` and restart
   - Application starts normally with all data and custom fields

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

```bash
# 1. Clone the repository
git clone <repository-url>
cd Dukahub

# 2. Set up environment
cp env.example .env
# Edit .env with your production values

# 3. Deploy
docker compose up -d

# 4. Check status
docker compose ps
```

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

### Other Platforms (Railway, Render, Fly.io, etc.)

#### 1. Create Database Services

**PostgreSQL 16:**

- Enable persistent storage
- Note internal hostname

**Redis 7:**

- Enable persistent storage
- Note internal hostname

#### 2. Deploy Backend

**Image:** `ghcr.io/kisinga/dukahub/backend:latest` or build from `backend/`

**Environment Variables:** Configure all variables from [Environment Variables](#environment-variables) section above.

**Required for production:**

- Set `NODE_ENV=production`
- Set `COOKIE_SECURE=true`
- Point `DB_HOST` and `REDIS_HOST` to internal service names
- Set `FRONTEND_URL` to your domain

**First-time setup:**

```bash
# Access backend container shell
npm run populate
```

#### 3. Deploy Frontend

**Image:** `ghcr.io/kisinga/dukahub/frontend:latest` or build from `frontend/`

**Environment Variables:** Set `BACKEND_HOST` and `BACKEND_PORT` from [Environment Variables](#environment-variables) section.

**Public URL:** Configure your domain to point to port 4200

#### 4. Configure CORS

Update `FRONTEND_URL` in backend environment to match your frontend domain.

### Security Checklist

- [ ] Generate new `COOKIE_SECRET` (see [Environment Variables](#security))
- [ ] Change `SUPERADMIN_PASSWORD`
- [ ] Change `DB_PASSWORD`
- [ ] Set `COOKIE_SECURE=true`
- [ ] Configure `FRONTEND_URL` with production domain
- [ ] Enable HTTPS on your platform
- [ ] Enable database backups

---

## Docker Containers

Run containers independently for flexible deployment. Services are **fully decoupled** and can be deployed on different servers, different container platforms, or different cloud providers.

### Backend Container

**Build:**

```bash
cd backend
docker build -t dukahub-backend .
```

**Run:**

```bash
docker run -d -p 3000:3000 \
  --name dukahub-backend \
  -e DB_HOST=your-postgres-host \
  -e DB_PORT=5432 \
  -e DB_NAME=vendure \
  -e DB_USERNAME=vendure \
  -e DB_PASSWORD=secure-password \
  -e REDIS_HOST=your-redis-host \
  -e REDIS_PORT=6379 \
  -e SUPERADMIN_USERNAME=superadmin \
  -e SUPERADMIN_PASSWORD=secure-password \
  -e COOKIE_SECRET=your-32-char-secret \
  -e FRONTEND_URL=http://your-frontend-domain:4200 \
  dukahub-backend
```

**Notes:**

- `DB_HOST` and `REDIS_HOST` can be hostnames, IPs, or service names
- Backend is completely independent - doesn't need to know about frontend infrastructure
- Exposes `/health` endpoint for health checks

### Frontend Container

**Build:**

```bash
cd frontend
docker build -t dukahub-frontend .
```

**Run:**

```bash
docker run -d -p 4200:4200 \
  --name dukahub-frontend \
  -e BACKEND_HOST=your-backend-host-or-ip \
  -e BACKEND_PORT=3000 \
  dukahub-frontend
```

**Notes:**

- `BACKEND_HOST` can be a hostname, IP address, or domain name
- Can resolve hostnames via Docker DNS (if same network) OR public DNS
- Works with backends on different servers/platforms
- Example values for `BACKEND_HOST`:
  - Same Docker network: `backend` (service name)
  - Different Docker host: `192.168.1.100` or `backend.example.com`
  - Different cloud provider: `backend-api.railway.app`
  - Local dev backend: `host.docker.internal` (on Docker Desktop)

### Build Images

```bash
# Backend
cd backend
docker build -t dukahub-backend .

# Frontend
cd frontend
docker build -t dukahub-frontend .
```

### Container Features

**Backend:**

- Health check on `/health`
- Automatic migrations on startup
- First-time initialization via `FIRST_RUN=true`

**Frontend:**

- nginx with caching and rate limiting
- Runtime backend configuration
- Health check on `/health`

---

## Database Operations

### Migrations

```bash
# Local dev
cd backend
npm run migration:generate -- --name=MigrationName
npm run migration:run

# Production (access backend container)
npm run migration:run
```

### Backups

```bash
# Backup (access postgres container)
pg_dump -U vendure vendure > backup-$(date +%Y%m%d).sql

# Restore (access postgres container)
psql -U vendure vendure < backup-20250113.sql
```

### Reset Database

**Local development:**

```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
cd backend && npm run populate
```

**Production:**  
Use your platform's UI to recreate the database service, then run `npm run populate` in backend container.

---

## ML Model Management System

### Overview

The system has been refactored to maintain **single pathway for information flow** through APIs rather than direct filesystem access. This ensures:

- ✅ **Consistent data flow** - All ML model operations go through the same API layer
- ✅ **Channel-specific models** - Each channel can have its own ML model
- ✅ **Centralized management** - Models are managed through the admin interface
- ✅ **Proper permissions** - Access control through Vendure's permission system
- ✅ **Persistent storage** - Models stored in Docker volumes with proper ownership

### Architecture Changes

#### Before: Direct File Access

```
Frontend → Direct filesystem access → /assets/ml-models/
└── ${channelId}/
    ├── latest/
    │   ├── model.json
    │   ├── metadata.json
    │   └── *.bin files
    └── versions/
```

#### After: API-Managed Models

```
Frontend → GraphQL API → Backend Plugin → Asset Storage
    ↓              ↓              ↓           ↓
Channel Data → Vendure DB → Custom Fields → Volume Mount
```

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

#### REST Endpoints

- `GET /admin-api/ml-models/{channelId}/model.json` - Serve TensorFlow model files
- `GET /admin-api/ml-models/{channelId}/metadata.json` - Serve model metadata

### Usage Workflow

#### For Administrators:

1. **Access Admin Panel** → Navigate to "ML Models" section
2. **Select Channel** → Choose the channel for model management
3. **Upload Files** → Upload `model.json` and `metadata.json` files
4. **Verify Status** → Check model information and training data

#### For Frontend Application:

1. **Check Model Availability** → Use `checkModelExists(channelId)` API call
2. **Load Model** → Use `loadModel(channelId)` to load TensorFlow model via API
3. **Make Predictions** → Use loaded model for product recognition
4. **Handle Updates** → Check for model updates via `checkForUpdate()` API

### Benefits Achieved

#### 1. Single Information Pathway

- **Before**: Frontend directly accessed filesystem (`/assets/ml-models/`)
- **After**: All access through authenticated GraphQL APIs
- **Result**: Consistent data flow, proper authentication, and centralized control

#### 2. Channel-Specific Models

- **Implementation**: Each channel has separate custom fields for ML model assets
- **Storage**: Models stored as Vendure assets with proper metadata
- **Access**: Frontend queries by channel ID through API

#### 3. Persistent Storage

- **Volume Mounts**: ML model files stored in Docker volumes
- **Ownership**: Proper UID/GID permissions for container user
- **Persistence**: Files survive container restarts and deployments

#### 4. Manual Upload Process

- **Admin Interface**: Drag-and-drop upload in admin panel
- **Validation**: File type and size validation
- **Status Tracking**: Version and status management

#### 5. API-First Architecture

- **GraphQL Integration**: Full GraphQL API for model management
- **Authentication**: Proper permission checks for model operations
- **Error Handling**: Comprehensive error handling and user feedback

### File Structure

```
backend/src/plugins/
├── ml-model.plugin.ts          # Main plugin with resolvers and middleware
└── ml-model-admin.component.ts # Admin UI Angular component

frontend/src/app/core/services/
└── ml-model.service.ts         # Updated to use API endpoints

backend/src/vendure-config.ts   # Updated to include ML model plugin
```

### Migration Notes

#### Breaking Changes:

- **Frontend**: ML service now requires Apollo GraphQL client
- **Backend**: Direct file access removed, API endpoints added
- **Storage**: Models now stored as Vendure assets in volumes

#### Deployment Requirements:

1. **Volume Mounts**: Ensure `/usr/src/app/static/assets` is mounted as Docker volume
2. **Permissions**: Volume must be owned by UID 1001 (vendure user)
3. **Admin Access**: Users need `UpdateCatalog` permission for model management

#### Rollback Plan:

If issues occur, the old direct file access can be restored by:

1. Removing ML model plugin from vendure config
2. Adding back direct file serving middleware
3. Reverting frontend service to direct file access

---

## Troubleshooting

### Fresh Setup Issues

#### Database Schema Errors

If you see errors like `relation "channel" does not exist`:

```bash
# Check if FIRST_RUN is set correctly
echo $FIRST_RUN

# Reset and try again
docker compose down -v
export FIRST_RUN=true
docker compose up -d
```

#### Population Not Working

```bash
# Check populate logs
docker compose logs backend | grep -E "(populate|error|✅|❌)"

# Force re-populate
docker compose exec backend npm run populate
```

#### Migration Conflicts

```bash
# Check migration status
docker compose exec backend npm run migration:show

# Reset database (DESTRUCTIVE)
docker compose down -v
docker compose up -d
```

### Backend won't connect to database

**Check database is running:**

```bash
# Local dev
docker compose -f docker-compose.dev.yml ps

# Production
# Check database service status in platform UI
```

**Verify credentials:**

```bash
# Local dev
grep -E "^DB_" configs/.env

# Production
# Check environment variables in platform UI
```

**Check network connectivity:**

```bash
# From backend container
ping postgres-hostname
```

### Frontend can't reach backend

**Check backend is running:**

```bash
curl http://backend-host:3000/health
```

**Verify environment variables:**

```bash
# Docker container
docker exec frontend-container env | grep BACKEND
```

### CORS errors

**Check `FRONTEND_URL` in backend:**

```bash
# Must match your frontend domain exactly
FRONTEND_URL=https://yourdomain.com
```

### Can't login to admin

**Default credentials:**

- Username: `superadmin`
- Password: Value of `SUPERADMIN_PASSWORD` environment variable

**Check you're using admin API:**

- Correct: `/admin-api`
- Wrong: `/shop-api`

### Database connection pool errors

**Increase connection limit in Postgres:**

```sql
ALTER SYSTEM SET max_connections = 200;
SELECT pg_reload_conf();
```

---

## Design Principles

1. **Platform Agnostic** - Deploy individual services anywhere
2. **Manual Local Dev** - Run apps on host for speed and debugging
3. **Self-Contained Images** - All dependencies bundled
4. **Environment Variables** - All configuration via env (12-factor)
5. **KISS** - Simple, obvious, maintainable
