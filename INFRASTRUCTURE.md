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

| Variable       | Example   | Default   | Notes                          |
| -------------- | --------- | --------- | ------------------------------ |
| `BACKEND_HOST` | `backend` | `backend` | Backend hostname to connect to |
| `BACKEND_PORT` | `3000`    | `3000`    | Backend port to connect to     |

**⚠️ Critical Constraint:** The `BACKEND_HOST` must be an internal Docker service name or container name accessible within the **same Docker network** as the frontend. The frontend's Nginx uses Docker's internal DNS resolver (`127.0.0.11`) to look up this hostname at request time. External URLs or backends running on different Docker engines/hosts will **not** work with the current Nginx proxy configuration.

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
