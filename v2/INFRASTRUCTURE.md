# 🧱 Infrastructure Overview

Containerized architecture for Dukahub development and production environments.

**Design Principle:** Single source of truth for configuration with environment parity between local and Docker deployments.

---

## 🏗️ Architecture

| Service         | Image                      | Exposed Port | Internal Port | Data Volume        |
| --------------- | -------------------------- | ------------ | ------------- | ------------------ |
| **postgres_db** | `postgres:16-alpine`       | `5433`       | `5432`        | `postgres_db_data` |
| **redis**       | `redis:7-alpine`           | `6479`       | `6379`        | `redis_data`       |
| **typesense**   | `typesense/typesense:27.0` | `8208`       | `8108`        | `typesense_data`   |
| **backend**     | Built from `./backend`     | `3000`       | `3000`        | —                  |
| **frontend**    | Built from `./frontend`    | `4200`       | `4200`        | —                  |

All services mount `./configs` as read-only for shared configuration access.

---

## ⚙️ Configuration Strategy

### Single Source of Truth

**One file:** `configs/.env.backend`

```
configs/.env.backend
  ↓
  ├─→ dc.sh (loads & exports)
  │     ↓
  │     └─→ docker-compose.yml (substitutes ${VARS})
  │           ↓
  │           ├─→ postgres_db (DB_* → POSTGRES_*)
  │           ├─→ typesense (TYPESENSE_API_KEY)
  │           └─→ backend (DB_SYNCHRONIZE injected)
  │
  └─→ backend container (dotenv loads all vars)
```

**Key principle:** No duplicate variables. `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` are mapped to `POSTGRES_*` in docker-compose.yml (Postgres requires this naming).

### Variable Flow

**Backend:**

- Mounts `configs/.env.backend` → loads via dotenv
- Gets `DB_SYNCHRONIZE` from docker-compose (set dynamically by dc.sh)

**Postgres:**

- Gets `POSTGRES_DB=${DB_NAME}` from shell environment (via dc.sh)
- Gets `POSTGRES_USER=${DB_USERNAME}` from shell environment
- Gets `POSTGRES_PASSWORD=${DB_PASSWORD}` from shell environment

**Typesense:**

- Gets `TYPESENSE_API_KEY` from shell environment (via dc.sh)

**DB_SYNCHRONIZE** (special handling):

- Set by `dc.sh` based on `--populate` flag
- `true` → auto-creates database schema (first run/populate)
- `false` → uses existing schema (normal operation)

---

## 🚀 Quick Start

### Initial Setup

```bash
cd v2
cp configs/.env.backend.example configs/.env.backend
nano configs/.env.backend

# Start stack
./dc.sh

# Or start with sample data
./dc.sh --populate
```

### Access Services

- **Backend API:** http://localhost:3000
- **Admin UI:** http://localhost:3002
- **Frontend:** http://localhost:4200
- **Typesense:** http://localhost:8208
- **Postgres:** `localhost:5433`
- **Redis:** `localhost:6479`

### Commands

```bash
./dc.sh              # Start
./dc.sh --populate   # Start + sample data
./dc.sh /configs     # Coolify
./dc.sh -h           # Help

docker compose logs -f              # View logs
docker compose down                 # Stop
docker compose down -v              # Reset (removes data)
docker compose exec backend npm run populate  # Populate manually
```

---

## 📋 Environment Variables

See [`configs/README.md`](configs/README.md) for complete variable reference.

**Critical variables to change before deploying:**

- `COOKIE_SECRET` — Session encryption key
- `DB_PASSWORD` — Database password
- `SUPERADMIN_PASSWORD` — Admin login
- `TYPESENSE_API_KEY` — Search API key
- `APP_ENV=production` — Enables production mode

---

## 🔧 Launcher Script: `dc.sh`

**Required** for running the stack. Loads environment variables from `.env.backend` and starts Docker Compose.

### Why Required?

- Exports vars for `docker-compose.yml` variable substitution (`${DB_NAME}`, etc.)
- Sets `DB_SYNCHRONIZE` dynamically based on `--populate` flag
- Validates required variables before startup

### Usage

```bash
./dc.sh [ENV_DIR] [-p|--populate]

# Examples
./dc.sh                 # Start stack
./dc.sh --populate      # Start + populate sample data
./dc.sh /configs        # Coolify (custom env path)
./dc.sh /configs -p     # Coolify + populate
```

### Populate Flag

Adds ~54 products, 9 collections, default channel/zone, countries, payment/shipping methods.

**How it works:**

1. Starts postgres/redis/typesense
2. Runs populate script (creates schema + imports data)
3. Starts backend/frontend (uses existing data)

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

### typesense

**Purpose:** Full-text search engine for product catalog  
**Configuration:** API key from `TYPESENSE_API_KEY`  
**Persistence:** `typesense_data` volume  
**Network:** Accessible as `typesense:8108` from containers

### backend

**Purpose:** Vendure-based e-commerce API and admin UI  
**Build Context:** `./backend` directory  
**Dependencies:** postgres_db, redis, typesense  
**Configuration:** Loads all vars from mounted `configs/.env.backend` via dotenv, `DB_SYNCHRONIZE` injected by docker-compose

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
| `typesense_data`   | Search index (rebuildable)  | Medium          |
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

# Typesense API key
openssl rand -hex 16

# Database password
openssl rand -base64 24 | tr -d "=+/" | cut -c1-20
```

---

## 🎯 Design Principles

1. **Single Source of Truth** — One `.env.backend`, no duplicates
2. **Environment Parity** — Same config works locally and in Docker
3. **Variable Mapping** — `DB_*` → `POSTGRES_*` in docker-compose (Postgres naming requirement)
4. **Dynamic Schema Control** — `DB_SYNCHRONIZE` set by dc.sh based on context
5. **Data Persistence** — Named volumes prevent accidental data loss
6. **Explicit Dependencies** — `depends_on` ensures correct startup order
7. **KISS Principle** — Simple, obvious, maintainable

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
# Test dc.sh variable export
./dc.sh
docker compose exec backend env | grep DB_

# Verify .env.backend exists and is readable
cat configs/.env.backend
```

### Clean slate (nuclear option)

```bash
# Remove everything and start fresh
docker compose down -v
docker system prune -a
./dc.sh
```

---

## 📚 Related

- [`configs/README.md`](configs/README.md) — Environment variables
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — Production deployment

### Sample Data

Use `--populate` flag to add Vendure sample data (initial-data.json + products.csv from `@vendure/create`).

**Includes:** Default channel/zone, ~250 countries, ~20 products with images, test payment handler.

**Reset database:** `docker compose down -v && ./dc.sh --populate`
