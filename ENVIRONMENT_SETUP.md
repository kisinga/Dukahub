# Environment Configuration Guide

## Single Source of Truth: `backend/.env`

All environment variables are defined in **`v2/backend/.env`** - this is the **single source of truth** for both local development and Docker.

## File Structure

```
v2/
├── backend/
│   ├── .env              ← SINGLE SOURCE OF TRUTH (git-ignored)
│   ├── .env.example      ← Template (committed to git)
│   └── ...
└── docker-compose.yml    ← References ./backend/.env
```

## Quick Start

### Initial Setup

```bash
cd v2/backend
cp .env.example .env
# Edit .env with your values if needed
```

### Local Development (No Docker)

```bash
cd v2/backend
npm install
npm run dev
```

**How it works:** The app loads `.env` automatically via `import 'dotenv/config'` in vendure-config.ts

### Docker Development

```bash
cd v2
docker-compose up --build
```

**How it works:**

- Docker Compose reads `backend/.env` via `env_file: - ./backend/.env`
- All variables are loaded into containers
- `DB_HOST` is overridden to `postgres_db` (the service name)

## How It Works

### 🔄 Variable Flow

```
backend/.env (single file)
    ├──> Local Dev: Loaded by dotenv/config → Application
    └──> Docker: Loaded by env_file → All containers
```

### 📋 docker-compose.yml Configuration

```yaml
postgres_db:
  env_file:
    - ./backend/.env # Loads all variables
  environment:
    POSTGRES_DB: ${DB_NAME} # Uses variables from backend/.env
    POSTGRES_USER: ${DB_USERNAME}
    POSTGRES_PASSWORD: ${DB_PASSWORD}

backend:
  env_file:
    - ./backend/.env # Loads all variables
  environment:
    DB_HOST: postgres_db # Override for Docker network
```

## Environment Variables Reference

### Application Variables

| Variable              | Required | Default      | Description                                         |
| --------------------- | -------- | ------------ | --------------------------------------------------- |
| `NODE_ENV`            | Yes      | `dev`        | Application environment (`dev` or `production`)     |
| `PORT`                | Yes      | `3000`       | Port the server listens on                          |
| `COOKIE_SECRET`       | Yes      | -            | Secret for cookie encryption (random string)        |
| `SUPERADMIN_USERNAME` | Yes      | `superadmin` | Initial superadmin username                         |
| `SUPERADMIN_PASSWORD` | Yes      | `superadmin` | Initial superadmin password                         |
| `DB_HOST`             | Yes      | `localhost`  | Database host (auto-set to `postgres_db` in Docker) |
| `DB_PORT`             | Yes      | `5432`       | Database port                                       |
| `DB_NAME`             | Yes      | `vendure`    | Database name                                       |
| `DB_USERNAME`         | Yes      | `vendure`    | Database username                                   |
| `DB_PASSWORD`         | Yes      | -            | Database password                                   |
| `DB_SCHEMA`           | Yes      | `public`     | Database schema                                     |

### Postgres Container Variables (Docker only)

These **must match** the `DB_*` values above:

| Variable            | Required | Description              |
| ------------------- | -------- | ------------------------ |
| `POSTGRES_DB`       | Yes      | Must equal `DB_NAME`     |
| `POSTGRES_USER`     | Yes      | Must equal `DB_USERNAME` |
| `POSTGRES_PASSWORD` | Yes      | Must equal `DB_PASSWORD` |

**Important:** When changing database credentials, update BOTH sets of variables in `backend/.env`

## Key Differences: Local vs Docker

| Aspect             | Local Dev     | Docker                     |
| ------------------ | ------------- | -------------------------- |
| DB_HOST            | `localhost`   | `postgres_db`              |
| How .env is loaded | dotenv/config | env_file in docker-compose |
| Database           | External      | In container               |

**Note:** `DB_HOST` is the **only** variable that differs between local and Docker - it's overridden in docker-compose.yml

## Production Deployment

### Option 1: Environment Variables (Recommended)

Set variables directly in your production environment:

```bash
docker run -d \
  -e APP_ENV=production \
  -e PORT=3000 \
  -e COOKIE_SECRET=your-secure-secret \
  -e SUPERADMIN_USERNAME=admin \
  -e SUPERADMIN_PASSWORD=secure-password \
  -e DB_HOST=your-db-host \
  -e DB_PORT=5432 \
  -e DB_NAME=vendure \
  -e DB_USERNAME=vendure \
  -e DB_PASSWORD=secure-db-password \
  -e DB_SCHEMA=public \
  -p 3000:3000 \
  your-image-name
```

### Option 2: .env File

```bash
# Create production .env on server
docker run -d --env-file /path/to/production/.env -p 3000:3000 your-image-name
```

## Security Best Practices

1. **Never commit `.env` files** - Contains sensitive credentials
2. **Always commit `.env.example`** - Template and documentation
3. **Use strong secrets** - Generate random `COOKIE_SECRET`:
   ```bash
   openssl rand -base64 32
   ```
4. **Rotate credentials** - Especially for production
5. **Use secrets management** - Docker secrets, Kubernetes secrets, or cloud provider services for production

## Troubleshooting

### Issue: Environment variables not loading in Docker

**Solution:** Ensure `backend/.env` exists. Docker Compose uses `env_file: - ./backend/.env`

```bash
cd v2/backend
ls -la .env  # Should exist
```

### Issue: Cannot connect to database in Docker

**Solution:** In Docker, `DB_HOST` must be `postgres_db` (service name), not `localhost`. This is handled automatically in docker-compose.yml.

### Issue: Different behavior between local and Docker

**Cause:** Local uses `DB_HOST=localhost`, Docker uses `DB_HOST=postgres_db`

**Solution:** This is expected and handled automatically. No action needed.

### Issue: Variables showing as blank/unset

**Solution:**

1. Check `backend/.env` exists and has values
2. Restart containers: `docker-compose down && docker-compose up`
3. Verify file is not empty: `cat backend/.env`

## Testing Your Setup

```bash
# 1. Verify .env file exists
cd v2/backend
cat .env

# 2. Test local development
npm run dev
# Expected: Server starts on port 3000

# 3. Test Docker build
cd v2
docker-compose build backend
# Expected: Build completes without errors

# 4. Test Docker run
docker-compose up
# Expected: All services start, no "variable not set" warnings
```

## Migration Checklist

- [x] Single `.env` file in `backend/` directory
- [x] `.env.example` template created
- [x] `.dockerignore` excludes `.env` from images
- [x] `.gitignore` prevents committing `.env`
- [x] `docker-compose.yml` uses `env_file: - ./backend/.env`
- [x] `DB_HOST` automatically switches between local/Docker

## Quick Commands

```bash
# Create .env from template
cd v2/backend && cp .env.example .env

# Start local development
cd v2/backend && npm run dev

# Start Docker development
cd v2 && docker-compose up --build

# Stop Docker
cd v2 && docker-compose down

# View logs
cd v2 && docker-compose logs -f backend

# Check running containers
docker-compose ps
```

---

**Remember:** `v2/backend/.env` is your single source of truth. Change values there and they'll work everywhere! 🎉
