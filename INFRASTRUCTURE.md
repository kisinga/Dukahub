# Infrastructure & Deployment

Complete guide for local development and production deployment.

---

## Table of Contents

- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Docker Containers](#docker-containers)
- [Database Operations](#database-operations)
- [Troubleshooting](#troubleshooting)

---

## Environment Variables

All configuration is managed via environment variables.

### Backend & Database

| Variable              | Example           | Default | Notes                                             |
| --------------------- | ----------------- | ------- | ------------------------------------------------- |
| `DB_NAME`             | `vendure`         | —       | Database name                                     |
| `DB_USERNAME`         | `vendure`         | —       | Database user                                     |
| `DB_PASSWORD`         | `secure-password` | —       | Database password **[CHANGE IN PRODUCTION]**      |
| `DB_SCHEMA`           | `public`          | —       | PostgreSQL schema                                 |
| `DB_HOST`             | `postgres_db`     | —       | Database hostname                                 |
| `DB_PORT`             | `5432`            | —       | Database port                                     |
| `REDIS_HOST`          | `redis`           | —       | Redis hostname                                    |
| `REDIS_PORT`          | `6379`            | —       | Redis port                                        |
| `SUPERADMIN_USERNAME` | `superadmin`      | —       | Initial admin login                               |
| `SUPERADMIN_PASSWORD` | `secure-password` | —       | Initial admin password **[CHANGE IN PRODUCTION]** |
| `COOKIE_SECRET`       | `random-32-chars` | —       | Session encryption key **[CHANGE IN PRODUCTION]** |

### Frontend (Docker Only)

| Variable       | Example           | Default   | Notes                                         |
| -------------- | ----------------- | --------- | --------------------------------------------- |
| `BACKEND_HOST` | `api.example.com` | `backend` | Backend hostname, IP, or domain to connect to |
| `BACKEND_PORT` | `3000`            | `3000`    | Backend port to connect to                    |

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
| `RUN_POPULATE`     | `true` / `false`          | `false`       | Auto-populate database on startup |

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
DB_HOST=localhost
DB_PORT=5433
REDIS_HOST=localhost
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

Deploy to any container platform (Coolify, Railway, Render, Fly.io, etc.).

### Architecture

| Service      | Image/Version        | Port | Requirements         |
| ------------ | -------------------- | ---- | -------------------- |
| **Frontend** | `dukahub-frontend`   | 4200 | Backend API          |
| **Backend**  | `dukahub-backend`    | 3000 | Postgres 16, Redis 7 |
| **Postgres** | `postgres:16-alpine` | 5432 | Persistent storage   |
| **Redis**    | `redis:7-alpine`     | 6379 | Persistent storage   |

### Coolify Deployment

#### 1. Setup Database and Redis Services

Create PostgreSQL 16 and Redis 7 services in Coolify. Note their internal service names.

#### 2. Deploy Backend

**Environment Variables:**

Set all variables from [Backend & Database](#backend--database) section:

- Database credentials and connection details
- Redis connection details
- Admin credentials
- Security keys (Cookie secret)

**Storage (CRITICAL):**

Add persistent storage to retain uploaded assets across redeployments:

```
Volume Name: dukahub_backend_assets
Source Path: (leave empty)
Destination Path: /usr/src/app/static/assets
```

**Why this is critical:**

- Without this volume, all uploaded product images are lost on every redeploy
- Persists: product images, previews, cached transformations, ML models
- Can be shared with other containers (backup services, image processors)

**After deployment:**

Note the backend's **service ID** (e.g., `a4skko0gg448sk4o0kg4gco8`) - you'll need this for frontend configuration.

Populate the database (one-time):

```bash
# Access backend container shell in Coolify
npm run populate
```

#### 3. Deploy Frontend

**Environment Variables:**

```bash
BACKEND_HOST=a4skko0gg448sk4o0kg4gco8  # Use backend's service ID from step 2
BACKEND_PORT=3000
```

**Important:** Use the backend's **service ID** (the long alphanumeric prefix from the container name), NOT the resource name. The service ID is stable across redeployments.

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
- Optional database population via `RUN_POPULATE=true`

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
