#!/bin/bash
# =====================================================
# Email Storage Restore Script
# =====================================================
# Restores email storage from encrypted backup

set -euo pipefail

VOLUME_NAME="${VOLUME_NAME:-email_storage}"
API_CONTAINER="${API_CONTAINER:-email-platform-api-1}"

if [ $# -eq 0 ]; then
  echo "Usage: $0 <backup_file.tar.gz.gpg>"
  echo ""
  echo "Example:"
  echo "  $0 /backups/storage/encrypted/storage_20260205.tar.gz.gpg"
  exit 1
fi

ENCRYPTED_FILE="$1"

if [ ! -f "$ENCRYPTED_FILE" ]; then
  echo "ERROR: Backup file not found: $ENCRYPTED_FILE"
  exit 1
fi

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "WARNING: This will replace all email attachments!"
log "Current storage volume will be overwritten."
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  log "Aborted"
  exit 1
fi

# Decrypt
log "Decrypting backup..."
TEMP_FILE=$(mktemp --suffix=.tar.gz)
gpg --decrypt --output "$TEMP_FILE" "$ENCRYPTED_FILE"

# Stop API container (prevent writes during restore)
log "Stopping API container..."
docker stop "$API_CONTAINER" 2>/dev/null || true

# Restore to volume
log "Restoring to volume..."
docker run --rm \
  -v "${VOLUME_NAME}:/data" \
  -v "$TEMP_FILE:/backup.tar.gz:ro" \
  alpine:latest \
  tar xzf /backup.tar.gz -C /data

# Start API container
log "Starting API container..."
docker start "$API_CONTAINER" 2>/dev/null || true

# Cleanup
rm -f "$TEMP_FILE"

log "Storage restore complete"
log "Verify with: docker exec $API_CONTAINER ls -lh /app/storage/attachments/ | head -20"
