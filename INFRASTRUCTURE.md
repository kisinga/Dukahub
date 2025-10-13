# Infrastructure & Deployment

Complete guide for local development and production deployment.

---

## Table of Contents

- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Docker Containers](#docker-containers)
- [Database Operations](#database-operations)
- [Troubleshooting](#troubleshooting)

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

### Deployment Steps

#### 1. Create Database Services

**PostgreSQL 16:**

- Enable persistent storage
- Note internal hostname

**Redis 7:**

- Enable persistent storage
- Note internal hostname

#### 2. Deploy Backend

**Image:** `ghcr.io/kisinga/dukahub/backend:latest` or build from `backend/`

**Environment Variables:**

```bash
NODE_ENV=production
PORT=3000
DB_HOST=<postgres-internal-host>
DB_PORT=5432
DB_NAME=vendure
DB_USERNAME=<db-user>
DB_PASSWORD=<strong-password>
DB_SCHEMA=public
REDIS_HOST=<redis-internal-host>
REDIS_PORT=6379
SUPERADMIN_USERNAME=superadmin
SUPERADMIN_PASSWORD=<strong-password>
COOKIE_SECRET=<32-char-random>
COOKIE_SECURE=true
FRONTEND_URL=https://yourdomain.com
```

**First-time setup:**

```bash
# Access backend container shell
npm run populate
```

#### 3. Deploy Frontend

**Image:** `ghcr.io/kisinga/dukahub/frontend:latest` or build from `frontend/`

**Environment Variables:**

```bash
BACKEND_HOST=<backend-internal-host>
BACKEND_PORT=3000
```

**Public URL:** Configure your domain to point to port 4200

#### 4. Configure CORS

Update `FRONTEND_URL` in backend environment to match your frontend domain.

### Security Checklist

- [ ] Generate new `COOKIE_SECRET` (see [README](./README.md#generate-secure-values))
- [ ] Change `SUPERADMIN_PASSWORD`
- [ ] Change `DB_PASSWORD`
- [ ] Set `COOKIE_SECURE=true`
- [ ] Configure `FRONTEND_URL` with production domain
- [ ] Enable HTTPS on your platform
- [ ] Enable database backups

---

## Docker Containers

Run containers independently for flexible deployment.

### Backend Container

```bash
docker run -p 3000:3000 \
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
  dukahub-backend
```

### Frontend Container

```bash
docker run -p 4200:4200 \
  -e BACKEND_HOST=your-backend-host \
  -e BACKEND_PORT=3000 \
  dukahub-frontend
```

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
