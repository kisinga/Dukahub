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

### Docker Compose Override Pattern

**Three-file structure for dev/prod parity:**

```
docker-compose.yml              ← Base config (shared by all environments)
docker-compose.override.yml     ← Dev overrides (auto-loaded)
docker-compose.prod.yml         ← Production overrides (explicit with -f flag)
```

**Environment variables:** `configs/.env.backend`

```
configs/.env.backend
  ↓
  ├─→ Development:
  │   compose-dev.sh → exports vars → docker-compose.yml + docker-compose.override.yml
  │
  └─→ Production:
      Platform (Coolify) → injects vars → docker-compose.yml + docker-compose.prod.yml
```

**Key principle:** Base config is shared, only differences are in override files. This ensures parity and makes environment differences explicit.

### Variable Flow

**Backend:**

- Receives all vars via docker-compose environment section
- `RUN_POPULATE=true` triggers database population on container startup

**Postgres:**

- Gets `POSTGRES_DB=${DB_NAME}` from shell environment (via compose-dev.sh)
- Gets `POSTGRES_USER=${DB_USERNAME}` from shell environment
- Gets `POSTGRES_PASSWORD=${DB_PASSWORD}` from shell environment

**RUN_POPULATE** (optional):

- Set by `compose-dev.sh` via `--populate` flag
- `true` → populates database with sample data on startup
- `false` (default) → normal startup without populate

---

## 🚀 Quick Start

### Local Development

```bash
cp configs/.env.backend.example configs/.env.backend
nano configs/.env.backend  # Update passwords/secrets

# Start stack (loads env vars + auto-merges docker-compose.override.yml)
./compose-dev.sh --env-file configs/.env.backend up -d

# Or with sample data (first run)
./compose-dev.sh --env-file configs/.env.backend --populate up -d
```

### Production Deployment

**1. Set environment variables in platform (e.g., Coolify UI):**

```
DB_NAME=dukahub
DB_USERNAME=vendure
DB_PASSWORD=<strong-password>
COOKIE_SECRET=<strong-secret>
SUPERADMIN_PASSWORD=<strong-password>
APP_ENV=production
```

**2. Deploy with production overrides:**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Access Services

- **Backend API:** http://localhost:3000
- **Admin UI:** http://localhost:3002
- **Frontend:** http://localhost:4200
- **Postgres:** `localhost:5433`
- **Redis:** `localhost:6479`

### Commands

```bash
# Start services (local dev)
./compose-dev.sh --env-file configs/.env.backend up -d
./compose-dev.sh --env-file configs/.env.backend --populate up -d  # With sample data

# Standard docker compose commands
./compose-dev.sh --env-file configs/.env.backend logs -f     # View logs
./compose-dev.sh --env-file configs/.env.backend down        # Stop
./compose-dev.sh --env-file configs/.env.backend down -v     # Reset (removes data)
```

---

## 📋 Environment Variables

See [`configs/README.md`](configs/README.md) for complete variable reference.

**Critical variables to change before deploying:**

- `COOKIE_SECRET` — Session encryption key
- `DB_PASSWORD` — Database password
- `SUPERADMIN_PASSWORD` — Admin login
- `APP_ENV=production` — Enables production mode

---

## 🔧 Launcher Script: `compose-dev.sh`

**Local development helper** that loads environment variables from `.env.backend` and runs Docker Compose.

### Why Use It?

- Exports vars for `docker-compose.yml` variable substitution (`${DB_NAME}`, etc.)
- Sets `RUN_POPULATE` flag to trigger database population
- Single command for local development workflow

### Usage

```bash
./compose-dev.sh --env-file FILE [OPTIONS] DOCKER_COMPOSE_ARGS

# Options
--env-file FILE    Load environment variables from FILE (required)
--populate         Set RUN_POPULATE=true to populate database on startup

# Examples
./compose-dev.sh --env-file configs/.env.backend up -d
./compose-dev.sh --env-file configs/.env.backend --populate up -d
./compose-dev.sh --env-file configs/.env.backend logs -f backend
```

### Populate Flag

Adds Vendure sample data (default channel/zone, ~250 countries, ~20 products with images).

**How it works:**

1. Sets `RUN_POPULATE=true` environment variable
2. Backend container's entrypoint script detects flag
3. Runs populate script before starting server
4. Server starts with populated data

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

1. **Never commit `.env.backend`** — it's gitignored for a reason
2. **Use strong secrets** — generate random values for production
3. **Don't use `--populate` in production** — only for initial dev setup
4. **Change default passwords** — all example passwords before deployment
5. **Set `APP_ENV=production`** — disables debug features

### Generate Strong Secrets

```bash
# Cookie secret
openssl rand -base64 32

# Database password
openssl rand -base64 24 | tr -d "=+/" | cut -c1-20
```

---

## 🎯 Design Principles

1. **Override Pattern** — Base config + environment-specific overrides (standard Docker Compose pattern)
2. **Dev/Prod Parity** — Shared base ensures environments stay in sync
3. **Environment Variables** — One `.env.backend`, no duplicates
4. **Explicit Differences** — Override files show exactly what differs between environments
5. **Health Checks** — All services have health checks for orchestration
6. **Resource Limits** — Defined for all services to prevent resource exhaustion
7. **Security Hardening** — Production uses non-root users, read-only filesystems, tmpfs
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
grep -E "^DB_" configs/.env.backend

# Connect manually to test
docker compose exec postgres_db psql -U vendure vendure
```

### Environment variables not loading

```bash
# Test compose-dev.sh variable export
./compose-dev.sh --env-file configs/.env.backend up -d
docker compose exec backend env | grep DB_

# Verify .env.backend exists and is readable
cat configs/.env.backend
```

### Clean slate (nuclear option)

```bash
# Remove everything and start fresh
./compose-dev.sh --env-file configs/.env.backend down -v
docker system prune -a
./compose-dev.sh --env-file configs/.env.backend --populate up -d
```

---

## 📚 Related

- [`configs/README.md`](configs/README.md) — Environment variables
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — Production deployment

### Sample Data

Use `--populate` flag to add Vendure sample data (initial-data.json + products.csv from `@vendure/create`).

**Includes:** Default channel/zone, ~250 countries, ~20 products with images, test payment handler.

**Reset database:** `docker compose down -v && ./compose-dev.sh --env-file ./configs/.env.backend --populate up -d`
