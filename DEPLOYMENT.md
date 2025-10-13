# Deployment Guide

## Docker Compose Override Pattern

### Three-File Structure

1. **`docker-compose.yml`** - Base config (shared)
2. **`docker-compose.override.yml`** - Dev overrides (auto-loaded)
3. **`docker-compose.prod.yml`** - Production overrides (explicit)

### Development

Uses override pattern with local builds.

```bash
./compose-dev.sh --env-file configs/.env.backend up -d
```

### Production

Uses pre-built images from GitHub Container Registry.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Development Workflow

### 1. Local Development

```bash
./compose-dev.sh --env-file configs/.env.backend up -d
```

Make changes, rebuild as needed.

### 2. Push to GitHub

```bash
git add .
git commit -m "Your changes"
git push origin main
```

GitHub Actions automatically builds and pushes images to GHCR (main branch only).

### 3. Deploy to Production Server

```bash
# SSH into your server
cd /path/to/dukahub

# Pull latest images
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull

# Restart services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Quick Commands

### Development

```bash
# Start dev environment
./compose-dev.sh --env-file configs/.env.backend up -d

# View logs
./compose-dev.sh --env-file configs/.env.backend logs -f

# Stop
./compose-dev.sh --env-file configs/.env.backend down

# Clean restart
./compose-dev.sh --env-file configs/.env.backend down -v
./compose-dev.sh --env-file configs/.env.backend --populate up -d
```

### Production

```bash
# Pull latest images
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull

# Start production environment
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Stop
docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# View logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend

# Update to latest (pull + restart)
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull && \
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Image Locations

- Frontend: `ghcr.io/kisinga/dukahub/frontend:latest`
- Backend: `ghcr.io/kisinga/dukahub/backend:latest`

Built automatically on push to `main` branch via GitHub Actions.

## First-Time Setup

### 1. Enable GHCR Access

Make your repository public or set package visibility:

1. Go to Settings → Packages
2. Set `frontend` and `backend` packages to public

### 2. Initial Build

Push to main branch to trigger first build:

```bash
git push origin main
```

Wait ~5-10 minutes for images to build.

### 3. Verify Images

Check packages at:

- https://github.com/kisinga/dukahub/packages

### 4. Deploy

```bash
# On your production server
git clone https://github.com/kisinga/dukahub.git
cd dukahub
cp configs/.env.backend.example configs/.env.backend
nano configs/.env.backend  # Set production values

# Deploy
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
