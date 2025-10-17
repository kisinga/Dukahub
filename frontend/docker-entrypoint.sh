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

# Wait for backend to be available (with timeout)
echo "   Checking backend connectivity..."
timeout=30
while [ $timeout -gt 0 ]; do
  if nc -z ${BACKEND_HOST} ${BACKEND_PORT} 2>/dev/null; then
    echo "   ✅ Backend is reachable"
    break
  fi
  echo "   ⏳ Waiting for backend... (${timeout}s remaining)"
  sleep 1
  timeout=$((timeout - 1))
done

if [ $timeout -eq 0 ]; then
  echo "   ⚠️  Backend not reachable, but continuing with proxy configuration"
fi

# Substitute environment variables in nginx config template
if [ -f /etc/nginx/conf.d/default.conf.template ]; then
  envsubst '${BACKEND_HOST} ${BACKEND_PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
else
  echo "   ⚠️  Template not found, using static config"
fi

# Debug: Show what was actually substituted
echo "   Substituted config preview:"
grep -A 2 "set \$backend_url" /etc/nginx/conf.d/default.conf | head -3 || echo "   (config check skipped)"

# Test nginx configuration
echo "   Testing nginx configuration..."
nginx -t

echo "✅ Configuration complete"

# Start nginx
exec nginx -g 'daemon off;'

