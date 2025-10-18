#!/bin/sh
set -e

# Frontend Container Entrypoint
# Configures nginx with backend service discovery

# Default values
export BACKEND_HOST="${BACKEND_HOST:-backend}"
export BACKEND_PORT="${BACKEND_PORT:-3000}"

echo "🔧 Configuring nginx for backend: ${BACKEND_HOST}:${BACKEND_PORT}"

# Substitute environment variables in nginx config
envsubst '${BACKEND_HOST} ${BACKEND_PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Test and start nginx
nginx -t
echo "✅ Configuration complete"

exec nginx -g 'daemon off;'

