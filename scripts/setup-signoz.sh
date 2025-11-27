#!/bin/bash
set -e

# SigNoz Setup Automation Script
# This script automates all manual steps needed to get SigNoz operational

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.services.yml"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Ensure network exists
log_info "Step 1: Checking Docker network..."
if ! docker network inspect dukarun_services_network >/dev/null 2>&1; then
    log_info "Creating dukarun_services_network..."
    docker network create dukarun_services_network
    log_info "Network created successfully"
else
    log_info "Network already exists"
fi

# Step 2: Start ClickHouse
log_info "Step 2: Starting ClickHouse..."
cd "$PROJECT_ROOT"
docker compose -f "$COMPOSE_FILE" up -d signoz-clickhouse

# Step 3: Wait for ClickHouse to be healthy
log_info "Step 3: Waiting for ClickHouse to be healthy..."
MAX_WAIT=120
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if docker compose -f "$COMPOSE_FILE" ps signoz-clickhouse | grep -q "healthy"; then
        log_info "ClickHouse is healthy"
        break
    fi
    sleep 2
    WAIT_COUNT=$((WAIT_COUNT + 2))
    if [ $((WAIT_COUNT % 10)) -eq 0 ]; then
        log_info "Still waiting for ClickHouse... (${WAIT_COUNT}s)"
    fi
done

if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
    log_error "ClickHouse failed to become healthy within ${MAX_WAIT}s"
    exit 1
fi

# Step 4: Create databases
log_info "Step 4: Creating SigNoz databases in ClickHouse..."
docker compose -f "$COMPOSE_FILE" exec -T signoz-clickhouse clickhouse-client --query "
CREATE DATABASE IF NOT EXISTS signoz_traces;
CREATE DATABASE IF NOT EXISTS signoz_metrics;
CREATE DATABASE IF NOT EXISTS signoz_logs;
CREATE DATABASE IF NOT EXISTS signoz_meter;
" 2>&1

if [ $? -eq 0 ]; then
    log_info "Databases created successfully"
else
    log_error "Failed to create databases"
    exit 1
fi

# Verify databases
log_info "Verifying databases..."
DATABASES=$(docker compose -f "$COMPOSE_FILE" exec -T signoz-clickhouse clickhouse-client --query "SELECT name FROM system.databases WHERE name LIKE 'signoz%' ORDER BY name;" 2>/dev/null)
if echo "$DATABASES" | grep -q "signoz_traces" && \
   echo "$DATABASES" | grep -q "signoz_metrics" && \
   echo "$DATABASES" | grep -q "signoz_logs" && \
   echo "$DATABASES" | grep -q "signoz_meter"; then
    log_info "All databases verified:"
    echo "$DATABASES" | sed 's/^/  - /'
else
    log_error "Database verification failed"
    exit 1
fi

# Step 5: Start SigNoz UI
log_info "Step 5: Starting SigNoz UI..."
docker compose -f "$COMPOSE_FILE" up -d signoz

# Step 6: Wait for SigNoz UI to be healthy
log_info "Step 6: Waiting for SigNoz UI to be healthy..."
MAX_WAIT=180
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    HEALTH=$(curl -s http://localhost:8080/api/v1/health 2>/dev/null || echo "")
    if echo "$HEALTH" | grep -q '"status":"ok"'; then
        log_info "SigNoz UI is healthy"
        break
    fi
    sleep 3
    WAIT_COUNT=$((WAIT_COUNT + 3))
    if [ $((WAIT_COUNT % 15)) -eq 0 ]; then
        log_info "Still waiting for SigNoz UI... (${WAIT_COUNT}s)"
    fi
done

if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
    log_error "SigNoz UI failed to become healthy within ${MAX_WAIT}s"
    log_warn "Checking logs..."
    docker compose -f "$COMPOSE_FILE" logs signoz --tail 20
    exit 1
fi

# Step 7: Start OTel Collector
log_info "Step 7: Starting OTel Collector..."
docker compose -f "$COMPOSE_FILE" up -d signoz-otel-collector

# Step 8: Wait for OTel Collector to be ready
log_info "Step 8: Waiting for OTel Collector to be ready..."
sleep 10

# Step 9: Verify endpoints
log_info "Step 9: Verifying endpoints..."

# Check SigNoz UI
if curl -s http://localhost:8080/api/v1/health | grep -q '"status":"ok"'; then
    log_info "✅ SigNoz UI: http://localhost:8080 - OK"
else
    log_error "❌ SigNoz UI health check failed"
    exit 1
fi

# Check OTLP HTTP endpoint
OTLP_RESPONSE=$(curl -s -X POST http://localhost:4318/v1/traces \
    -H "Content-Type: application/json" \
    -d '{}' 2>&1)
if echo "$OTLP_RESPONSE" | grep -q "partialSuccess\|{}"; then
    log_info "✅ OTLP HTTP (4318): Accepting traces"
else
    log_warn "⚠️  OTLP HTTP endpoint may not be fully ready yet"
fi

# Check OTLP gRPC port (just check if it's listening)
if docker compose -f "$COMPOSE_FILE" ps signoz-otel-collector | grep -q "4317"; then
    log_info "✅ OTLP gRPC (4317): Port exposed"
else
    log_warn "⚠️  OTLP gRPC port not found"
fi

# Final status
log_info ""
log_info "=== Setup Complete ==="
log_info ""
log_info "Services Status:"
docker compose -f "$COMPOSE_FILE" ps signoz signoz-otel-collector signoz-clickhouse --format "table {{.Service}}\t{{.Status}}" | grep -E "SERVICE|signoz"
log_info ""
log_info "Access SigNoz UI at: http://localhost:8080"
log_info ""
log_info "Configuration:"
log_info "  - Frontend: nginx -> /signoz/ -> signoz-otel-collector:4318"
log_info "  - Backend: signoz-otel-collector:4317 (gRPC)"
log_info "  - Collector: -> ClickHouse (all databases ready)"

