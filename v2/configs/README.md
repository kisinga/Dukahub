# Environment Configuration

**Single source of truth** for all Dukahub environment variables.

## Files

| File                   | Purpose                       |
| ---------------------- | ----------------------------- |
| `.env.backend`         | Active config (gitignored)    |
| `.env.backend.example` | Template with secure defaults |

## Quick Setup

```bash
cd configs
cp .env.backend.example .env.backend
# Update passwords and secrets
nano .env.backend
```

## How It Works

### Configuration Loading

1. **Local Development** (backend running on host):

   - Backend loads `configs/.env.backend` via `dotenv`
   - Connects to Docker services via mapped ports (e.g., `localhost:5433`)

2. **Docker Compose** (all services containerized):
   - `compose-dev.sh` exports variables from `.env.backend` to shell environment
   - Docker Compose inherits these variables automatically
   - Services communicate via Docker network (e.g., `postgres_db:5432`)

### Environment Parity

Both environments use **the same `.env.backend` file**. Docker-specific overrides (like `DB_HOST=postgres_db`) are set in `docker-compose.yml` environment section.

```
Local:  backend (host) → localhost:5433 → postgres_db (container)
Docker: backend (container) → postgres_db:5432 (internal network)
```

## Environment Variables

| Variable              | Example              | Used By            | Notes                            |
| --------------------- | -------------------- | ------------------ | -------------------------------- |
| `APP_ENV`             | `dev` / `production` | Backend            | Controls debug mode, trust proxy |
| `PORT`                | `3000`               | Backend            | API server port                  |
| `DB_HOST`             | `postgres_db`        | Backend            | Database hostname                |
| `DB_PORT`             | `5432`               | Backend            | Database port                    |
| `DB_NAME`             | `vendure`            | Backend, Postgres  | Database name                    |
| `DB_SCHEMA`           | `public`             | Backend            | PostgreSQL schema                |
| `DB_USERNAME`         | `vendure`            | Backend, Postgres  | Database user                    |
| `DB_PASSWORD`         | `secure-password`    | Backend, Postgres  | Database password                |
| `SUPERADMIN_USERNAME` | `superadmin`         | Backend            | Initial admin login              |
| `SUPERADMIN_PASSWORD` | `secure-password`    | Backend            | Initial admin password           |
| `COOKIE_SECRET`       | `random-32-chars`    | Backend            | Session cookie encryption key    |
| `TYPESENSE_API_KEY`   | `secure-api-key`     | Typesense, Backend | Search API authentication        |
| `TYPESENSE_HOST`      | `typesense`          | Backend            | Search service hostname          |
| `TYPESENSE_PORT`      | `8108`               | Backend            | Search service port              |

**Note:** `RUN_POPULATE` can be set to `true` to populate database on first run

## How Variables Are Used

**Backend:**

- Receives all vars via docker-compose environment section
- `RUN_POPULATE` triggers database population on container startup (optional)

**Postgres:**

- Uses `DB_NAME` → `POSTGRES_DB`
- Uses `DB_USERNAME` → `POSTGRES_USER`
- Uses `DB_PASSWORD` → `POSTGRES_PASSWORD`
- (Mapped in docker-compose.yml because Postgres requires `POSTGRES_*` naming)

**Typesense:**

- Uses `TYPESENSE_API_KEY` directly from shell (exported by `compose-dev.sh`)

All variables loaded from `.env.backend` → exported by `compose-dev.sh` → available to docker-compose.

## Security Checklist

- [ ] Change `COOKIE_SECRET` to a random 32+ character string
- [ ] Change `SUPERADMIN_PASSWORD` before deploying
- [ ] Change `DB_PASSWORD` to a strong password
- [ ] Update `TYPESENSE_API_KEY` to a strong random value
- [ ] Set `APP_ENV=production` for production deployments
- [ ] Never commit `.env.backend` to version control

## Generate Secure Values

```bash
# Cookie secret (32 chars)
openssl rand -base64 32

# Passwords (20 chars)
openssl rand -base64 24 | tr -d "=+/" | cut -c1-20

# API keys (hex)
openssl rand -hex 16
```
