#!/bin/bash
# Cloud Backup Script - Google Drive
# Backs up PostgreSQL and Redis to Google Drive via rclone

set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/app/backups"
LOG_FILE="/var/log/cloud-backup.log"
REMOTE="gdrive:email-platform-backups"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log "=== Starting cloud backup ==="

# Find postgres container
POSTGRES_CONTAINER=$(docker ps --format '{{.Names}}' | grep postgres | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    log "ERROR: PostgreSQL container not found"
    exit 1
fi

log "Found PostgreSQL container: ${POSTGRES_CONTAINER}"

# PostgreSQL Backup
log "Creating PostgreSQL backup..."
PG_BACKUP="${BACKUP_DIR}/backup_postgres_${TIMESTAMP}.sql.gz"
docker exec "${POSTGRES_CONTAINER}" pg_dump -U postgres -d email_service | gzip > "${PG_BACKUP}"
log "PostgreSQL backup created: ${PG_BACKUP} ($(du -h "${PG_BACKUP}" | cut -f1))"

# Upload PostgreSQL to cloud
log "Uploading PostgreSQL backup to cloud..."
rclone copy "${PG_BACKUP}" "${REMOTE}/postgres/" --progress
log "PostgreSQL backup uploaded to ${REMOTE}/postgres/"

# Redis Backup (if redis container exists)
REDIS_CONTAINER=$(docker ps --format '{{.Names}}' | grep redis | head -1)

if [ -n "$REDIS_CONTAINER" ]; then
    log "Found Redis container: ${REDIS_CONTAINER}"

    # Trigger BGSAVE and wait
    docker exec "${REDIS_CONTAINER}" redis-cli BGSAVE || true
    sleep 3

    # Copy RDB file
    REDIS_BACKUP="${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"
    docker exec "${REDIS_CONTAINER}" cat /data/dump.rdb > "${REDIS_BACKUP}" 2>/dev/null || true

    if [ -s "${REDIS_BACKUP}" ]; then
        log "Redis backup created: ${REDIS_BACKUP} ($(du -h "${REDIS_BACKUP}" | cut -f1))"

        # Upload Redis to cloud
        log "Uploading Redis backup to cloud..."
        rclone copy "${REDIS_BACKUP}" "${REMOTE}/redis/" --progress
        log "Redis backup uploaded to ${REMOTE}/redis/"
    else
        log "WARNING: Redis backup is empty or failed"
        rm -f "${REDIS_BACKUP}"
    fi
else
    log "WARNING: Redis container not found, skipping Redis backup"
fi

# Cleanup old local backups (keep last 7 days)
log "Cleaning up old local backups..."
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +7 -delete 2>/dev/null || true
find "${BACKUP_DIR}" -name "*.rdb" -mtime +7 -delete 2>/dev/null || true

# Cleanup old cloud backups (keep last 30 days)
log "Cleaning up old cloud backups..."
rclone delete "${REMOTE}/postgres/" --min-age 30d 2>/dev/null || true
rclone delete "${REMOTE}/redis/" --min-age 30d 2>/dev/null || true

log "=== Cloud backup completed successfully ==="
log "Local: ${BACKUP_DIR}"
log "Cloud: ${REMOTE}"

exit 0
