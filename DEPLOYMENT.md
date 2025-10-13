# Deployment Guide

## Architecture: Docker = Production Only

**Single file:** `docker-compose.yml` (production-optimized, GHCR images)

### Production Deployment

Uses pre-built images from GitHub Container Registry.

```bash
docker compose pull
docker compose up -d
```

### Local Development

Run services manually (not containerized):

```bash
# Start dependencies only (postgres, redis)
docker compose -f docker-compose.dev.yml up -d

# Run backend
cd backend
npm install
npm run dev

# Run frontend (separate terminal)
cd frontend
npm install
npm start
```

---

## Deployment Workflow

### 1. Local Development

```bash
# Start dependencies
docker compose -f docker-compose.dev.yml up -d

# Develop backend/frontend manually
cd backend && npm run dev
cd frontend && npm start
```

### 2. Push to GitHub

```bash
git add .
git commit -m "Your changes"
git push origin main
```

GitHub Actions builds and pushes images to GHCR.

### 3. Deploy to Production

```bash
# Pull latest images
docker compose pull

# Start services
docker compose up -d
```

---

## Quick Commands

### Local Development

```bash
# Start dependencies only
docker compose -f docker-compose.dev.yml up -d

# Run backend manually
cd backend && npm run dev

# Run frontend manually (separate terminal)
cd frontend && npm start

# Stop dependencies
docker compose -f docker-compose.dev.yml down
```

### Production

```bash
# Pull latest images
docker compose pull

# Start services
docker compose up -d

# View logs
docker compose logs -f backend

# Stop services
docker compose down

# Update to latest
docker compose pull && docker compose up -d
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

# Set environment variables in .env or Coolify UI
# Required: DB_NAME, DB_USERNAME, DB_PASSWORD, COOKIE_SECRET,
#           SUPERADMIN_USERNAME, SUPERADMIN_PASSWORD

# Deploy
docker compose pull
docker compose up -d
```
