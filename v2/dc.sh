#!/usr/bin/env bash
# dc.sh — Load env vars from configs/.env.backend, then run docker compose
set -euo pipefail

ENV_FILE="${ENV_FILE:-./configs/.env.backend}"

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

# Pass all arguments to docker compose
exec docker compose "$@"
