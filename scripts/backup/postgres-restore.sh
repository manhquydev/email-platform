#!/bin/bash
# =====================================================
# PostgreSQL Restore Script
# =====================================================
# Restores PostgreSQL from backup
# Usage: ./postgres-restore.sh <backup_file.sql.gz or backup_file.sql.gz.gpg>

set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-email-platform-postgres-1}"
DB_NAME="${DB_NAME:-email_service}"
RESTORED_DB_NAME="${DB_NAME}_restored"

if [ $# -eq 0 ]; then
  echo "Usage: $0 <backup_file.sql.gz or backup_file.sql.gz.gpg>"
  echo ""
  echo "Examples:"
  echo "  $0 /backups/postgres/daily/email_service_20260205_020000.sql.gz"
  echo "  $0 /backups/postgres/encrypted/email_service_20260205_020000.sql.gz.gpg"
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

# Check if encrypted
if [[ "$BACKUP_FILE" == *.gpg ]]; then
  log "Decrypting backup..."
  TEMP_FILE=$(mktemp --suffix=.sql.gz)
  gpg --decrypt --output "$TEMP_FILE" "$BACKUP_FILE"
  BACKUP_FILE="$TEMP_FILE"
fi

# Confirm restore
log "WARNING: This will create a new database '${RESTORED_DB_NAME}' from backup."
log "After verification, you can swap it with the original database."
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  log "Restore aborted"
  [ -n "${TEMP_FILE:-}" ] && rm -f "$TEMP_FILE"
  exit 1
fi

# Drop restored database if exists
log "Dropping existing ${RESTORED_DB_NAME} if present..."
docker exec "$CONTAINER_NAME" psql -U postgres -c "DROP DATABASE IF EXISTS ${RESTORED_DB_NAME};" 2>/dev/null || true

# Create new database
log "Creating database ${RESTORED_DB_NAME}..."
docker exec "$CONTAINER_NAME" psql -U postgres -c "CREATE DATABASE ${RESTORED_DB_NAME};"

# Restore backup
log "Restoring backup to ${RESTORED_DB_NAME}..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U postgres -d "$RESTORED_DB_NAME"

# Cleanup temp file
[ -n "${TEMP_FILE:-}" ] && rm -f "$TEMP_FILE"

log "Restore complete to ${RESTORED_DB_NAME}"
log ""
log "To verify:"
log "  docker exec $CONTAINER_NAME psql -U postgres -d ${RESTORED_DB_NAME} -c '\dt'"
log ""
log "To swap databases (after verification):"
log "  docker stop email-platform-api-1"
log "  docker exec $CONTAINER_NAME psql -U postgres -c \"ALTER DATABASE ${DB_NAME} RENAME TO ${DB_NAME}_old;\""
log "  docker exec $CONTAINER_NAME psql -U postgres -c \"ALTER DATABASE ${RESTORED_DB_NAME} RENAME TO ${DB_NAME};\""
log "  docker start email-platform-api-1"
