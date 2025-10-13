# Dukahub

> **AI-powered point-of-sale system for modern small businesses**

Dukahub helps shopkeepers ditch manual data entry and expensive barcode scanners. Use your phone's camera to instantly recognize products, process sales, and manage inventory—all powered by custom AI trained on your products.

## Quick Links

- 📖 **[Full Documentation](./docs/README.md)** - Vision, guides, and architecture
- 🚀 **[Getting Started](./ENVIRONMENT_SETUP.md)** - Local development setup
- 🗺️ **[Roadmap](./ROADMAP.md)** - Planned features and timeline
- 🏗️ **[Architecture](./ARCHITECTURE.md)** - System design and technology stack
- 🤖 **[ML Guide](./ML_GUIDE.md)** - AI model training and deployment

## Current Status

**Version:** 2.0 (Active Development)  
**Stack:** Angular + Vendure + PostgreSQL  
**V1 Archive:** See [V1 Migration Docs](./docs/v1-migration/MIGRATION_SUMMARY.md)

## Core Features

- 🎯 **AI Product Recognition** - Camera-based product identification
- 💰 **Fast Point-of-Sale** - Streamlined checkout workflow
- 📦 **Inventory Management** - Real-time stock tracking
- 🏪 **Multi-location Support** - Manage multiple shops from one system
- 📊 **Sales Analytics** - Business insights and reporting
- 📱 **Mobile-first** - Optimized for smartphones and tablets

## Tech Stack

| Component      | Technology                           |
| -------------- | ------------------------------------ |
| **Frontend**   | Angular 19 + daisyUI + Tailwind CSS  |
| **Backend**    | Vendure (NestJS) + TypeScript        |
| **Database**   | PostgreSQL 16                        |
| **Cache**      | Redis 7                              |
| **ML**         | TensorFlow.js (client-side)          |
| **Deployment** | Container images (platform-agnostic) |

## Configuration

**Single source of truth** for all Dukahub environment variables.

### How It Works

#### Configuration Loading

1.  **Local Development** (backend running on host):

    - Backend loads `configs/.env` via `dotenv`
    - Connects to Docker services via mapped ports (e.g., `localhost:5433`)

2.  **Docker Compose** (all services containerized):
    - Variables are loaded by docker-compose or manually for local development
    - Docker Compose inherits these variables automatically
    - Services communicate via Docker network (e.g., `postgres_db:5432`)

#### Environment Parity

Both environments use **the same `.env` file**. Docker-specific overrides (like `DB_HOST=postgres_db`) are set in `docker-compose.yml` environment section.

```
Local:  backend (host) → localhost:5433 → postgres_db (container)
Docker: backend (container) → postgres_db:5432 (internal network)
```

### Environment Variables

#### Backend & Database

| Variable              | Example           | Default | Used By           | Notes                                             |
| --------------------- | ----------------- | ------- | ----------------- | ------------------------------------------------- |
| `DB_NAME`             | `vendure`         | —       | Backend, Postgres | Database name                                     |
| `DB_USERNAME`         | `vendure`         | —       | Backend, Postgres | Database user                                     |
| `DB_PASSWORD`         | `secure-password` | —       | Backend, Postgres | Database password **[CHANGE IN PRODUCTION]**      |
| `DB_SCHEMA`           | `public`          | —       | Backend           | PostgreSQL schema                                 |
| `DB_HOST`             | `postgres_db`     | —       | Backend           | Database hostname (service name in Docker)        |
| `DB_PORT`             | `5432`            | —       | Backend           | Database port                                     |
| `REDIS_HOST`          | `redis`           | —       | Backend           | Redis hostname (service name in Docker)           |
| `REDIS_PORT`          | `6379`            | —       | Backend           | Redis port                                        |
| `SUPERADMIN_USERNAME` | `superadmin`      | —       | Backend           | Initial admin login                               |
| `SUPERADMIN_PASSWORD` | `secure-password` | —       | Backend           | Initial admin password **[CHANGE IN PRODUCTION]** |
| `COOKIE_SECRET`       | `random-32-chars` | —       | Backend           | Session encryption key **[CHANGE IN PRODUCTION]** |

#### Frontend (Docker Only)

| Variable       | Example   | Default   | Notes                          |
| -------------- | --------- | --------- | ------------------------------ |
| `BACKEND_HOST` | `backend` | `backend` | Backend hostname to connect to |
| `BACKEND_PORT` | `3000`    | `3000`    | Backend port to connect to     |

#### Optional Settings

| Variable           | Example                   | Default       | Used By | Notes                          |
| ------------------ | ------------------------- | ------------- | ------- | ------------------------------ |
| `NODE_ENV`         | `production`              | `development` | Backend | Runtime mode                   |
| `PORT`             | `3000`                    | `3000`        | Backend | Backend port                   |
| `COOKIE_SECURE`    | `true` / `false`          | `false`       | Backend | HTTPS-only cookies             |
| `FRONTEND_URL`     | `http://example.com`      | —             | Backend | CORS origins (comma-separated) |
| `ASSET_URL_PREFIX` | `https://cdn.example.com` | —             | Backend | CDN URL for assets             |
| `RUN_POPULATE`     | `true` / `false`          | `false`       | Backend | Auto-populate database         |

**Security Warning:** Always change `DB_PASSWORD`, `SUPERADMIN_PASSWORD`, and `COOKIE_SECRET` before production deployment!

### Usage Notes

**Backend Container:**

- Requires database and Redis connection variables
- `RUN_POPULATE=true` seeds database on first startup

**Frontend Container:**

- Only requires `BACKEND_HOST` and `BACKEND_PORT`
- All API requests proxy through nginx to backend
- Independent deployment - no database access

**Postgres Container:**

- Maps `DB_*` to `POSTGRES_*` environment variables
- Required by official postgres image naming

**Local Development:**

- Frontend uses `proxy.conf.json` (edit target URL manually)
- Backend loads `configs/.env` via dotenv
- Services connect via localhost ports (5433, 6479)

### Security Checklist

- [ ] Change `COOKIE_SECRET` to a random 32+ character string
- [ ] Change `SUPERADMIN_PASSWORD` before deploying
- [ ] Change `DB_PASSWORD` to a strong password
- [ ] Never commit `.env` to version control

### Generate Secure Values

```bash
# Cookie secret (32 chars)
openssl rand -base64 32

# Passwords (20 chars)
openssl rand -base64 24 | tr -d "=+/" | cut -c1-20
```

## Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/dukahub.git
cd dukahub

# Start dependencies (Postgres, Redis)
docker compose -f docker-compose.dev.yml up -d

# Set up environment
cp configs/env.example configs/.env
nano configs/.env

# Run backend
cd backend && npm install && npm run dev

# Run frontend (in another terminal)
cd frontend && npm install && npm start
```

### Docker Deployment

Images are **independent** and configurable at runtime.

#### Backend

```bash
docker run -p 3000:3000 \
  -e DB_HOST=your-postgres-host \
  -e DB_PORT=5432 \
  -e REDIS_HOST=your-redis-host \
  -e REDIS_PORT=6379 \
  dukahub-backend
```

#### Frontend

```bash
docker run -p 4200:4200 \
  -e BACKEND_HOST=your-backend-host \
  -e BACKEND_PORT=3000 \
  dukahub-frontend
```

**Required Services:** PostgreSQL 16 + Redis 7 (backend only)

**All Environment Variables:** See Configuration section above

See [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) for platform-specific guides.

## Project Structure

```
dukahub/
├── backend/          # Vendure server & worker
├── frontend/         # Angular SPA
├── configs/          # Shared configuration
├── docs/            # Documentation & assets
│   └── v1-migration/ # V1 PocketBase archive
└── v1/              # Legacy codebase (to be removed)
```

## Development

```bash
# Backend (Vendure)
cd backend
npm run dev

# Frontend (Angular)
cd frontend
npm start

# Database migrations
cd backend
npm run migration:run
```

## Contributing

This is currently a private project. For questions or contributions, contact the maintainers.

## License

Proprietary - All rights reserved

---

**Built with ❤️ for African small businesses**
