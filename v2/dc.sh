#!/usr/bin/env bash
# dc.sh — Load env vars from configs/.env.backend, then run docker compose
set -euo pipefail

ENV_FILE="${ENV_FILE:-./configs/.env.backend}"
FIRST_RUN=false

# Check for --first-run flag
if [[ "${1:-}" == "--first-run" ]]; then
  FIRST_RUN=true
  shift
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Error: $ENV_FILE not found" >&2
  echo "Run: cp configs/.env.backend.example configs/.env.backend" >&2
  exit 1
fi

# Load and export all variables
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Run docker compose with provided args
docker compose "$@"

# If first run, populate database
if [[ "$FIRST_RUN" == "true" ]]; then
  echo ""
  echo "🌱 First run detected - populating database..."
  sleep 3  # Wait for services to be ready
  docker compose exec backend npm run populate
fi
