#!/bin/bash
# =====================================================
# Migration Script: Bind Mounts to Named Volumes
# =====================================================
# This script migrates data from local directories (bind mounts)
# to Docker Named Volumes.
#
# TARGETS:
# 1. ./postgres-data -> email_postgres_data
# 2. ./services/api/storage -> email_storage
#
# USAGE:
# ./scripts/migrate-to-volumes.sh

set -e

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${PROJECT_DIR}/migration_backup_${TIMESTAMP}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# 1. Safety Check
log "Starting migration safety checks..."
if [ ! -f "${PROJECT_DIR}/docker-compose.yml" ]; then
    error "docker-compose.yml not found in ${PROJECT_DIR}"
fi

# 2. Backup
log "Creating local file backup before migration..."
mkdir -p "$BACKUP_DIR"

if [ -d "${PROJECT_DIR}/postgres-data" ]; then
    log "Backing up postgres-data to ${BACKUP_DIR}/postgres-data..."
    cp -r "${PROJECT_DIR}/postgres-data" "${BACKUP_DIR}/"
else
    warn "postgres-data directory not found. Skipping Postgres backup."
fi

if [ -d "${PROJECT_DIR}/services/api/storage" ]; then
    log "Backing up api/storage to ${BACKUP_DIR}/storage..."
    cp -r "${PROJECT_DIR}/services/api/storage" "${BACKUP_DIR}/"
else
    warn "services/api/storage directory not found. Skipping storage backup."
fi

# 3. Stop Services
log "Stopping Docker containers..."
docker compose down

# 4. Create Volumes
log "Creating Docker Named Volumes..."
docker volume create email_postgres_data || true
docker volume create email_storage || true

# 5. Migrate Data
# Helper function to migrate directory to volume
migrate_data() {
    local src_dir="$1"
    local vol_name="$2"

    if [ -d "$src_dir" ] && [ "$(ls -A "$src_dir")" ]; then
        log "Migrating $src_dir to volume $vol_name..."
        docker run --rm \
            -v "$src_dir":/source \
            -v "$vol_name":/target \
            alpine ash -c "cp -av /source/. /target/"
        log "Migration to $vol_name complete."
    else
        warn "Source $src_dir is empty or missing. Nothing to migrate to $vol_name."
    fi
}

migrate_data "${PROJECT_DIR}/postgres-data" "email_postgres_data"
migrate_data "${PROJECT_DIR}/services/api/storage" "email_storage"

# 6. Next Steps
echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN} MIGRATION DATA COPY COMPLETE ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo "Next steps:"
echo "1. Verify the 'migration_backup_*' folder contains your data."
echo "2. Update your docker-compose.yml to use the new volumes:"
echo "   - postgres: volumes: - email_postgres_data:/var/lib/postgresql/data"
echo "   - api: volumes: - email_storage:/app/storage"
echo "3. Run 'docker compose up -d'"
echo ""
echo "Backup location: ${BACKUP_DIR}"
