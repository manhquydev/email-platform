#!/bin/bash
# =====================================================
# Redis Backup Script
# =====================================================
# Backs up Redis RDB snapshot and AOF log

set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-email-platform-redis-1}"
BACKUP_DIR="${BACKUP_DIR:-/backups/redis}"
RETENTION_DAYS=${RETENTION_DAYS:-7}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "Triggering BGSAVE..."

# Get LASTSAVE before BGSAVE
LASTSAVE_BEFORE=$(docker exec "$CONTAINER_NAME" redis-cli LASTSAVE 2>/dev/null || echo "0")

# Trigger background save
docker exec "$CONTAINER_NAME" redis-cli BGSAVE > /dev/null

# Wait for BGSAVE to complete (max 60 seconds)
for i in {1..30}; do
  LASTSAVE_AFTER=$(docker exec "$CONTAINER_NAME" redis-cli LASTSAVE 2>/dev/null || echo "0")
  if [ "$LASTSAVE_AFTER" != "$LASTSAVE_BEFORE" ]; then
    log "BGSAVE completed"
    break
  fi
  sleep 2
done

# Copy RDB file
log "Copying RDB file..."
docker cp "$CONTAINER_NAME:/data/dump.rdb" "$BACKUP_DIR/dump_${TIMESTAMP}.rdb"

RDB_SIZE=$(du -h "$BACKUP_DIR/dump_${TIMESTAMP}.rdb" | cut -f1)
log "RDB backup: $BACKUP_DIR/dump_${TIMESTAMP}.rdb ($RDB_SIZE)"

# Copy AOF file if exists
if docker exec "$CONTAINER_NAME" test -f /data/appendonly.aof 2>/dev/null; then
  log "Copying AOF file..."
  docker cp "$CONTAINER_NAME:/data/appendonly.aof" "$BACKUP_DIR/appendonly_${TIMESTAMP}.aof"
  AOF_SIZE=$(du -h "$BACKUP_DIR/appendonly_${TIMESTAMP}.aof" | cut -f1)
  log "AOF backup: $BACKUP_DIR/appendonly_${TIMESTAMP}.aof ($AOF_SIZE)"
fi

# Cleanup old backups
log "Cleaning up old backups..."
find "$BACKUP_DIR" -name "dump_*.rdb" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "appendonly_*.aof" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

log "Redis backup complete"
