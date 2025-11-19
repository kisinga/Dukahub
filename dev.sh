#!/bin/bash

# =====================================
# Docker Supporting Services Startup Script
# =====================================
# Starts only the supporting infrastructure services from docker-compose.yml
# This allows backend and frontend to be run manually for local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Supporting services to start
SUPPORTING_SERVICES=(
  "postgres_db"
  "timescaledb_audit"
  "redis"
  "clickhouse"
  "signoz"
)

# Application services that should be stopped by default
APP_SERVICES=(
  "backend"
  "frontend"
)

# Script directory (project root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"

# Default behavior: stop app services
STOP_APP_SERVICES=true

# Function to print colored messages
print_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if docker is available
check_docker() {
  if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
  fi

  if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running"
    exit 1
  fi

  if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed or not in PATH"
    exit 1
  fi
}

# Function to check for .env file
check_env_file() {
  if [ ! -f "$ENV_FILE" ]; then
    print_warn ".env file not found at ${ENV_FILE}"
    print_warn "Docker Compose will use default values from docker-compose.yml"
    return 1
  else
    print_info ".env file found at ${ENV_FILE}"
    return 0
  fi
}

# Function to get docker compose command
get_compose_cmd() {
  if command -v docker compose &> /dev/null; then
    echo "docker compose"
  else
    echo "docker-compose"
  fi
}

# Function to wait for service health
wait_for_health() {
  local service=$1
  local compose_cmd=$(get_compose_cmd)
  local max_attempts=60
  local attempt=0

  print_info "Waiting for ${service} to be healthy..."

  while [ $attempt -lt $max_attempts ]; do
    # Get service status using docker compose ps
    local status_output=$($compose_cmd ps "$service" 2>/dev/null | grep -v "NAME" | grep "$service" || echo "")
    
    if [ -z "$status_output" ]; then
      attempt=$((attempt + 1))
      sleep 2
      continue
    fi

    # Check if service is healthy
    if echo "$status_output" | grep -q "healthy"; then
      print_info "${service} is healthy"
      return 0
    fi

    # Check if service is running but has no health check
    if echo "$status_output" | grep -q "Up" && ! echo "$status_output" | grep -q "health"; then
      print_info "${service} is running (no health check configured)"
      return 0
    fi

    # Check if service is starting (health: starting)
    if echo "$status_output" | grep -q "starting"; then
      attempt=$((attempt + 1))
      sleep 2
      continue
    fi

    # If service is up but unhealthy, wait a bit more
    if echo "$status_output" | grep -q "Up"; then
      attempt=$((attempt + 1))
      sleep 2
      continue
    fi

    attempt=$((attempt + 1))
    sleep 2
  done

  print_warn "${service} did not become healthy within timeout period"
  return 1
}

# Function to stop application services (backend and frontend)
stop_app_services() {
  local compose_cmd=$(get_compose_cmd)
  
  print_info "Stopping application services (backend and frontend)..."
  
  # Check which app services are currently running
  local running_services=()
  for service in "${APP_SERVICES[@]}"; do
    local status_output=$($compose_cmd ps "$service" 2>/dev/null | grep -v "NAME" | grep "$service" || echo "")
    if [ -n "$status_output" ] && echo "$status_output" | grep -q "Up"; then
      running_services+=("$service")
    fi
  done
  
  if [ ${#running_services[@]} -eq 0 ]; then
    print_info "No application services are currently running"
    return 0
  fi
  
  # Stop the running services (env file is optional for stop command)
  if [ -f "$ENV_FILE" ]; then
    $compose_cmd --env-file "$ENV_FILE" stop "${running_services[@]}"
  else
    $compose_cmd stop "${running_services[@]}"
  fi
  
  if [ $? -eq 0 ]; then
    print_info "Application services stopped successfully"
  else
    print_warn "Some application services may not have stopped cleanly"
  fi
  echo ""
}

# Function to start supporting services
start_services() {
  local compose_cmd=$(get_compose_cmd)
  local env_flag=""

  print_info "Starting supporting Docker services..."

  # Check for .env file
  if check_env_file; then
    env_flag="--env-file ${ENV_FILE}"
  fi

  # Check if docker-compose.yml exists
  if [ ! -f "$COMPOSE_FILE" ]; then
    print_error "docker-compose.yml not found at ${COMPOSE_FILE}"
    exit 1
  fi

  # Stop application services by default (unless overridden)
  if [ "$STOP_APP_SERVICES" = true ]; then
    stop_app_services
  else
    print_info "Skipping application services stop (--keep-apps flag set)"
    echo ""
  fi

  # Build the docker compose command
  local services_list="${SUPPORTING_SERVICES[*]}"
  
  print_info "Starting services: ${services_list}"

  # Start services
  if [ -n "$env_flag" ]; then
    $compose_cmd --env-file "$ENV_FILE" up -d "${SUPPORTING_SERVICES[@]}"
  else
    $compose_cmd up -d "${SUPPORTING_SERVICES[@]}"
  fi

  if [ $? -ne 0 ]; then
    print_error "Failed to start services"
    exit 1
  fi

  print_info "Services started successfully"
  echo ""

  # Wait for services to be healthy
  print_info "Waiting for services to become healthy..."
  local failed_services=()

  for service in "${SUPPORTING_SERVICES[@]}"; do
    if ! wait_for_health "$service"; then
      failed_services+=("$service")
    fi
  done

  echo ""
  if [ ${#failed_services[@]} -eq 0 ]; then
    print_info "All supporting services are ready!"
    print_info "You can now start backend and frontend manually"
  else
    print_warn "Some services may not be fully healthy: ${failed_services[*]}"
    print_warn "Check service status with: $compose_cmd ps"
  fi

  # Show service status
  echo ""
  print_info "Service status:"
  $compose_cmd ps "${SUPPORTING_SERVICES[@]}"
}

# Function to show usage
show_usage() {
  echo "Usage: $0 [start] [OPTIONS]"
  echo ""
  echo "Commands:"
  echo "  start    Start supporting Docker services (default)"
  echo ""
  echo "Options:"
  echo "  --keep-apps, -k    Keep backend and frontend services running (don't stop them)"
  echo "  --help, -h         Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0 start              Start supporting services and stop backend/frontend"
  echo "  $0 start --keep-apps  Start supporting services without stopping backend/frontend"
  echo "  $0 --keep-apps        Same as above (start is default)"
}

# Main function
main() {
  local command="start"
  local args=()
  
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      start)
        command="start"
        shift
        ;;
      --keep-apps|-k)
        STOP_APP_SERVICES=false
        shift
        ;;
      --help|-h)
        show_usage
        exit 0
        ;;
      *)
        # Unknown option or argument
        if [[ "$1" =~ ^- ]]; then
          print_error "Unknown option: $1"
          echo ""
          show_usage
          exit 1
        else
          # Treat as command if not already set
          if [ "$command" = "start" ] && [ "$1" != "start" ]; then
            command="$1"
          fi
          args+=("$1")
        fi
        shift
        ;;
    esac
  done

  case "$command" in
    start)
      check_docker
      start_services
      ;;
    *)
      print_error "Unknown command: $command"
      echo ""
      show_usage
      exit 1
      ;;
  esac
}

# Run main function
main "$@"

