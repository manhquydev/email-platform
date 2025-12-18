#!/bin/bash

# Storage Backup Script for TempMail Pro
# Backs up email storage directory (attachments, logs, etc.)
# Usage: ./scripts/backup-storage.sh [backup_name]

set -e

# Configuration
STORAGE_DIR="${STORAGE_DIR:-./storage}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Parse backup name if provided
BACKUP_NAME="${1:-storage_backup_${TIMESTAMP}}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Log function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

# Check if storage directory exists
if [ ! -d "$STORAGE_DIR" ]; then
    error "Storage directory not found: $STORAGE_DIR"
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup file paths
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
BACKUP_LOG="${BACKUP_DIR}/${BACKUP_NAME}.log"

# Start log
exec > >(tee -a "$BACKUP_LOG")
exec 2>&1

log "Starting storage backup..."
log "Storage directory: $STORAGE_DIR"
log "Backup file: $BACKUP_FILE"

# Get storage directory size before backup
STORAGE_SIZE=$(du -sh "$STORAGE_DIR" 2>/dev/null | cut -f1)
log "Storage directory size: $STORAGE_SIZE"

# Create backup excluding temporary and cache files
log "Creating compressed archive..."
tar \
    --exclude="*.tmp" \
    --exclude="*.temp" \
    --exclude="cache/*" \
    --exclude="temp/*" \
    --exclude="*.pid" \
    --exclude="*.sock" \
    --exclude="logs/*.log.old" \
    --exclude="logs/*.log.*" \
    -czf \
    "$BACKUP_FILE" \
    -C "$(dirname "$STORAGE_DIR")" \
    "$(basename "$STORAGE_DIR")"

# Verify backup was created
if [ ! -f "$BACKUP_FILE" ]; then
    error "Backup file was not created"
fi

# Get backup file size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
COMPRESSION_RATIO=$(echo "scale=1; ${STORAGE_SIZE/[^0-9]*} / ${BACKUP_SIZE/[^0-9]*}" | bc 2>/dev/null || echo "N/A")

log "Backup completed successfully!"
log "Backup size: $BACKUP_SIZE"
log "Compression ratio: ${COMPRESSION_RATIO}:1"

# Create checksum for integrity verification
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
sha256sum "$BACKUP_FILE" > "$CHECKSUM_FILE"
log "Checksum created: $CHECKSUM_FILE"

# List backup contents (top level only)
log "Backup contents:"
tar -tzf "$BACKUP_FILE" | head -20
if [ $(tar -tzf "$BACKUP_FILE" | wc -l) -gt 20 ]; then
    log "... and $(($(tar -tzf "$BACKUP_FILE" | wc -l) - 20)) more files"
fi

# Clean up old backups
log "Cleaning up old storage backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "storage_backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "storage_backup_*.tar.gz.sha256" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "storage_backup_*.log" -type f -mtime +$RETENTION_DAYS -delete

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "storage_backup_*.tar.gz" -type f | wc -l)
log "Active storage backups: $BACKUP_COUNT"

# Upload to cloud storage if configured
if [ -n "$S3_BACKUP_BUCKET" ] && command -v aws >/dev/null 2>&1; then
    log "Uploading storage backup to S3..."
    aws s3 cp "$BACKUP_FILE" "s3://${S3_BACKUP_BUCKET}/storage-backups/"
    aws s3 cp "$CHECKSUM_FILE" "s3://${S3_BACKUP_BUCKET}/storage-backups/"
    aws s3 cp "$BACKUP_LOG" "s3://${S3_BACKUP_BUCKET}/storage-backups/"
    log "Upload to S3 completed"
fi

if [ -n "$GCS_BACKUP_BUCKET" ] && command -v gsutil >/dev/null 2>&1; then
    log "Uploading storage backup to Google Cloud Storage..."
    gsutil cp "$BACKUP_FILE" "gs://${GCS_BACKUP_BUCKET}/storage-backups/"
    gsutil cp "$CHECKSUM_FILE" "gs://${GCS_BACKUP_BUCKET}/storage-backups/"
    gsutil cp "$BACKUP_LOG" "gs://${GCS_BACKUP_BUCKET}/storage-backups/"
    log "Upload to GCS completed"
fi

# Create backup report
REPORT_FILE="${BACKUP_DIR}/${BACKUP_NAME}_report.json"
cat > "$REPORT_FILE" << EOF
{
    "backup_name": "$BACKUP_NAME",
    "backup_type": "storage",
    "created_at": "$(date -Iseconds)",
    "storage_directory": "$STORAGE_DIR",
    "storage_size": "$STORAGE_SIZE",
    "backup_file": "$BACKUP_FILE",
    "backup_size": "$BACKUP_SIZE",
    "compression_ratio": $COMPRESSION_RATIO,
    "checksum": "$(cat "$CHECKSUM_FILE" | cut -d' ' -f1)",
    "total_files": $(tar -tzf "$BACKUP_FILE" | wc -l)
}
EOF
log "Backup report created: $REPORT_FILE"

# Send notification if configured
if [ -n "$BACKUP_NOTIFICATION_WEBHOOK" ]; then
    log "Sending backup notification..."
    curl -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"Storage backup completed successfully\",
            \"attachments\": [
                {
                    \"color\": \"good\",
                    \"fields\": [
                        {
                            \"title\": \"Backup File\",
                            \"value\": \"${BACKUP_FILE}\",
                            \"short\": true
                        },
                        {
                            \"title\": \"Storage Size\",
                            \"value\": \"${STORAGE_SIZE}\",
                            \"short\": true
                        },
                        {
                            \"title\": \"Backup Size\",
                            \"value\": \"${BACKUP_SIZE}\",
                            \"short\": true
                        },
                        {
                            \"title\": \"Files Backed Up\",
                            \"value\": \"$(tar -tzf "$BACKUP_FILE" | wc -l)\",
                            \"short\": true
                        }
                    ]
                }
            ]
        }" \
        "$BACKUP_NOTIFICATION_WEBHOOK"
fi

log "All storage backup tasks completed successfully!"