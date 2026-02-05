#!/bin/bash
# =====================================================
# Google Drive Sync Script
# =====================================================
# Syncs encrypted backups to Google Drive via rclone

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive}"
RCLONE_PATH="${RCLONE_PATH:-ephemera-backups}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "Syncing encrypted backups to Google Drive..."

# Sync PostgreSQL backups
if [ -d "${BACKUP_DIR}/postgres/encrypted" ]; then
  log "Syncing PostgreSQL backups..."
  rclone sync "${BACKUP_DIR}/postgres/encrypted" \
    "${RCLONE_REMOTE}:${RCLONE_PATH}/postgres/" \
    --progress \
    --transfers 4 \
    --checkers 8 \
    --delete-after || log "WARNING: PostgreSQL sync failed"
fi

# Sync storage backups
if [ -d "${BACKUP_DIR}/storage/encrypted" ]; then
  log "Syncing storage backups..."
  rclone sync "${BACKUP_DIR}/storage/encrypted" \
    "${RCLONE_REMOTE}:${RCLONE_PATH}/storage/" \
    --progress \
    --transfers 4 \
    --checkers 8 \
    --delete-after || log "WARNING: Storage sync failed"
fi

# Sync Redis backups (optional - not encrypted)
if [ -d "${BACKUP_DIR}/redis" ]; then
  log "Syncing Redis backups..."
  rclone sync "${BACKUP_DIR}/redis" \
    "${RCLONE_REMOTE}:${RCLONE_PATH}/redis/" \
    --progress \
    --transfers 4 \
    --checkers 8 \
    --delete-after || log "WARNING: Redis sync failed"
fi

log "Google Drive sync complete"
