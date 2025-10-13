# 🧱 Infrastructure Overview

Containerized architecture for Dukahub development and production environments.

**Design Principle:** Single source of truth for configuration with environment parity between local and Docker deployments.

---

## 🏗️ Architecture

| Service         | Image                   | Exposed Port | Internal Port | Data Volume        |
| --------------- | ----------------------- | ------------ | ------------- | ------------------ |
| **postgres_db** | `postgres:16-alpine`    | `5433`       | `5432`        | `postgres_db_data` |
| **redis**       | `redis:7-alpine`        | `6479`       | `6379`        | `redis_data`       |
| **backend**     | Built from `./backend`  | `3000`       | `3000`        | —                  |
| **frontend**    | Built from `./frontend` | `4200`       | `4200`        | —                  |

All services mount `./configs` as read-only for shared configuration access.

---

## ⚙️ Configuration Strategy

### Docker = Production Only

**Single production file:** `docker-compose.yml`

```
docker-compose.yml          ← Production-only (GHCR images, optimized, hardened)
docker-compose.dev.yml      ← Local dependencies only (postgres, redis)
```

**Environment variables:**

```
Production (Docker):
  Coolify/VPS → Environment variables → docker-compose.yml

Local Development:
  Manual setup → configs/.env → npm run dev
```

**Key principle:** Clear separation between production (containerized) and development (manual). No dev containers for application code.

### Variable Flow

**Backend:**

- Receives all vars via docker-compose environment section
- `RUN_POPULATE=true` triggers database population on container startup

**Postgres:**

- Gets `POSTGRES_DB=${DB_NAME}` from environment variables
- Gets `POSTGRES_USER=${DB_USERNAME}` from environment variables
- Gets `POSTGRES_PASSWORD=${DB_PASSWORD}` from environment variables

**RUN_POPULATE** (optional):

- Environment variable for production deployment
- `true` → populates database with sample data on startup (via docker-entrypoint.sh)
- `false` (default) → normal startup without populate
- **Recommended:** Use `docker compose exec backend npm run populate` instead

---

## 🚀 Quick Start

### Local Development

```bash
# Start dependencies only (postgres, redis)
docker compose -f docker-compose.dev.yml up -d

# Set up environment
cp configs/env.example configs/.env
nano configs/.env

# Run backend manually
cd backend
npm install
npm run dev

# Run frontend manually (separate terminal)
cd frontend
npm install
npm start
```

### Production Deployment

**1. Set environment variables in platform (e.g., Coolify UI):**

```
DB_NAME=dukahub
DB_USERNAME=vendure
DB_PASSWORD=<strong-password>
COOKIE_SECRET=<strong-secret>
SUPERADMIN_PASSWORD=<strong-password>
```

**2. Deploy:**

```bash
docker compose pull
docker compose up -d
```

**3. Populate Database (First-time setup only):**

Choose one approach:

```bash
# Option A: One-off populate command (recommended)
docker compose exec backend npm run populate

# Option B: Via environment variable (requires restart)
# In Coolify: Set RUN_POPULATE=true → Deploy → Set back to false → Deploy
# Via CLI: Edit .env, set RUN_POPULATE=true, restart backend
```

### Access Services

- **Backend API:** http://localhost:3000
- **Admin UI:** http://localhost:3002
- **Frontend:** http://localhost:4200
- **Postgres:** `localhost:5433`
- **Redis:** `localhost:6479`

### Commands

```bash
# Production
docker compose pull                           # Pull latest images
docker compose up -d                          # Start services
docker compose logs -f backend                # View logs
docker compose exec backend npm run populate # Populate database (first-time)
docker compose down                           # Stop services

# Local Development
docker compose -f docker-compose.dev.yml up -d    # Start dependencies
cd backend && npm run dev                          # Run backend
cd frontend && npm start                           # Run frontend
docker compose -f docker-compose.dev.yml down     # Stop dependencies
```

---

## 📋 Environment Variables

See [`configs/README.md`](configs/README.md) for complete variable reference.

**Critical variables to change before deploying:**

- `COOKIE_SECRET` — Session encryption key
- `DB_PASSWORD` — Database password
- `SUPERADMIN_PASSWORD` — Admin login

---

## 🔧 Local Development Setup

### Dependencies Only

Use `docker-compose.dev.yml` to run database and cache:

```bash
docker compose -f docker-compose.dev.yml up -d
```

This provides:

- PostgreSQL on `localhost:5433`
- Redis on `localhost:6479`

### Run Application Manually

```bash
# Backend
cd backend
npm install
cp ../configs/env.example ../configs/.env
# Edit configs/.env with DB settings
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm start
```

### Populate Database

```bash
cd backend
npm run populate
```

---

## 🐳 Service Details

### postgres_db

**Purpose:** Primary relational database  
**Configuration:** Maps `DB_NAME` → `POSTGRES_DB`, `DB_USERNAME` → `POSTGRES_USER`, `DB_PASSWORD` → `POSTGRES_PASSWORD`  
**Persistence:** `postgres_db_data` volume  
**Network:** Accessible as `postgres_db:5432` from containers

### redis

**Purpose:** Caching and job queue backend  
**Configuration:** Default Redis settings  
**Persistence:** `redis_data` volume  
**Network:** Accessible as `redis:6379` from containers

### backend

**Purpose:** Vendure-based e-commerce API and admin UI  
**Build Context:** `./backend` directory  
**Dependencies:** postgres_db, redis  
**Configuration:** Receives all vars via docker-compose environment section, `RUN_POPULATE` triggers populate on startup

### frontend

**Purpose:** Angular-based storefront web client  
**Build Context:** `./frontend` directory  
**Dependencies:** backend  
**Configuration:** None currently (could be added)

---

## 📦 Data Volumes

| Volume Name        | Purpose                     | Backup Priority |
| ------------------ | --------------------------- | --------------- |
| `postgres_db_data` | Database (products, orders) | **Critical**    |
| `redis_data`       | Cache/queue (ephemeral)     | Low             |

### Backup Database

```bash
# Backup
docker compose exec postgres_db pg_dump -U vendure vendure > backup.sql

# Restore
docker compose exec -T postgres_db psql -U vendure vendure < backup.sql
```

---

## 🔐 Security Best Practices

1. **Never commit `.env`** — it's gitignored for a reason
2. **Use strong secrets** — generate random values for production
3. **Don't use `--populate` in production** — only for initial dev setup
4. **Change default passwords** — all example passwords before deployment

### Generate Strong Secrets

```bash
# Cookie secret
openssl rand -base64 32

# Database password
openssl rand -base64 24 | tr -d "=+/" | cut -c1-20
```

---

## 🎯 Design Principles

1. **Docker = Production** — Containers only for deployed environments
2. **Manual Dev** — Run backend/frontend directly on host (faster, simpler debugging)
3. **Clear Separation** — DevOps (Docker) vs Development (manual) are distinct
4. **Single Source** — One production compose file, no overrides
5. **Health Checks** — All services have health checks for orchestration
6. **Resource Limits** — Optimized for 8GB server, prevent resource exhaustion
7. **Security Hardening** — Non-root users, read-only filesystems, tmpfs
8. **KISS Principle** — Simple, obvious, maintainable

---

## 🐞 Troubleshooting

### Services won't start

```bash
# Check if ports are already in use
sudo lsof -i :3000
sudo lsof -i :5433

# View detailed logs
docker compose logs
```

### Database connection errors

```bash
# Verify postgres is running
docker compose ps postgres_db

# Check database credentials
grep -E "^DB_" configs/.env

# Connect manually to test
docker compose exec postgres_db psql -U vendure vendure
```

### Environment variables not loading

```bash
# Check environment variables in container
docker compose exec backend env | grep DB_

# Verify environment variables are set
cat .env  # or check Coolify UI
```

### Clean slate (nuclear option)

```bash
# Production
docker compose down -v
docker system prune -a
docker compose pull && docker compose up -d

# Local dev
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
cd backend && npm run populate
```

---

## 📚 Related

- [`configs/README.md`](configs/README.md) — Environment variables
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — Production deployment

### Sample Data

Add Vendure sample data (initial-data.json + products.csv from `@vendure/create`).

**Includes:** Default channel/zone, ~250 countries, ~20 products with images, test payment handler.

**Populate database:**

```bash
# Production
docker compose exec backend npm run populate

# Local development (run from backend directory)
npm run populate
```

**Reset database:**

```bash
# Production
docker compose down -v && docker compose up -d && docker compose exec backend npm run populate

# Local development
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
cd backend && npm run populate
```
