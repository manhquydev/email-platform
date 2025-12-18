# Backup and Restore Procedures

## Overview

This document provides comprehensive procedures for backing up and restoring the TempMail Pro email platform. The backup strategy includes both database and storage components with automated scheduling and cloud storage replication options.

## Backup Strategy Overview

### Components Backed Up

1. **Database Backup**
   - PostgreSQL database with all user data
   - Excludes temporary tables: `temp_*`, `cache_*`, `session_*`
   - Compressed custom format for space efficiency

2. **Storage Backup**
   - Email attachments
   - User uploaded files
   - Generated content

3. **Configuration Backup**
   - Environment files
   - Docker configurations
   - SSL certificates

### Backup Schedule

| Component | Frequency | Retention | Cloud Storage |
|-----------|-----------|------------|---------------|
| Database | Daily at 2:00 AM | 30 days | Optional S3/GCS |
| Storage | Daily at 3:00 AM | 30 days | Optional S3/GCS |
| Health Check | Daily at 6:00 AM | 7 days | - |

## Backup Procedures

### 1. Manual Database Backup

```bash
# Basic backup
./scripts/backup-database.sh

# With custom name
./scripts/backup-database.sh manual_backup_2024

# With environment variables
BACKUP_DIR=/backups RETENTION_DAYS=30 ./scripts/backup-database.sh
```

### 2. Manual Storage Backup

```bash
# Create storage backup
./scripts/backup-storage.sh

# With retention period
BACKUP_RETENTION_DAYS=30 ./scripts/backup-storage.sh
```

### 3. Automated Backup Setup

1. **Enable backup service in production**:

```bash
# Add backup services to production
docker-compose -f docker-compose.prod.yml -f docker-compose.backup.yml up -d
```

2. **Configure environment variables**:

```bash
# .env file
BACKUP_RETENTION_DAYS=30
DATABASE_BACKUP_SCHEDULE="0 2 * * *"
STORAGE_BACKUP_SCHEDULE="0 3 * * *"
S3_BACKUP_BUCKET=your-s3-bucket-name
GCS_BACKUP_BUCKET=your-gcs-bucket-name
BACKUP_NOTIFICATION_WEBHOOK=https://hooks.slack.com/services/...
```

3. **Verify backup scheduler**:

```bash
# Check backup logs
docker logs backup-scheduler

# Check backup files
ls -la backups/
```

### 4. Backup Directory Structure

```
backups/
├── backup_20241218_020001.sql              # Database backup
├── backup_20241218_020001.sql.sha256       # Checksum file
├── storage_backup_20241218_030001.tar.gz   # Storage backup
├── storage_backup_20241218_030001.tar.gz.sha256
└── logs/
    └── backup.log                          # Backup execution logs
```

## Restore Procedures

### 1. Database Restore

#### Local Development Restore

```bash
# Stop all services
docker-compose down

# Start database only
docker-compose up -d postgres

# Wait for database to be ready
docker-compose exec postgres pg_isready

# Restore from backup (inside container)
docker-compose exec -T postgres psql -U postgres -d email_service < backup_20241218_020001.sql

# OR using pg_restore (custom format)
docker-compose exec -T postgres pg_restore -U postgres -d email_service -v backup_20241218_020001.sql

# Restart all services
docker-compose up -d
```

#### Production Restore

```bash
# Stop services except database
docker-compose stop api web caddy

# Create new database if needed
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE email_service_restore;"

# Restore database
docker-compose exec -T postgres pg_restore -U postgres -d email_service_restore -v /backups/backup_20241218_020001.sql

# Verify restore
docker-compose exec postgres psql -U postgres -d email_service_restore -c "\dt"

# Rename databases (atomic operation)
docker-compose exec postgres psql -U postgres -c "
ALTER DATABASE email_service RENAME TO email_service_old;
ALTER DATABASE email_service_restore RENAME TO email_service;
"

# Clean up old database
docker-compose exec postgres psql -U postgres -c "DROP DATABASE email_service_old;"

# Restart services
docker-compose start api web caddy
```

### 2. Storage Restore

```bash
# Stop API service to prevent file conflicts
docker-compose stop api

# Backup current storage
mv ./api_storage ./api_storage_backup

# Extract storage backup
cd ./api_storage
tar -xzf ../backups/storage_backup_20241218_030001.tar.gz
cd ..

# Restart API service
docker-compose start api

# Verify files are accessible
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3001/attachments/1/download
```

### 3. Complete System Restore

```bash
#!/bin/bash
# restore-complete.sh

echo "Starting complete system restore..."

# 1. Stop all services
docker-compose down

# 2. Restore database
echo "Restoring database..."
docker-compose up -d postgres
sleep 30  # Wait for database to initialize
docker-compose exec -T postgres pg_restore -U postgres -d email_service -v /backups/backup_20241218_020001.sql

# 3. Restore storage
echo "Restoring storage..."
docker-compose stop api
mv ./api_storage ./api_storage_old
tar -xzf ./backups/storage_backup_20241218_030001.tar.gz -C ./
docker-compose start api

# 4. Verify system health
echo "Verifying system health..."
sleep 10
curl http://localhost:3001/health
curl http://localhost:3001/ready

echo "Restore completed!"
```

## Backup Monitoring

### 1. Prometheus Metrics

The backup exporter exposes the following metrics:

```bash
# Access backup metrics
curl http://localhost:9180/metrics

# Key metrics:
# tempmail_backup_size_bytes - Size of latest backup
# tempmail_backup_count - Number of backups
# tempmail_backup_age_seconds - Age of latest backup
# tempmail_backup_last_success_timestamp - Last successful backup
```

### 2. Alerting Rules

Configure alerts in Prometheus for:

```yaml
# Alert if no database backup in 48 hours
- alert: DatabaseBackupMissing
  expr: tempmail_backup_last_success_timestamp{type="database"} < (time() - 172800)
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Database backup missing"
    description: "No database backup found for 48 hours"

# Alert if backup size exceeds threshold
- alert: DatabaseBackupTooLarge
  expr: tempmail_backup_size_bytes{type="database"} > 10737418240  # 10GB
  for: 15m
  labels:
    severity: warning
  annotations:
    summary: "Database backup size exceeded"
    description: "Database backup is larger than 10GB"

# Alert if backup retention exceeded
- alert: BackupRetentionWarning
  expr: tempmail_backup_count{type="database"} > 35
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "Backup retention exceeded"
    description: "More than 35 database backups exist"
```

### 3. Log Monitoring

```bash
# View recent backup logs
tail -f backups/logs/backup.log

# Search for errors
grep -i "error" backups/logs/backup.log

# Check backup status
grep "Backup completed" backups/logs/backup.log | tail -5
```

## Cloud Storage Integration

### S3 Configuration

```bash
# Install AWS CLI
apk add --no-cache aws-cli

# Configure S3 backup
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=us-east-1
export S3_BACKUP_BUCKET=your-bucket-name

# Test upload
aws s3 cp ./backups/backup_20241218_020001.sql s3://${S3_BACKUP_BUCKET}/database-backups/
```

### Google Cloud Storage Configuration

```bash
# Install gcloud
apk add --no-cache google-cloud-sdk

# Configure GCS
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
export GCS_BACKUP_BUCKET=your-gcs-bucket

# Test upload
gsutil cp ./backups/backup_20241218_020001.sql gs://${GCS_BACKUP_BUCKET}/database-backups/
```

## Disaster Recovery

### 1. Restore to New Server

```bash
# Step 1: Install Docker on new server
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Step 2: Clone repository
git clone https://github.com/your-repo/Email.git
cd Email

# Step 3: Download latest backups from cloud storage
aws s3 cp s3://${S3_BACKUP_BUCKET}/database-backups/latest.sql ./backups/
aws s3 cp s3://${S3_BACKUP_BUCKET}/storage-backups/latest.tar.gz ./backups/

# Step 4: Update environment variables
cp .env.example .env
# Edit .env with new server details

# Step 5: Restore system
./restore-complete.sh
```

### 2. Point-in-Time Recovery

```bash
# Create point-in-time backup timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker-compose exec postgres pg_dump -U postgres -F c -f /backups/pitr_${TIMESTAMP}.sql email_service

# Restore to specific time
docker-compose exec -T postgres psql -U postgres -d email_service -c "
CREATE DATABASE email_service_pitr;
SELECT pg_restore('pitr_${TIMESTAMP}.sql', 'email_service_pitr');
"
```

## Backup Security

### 1. Encryption

```bash
# Encrypt backup before uploading
openssl enc -aes-256-cbc -salt -in backup.sql -out backup.sql.enc

# Decrypt backup
openssl enc -d -aes-256-cbc -in backup.sql.enc -out backup.sql
```

### 2. Access Control

```bash
# Restrict backup directory permissions
chmod 700 backups/
chmod 600 backups/*.sql
chmod 600 backups/*.tar.gz

# Set file ownership
chown root:root backups/
chown root:root backups/*.sql
```

### 3. Backup Verification

```bash
# Verify database backup
./scripts/verify-backup.sh backup_20241218_020001.sql

# Verify storage backup
tar -tzf storage_backup_20241218_030001.tar.gz | head -10

# Check checksums
sha256sum -c backup_20241218_020001.sql.sha256
```

## Troubleshooting

### Common Issues

#### 1. Backup Permission Denied

```bash
# Fix permissions
chmod +x scripts/*.sh
chown -R $(whoami):$(whoami) backups/
```

#### 2. Database Restore Error

```bash
# Check database encoding
docker-compose exec postgres psql -U postgres -c "SHOW server_encoding;"

# Fix encoding issues
docker-compose exec -T postgres pg_restore -U postgres -d email_service --encoding=UTF8 backup.sql
```

#### 3. Storage Restore Fails

```bash
# Check disk space
df -h

# Clear old backups if needed
find backups/ -name "*.sql" -mtime +30 -delete
find backups/ -name "*.tar.gz" -mtime +30 -delete
```

#### 4. Cloud Upload Fails

```bash
# Test AWS connectivity
aws s3 ls s3://${S3_BACKUP_BUCKET}/

# Check credentials
aws sts get-caller-identity
```

### Debug Commands

```bash
# View backup scheduler logs
docker logs -f backup-scheduler

# Test database connection
docker-compose exec postgres pg_isready

# Check backup integrity
./scripts/backup-integrity-check.sh

# Generate backup report
./scripts/backup-report.sh
```

## Best Practices

### 1. Regular Testing
- Test restore process monthly
- Verify backup checksums weekly
- Test cloud uploads daily

### 2. Monitoring
- Set up alerting for backup failures
- Monitor backup size trends
- Track restoration times

### 3. Security
- Rotate encryption keys quarterly
- Audit backup access monthly
- Keep offline copies annually

### 4. Documentation
- Update backup procedures after changes
- Document retention policies
- Keep recovery contact information current

## Contact Information

For backup-related issues:
- **Support Email**: support@tempmail.com
- **Slack Channel**: #backups-ops
- **On-call Engineer**: rotate weekly