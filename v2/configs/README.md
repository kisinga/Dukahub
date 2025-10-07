# Environment Configuration

This directory contains the shared environment configuration for the Dukahub backend.

## Files

- `.env.backend` - Single source of truth for all environment variables (gitignored)
- `.env.backend.example` - Template file with all required variables

## How It Works

### Local Development

- The backend loads environment variables from `configs/.env.backend`
- Path resolution: `../configs/.env.backend` relative to the compiled JavaScript file

### Docker Environment

- The `configs` directory is mounted into the backend container at `/usr/src/app/configs`
- Docker Compose loads the same `.env.backend` file via `env_file` for all services
- **postgres_db**: Uses `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` from `.env.backend`
- **backend**: Docker-specific overrides in `docker-compose.yml`:
  - `APP_ENV: production` (overrides `dev`)
  - `DB_HOST: postgres_db` (overrides `localhost`)
  - `DB_SYNCHRONIZE: false` (overrides `true`)

## Environment Variables

| Variable              | Default                                     | Docker Override | Description               |
| --------------------- | ------------------------------------------- | --------------- | ------------------------- |
| `APP_ENV`             | `dev`                                       | `production`    | Application environment   |
| `PORT`                | `3000`                                      | -               | Server port               |
| `DB_HOST`             | `localhost`                                 | `postgres_db`   | Database host             |
| `DB_SYNCHRONIZE`      | `true`                                      | `false`         | Auto-sync database schema |
| `DB_NAME`             | `dukahub`                                   | -               | Database name             |
| `DB_SCHEMA`           | `public`                                    | -               | Database schema           |
| `DB_PORT`             | `5432`                                      | -               | Database port             |
| `DB_USERNAME`         | `dukahub`                                   | -               | Database username         |
| `DB_PASSWORD`         | `password`                                  | -               | Database password         |
| `POSTGRES_DB`         | `dukahub`                                   | -               | PostgreSQL database name  |
| `POSTGRES_USER`       | `dukahub`                                   | -               | PostgreSQL username       |
| `POSTGRES_PASSWORD`   | `password`                                  | -               | PostgreSQL password       |
| `SUPERADMIN_USERNAME` | `admin`                                     | -               | Admin username            |
| `SUPERADMIN_PASSWORD` | `admin`                                     | -               | Admin password            |
| `COOKIE_SECRET`       | `your-secret-key-here-change-in-production` | -               | Cookie encryption secret  |
| `ASSET_URL_PREFIX`    | `https://www.my-shop.com/assets/`           | -               | CDN/Asset URL prefix      |

## Adding New Variables

1. Add the variable to `.env.backend.example` with a default value
2. Add the variable to your local `.env.backend` file
3. If needed, add Docker-specific overrides in `docker-compose.yml`
4. Update this README with the new variable

## Quick Setup

```bash
# Copy example file
cd configs
cp .env.backend.example .env.backend

# Edit with your values
nano .env.backend
```

## Security Notes

- Change `COOKIE_SECRET` in production
- Change default passwords in production
- Consider using Docker secrets for sensitive data in production
