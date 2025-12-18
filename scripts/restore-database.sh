#!/bin/bash

# Database Restore Script for TempMail Pro
# Usage: ./scripts/restore-database.sh <backup_file> [confirm]

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_NAME="${DB_NAME:-email_service}"

# Parse arguments
if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file> [confirm]"
    echo "Example: $0 backup_20231218_120000.sql"
    echo "         $0 backup_20231218_120000.sql confirm"
    exit 1
fi

BACKUP_FILE="$1"
if [[ "$BACKUP_FILE" != /* ]]; then
    BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
fi

CONFIRM="$2"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    error "DATABASE_URL environment variable is not set"
fi

# Check if backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    error "Backup file not found: ${BACKUP_FILE}"
fi

# Parse DATABASE_URL
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/^postgresql:\/\/\([^:]*\):\([^@]*\)@.*/\1/p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/^postgresql:\/\/\([^:]*\):\([^@]*\)@.*/\2/p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/^postgresql:\/\/[^@]*@\([^:\/]*\).*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/^postgresql:\/\/[^@]*@[^:]*:\([0-9]*\).*/\1/p')

# Set defaults
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Set PGPASSWORD if password is provided
export PGPASSWORD="$DB_PASS"

# Get backup info
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
BACKUP_DATE=$(stat -c %y "${BACKUP_FILE}" 2>/dev/null || stat -f %Sm "${BACKUP_FILE}" 2>/dev/null)

# Verify backup integrity if checksum exists
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "${CHECKSUM_FILE}" ]; then
    log "Verifying backup integrity..."
    if sha256sum -c "${CHECKSUM_FILE}" >/dev/null 2>&1; then
        log "Backup integrity verified ✓"
    else
        error "Backup integrity check failed! The backup file may be corrupted."
    fi
else
    warn "No checksum file found. Skipping integrity verification."
fi

# Show backup info
echo ""
info "=== DATABASE RESTORE ==="
info "Database: ${DB_NAME}"
info "Host: ${DB_HOST}:${DB_PORT}"
info "Backup File: ${BACKUP_FILE}"
info "Backup Size: ${BACKUP_SIZE}"
info "Backup Date: ${BACKUP_DATE}"
echo ""

# Confirmation prompt
if [ "$CONFIRM" != "confirm" ]; then
    warn "⚠️  WARNING: This will REPLACE all data in the database!"
    warn "⚠️  This action cannot be undone!"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Restore cancelled by user"
        exit 0
    fi
    echo ""
else
    warn "Running restore with explicit confirmation..."
fi

# Create restore timestamp
RESTORE_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${BACKUP_DIR}/restore_${RESTORE_TIMESTAMP}.log"

# Function to handle exit and cleanup
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        error "Restore failed. Check log file: ${LOG_FILE}"
    fi
}
trap cleanup EXIT

# Start logging
exec > >(tee -a "${LOG_FILE}")
exec 2>&1

log "Starting database restore at $(date)"
log "Log file: ${LOG_FILE}"

# Check database connection
log "Checking database connection..."
if ! psql \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    --dbname="${DB_NAME}" \
    --command="SELECT 1;" \
    --no-password \
    --quiet \
    2>/dev/null; then
    error "Cannot connect to database. Check your credentials and network."
fi
log "Database connection successful ✓"

# Create pre-restore backup if database exists
log "Creating pre-restore backup..."
PRE_RESTORE_BACKUP="${BACKUP_DIR}/pre_restore_${RESTORE_TIMESTAMP}.sql"
pg_dump \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    --dbname="${DB_NAME}" \
    --format=custom \
    --compress=9 \
    --file="${PRE_RESTORE_BACKUP}" \
    --no-password \
    --quiet
log "Pre-restore backup created: ${PRE_RESTORE_BACKUP}"

# Drop and recreate database
log "Preparing database..."
psql \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    --dbname="postgres" \
    --no-password \
    --command="
        DROP DATABASE IF EXISTS ${DB_NAME};
        CREATE DATABASE ${DB_NAME};
    " \
    --quiet

log "Database prepared ✓"

# Restore from backup
log "Restoring database from backup..."
pg_restore \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    --dbname="${DB_NAME}" \
    --verbose \
    --clean \
    --if-exists \
    --no-password \
    "${BACKUP_FILE}"

log "Database restore completed ✓"

# Run post-restore operations
log "Running post-restore operations..."

# Update sequences
psql \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    --dbname="${DB_NAME}" \
    --no-password \
    --command="
        -- Reset all sequences to their max value
        DO \$\$
        BEGIN
            EXECUTE '
                SELECT SETVAL(
                    pg_get_serial_sequence(''\"'' || schemaname || ''\"'.'''' || tablename || ''\"'.'''' || attname || ''\"''),
                    COALESCE(MAX(''\"'' || attname || ''\"''), 1)
                )
                FROM pg_attribute
                JOIN pg_class ON pg_class.oid = pg_attribute.attrelid
                JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
                JOIN pg_type ON pg_type.oid = pg_attribute.atttypid
                JOIN pg_attrdef ON pg_attrdef.adrelid = pg_class.oid AND pg_attrdef.adnum = pg_attribute.attnum
                WHERE schemaname = ''public''
                    AND pg_attribute.attnum > 0
                    AND NOT pg_attribute.attisdropped
                    AND pg_type.typname = ''int4''
                    AND pg_attrdef.adsrc LIKE ''nextval%''
                GROUP BY schemaname, tablename, attname;
        END \$\$;
    " \
    --quiet

# Verify data integrity
log "Verifying data integrity..."
TABLE_COUNT=$(psql \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    --dbname="${DB_NAME}" \
    --no-password \
    --tuples-only \
    --command="
        SELECT count(*) FROM information_schema.tables
        WHERE table_schema = 'public';
    " \
    --quiet)

USER_COUNT=$(psql \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    --dbname="${DB_NAME}" \
    --no-password \
    --tuples-only \
    --command="SELECT count(*) FROM users;" \
    --quiet)

DOMAIN_COUNT=$(psql \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    --dbname="${DB_NAME}" \
    --no-password \
    --tuples-only \
    --command="SELECT count(*) FROM domains;" \
    --quiet)

log "Restore verification:"
log "  - Tables restored: ${TABLE_COUNT}"
log "  - Users: ${USER_COUNT}"
log "  - Domains: ${DOMAIN_COUNT}"

# Send notification if configured
if [ -n "$RESTORE_NOTIFICATION_WEBHOOK" ]; then
    log "Sending restore notification..."
    curl -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"Database restore completed successfully\",
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
                            \"title\": \"Pre-restore Backup\",
                            \"value\": \"${PRE_RESTORE_BACKUP}\",
                            \"short\": true
                        },
                        {
                            \"title\": \"Users Restored\",
                            \"value\": \"${USER_COUNT}\",
                            \"short\": true
                        },
                        {
                            \"title\": \"Domains Restored\",
                            \"value\": \"${DOMAIN_COUNT}\",
                            \"short\": true
                        }
                    ]
                }
            ]
        }" \
        "${RESTORE_NOTIFICATION_WEBHOOK}"
fi

log ""
log "✅ DATABASE RESTORE COMPLETED SUCCESSFULLY!"
log ""
log "Summary:"
log "  - Restored from: ${BACKUP_FILE}"
log "  - Pre-restore backup: ${PRE_RESTORE_BACKUP}"
log "  - Log file: ${LOG_FILE}"
log ""
warn "Please verify all data and restart the application."