#!/bin/sh
set -e

# ========================================
# Frontend Container Entrypoint
# ========================================
# Substitutes environment variables into nginx config at runtime
# Allows frontend container to be deployed independently

# Default values if not provided
export BACKEND_HOST="${BACKEND_HOST:-backend}"
export BACKEND_PORT="${BACKEND_PORT:-3000}"

echo "🔧 Configuring nginx..."
echo "   Backend: ${BACKEND_HOST}:${BACKEND_PORT}"

# Substitute environment variables in nginx config template
envsubst '${BACKEND_HOST} ${BACKEND_PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "✅ Configuration complete"

# Start nginx
exec nginx -g 'daemon off;'

