#!/bin/bash
# =====================================================
# Redis Restore Script
# =====================================================
# Restores Redis from RDB backup

set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-email-platform-redis-1}"

if [ $# -eq 0 ]; then
  echo "Usage: $0 <dump_file.rdb>"
  echo ""
  echo "Example:"
  echo "  $0 /backups/redis/dump_20260205_020000.rdb"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "WARNING: This will replace all Redis data!"
log "Sessions, queues, and cache will be restored from backup."
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  log "Restore aborted"
  exit 1
fi

# Stop container
log "Stopping Redis container..."
docker stop "$CONTAINER_NAME"

# Backup current data
log "Backing up current data..."
CURRENT_BACKUP="/tmp/dump_rdb_backup_$(date +%s).rdb"
docker cp "$CONTAINER_NAME:/data/dump.rdb" "$CURRENT_BACKUP" 2>/dev/null || true
log "Current data backed up to: $CURRENT_BACKUP"

# Copy backup file to container
log "Restoring from backup..."
docker cp "$BACKUP_FILE" "$CONTAINER_NAME:/data/dump.rdb"

# Start container
log "Starting Redis container..."
docker start "$CONTAINER_NAME"

# Wait and verify
sleep 5
if docker exec "$CONTAINER_NAME" redis-cli PING > /dev/null 2>&1; then
  log "Restore complete. Redis is responding."
else
  log "ERROR: Redis not responding after restore"
  log "You may need to restore from backup: $CURRENT_BACKUP"
  exit 1
fi
