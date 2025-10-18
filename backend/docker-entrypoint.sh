#!/bin/sh
set -e

# First run initialization process
if [ "$FIRST_RUN" = "true" ]; then
  echo "🚀 FIRST_RUN=true detected, starting initialization process..."
  
  # Step 1: Populate database (creates schema + sample data)
  echo "📦 Step 1: Populating database with sample data..."
  if ! npm run populate; then
    echo "❌ Population failed!"
    exit 1
  fi
  echo "✅ Population complete"
  
  # Step 2: Run migrations (adds custom fields)
  echo "🔧 Step 2: Running migrations to add custom fields..."
  if ! npm run migration:run; then
    echo "❌ Migrations failed!"
    exit 1
  fi
  echo "✅ Migrations complete"
  
  # Step 3: Shutdown gracefully - DO NOT START VENDURE SERVER
  echo "✅ First run initialization complete!"
  echo "🔄 Please set FIRST_RUN=false and restart the container"
  echo "🚫 Vendure server will NOT start during FIRST_RUN=true"
  exit 0
fi


# Start the application
echo "🚀 Starting Vendure server and worker..."
exec npm run start

