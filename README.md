# Dukahub

> **AI-powered point-of-sale system for modern small businesses**

Dukahub helps shopkeepers ditch manual data entry and expensive barcode scanners. Use your phone's camera to instantly recognize products, process sales, and manage inventory—all powered by custom AI trained on your products.

## Quick Links

- 🚀 **[Setup & Deployment](./INFRASTRUCTURE.md)** - Local dev and production deployment
- 🏗️ **[Architecture](./ARCHITECTURE.md)** - System design and technology stack
- 🤖 **[ML Guide](./ML_GUIDE.md)** - AI model training and deployment
- 🗺️ **[Roadmap](./ROADMAP.md)** - Planned features and timeline

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

Environment variables reference for all deployment modes.

### Backend & Database

| Variable              | Example           | Default | Notes                                             |
| --------------------- | ----------------- | ------- | ------------------------------------------------- |
| `DB_NAME`             | `vendure`         | —       | Database name                                     |
| `DB_USERNAME`         | `vendure`         | —       | Database user                                     |
| `DB_PASSWORD`         | `secure-password` | —       | Database password **[CHANGE IN PRODUCTION]**      |
| `DB_SCHEMA`           | `public`          | —       | PostgreSQL schema                                 |
| `DB_HOST`             | `postgres_db`     | —       | Database hostname                                 |
| `DB_PORT`             | `5432`            | —       | Database port                                     |
| `REDIS_HOST`          | `redis`           | —       | Redis hostname                                    |
| `REDIS_PORT`          | `6379`            | —       | Redis port                                        |
| `SUPERADMIN_USERNAME` | `superadmin`      | —       | Initial admin login                               |
| `SUPERADMIN_PASSWORD` | `secure-password` | —       | Initial admin password **[CHANGE IN PRODUCTION]** |
| `COOKIE_SECRET`       | `random-32-chars` | —       | Session encryption key **[CHANGE IN PRODUCTION]** |

### Frontend (Docker Only)

| Variable       | Example   | Default   | Notes                          |
| -------------- | --------- | --------- | ------------------------------ |
| `BACKEND_HOST` | `backend` | `backend` | Backend hostname to connect to |
| `BACKEND_PORT` | `3000`    | `3000`    | Backend port to connect to     |

### Optional Settings

| Variable           | Example                   | Default       | Notes                             |
| ------------------ | ------------------------- | ------------- | --------------------------------- |
| `NODE_ENV`         | `production`              | `development` | Runtime mode                      |
| `PORT`             | `3000`                    | `3000`        | Backend port                      |
| `COOKIE_SECURE`    | `true` / `false`          | `false`       | HTTPS-only cookies                |
| `FRONTEND_URL`     | `http://example.com`      | —             | CORS origins (comma-separated)    |
| `ASSET_URL_PREFIX` | `https://cdn.example.com` | —             | CDN URL for assets                |
| `RUN_POPULATE`     | `true` / `false`          | `false`       | Auto-populate database on startup |

**Security Warning:** Always change `DB_PASSWORD`, `SUPERADMIN_PASSWORD`, and `COOKIE_SECRET` before production deployment!

### Generate Secure Values

```bash
# Cookie secret (32 chars)
openssl rand -base64 32

# Passwords (20 chars)
openssl rand -base64 24 | tr -d "=+/" | cut -c1-20
```

## Project Structure

```
dukahub/
├── backend/          # Vendure server & worker
├── frontend/         # Angular SPA
├── configs/          # Shared configuration
└── docs/             # Documentation & assets
```

## Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/dukahub.git
cd dukahub
```

**Next Steps:** See [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) for setup instructions.

## Contributing

This is currently a private project. For questions or contributions, contact the maintainers.

## License

Proprietary - All rights reserved

---

**Built with ❤️ for African small businesses**
