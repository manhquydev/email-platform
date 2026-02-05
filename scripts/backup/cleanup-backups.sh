#!/bin/bash
# =====================================================
# Cleanup Old Backups Script
# =====================================================
# Enforces retention policies

set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/backups}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# PostgreSQL: 7 daily, 28 weekly
log "Cleaning PostgreSQL daily backups (7 days)..."
find "${BACKUP_ROOT}/postgres/daily" -name "*.sql.gz" -mtime +7 -delete 2>/dev/null || true
find "${BACKUP_ROOT}/postgres/daily" -name "*.sql.gz.gpg" -mtime +7 -delete 2>/dev/null || true

log "Cleaning PostgreSQL weekly backups (28 days)..."
find "${BACKUP_ROOT}/postgres/weekly" -name "cluster_*.sql.gz" -mtime +28 -delete 2>/dev/null || true

# Redis: 7 daily
log "Cleaning Redis backups (7 days)..."
find "${BACKUP_ROOT}/redis" -name "dump_*.rdb" -mtime +7 -delete 2>/dev/null || true
find "${BACKUP_ROOT}/redis" -name "appendonly_*.aof" -mtime +7 -delete 2>/dev/null || true

# Storage encrypted: 7 daily
log "Cleaning encrypted storage backups (7 days)..."
find "${BACKUP_ROOT}/storage/encrypted" -name "*.tar.gz.gpg" -mtime +7 -delete 2>/dev/null || true

log "Cleanup complete"
