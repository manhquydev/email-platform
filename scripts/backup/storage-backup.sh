#!/bin/bash
# =====================================================
# Email Storage Backup Script
# =====================================================
# Backs up email storage volume with GPG encryption

set -euo pipefail

VOLUME_NAME="${VOLUME_NAME:-email_storage}"
BACKUP_DIR="${BACKUP_DIR:-/backups/storage}"
ENCRYPTED_DIR="${BACKUP_DIR}/encrypted"
RETENTION_DAYS=${RETENTION_DAYS:-7}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
GPG_RECIPIENT="${GPG_RECIPIENT:-manhquydev@gmail.com}"

mkdir -p "$BACKUP_DIR" "$ENCRYPTED_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "Backing up storage volume..."

# Create tar.gz backup using alpine container
BACKUP_FILE="${BACKUP_DIR}/storage_${TIMESTAMP}.tar.gz"
docker run --rm \
  -v "${VOLUME_NAME}:/data:ro" \
  -v "$BACKUP_DIR:/backup" \
  alpine:latest \
  tar czf "/backup/storage_${TIMESTAMP}.tar.gz" -C /data .

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Storage backup: $BACKUP_FILE ($BACKUP_SIZE)"

# Encrypt with GPG
log "Encrypting backup..."
ENCRYPTED_FILE="${ENCRYPTED_DIR}/storage_${TIMESTAMP}.tar.gz.gpg"
gpg --encrypt --recipient "$GPG_RECIPIENT" \
  --output "$ENCRYPTED_FILE" \
  "$BACKUP_FILE"

if [ -f "$ENCRYPTED_FILE" ]; then
  # Remove unencrypted backup after successful encryption
  rm -f "$BACKUP_FILE"
  ENCRYPTED_SIZE=$(du -h "$ENCRYPTED_FILE" | cut -f1)
  log "Encrypted backup: $ENCRYPTED_FILE ($ENCRYPTED_SIZE)"
else
  log "WARNING: Encryption failed, keeping unencrypted backup"
fi

# Cleanup old encrypted backups
find "$ENCRYPTED_DIR" -name "*.tar.gz.gpg" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

log "Storage backup complete"
