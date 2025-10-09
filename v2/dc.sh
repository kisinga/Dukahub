#!/usr/bin/env bash
# dc.sh — Load env vars from file, then run docker compose
set -euo pipefail

LOAD_ENV=false
FIRST_RUN=false
ENV_FILE="./configs/.env.backend"

# Parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      LOAD_ENV=true
      shift
      ;;
    --first-run)
      FIRST_RUN=true
      shift
      ;;
    *)
      break
      ;;
  esac
done

# Load env file if explicitly requested
if [[ "$LOAD_ENV" == "true" ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "❌ Error: $ENV_FILE not found" >&2
    exit 1
  fi
  echo "📦 Loading: $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

# Run docker compose with remaining args
docker compose "$@"

# Populate database if requested
if [[ "$FIRST_RUN" == "true" ]]; then
  echo ""
  echo "🌱 Populating database..."
  sleep 3
  docker compose exec backend npm run populate
fi
