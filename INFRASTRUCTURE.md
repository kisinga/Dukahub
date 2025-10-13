# Infrastructure

Platform-agnostic deployment using individual container images.

**Deploy anywhere:** Coolify, Railway, Render, Fly.io, DigitalOcean, etc.

---

## Architecture

### Production

| Service      | Image                                     | Port | Requirements         |
| ------------ | ----------------------------------------- | ---- | -------------------- |
| **Backend**  | `ghcr.io/kisinga/dukahub/backend:latest`  | 3000 | Postgres 16, Redis 7 |
| **Frontend** | `ghcr.io/kisinga/dukahub/frontend:latest` | 4200 | Backend API          |
| **Postgres** | `postgres:16-alpine`                      | 5432 | Persistent storage   |
| **Redis**    | `redis:7-alpine`                          | 6379 | Persistent storage   |

### Local Development

| Service      | Source                   | Port |
| ------------ | ------------------------ | ---- |
| **Backend**  | Manual (`npm run dev`)   | 3000 |
| **Frontend** | Manual (`npm start`)     | 4200 |
| **Postgres** | `docker-compose.dev.yml` | 5433 |
| **Redis**    | `docker-compose.dev.yml` | 6479 |

---

## Local Development

```bash
# Start dependencies
docker compose -f docker-compose.dev.yml up -d

# Setup environment
cp configs/env.example configs/.env
nano configs/.env  # Set DB_HOST=localhost, DB_PORT=5433

# Run backend
cd backend && npm install && npm run dev

# Run frontend (separate terminal)
cd frontend && npm install && npm start

# Populate database (first-time)
cd backend && npm run populate

# Stop dependencies
docker compose -f docker-compose.dev.yml down
```

---

## Production Deployment

Deploy to any container platform:

**1. Create database services:**

- PostgreSQL 16 (persistent storage required)
- Redis 7 (persistent storage required)

**2. Deploy backend container:**

- Image: `ghcr.io/kisinga/dukahub/backend:latest`
- Port: 3000
- Environment variables (see below)

**3. Deploy frontend container:**

- Image: `ghcr.io/kisinga/dukahub/frontend:latest`
- Port: 4200

**4. Populate database (first-time):**

```bash
# Access backend container shell
npm run populate
```

### Backend Environment Variables

```bash
# Required
NODE_ENV=production
PORT=3000
DB_HOST=<postgres-internal-host>
DB_PORT=5432
DB_NAME=vendure
DB_USERNAME=<db-user>
DB_PASSWORD=<strong-password>
DB_SCHEMA=public
SUPERADMIN_USERNAME=superadmin
SUPERADMIN_PASSWORD=<strong-password>
COOKIE_SECRET=<32-char-random>
COOKIE_SECURE=true
FRONTEND_URL=https://yourdomain.com
REDIS_HOST=<redis-internal-host>
REDIS_PORT=6379
```

**Generate secrets:**

```bash
# COOKIE_SECRET
openssl rand -base64 32

# Passwords
openssl rand -base64 24 | tr -d "=+/" | cut -c1-20
```

See [`configs/env.example`](configs/env.example) for complete reference.

---

## Backups

```bash
# Backup (access postgres container)
pg_dump -U vendure vendure > backup.sql

# Restore (access postgres container)
psql -U vendure vendure < backup.sql
```

---

## Troubleshooting

### Database connection errors

```bash
# Local dev: Check dependencies are running
docker compose -f docker-compose.dev.yml ps

# Check credentials in configs/.env
grep -E "^DB_" configs/.env

# Production: Check platform environment variables
```

### Reset database

```bash
# Local dev
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
cd backend && npm run populate

# Production: Use platform UI to recreate database service
```

---

## Design Principles

1. **Platform Agnostic** — Deploy individual services to any container platform
2. **Manual Local Dev** — Run apps directly on host (faster, simpler debugging)
3. **Self-Contained Images** — All dependencies bundled in container images
4. **Environment Variables** — All configuration via env vars (12-factor)
5. **KISS** — Simple, obvious, maintainable
