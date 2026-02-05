#!/bin/bash
# =====================================================
# PostgreSQL Backup Script
# =====================================================
# Backs up PostgreSQL database with GPG encryption
# Usage: ./postgres-backup.sh [--cluster]

set -euo pipefail

# Configuration
CONTAINER_NAME="${CONTAINER_NAME:-email-platform-postgres-1}"
BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
RETENTION_DAYS=${RETENTION_DAYS:-7}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
GPG_RECIPIENT="${GPG_RECIPIENT:-manhquydev@gmail.com}"
DB_NAME="${DB_NAME:-email_service}"

# Backup directories
DAILY_DIR="${BACKUP_DIR}/daily"
WEEKLY_DIR="${BACKUP_DIR}/weekly"
ENCRYPTED_DIR="${BACKUP_DIR}/encrypted"

mkdir -p "$DAILY_DIR" "$WEEKLY_DIR" "$ENCRYPTED_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# Check if cluster backup requested
if [ "${1:-}" = "--cluster" ]; then
  log "Creating cluster-wide backup..."
  BACKUP_FILE="${WEEKLY_DIR}/cluster_${TIMESTAMP}.sql.gz"
  docker exec "$CONTAINER_NAME" pg_dumpall -U postgres | gzip > "$BACKUP_FILE"
else
  log "Creating database backup for ${DB_NAME}..."
  BACKUP_FILE="${DAILY_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
  docker exec "$CONTAINER_NAME" pg_dump -U postgres -d "$DB_NAME" | gzip > "$BACKUP_FILE"
fi

# Verify backup was created
if [ ! -s "$BACKUP_FILE" ]; then
  log "ERROR: Backup file is empty or was not created"
  exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Backup created: $BACKUP_FILE ($BACKUP_SIZE)"

# Encrypt with GPG
log "Encrypting backup..."
ENCRYPTED_FILE="${ENCRYPTED_DIR}/$(basename "$BACKUP_FILE").gpg"
gpg --encrypt --recipient "$GPG_RECIPIENT" --output "$ENCRYPTED_FILE" "$BACKUP_FILE"

if [ -f "$ENCRYPTED_FILE" ]; then
  # Remove unencrypted backup after successful encryption
  rm -f "$BACKUP_FILE"
  ENCRYPTED_SIZE=$(du -h "$ENCRYPTED_FILE" | cut -f1)
  log "Encrypted backup: $ENCRYPTED_FILE ($ENCRYPTED_SIZE)"
else
  log "WARNING: Encryption failed, keeping unencrypted backup"
fi

# Cleanup old backups
log "Cleaning up old backups..."
find "$DAILY_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$ENCRYPTED_DIR" -name "*.sql.gz.gpg" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$WEEKLY_DIR" -name "cluster_*.sql.gz" -mtime +28 -delete 2>/dev/null || true

log "PostgreSQL backup complete"
