#!/usr/bin/env bash
# dc.sh — load env from folder (default /configs) then run docker compose
set -euo pipefail

# --- Parse arguments ---
POPULATE=false
ENV_DIR=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -p|--populate)
      POPULATE=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [ENV_DIR] [-p|--populate]"
      echo ""
      echo "  -p, --populate    Populate database with sample data"
      echo "  -h, --help        Show this help"
      echo ""
      echo "Examples:"
      echo "  $0                # Start stack"
      echo "  $0 --populate     # Start and populate"
      echo "  $0 /configs -p    # Coolify + populate"
      exit 0
      ;;
    *)
      if [[ -z "$ENV_DIR" ]]; then
        ENV_DIR="$1"
      else
        echo "Error: unexpected argument '$1'" >&2
        echo "Run '$0 --help' for usage information." >&2
        exit 1
      fi
      shift
      ;;
  esac
done

# Set default ENV_DIR if not provided
ENV_DIR="${ENV_DIR:-./configs}"
ENV_FILENAME=".env.backend"
DC_CMD="${DC_CMD:-docker compose}"
# ----------------------

# Resolve fallback if the provided dir doesn't exist
if [[ ! -d "$ENV_DIR" ]]; then
  if [[ -d "./configs" ]]; then
    echo "⚠️  Warning: $ENV_DIR not found — falling back to ./configs"
    ENV_DIR="./configs"
  elif [[ -d "/configs" ]]; then
    echo "⚠️  Warning: $ENV_DIR not found — falling back to /configs (Coolify)"
    ENV_DIR="/configs"
  else
    echo "❌ Error: env directory '$ENV_DIR' not found and no fallback available." >&2
    exit 1
  fi
fi

ENV_FILE="$ENV_DIR/$ENV_FILENAME"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env file '$ENV_FILE' not found." >&2
  exit 1
fi

# Show which file we're using
echo "Loading env: $ENV_FILE"

# Export variables into the shell (assumes file is shell-compatible KEY=VALUE)
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Optional sanity check: warn about common required vars (non-fatal)
required=(DB_NAME DB_USERNAME DB_PASSWORD)
missing=()
for v in "${required[@]}"; do
  if [[ -z "${!v-}" ]]; then
    missing+=("$v")
  fi
done
if (( ${#missing[@]} )); then
  echo "Warning: missing env vars: ${missing[*]}"
fi

# Handle populate flag
if [[ "$POPULATE" == "true" ]]; then
  export DB_SYNCHRONIZE=true
  echo "Starting infrastructure services..."
  $DC_CMD up -d --build postgres_db redis typesense
  
  echo "Waiting for database..."
  sleep 5
  
  echo "Populating database..."
  if $DC_CMD run --rm backend npm run populate; then
    echo "✓ Database populated"
  else
    echo "⚠ Populate failed"
    exit 1
  fi
  
  export DB_SYNCHRONIZE=false
  echo "Starting application services..."
  $DC_CMD up -d backend frontend
else
  export DB_SYNCHRONIZE=false
  echo "Starting stack..."
  $DC_CMD up -d --build
fi

echo ""
echo "✓ Stack running"
echo "  Admin:   http://localhost:3002/admin"
echo "  API:     http://localhost:3000"
echo "  Frontend: http://localhost:4200"
