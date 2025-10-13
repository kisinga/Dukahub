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

| Component      | Technology                          |
| -------------- | ----------------------------------- |
| **Frontend**   | Angular 19 + daisyUI + Tailwind CSS |
| **Backend**    | Vendure (NestJS) + TypeScript       |
| **Database**   | PostgreSQL 16                       |
| **Cache**      | Redis 7                             |
| **ML**         | TensorFlow.js (client-side)         |
| **Deployment** | Docker + Docker Compose             |

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

### Production
```bash
# Pull and start all services
docker compose pull
docker compose up -d

# Populate database (first-time only)
docker compose exec backend npm run populate
```

See [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) for detailed instructions.

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
