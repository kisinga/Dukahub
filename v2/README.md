# Dukahub v2

Modern multi-tenant inventory management system built with Vendure and Angular.

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- Docker & Docker Compose

### Setup

```bash
cd v2
cp configs/.env.backend.example configs/.env.backend
nano configs/.env.backend  # Update passwords/secrets

# First-time setup (loads env + starts + populates)
./compose-dev.sh --env-file ./configs/.env.backend --populate up -d

# Or start normally without populate
./compose-dev.sh --env-file ./configs/.env.backend up -d
```

**Access:**

- Admin UI: http://localhost:3002/admin (superadmin / [your password])
- API: http://localhost:3000
- Frontend: http://localhost:4200

## 🔄 Workflows

### Local Docker (Recommended)

```bash
./compose-dev.sh --env-file ./configs/.env.backend --populate up -d  # First run
./compose-dev.sh --env-file ./configs/.env.backend up -d              # Subsequent runs
docker compose logs -f                                                # View logs
docker compose down                                                   # Stop
```

### Local Backend Dev

Backend on host, services in Docker:

```bash
# 1. Start infrastructure
docker compose up -d postgres_db redis

# 2. Run backend locally (connects to localhost:5433)
cd backend
npm install
npm run dev

# 3. First run: populate
npm run populate
```

## 📁 Project Structure

```
v2/
├── configs/
│   └── .env.backend     # ← SINGLE SOURCE OF TRUTH
├── backend/             # Vendure e-commerce backend
│   ├── src/
│   │   ├── plugins/
│   │   ├── populate.ts  # Sample data loader (idempotent)
│   │   └── vendure-config.ts
│   └── Dockerfile
├── frontend/            # Angular SPA
│   ├── src/
│   └── Dockerfile
├── docker-compose.yml   # Service definitions
└── compose-dev.sh       # Local dev helper (loads env + runs docker compose)
```

## ⚙️ Configuration

**Single source:** `configs/.env.backend`

- **Local dev:** `./compose-dev.sh --env-file ./configs/.env.backend` loads from file
- **Production:** Platform (e.g., Coolify) injects vars directly via UI
- See `configs/README.md` for all variables

## 📚 Documentation

- [Infrastructure](./INFRASTRUCTURE.md) - Docker & deployment
- [Roadmap](./ROADMAP.md) - Future plans
- [Frontend Architecture](./frontend/ARCHITECTURE.md)
- [Design System](./frontend/DESIGN-SYSTEM.md)
- [ML Guide](./ML_GUIDE.md)
- [Gaps & Workarounds](./GAPS.md)

## 🔐 Security

Generate strong secrets:

```bash
openssl rand -base64 32  # COOKIE_SECRET
```

Never commit `configs/.env.backend` to git (already in `.gitignore`)

## 📦 Tech Stack

### Backend

- **Vendure** - E-commerce framework
- **TypeScript** - Type-safe development
- **PostgreSQL** - Primary database
- **Redis** - Session & cache store

### Frontend

- **Angular 19** - SPA framework
- **Tailwind CSS** - Styling
- **TypeScript** - Type-safe development

## 🤝 Contributing

This project is part of the Dukahub platform migration from PocketBase (v1) to Vendure (v2).

See [MIGRATION_BLUEPRINT.md](../MIGRATION_BLUEPRINT.md) for the full architecture and migration strategy.

## 📄 License

See [LICENSE](../v1/LICENSE)
