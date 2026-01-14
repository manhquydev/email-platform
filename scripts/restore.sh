#!/bin/bash
# =====================================================
# Database Restore Script (PostgreSQL)
# =====================================================
# Usage: ./scripts/restore.sh <backup_file.sql.gz>
#
# Warning: This will OVERWRITE the current database!

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER_NAME="email-postgres-1"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo "Usage: $0 <path_to_backup_file.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: File $BACKUP_FILE not found.${NC}"
    exit 1
fi

# 1. Detect Container
if ! docker ps -q -f name="$CONTAINER_NAME" > /dev/null; then
    CONTAINER_NAME=$(docker ps --format '{{.Names}}' | grep "postgres" | head -n 1)
    if [ -z "$CONTAINER_NAME" ]; then
        echo -e "${RED}Error: PostgreSQL container not found.${NC}"
        exit 1
    fi
fi

echo -e "${RED}WARNING: This will drop and recreate the 'email_service' database.${NC}"
echo -e "${RED}Data in container '$CONTAINER_NAME' will be overwritten.${NC}"
echo "Restoring from: $BACKUP_FILE"
read -p "Are you sure? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# 2. Drop Connections & Recreate DB
echo "Terminating existing connections..."
docker exec "$CONTAINER_NAME" psql -U postgres -c "
  SELECT pid, pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'email_service' AND pid <> pg_backend_pid();" > /dev/null

echo "Dropping database..."
docker exec "$CONTAINER_NAME" psql -U postgres -c "DROP DATABASE IF EXISTS email_service;"

echo "Creating database..."
docker exec "$CONTAINER_NAME" psql -U postgres -c "CREATE DATABASE email_service;"

# 3. Restore
echo "Restoring data (this may take a while)..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U postgres -d email_service > /dev/null

echo -e "${GREEN}Restore complete!${NC}"
