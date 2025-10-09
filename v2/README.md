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

# First-time setup (starts services + populates data)
./dc.sh --first-run up -d

# Or start normally, then populate manually
./dc.sh up -d
./dc.sh exec backend npm run populate
```

**Access:**

- Admin UI: http://localhost:3002/admin (superadmin / [your password])
- API: http://localhost:3000
- Frontend: http://localhost:4200

## 🔄 Workflows

### Local Docker (Recommended)

```bash
./dc.sh --first-run up -d  # First run: start + populate
./dc.sh up -d              # Subsequent runs: just start
./dc.sh logs -f            # View logs
./dc.sh down               # Stop all services
```

### Local Backend Dev

Backend on host, services in Docker:

```bash
# 1. Start infrastructure
docker compose up -d postgres_db redis typesense

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
└── dc.sh                # Helper script (loads env + runs docker compose)
```

## ⚙️ Configuration

**Single source:** `configs/.env.backend`

- Local dev: Backend loads via dotenv OR `dc.sh` exports to docker-compose
- Coolify: Set variables in UI (overrides)
- See `configs/README.md` for all variables

## 📚 Documentation

- [Infrastructure Guide](./INFRASTRUCTURE.md) - Docker setup & deployment
- [Config Reference](./configs/README.md) - Environment variables
- [Vendure Docs](https://www.vendure.io/docs)
- [Migration Blueprint](../MIGRATION_BLUEPRINT.md) - v1→v2 migration plan

## 🔐 Security

Generate strong secrets:

```bash
openssl rand -base64 32  # COOKIE_SECRET
openssl rand -hex 16     # TYPESENSE_API_KEY
```

Never commit `configs/.env.backend` to git (already in `.gitignore`)

## 📦 Tech Stack

### Backend

- **Vendure** - E-commerce framework
- **TypeScript** - Type-safe development
- **PostgreSQL** - Primary database
- **Redis** - Session & cache store
- **Typesense** - Search engine

### Frontend

- **Angular 19** - SPA framework
- **Tailwind CSS** - Styling
- **TypeScript** - Type-safe development

## 🤝 Contributing

This project is part of the Dukahub platform migration from PocketBase (v1) to Vendure (v2).

See [MIGRATION_BLUEPRINT.md](../MIGRATION_BLUEPRINT.md) for the full architecture and migration strategy.

## 📄 License

See [LICENSE](../v1/LICENSE)
