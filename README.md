# Dukarun

> **AI-powered point-of-sale system for modern small businesses**

Dukarun helps shopkeepers ditch manual data entry and expensive barcode scanners. Use your phone's camera to instantly recognize products, process sales, and manage inventory—all powered by custom AI trained on your products.

[![Tests](https://github.com/kisinga/Dukarun/actions/workflows/test.yml/badge.svg)](https://github.com/kisinga/Dukarun/actions/workflows/test.yml)
[![Coverage](https://codecov.io/gh/kisinga/Dukarun/branch/main/graph/badge.svg)](https://codecov.io/gh/kisinga/Dukarun)
[![Backend Coverage](https://codecov.io/gh/kisinga/Dukarun/branch/main/graph/badge.svg?flag=backend)](https://codecov.io/gh/kisinga/Dukarun)
[![Frontend Coverage](https://codecov.io/gh/kisinga/Dukarun/branch/main/graph/badge.svg?flag=frontend)](https://codecov.io/gh/kisinga/Dukarun)

## Quick Links

- 🚀 **[Setup & Deployment](./INFRASTRUCTURE.md)** - Get started, deploy anywhere
- 🆕 **[Fresh Setup](./INFRASTRUCTURE.md#fresh-setup)** - First-time installation guide
- 🏗️ **[Architecture](./ARCHITECTURE.md)** - System design and decisions
- 🤖 **[ML Guide](./ML_TRAINING_SETUP.md)** - AI model training
- 🗺️ **[Roadmap](./ROADMAP.md)** - Planned features
- **[Vendure Setup](../VENDURE_SETUP.md)** - Vendure setup, limitations and workarounds

- **[Frontend Architecture](../frontend/ARCHITECTURE.md)** - Angular app structure
- **[Design System](../frontend/DESIGN-SYSTEM.md)** - UI components and patterns
- **[POS Guide](../frontend/POS_README.md)** - Point-of-sale workflow

## Current Status

**Version:** 2.0 (Active Development)  
**Stack:** Angular + Vendure + PostgreSQL  
**V1 Archive:** See [V1 Migration](./docs/v1-migration/MIGRATION_SUMMARY.md)

## Core Features

- 🎯 **AI Product Recognition** - Camera-based product identification
- 💰 **Fast Point-of-Sale** - Streamlined checkout workflow
- 📦 **Inventory Management** - Real-time stock tracking
- 🏪 **Multi-location Support** - Manage multiple shops
- 📊 **Sales Analytics** - Business insights
- 📱 **Mobile-first** - Optimized for smartphones

## Tech Stack

| Component      | Technology                           |
| -------------- | ------------------------------------ |
| **Frontend**   | Angular 19 + daisyUI + Tailwind CSS  |
| **Backend**    | Vendure (NestJS) + TypeScript        |
| **Database**   | PostgreSQL 16                        |
| **Cache**      | Redis 7                              |
| **ML**         | TensorFlow.js (client-side)          |
| **Deployment** | Container images (platform-agnostic) |

## Project Structure

```
dukarun/
├── backend/          # Vendure server & worker
├── frontend/         # Angular SPA
├── configs/          # Shared configuration
└── docs/             # Documentation & assets
```

## Getting Started

```bash
# Clone repository
git clone https://github.com/yourusername/dukarun.git
cd dukarun
```

**Next:** See [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) for complete setup instructions.

## Docker Compose Setup

Dukarun uses a two-file Docker Compose structure for flexible deployment:

- **`docker-compose.services.yml`** - Infrastructure services (PostgreSQL, Redis, TimescaleDB, SigNoz, ClickHouse)
- **`docker-compose.yml`** - Application services (Backend, Frontend)

### Local Development

**Option 1: Full Docker (Production-like)**
```bash
# Start infrastructure services
docker compose -f docker-compose.services.yml up -d

# Start application services (uses service names via shared network)
docker compose up -d
```

**Option 2: Hybrid (Services in Docker, App Direct)**
```bash
# Start infrastructure services
docker compose -f docker-compose.services.yml up -d

# Run backend directly (override .env: DB_HOST=localhost, REDIS_HOST=localhost)
cd backend && npm run dev

# Run frontend directly (uses proxy to localhost:3000)
cd frontend && npm start
```

### Network Architecture

- **Services compose** creates named network `dukarun_services`
- **App compose** joins `dukarun_services` network (external: true)
- Backend **always uses service names** in Docker: `postgres_db`, `redis`, `timescaledb_audit`, `signoz`
- Frontend connects to backend via service name: `backend`
- Never uses localhost in Docker compose files (production-ready, scalable)

### Deployment to Coolify

- **Services compose** can be pasted directly into Coolify for managed resources with backups
- **App compose** stays in git for version control and rollback
- Services communicate via Docker service discovery (service names)

## Contributing

This is currently a private project. For questions or contributions, contact the maintainers.

## License

Proprietary - All rights reserved

---

**Built with ❤️ for African small businesses**
