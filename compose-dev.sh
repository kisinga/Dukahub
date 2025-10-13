#!/usr/bin/env bash
# compose-dev.sh — DEPRECATED
#
# Architecture has changed: Docker = Production only
# For local development, use: docker compose -f docker-compose.dev.yml up -d
# Then run backend/frontend manually: npm run dev
#
# This script is kept for backwards compatibility only.
set -euo pipefail

# Change to script directory
cd "$(dirname "${BASH_SOURCE[0]}")"

ENV_FILE=""
RUN_POPULATE=false

# Parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      shift
      if [[ $# -gt 0 && ! "$1" =~ ^-- ]]; then
        ENV_FILE="$1"
        shift
      else
        echo "❌ Error: --env-file requires a file path argument" >&2
        exit 1
      fi
      ;;
    --populate)
      RUN_POPULATE=true
      shift
      ;;
    *)
      break
      ;;
  esac
done

# Load env file if explicitly provided
if [[ -n "$ENV_FILE" ]]; then
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

# Export RUN_POPULATE for docker compose to pick up
if [[ "$RUN_POPULATE" == "true" ]]; then
  export RUN_POPULATE=true
  echo "🌱 RUN_POPULATE=true will populate database on first start"
fi

# Run docker compose with remaining args
docker compose "$@"
