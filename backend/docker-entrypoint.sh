#!/bin/sh
set -e

# If RUN_POPULATE is set to "true", run populate first
if [ "$RUN_POPULATE" = "true" ]; then
  echo "🌱 RUN_POPULATE=true detected, populating database..."
  npm run populate
  echo "✅ Population complete"
fi

# Start the application
echo "🚀 Starting Vendure server and worker..."
exec npm run start

