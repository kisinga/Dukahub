# GitHub Actions Workflows

## Docker Build and Push – v2

Builds images using your existing `docker-compose.yml` and pushes to GitHub Container Registry.

### Why This Approach?

✅ **Consistency**: Uses the same docker-compose.yml as local development  
✅ **Single source of truth**: One build configuration everywhere  
✅ **Easier maintenance**: Update Dockerfile once, works everywhere

### Triggers

- Push to `v2` branch
- Manual trigger via workflow_dispatch

### Images

- **Frontend**: `ghcr.io/kisinga/dukahub/frontend:latest`
- **Backend**: `ghcr.io/kisinga/dukahub/backend:latest`

### Usage

#### Development (Build Locally)

Use the standard docker-compose for development:

```bash
cd v2
docker compose up --build
```

This builds images from source. Best for active development.

#### Production (Use Pre-Built Images)

Use the production compose file with pre-built images from GHCR:

```bash
cd v2
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

This pulls the latest tested images. Best for deployment.

#### Manual Image Pull

```bash
docker pull ghcr.io/kisinga/dukahub/frontend:latest
docker pull ghcr.io/kisinga/dukahub/backend:latest
```

#### Making Images Public

1. Go to repository → Packages
2. Click package → Package settings
3. Change visibility to Public
