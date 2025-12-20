#!/bin/bash

# =============================================================================
# UPDATE.SH - Script cập nhật triệt để cho Email Platform
# =============================================================================
# Xử lý tất cả các lỗi thường gặp khi update code mới:
# - Database migrations
# - Container rebuild
# - Network issues
# - Orphan containers
#
# Usage: ./scripts/update.sh [options]
#   --skip-pull     Bỏ qua git pull (nếu đã pull thủ công)
#   --force-rebuild Rebuild toàn bộ image (không dùng cache)
#   --dry-run       Chỉ hiển thị các bước, không thực thi
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Config
COMPOSE_FILE="docker-compose.prod.yml"
API_CONTAINER="email-platform-api-1"
MIN_NODE_VERSION=20

# Parse arguments
SKIP_PULL=false
FORCE_REBUILD=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-pull) SKIP_PULL=true; shift ;;
        --force-rebuild) FORCE_REBUILD=true; shift ;;
        --dry-run) DRY_RUN=true; shift ;;
        *) echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
    esac
done

# Helper functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() { echo -e "\n${GREEN}═══════════════════════════════════════════════════════════${NC}"; echo -e "${GREEN}📌 STEP: $1${NC}"; echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"; }

run_cmd() {
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY-RUN] Would execute: $*${NC}"
    else
        "$@"
    fi
}

# =============================================================================
# PRE-FLIGHT CHECKS
# =============================================================================
log_step "Pre-flight Checks"

# Check if docker-compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "File $COMPOSE_FILE not found! Make sure you're in the project root."
    exit 1
fi
log_success "Found $COMPOSE_FILE"

# Check Docker daemon
if ! docker info &>/dev/null; then
    log_error "Docker daemon is not running!"
    exit 1
fi
log_success "Docker is running"

# Check Docker Compose
if ! docker compose version &>/dev/null; then
    log_error "Docker Compose not available!"
    exit 1
fi
log_success "Docker Compose is available"

# =============================================================================
# STEP 1: PULL LATEST CODE
# =============================================================================
log_step "1/7 - Pull Latest Code"

if [ "$SKIP_PULL" = true ]; then
    log_warning "Skipping git pull (--skip-pull flag)"
else
    log_info "Fetching latest code from git..."
    run_cmd git fetch origin
    
    # Check if there are changes
    LOCAL=$(git rev-parse @)
    REMOTE=$(git rev-parse @{u})
    
    if [ "$LOCAL" = "$REMOTE" ]; then
        log_info "Already up to date, but continuing with deployment..."
    else
        run_cmd git pull origin main
        log_success "Code updated"
    fi
fi

# =============================================================================
# STEP 2: CLEANUP ORPHAN CONTAINERS & NETWORKS
# =============================================================================
log_step "2/7 - Cleanup Orphans & Network Issues"

log_info "Removing orphan containers..."
run_cmd docker compose -f $COMPOSE_FILE down --remove-orphans 2>/dev/null || true

log_info "Pruning unused networks (except named volumes)..."
run_cmd docker network prune -f 2>/dev/null || true

log_success "Cleanup completed"

# =============================================================================
# STEP 3: REBUILD IMAGES
# =============================================================================
log_step "3/7 - Rebuild Container Images"

if [ "$FORCE_REBUILD" = true ]; then
    log_info "Force rebuilding all images (no cache)..."
    run_cmd docker compose -f $COMPOSE_FILE build --no-cache
else
    log_info "Rebuilding changed images..."
    run_cmd docker compose -f $COMPOSE_FILE build
fi

log_success "Images rebuilt"

# =============================================================================
# STEP 4: START ALL SERVICES
# =============================================================================
log_step "4/7 - Start All Services"

log_info "Starting services in correct order..."
run_cmd docker compose -f $COMPOSE_FILE up -d

log_info "Waiting for services to stabilize (15s)..."
if [ "$DRY_RUN" = false ]; then
    sleep 15
fi

log_success "All services started"

# =============================================================================
# STEP 5: VERIFY NETWORK CONNECTIVITY
# =============================================================================
log_step "5/7 - Verify Network Connectivity"

if [ "$DRY_RUN" = false ]; then
    # Get API container name dynamically
    API_CONTAINER=$(docker compose -f $COMPOSE_FILE ps --format '{{.Name}}' | grep api || echo "")
    
    if [ -z "$API_CONTAINER" ]; then
        log_error "API container not found!"
        exit 1
    fi
    
    log_info "Testing connectivity from API container..."
    
    # Test PostgreSQL
    if docker exec "$API_CONTAINER" sh -c "nc -z postgres 5432" 2>/dev/null; then
        log_success "PostgreSQL: reachable"
    else
        log_warning "PostgreSQL: not reachable, waiting 10s..."
        sleep 10
    fi
    
    # Test Redis
    if docker exec "$API_CONTAINER" sh -c "nc -z redis 6379" 2>/dev/null; then
        log_success "Redis: reachable"
    else
        log_warning "Redis: not reachable, restarting network..."
        docker compose -f $COMPOSE_FILE restart redis
        sleep 5
    fi
else
    log_info "[DRY-RUN] Would verify network connectivity"
fi

# =============================================================================
# STEP 6: RUN DATABASE MIGRATIONS
# =============================================================================
log_step "6/7 - Database Migrations"

if [ "$DRY_RUN" = false ]; then
    API_CONTAINER=$(docker compose -f $COMPOSE_FILE ps --format '{{.Name}}' | grep api || echo "")
    
    log_info "Running Prisma migrations inside container..."
    
    # Check Node.js version in container
    NODE_VERSION=$(docker exec "$API_CONTAINER" node -v 2>/dev/null | sed 's/v//' | cut -d. -f1 || echo "0")
    
    if [ "$NODE_VERSION" -lt "$MIN_NODE_VERSION" ]; then
        log_error "Node.js version $NODE_VERSION is too old! Prisma requires Node.js >= $MIN_NODE_VERSION"
        log_error "Please rebuild the API image with a newer Node.js version"
        exit 1
    fi
    log_success "Node.js version: v$NODE_VERSION (OK)"
    
    # Run migrations
    if docker exec "$API_CONTAINER" npx prisma migrate deploy; then
        log_success "Migrations applied successfully"
    else
        log_error "Migration failed!"
        log_info "Showing migration status..."
        docker exec "$API_CONTAINER" npx prisma migrate status || true
        exit 1
    fi
else
    log_info "[DRY-RUN] Would run: docker exec <api> npx prisma migrate deploy"
fi

# =============================================================================
# STEP 7: FINAL RESTART & HEALTH CHECK
# =============================================================================
log_step "7/7 - Final Restart & Health Check"

log_info "Restarting API to pick up schema changes..."
run_cmd docker compose -f $COMPOSE_FILE restart api

if [ "$DRY_RUN" = false ]; then
    log_info "Waiting for API health check (10s)..."
    sleep 10
    
    # Health check
    API_STATUS=$(docker compose -f $COMPOSE_FILE ps --format '{{.Status}}' api 2>/dev/null | head -1)
    
    if [[ "$API_STATUS" == *"Up"* ]]; then
        log_success "API is healthy: $API_STATUS"
    else
        log_warning "API status: $API_STATUS"
        log_info "Showing API logs..."
        docker compose -f $COMPOSE_FILE logs --tail=20 api
    fi
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 UPDATE COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Services status:"
if [ "$DRY_RUN" = false ]; then
    docker compose -f $COMPOSE_FILE ps
fi
echo ""
echo -e "${BLUE}Endpoints:${NC}"
echo "   - Web:  https://app.manhquy.click"
echo "   - API:  https://api.manhquy.click"
echo "   - Health: https://api.manhquy.click/health"
echo ""
echo -e "${YELLOW}Quick Commands:${NC}"
echo "   - View logs:    docker compose -f $COMPOSE_FILE logs -f api"
echo "   - Restart API:  docker compose -f $COMPOSE_FILE restart api"
echo "   - Full restart: docker compose -f $COMPOSE_FILE restart"
