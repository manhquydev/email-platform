#!/bin/bash

# Database Backup Script for TempMail Pro
# Usage: ./scripts/backup-database.sh [backup_name]

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="${DB_NAME:-email_service}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Parse backup name if provided
BACKUP_NAME="${1:-backup_${TIMESTAMP}}"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.sql"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

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

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    error "DATABASE_URL environment variable is not set"
fi

# Parse DATABASE_URL
# Expected format: postgresql://[user[:password]@][netloc][:port][/dbname][?param1=value1&...]
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/^postgresql:\/\/\([^:]*\):\([^@]*\)@.*/\1/p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/^postgresql:\/\/\([^:]*\):\([^@]*\)@.*/\2/p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/^postgresql:\/\/[^@]*@\([^:\/]*\).*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/^postgresql:\/\/[^@]*@[^:]*:\([0-9]*\).*/\1/p')

# Set defaults if not found
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Set PGPASSWORD if password is provided
export PGPASSWORD="$DB_PASS"

log "Starting database backup..."
log "Database: ${DB_NAME}"
log "Host: ${DB_HOST}:${DB_PORT}"
log "Backup file: ${BACKUP_FILE}"

# Create backup
log "Creating backup..."
pg_dump \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    --dbname="${DB_NAME}" \
    --format=custom \
    --compress=9 \
    --verbose \
    --file="${BACKUP_FILE}" \
    --no-password \
    --exclude-table-data='temp_*' \
    --exclude-table-data='cache_*' \
    --exclude-table-data='session_*'

# Verify backup was created
if [ ! -f "${BACKUP_FILE}" ]; then
    error "Backup file was not created"
fi

# Get backup size
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)

log "Backup completed successfully!"
log "Backup size: ${BACKUP_SIZE}"

# Create checksum for integrity verification
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
sha256sum "${BACKUP_FILE}" > "${CHECKSUM_FILE}"
log "Checksum created: ${CHECKSUM_FILE}"

# Clean up old backups (keep only RETENTION_DAYS worth)
log "Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "backup_*.sql" -type f -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "backup_*.sql.sha256" -type f -mtime +${RETENTION_DAYS} -delete

# Count remaining backups
BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "backup_*.sql" -type f | wc -l)
log "Active backups: ${BACKUP_COUNT}"

# Upload to cloud storage if configured (S3, GCS, Azure)
if [ -n "$S3_BACKUP_BUCKET" ] && command -v aws >/dev/null 2>&1; then
    log "Uploading backup to S3..."
    aws s3 cp "${BACKUP_FILE}" "s3://${S3_BACKUP_BUCKET}/database-backups/"
    aws s3 cp "${CHECKSUM_FILE}" "s3://${S3_BACKUP_BUCKET}/database-backups/"
    log "Upload to S3 completed"
fi

if [ -n "$GCS_BACKUP_BUCKET" ] && command -v gsutil >/dev/null 2>&1; then
    log "Uploading backup to Google Cloud Storage..."
    gsutil cp "${BACKUP_FILE}" "gs://${GCS_BACKUP_BUCKET}/database-backups/"
    gsutil cp "${CHECKSUM_FILE}" "gs://${GCS_BACKUP_BUCKET}/database-backups/"
    log "Upload to GCS completed"
fi

# Send notification if configured
if [ -n "$BACKUP_NOTIFICATION_WEBHOOK" ]; then
    log "Sending backup notification..."
    curl -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"Database backup completed successfully\",
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
                            \"title\": \"Size\",
                            \"value\": \"${BACKUP_SIZE}\",
                            \"short\": true
                        },
                        {
                            \"title\": \"Database\",
                            \"value\": \"${DB_NAME}\",
                            \"short\": true
                        },
                        {
                            \"title\": \"Active Backups\",
                            \"value\": \"${BACKUP_COUNT}\",
                            \"short\": true
                        }
                    ]
                }
            ]
        }" \
        "${BACKUP_NOTIFICATION_WEBHOOK}"
fi

log "All tasks completed successfully!"