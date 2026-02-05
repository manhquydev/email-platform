#!/bin/bash
# =====================================================
# Backup All Script - Orchestrator
# =====================================================
# Runs all backup scripts and syncs to cloud

set -euo pipefail

BACKUP_LOG="${BACKUP_LOG:-/var/log/backup.log}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PUSHGATEWAY_URL="${PUSHGATEWAY_URL:-http://pushgateway:9091}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$BACKUP_LOG"
}

push_metric() {
  local service=$1
  local status=$2
  local duration=$3
  local size=$4

  curl -s --data-binary @- "${PUSHGATEWAY_URL}/metrics/job/backup/service/${service}" <<EOF
backup_success{service="${service}"} ${status}
backup_duration_seconds{service="${service}"} ${duration}
backup_timestamp{service="${service}"} $(date +%s)
backup_size_bytes{service="${service}"} ${size}
EOF
}

START_TIME=$(date +%s)

log "Starting backup batch: $TIMESTAMP"

# PostgreSQL backup
log "=== PostgreSQL Backup ==="
PG_START=$(date +%s)
if /scripts/backup/postgres-backup.sh; then
  PG_DURATION=$(($(date +%s) - PG_START))
  log "PostgreSQL backup: SUCCESS (${PG_DURATION}s)"
  push_metric "postgres" 1 $PG_DURATION 0
else
  PG_DURATION=$(($(date +%s) - PG_START))
  log "PostgreSQL backup: FAILED"
  push_metric "postgres" 0 $PG_DURATION 0
fi

# Redis backup
log "=== Redis Backup ==="
REDIS_START=$(date +%s)
if /scripts/backup/redis-backup.sh; then
  REDIS_DURATION=$(($(date +%s) - REDIS_START))
  log "Redis backup: SUCCESS (${REDIS_DURATION}s)"
  push_metric "redis" 1 $REDIS_DURATION 0
else
  REDIS_DURATION=$(($(date +%s) - REDIS_START))
  log "Redis backup: FAILED"
  push_metric "redis" 0 $REDIS_DURATION 0
fi

# Storage backup
log "=== Storage Backup ==="
STORAGE_START=$(date +%s)
if /scripts/backup/storage-backup.sh; then
  STORAGE_DURATION=$(($(date +%s) - STORAGE_START))
  log "Storage backup: SUCCESS (${STORAGE_DURATION}s)"
  push_metric "storage" 1 $STORAGE_DURATION 0
else
  STORAGE_DURATION=$(($(date +%s) - STORAGE_START))
  log "Storage backup: FAILED"
  push_metric "storage" 0 $STORAGE_DURATION 0
fi

# Google Drive sync
log "=== Google Drive Sync ==="
GDRIVE_START=$(date +%s)
if /scripts/backup/storage-sync-gdrive.sh; then
  GDRIVE_DURATION=$(($(date +%s) - GDRIVE_START))
  log "GDrive sync: SUCCESS (${GDRIVE_DURATION}s)"
else
  log "GDrive sync: FAILED"
fi

TOTAL_DURATION=$(($(date +%s) - START_TIME))
log "Backup batch complete: ${TOTAL_DURATION}s"
