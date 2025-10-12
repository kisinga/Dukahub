# Deployment Guide

## Two Docker Compose Files

### `docker-compose.yml` - Development

Builds images from source. Use for active development.

```bash
docker compose up --build
```

### `docker-compose.prod.yml` - Production

Uses pre-built images from GitHub Container Registry. Use for deployment.

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

## Development Workflow

### 1. Local Development

```bash
cd v2
docker compose up --build
```

Make changes, restart containers as needed.

### 2. Push to GitHub

```bash
git add .
git commit -m "Your changes"
git push origin v2
```

GitHub Actions automatically builds and pushes images to GHCR.

### 3. Deploy to Production Server

```bash
# SSH into your server
cd /path/to/dukahub/v2

# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Restart services
docker compose -f docker-compose.prod.yml up -d
```

---

## Quick Commands

### Development

```bash
# Start dev environment
docker compose up

# Rebuild and start
docker compose up --build

# Stop
docker compose down

# View logs
docker compose logs -f
```

### Production

```bash
# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Start production environment
docker compose -f docker-compose.prod.yml up -d

# Stop
docker compose -f docker-compose.prod.yml down

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Update to latest (pull + restart)
docker compose -f docker-compose.prod.yml pull && \
docker compose -f docker-compose.prod.yml up -d
```

---

## Image Locations

- Frontend: `ghcr.io/kisinga/dukahub/frontend:latest`
- Backend: `ghcr.io/kisinga/dukahub/backend:latest`

Built automatically on push to `v2` branch via GitHub Actions.
