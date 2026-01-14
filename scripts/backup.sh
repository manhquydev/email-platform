#!/bin/bash
# =====================================================
# Database Backup Script (PostgreSQL)
# =====================================================
# Usage: ./scripts/backup.sh [OPTIONS]
#
# Options:
#   --s3           Upload to S3 (requires AWS_ACCESS_KEY_ID etc. in env)
#   --retention N  Keep N days of backups (default: 7)
#   --dir PATH     Backup directory (default: ./backups)
#
# Dependencies:
#   - docker
#   - gzip
#   - aws-cli (optional, for --s3)

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
# Use env var if set, otherwise default relative to project root
DEFAULT_BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"
CONTAINER_NAME="${CONTAINER_NAME:-email-postgres-1}" # Allow override via env

# Load .env if present
if [ -f "${PROJECT_ROOT}/services/api/.env" ]; then
    export $(grep -v '^#' "${PROJECT_ROOT}/services/api/.env" | xargs)
fi

# Args
UPLOAD_S3=false
RETENTION_DAYS=7
BACKUP_DIR="$DEFAULT_BACKUP_DIR"

while [[ $# -gt 0 ]]; do
    case $1 in
        --s3) UPLOAD_S3=true; shift ;;
        --retention) RETENTION_DAYS="$2"; shift 2 ;;
        --dir) BACKUP_DIR="$2"; shift 2 ;;
        *) echo "Unknown arg: $1"; exit 1 ;;
    esac
done

# Setup
mkdir -p "$BACKUP_DIR"
FILENAME="backup_postgres_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

# 1. Detect Container
if ! docker ps -q -f name="$CONTAINER_NAME" > /dev/null; then
    # Try finding any postgres container in the project
    CONTAINER_NAME=$(docker ps --format '{{.Names}}' | grep "postgres" | head -n 1)
    if [ -z "$CONTAINER_NAME" ]; then
        echo "Error: PostgreSQL container not found."
        exit 1
    fi
fi
echo "Targeting container: $CONTAINER_NAME"

# 2. Perform Dump
echo "Creating backup..."
docker exec "$CONTAINER_NAME" pg_dump -U postgres -d email_service | gzip > "$FILEPATH"

if [ "${PIPESTATUS[0]}" -ne 0 ]; then
    echo "Error: pg_dump failed"
    rm -f "$FILEPATH"
    exit 1
fi

echo "Backup created: $FILEPATH ($(du -h "$FILEPATH" | cut -f1))"

# 3. S3 Upload
if [ "$UPLOAD_S3" = true ]; then
    if ! command -v aws &> /dev/null; then
        echo "Error: aws CLI not installed. Cannot upload to S3."
    elif [ -z "$S3_BUCKET" ]; then
        echo "Error: S3_BUCKET env var not set."
    else
        echo "Uploading to s3://${S3_BUCKET}/backups/${FILENAME}..."
        aws s3 cp "$FILEPATH" "s3://${S3_BUCKET}/backups/${FILENAME}"
        if [ $? -eq 0 ]; then
            echo "S3 Upload successful."
        else
            echo "S3 Upload failed."
        fi
    fi
fi

# 4. Retention Policy (Local)
echo "Cleaning up local backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "backup_postgres_*.sql.gz" -type f -mtime +"$RETENTION_DAYS" -delete

echo "Done."
