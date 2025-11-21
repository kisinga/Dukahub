#!/bin/sh
set -e

# Frontend Container Entrypoint
# Configures nginx with backend service discovery and runtime config injection

# Default values
export BACKEND_HOST="${BACKEND_HOST:-backend}"
export BACKEND_PORT="${BACKEND_PORT:-3000}"

# SigNoz Observability Configuration (optional)
# All values can be overridden via environment variables
export SIGNOZ_HOST="${SIGNOZ_HOST:-signoz}"
export SIGNOZ_PORT="${SIGNOZ_PORT:-4318}"
export ENABLE_TRACING="${ENABLE_TRACING:-false}"
export SIGNOZ_ENDPOINT="${SIGNOZ_ENDPOINT:-/signoz/v1/traces}"
export SERVICE_NAME="${SERVICE_NAME:-dukarun-frontend}"
export SERVICE_VERSION="${SERVICE_VERSION:-2.0.0}"
# Web Push VAPID Public Key
export VAPID_PUBLIC_KEY="${VAPID_PUBLIC_KEY:-}"

echo "🔧 Configuring nginx for backend: ${BACKEND_HOST}:${BACKEND_PORT}"
echo "📊 Observability: Tracing=${ENABLE_TRACING}, Endpoint=${SIGNOZ_ENDPOINT}, SigNoz=${SIGNOZ_HOST}:${SIGNOZ_PORT}"
echo "🔔 Push Notifications: VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY:0:10}..."

# Verify the nginx template exists
if [ ! -f /etc/nginx/conf.d/default.conf.template ]; then
    echo "❌ Error: nginx template not found at /etc/nginx/conf.d/default.conf.template"
    exit 1
fi

# Inject runtime configuration into index.html
echo "📝 Injecting runtime configuration into index.html..."
if [ -f /usr/share/nginx/html/index.html ]; then
  # Create config script with service metadata
  CONFIG_SCRIPT="<script>window.__APP_CONFIG__={enableTracing:${ENABLE_TRACING},signozEndpoint:'${SIGNOZ_ENDPOINT}',serviceName:'${SERVICE_NAME}',serviceVersion:'${SERVICE_VERSION}',vapidPublicKey:'${VAPID_PUBLIC_KEY}'};</script>"
  
  # Inject before closing </head> tag
  sed -i "s|</head>|${CONFIG_SCRIPT}</head>|" /usr/share/nginx/html/index.html
  echo "✅ Runtime configuration injected"
else
  echo "⚠️  Warning: index.html not found, skipping config injection"
fi

# Substitute environment variables in nginx config
envsubst '${BACKEND_HOST} ${BACKEND_PORT} ${SIGNOZ_HOST} ${SIGNOZ_PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

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