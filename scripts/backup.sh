#!/bin/bash
# =====================================================
# PostgreSQL Backup Script for Email Platform
# =====================================================
# Sử dụng: ./backup.sh [OPTIONS]
# Options:
#   --upload-s3    Upload backup lên S3 (yêu cầu cấu hình AWS CLI)
#   --keep-days N  Giữ backup trong N ngày (mặc định: 7)
#
# Cronjob mẫu (mỗi 6 giờ):
#   0 */6 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1

set -e

# ===================
# Configuration
# ===================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_DIR}/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="email_platform_${TIMESTAMP}.sql.gz"

# Defaults
KEEP_DAYS=7
UPLOAD_S3=false
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
CONTAINER_NAME="email-postgres-1"  # Điều chỉnh nếu tên container khác

# ===================
# Parse arguments
# ===================
while [[ $# -gt 0 ]]; do
    case $1 in
        --upload-s3)
            UPLOAD_S3=true
            shift
            ;;
        --keep-days)
            KEEP_DAYS="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ===================
# Functions
# ===================
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    log "ERROR: $1" >&2
    exit 1
}

# ===================
# Main
# ===================
log "Starting PostgreSQL backup..."

# Tạo thư mục backup nếu chưa tồn tại
mkdir -p "$BACKUP_DIR"

# Xác định tên container PostgreSQL
if ! docker ps --format '{{.Names}}' | grep -q postgres; then
    # Thử tìm container với pattern khác
    CONTAINER_NAME=$(docker ps --format '{{.Names}}' | grep -E 'postgres|db' | head -1)
    if [ -z "$CONTAINER_NAME" ]; then
        error "Không tìm thấy container PostgreSQL đang chạy"
    fi
fi

log "Sử dụng container: $CONTAINER_NAME"

# Thực hiện backup
log "Đang dump database..."
docker exec "$CONTAINER_NAME" pg_dump -U postgres -d email_service | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    log "Backup thành công: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
    error "Backup thất bại!"
fi

# Upload lên S3 nếu được yêu cầu
if [ "$UPLOAD_S3" = true ]; then
    if [ -z "$S3_BUCKET" ]; then
        log "CẢNH BÁO: S3_BACKUP_BUCKET không được cấu hình, bỏ qua upload S3"
    else
        log "Đang upload lên S3: s3://${S3_BUCKET}/backups/${BACKUP_FILE}"
        if aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" "s3://${S3_BUCKET}/backups/${BACKUP_FILE}"; then
            log "Upload S3 thành công"
        else
            log "CẢNH BÁO: Upload S3 thất bại"
        fi
    fi
fi

# Xóa backup cũ
log "Đang xóa backup cũ hơn ${KEEP_DAYS} ngày..."
find "$BACKUP_DIR" -name "email_platform_*.sql.gz" -type f -mtime +"$KEEP_DAYS" -delete

REMAINING=$(find "$BACKUP_DIR" -name "email_platform_*.sql.gz" -type f | wc -l)
log "Hoàn tất. Số backup hiện có: ${REMAINING}"

# ===================
# Hướng dẫn Restore
# ===================
# Để restore backup:
# 1. gunzip backup_file.sql.gz
# 2. docker exec -i CONTAINER_NAME psql -U postgres -d email_service < backup_file.sql
#
# Hoặc sử dụng script restore.sh (sẽ được tạo nếu cần)
