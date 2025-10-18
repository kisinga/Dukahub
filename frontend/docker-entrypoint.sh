#!/bin/sh
set -e

# Frontend Container Entrypoint
# Configures nginx with backend service discovery

# Default values
export BACKEND_HOST="${BACKEND_HOST:-backend}"
export BACKEND_PORT="${BACKEND_PORT:-3000}"

echo "🔧 Configuring nginx for backend: ${BACKEND_HOST}:${BACKEND_PORT}"

# Verify the nginx template exists
if [ ! -f /etc/nginx/conf.d/default.conf.template ]; then
    echo "❌ Error: nginx template not found at /etc/nginx/conf.d/default.conf.template"
    exit 1
fi

# Substitute environment variables in nginx config
envsubst '${BACKEND_HOST} ${BACKEND_PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Verify the generated config
if [ ! -f /etc/nginx/conf.d/default.conf ]; then
    echo "❌ Error: Failed to generate nginx configuration"
    exit 1
fi

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Error: nginx configuration test failed"
    exit 1
fi

# Verify index.html exists
if [ ! -f /usr/share/nginx/html/index.html ]; then
    echo "❌ Error: index.html not found in /usr/share/nginx/html/"
    echo "Contents of /usr/share/nginx/html/:"
    ls -la /usr/share/nginx/html/
    exit 1
fi

echo "✅ Configuration complete, starting nginx..."

# Start nginx
exec nginx -g 'daemon off;'