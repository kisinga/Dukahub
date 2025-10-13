# Environment Configuration

**Single source of truth** for all Dukahub environment variables.

## Files

| File          | Purpose                       |
| ------------- | ----------------------------- |
| `.env`        | Active config (gitignored)    |
| `env.example` | Template with secure defaults |

## Quick Setup

```bash
cd configs
cp env.example .env
# Update passwords and secrets
nano .env
```

## How It Works

### Configuration Loading

1. **Local Development** (backend running on host):

   - Backend loads `configs/.env` via `dotenv`
   - Connects to Docker services via mapped ports (e.g., `localhost:5433`)

2. **Docker Compose** (all services containerized):
   - Variables are loaded by docker-compose or manually for local development
   - Docker Compose inherits these variables automatically
   - Services communicate via Docker network (e.g., `postgres_db:5432`)

### Environment Parity

Both environments use **the same `.env` file**. Docker-specific overrides (like `DB_HOST=postgres_db`) are set in `docker-compose.yml` environment section.

```
Local:  backend (host) → localhost:5433 → postgres_db (container)
Docker: backend (container) → postgres_db:5432 (internal network)
```

## Environment Variables

### Required Variables

| Variable              | Example           | Used By           | Notes                                             |
| --------------------- | ----------------- | ----------------- | ------------------------------------------------- |
| `DB_NAME`             | `vendure`         | Backend, Postgres | Database name                                     |
| `DB_USERNAME`         | `vendure`         | Backend, Postgres | Database user                                     |
| `DB_PASSWORD`         | `secure-password` | Backend, Postgres | Database password **[CHANGE IN PRODUCTION]**      |
| `DB_SCHEMA`           | `public`          | Backend           | PostgreSQL schema                                 |
| `DB_HOST`             | `postgres_db`     | Backend           | Database hostname (service name in Docker)        |
| `DB_PORT`             | `5432`            | Backend           | Database port                                     |
| `SUPERADMIN_USERNAME` | `superadmin`      | Backend           | Initial admin login                               |
| `SUPERADMIN_PASSWORD` | `secure-password` | Backend           | Initial admin password **[CHANGE IN PRODUCTION]** |
| `COOKIE_SECRET`       | `random-32-chars` | Backend           | Session encryption key **[CHANGE IN PRODUCTION]** |

### Application Settings

| Variable        | Example              | Default       | Notes                                  |
| --------------- | -------------------- | ------------- | -------------------------------------- |
| `NODE_ENV`      | `production`         | `development` | Node environment mode                  |
| `PORT`          | `3000`               | `3000`        | Backend server port                    |
| `COOKIE_SECURE` | `true` / `false`     | `false`       | Enable secure cookies (requires HTTPS) |
| `FRONTEND_URL`  | `http://example.com` | —             | CORS allowed origins (comma-separated) |

### Optional Variables

| Variable           | Example                   | Default | Notes                                       |
| ------------------ | ------------------------- | ------- | ------------------------------------------- |
| `ASSET_URL_PREFIX` | `https://cdn.example.com` | —       | CDN prefix for assets (empty = local serve) |
| `RUN_POPULATE`     | `true` / `false`          | `false` | Populate DB with sample data on startup     |

**Security Warning:** Always change `DB_PASSWORD`, `SUPERADMIN_PASSWORD`, and `COOKIE_SECRET` before production deployment!

## How Variables Are Used

**Backend:**

- Receives all vars via docker-compose environment section
- `RUN_POPULATE` triggers database population on container startup (optional)

**Postgres:**

- Uses `DB_NAME` → `POSTGRES_DB`
- Uses `DB_USERNAME` → `POSTGRES_USER`
- Uses `DB_PASSWORD` → `POSTGRES_PASSWORD`
- (Mapped in docker-compose.yml because Postgres requires `POSTGRES_*` naming)

For local development: Load `.env` manually in your shell or let your IDE/tools handle it.

## Security Checklist

- [ ] Change `COOKIE_SECRET` to a random 32+ character string
- [ ] Change `SUPERADMIN_PASSWORD` before deploying
- [ ] Change `DB_PASSWORD` to a strong password
- [ ] Never commit `.env` to version control

## Generate Secure Values

```bash
# Cookie secret (32 chars)
openssl rand -base64 32

# Passwords (20 chars)
openssl rand -base64 24 | tr -d "=+/" | cut -c1-20

```
