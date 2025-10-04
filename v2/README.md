# Dukahub v2

Modern multi-tenant inventory management system built with Vendure and Angular.

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- Docker & Docker Compose (for containerized development)
- PostgreSQL 16 (if running locally without Docker)

### Setup

1. **Create environment file:**

   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start with Docker (Recommended):**

   ```bash
   cd v2
   docker compose up
   ```

   Access:

   - Backend API: http://localhost:3000
   - Admin UI: http://localhost:3002/admin
   - Frontend: http://localhost:8080

3. **Or run locally:**
   ```bash
   # Start database first (use docker-compose or local postgres)
   cd backend
   npm install
   npm run dev
   ```

## 📁 Project Structure

```
v2/
├── backend/          # Vendure backend
│   ├── src/
│   │   ├── plugins/  # Custom Vendure plugins
│   │   └── vendure-config.ts
│   ├── .env          # ← SINGLE SOURCE OF TRUTH for environment config
│   └── Dockerfile
├── frontend/         # Angular SPA
│   ├── src/
│   └── Dockerfile
├── docker-compose.yml
└── ENVIRONMENT_SETUP.md  # Detailed environment configuration guide
```

## ⚙️ Configuration

**All configuration is in `backend/.env`** - this is the single source of truth for both local and Docker environments.

See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for detailed configuration instructions.

### Key Points:

- ✅ One `.env` file for all environments (`backend/.env`)
- ✅ Works identically in local and Docker
- ✅ No hardcoded credentials in `docker-compose.yml`
- ✅ Secure by default (`.env` is git-ignored)

## 🐳 Docker Commands

```bash
# Start all services
docker compose up

# Start in background
docker compose up -d

# Rebuild and start
docker compose up --build

# View logs
docker compose logs -f backend

# Stop all services
docker compose down

# Remove volumes (clean database)
docker compose down -v
```

## 📚 Documentation

- [Environment Setup Guide](./ENVIRONMENT_SETUP.md) - Complete environment configuration
- [Vendure Documentation](https://www.vendure.io/docs)
- [Migration Blueprint](../MIGRATION_BLUEPRINT.md) - Architecture and migration plan

## 🔐 Security

- Never commit `.env` files
- Use strong secrets in production
- Generate secure `COOKIE_SECRET`:
  ```bash
  openssl rand -base64 32
  ```

## 🛠️ Development

### Backend Development

```bash
cd backend
npm run dev          # Start with hot reload
npm run build        # Build for production
npm run start        # Run production build
```

### Frontend Development

```bash
cd frontend
npm install
npm start            # Development server
npm run build        # Production build
```

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
