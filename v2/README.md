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
./dc.sh --env-file --first-run up -d

# Or start normally, then populate manually
./dc.sh --env-file up -d
./dc.sh exec backend npm run populate
```

**Access:**

- Admin UI: http://localhost:3002/admin (superadmin / [your password])
- API: http://localhost:3000
- Frontend: http://localhost:4200

## 🔄 Workflows

### Local Docker (Recommended)

```bash
./dc.sh --env-file --first-run up -d  # First run: load env + start + populate
./dc.sh --env-file up -d              # Subsequent runs: load env + start
./dc.sh logs -f                       # View logs (no env needed)
./dc.sh down                          # Stop (no env needed)
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

- Local dev: `./dc.sh --env-file` loads from file
- Coolify/Production: `./dc.sh` uses provider-injected vars (no `--env-file`)
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
