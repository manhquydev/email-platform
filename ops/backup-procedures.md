# TempMail Pro Backup and Disaster Recovery Procedures

## Overview

This document outlines the backup and disaster recovery procedures for TempMail Pro to ensure business continuity and data integrity.

## Backup Strategy

### 1. Database Backups

#### PostgreSQL Database
- **Frequency**:
  - Full backup: Daily at 2:00 AM UTC
  - Incremental (WAL): Continuous
  - Point-in-time recovery: 7-day retention

- **Storage**:
  - Primary: AWS S3 (us-east-1)
  - Secondary: AWS S3 (eu-west-1) for cross-region redundancy
  - Tertiary: Local encrypted backup on secure NAS

- **Retention Policy**:
  - Daily backups: 30 days
  - Weekly backups: 12 weeks
  - Monthly backups: 12 months
  - Yearly backups: 7 years

#### Backup Scripts

```bash
#!/bin/bash
# backup-postgres.sh
# PostgreSQL backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/postgres-backups"
DB_NAME="tempmail-pro"

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform full backup
pg_dump -h localhost -U postgres -d $DB_NAME \
  --format=custom \
  --compress=9 \
  --file=$BACKUP_DIR/tempmail-pro-$DATE.dump

# Encrypt backup
gpg --cipher-algo AES256 --compress-algo 1 --symmetric \
  --output $BACKUP_DIR/tempmail-pro-$DATE.dump.gpg \
  $BACKUP_DIR/tempmail-pro-$DATE.dump

# Upload to S3
aws s3 cp $BACKUP_DIR/tempmail-pro-$DATE.dump.gpg \
  s3://tempmail-pro-backups/database/

# Cleanup
rm -f $BACKUP_DIR/tempmail-pro-$DATE.dump*
```

### 2. Redis Backups

#### Configuration
- **RDB Snapshots**: Every 6 hours
- **AOF Logging**: Enabled with every second fsync
- **Persistence**: Both RDB and AOF enabled

#### Backup Script
```bash
#!/bin/bash
# backup-redis.sh

DATE=$(date +%Y%m%d_%H%M%S)
REDIS_DIR="/var/lib/redis"

# Create RDB snapshot
redis-cli BGSAVE

# Wait for save to complete
redis-cli LASTSAVE

# Copy and encrypt RDB file
cp $REDIS_DIR/dump.rdb /tmp/redis-$DATE.rdb
gzip /tmp/redis-$DATE.rdb

# Upload to S3
aws s3 cp /tmp/redis-$DATE.rdb.gz \
  s3://tempmail-pro-backups/redis/

# Cleanup
rm -f /tmp/redis-$DATE.rdb.gz
```

### 3. File System Backups

#### What to Backup
- User-uploaded files
- SSL certificates
- Configuration files
- Log files (last 30 days)
- Static assets

#### Backup Script
```bash
#!/bin/bash
# backup-files.sh

DATE=$(date +%Y%m%d_%H%M%S)
SOURCE_DIRS="/opt/tempmail-pro/certs /opt/tempmail-pro/config /opt/tempmail-pro/uploads"
TEMP_DIR="/tmp/tempmail-backup-$DATE"

# Create temporary directory
mkdir -p $TEMP_DIR

# Copy and compress files
tar -czf $TEMP_DIR/files-$DATE.tar.gz $SOURCE_DIRS

# Encrypt backup
gpg --cipher-algo AES256 --compress-algo 1 --symmetric \
  --output $TEMP_DIR/files-$DATE.tar.gz.gpg \
  $TEMP_DIR/files-$DATE.tar.gz

# Upload to S3
aws s3 cp $TEMP_DIR/files-$DATE.tar.gz.gpg \
  s3://tempmail-pro-backups/files/

# Cleanup
rm -rf $TEMP_DIR
```

### 4. Application Code Backup

#### Git Repository
- Primary: GitHub with protected main branch
- Mirror: GitLab for redundancy
- Local: Development servers

#### Deployment Scripts
```bash
#!/bin/bash
# backup-code.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/code-backup-$DATE"

# Create backup directory
mkdir -p $BACKUP_DIR

# Clone repository
cd $BACKUP_DIR
git clone git@github.com:manhquydev/tempmail-pro.git

# Create archive
tar -czf tempmail-pro-code-$DATE.tar.gz tempmail-pro/

# Upload to S3
aws s3 cp tempmail-pro-code-$DATE.tar.gz \
  s3://tempmail-pro-backups/code/

# Cleanup
rm -rf $BACKUP_DIR
```

## Automated Backup Schedule

### Cron Jobs

```bash
# PostgreSQL backup (daily)
0 2 * * * /opt/tempmail-pro/scripts/backup-postgres.sh

# Redis backup (every 6 hours)
0 */6 * * * /opt/tempmail-pro/scripts/backup-redis.sh

# File system backup (weekly)
0 3 * * 0 /opt/tempmail-pro/scripts/backup-files.sh

# Code backup (weekly)
0 4 * * 0 /opt/tempmail-pro/scripts/backup-code.sh

# Backup verification (daily)
0 5 * * * /opt/tempmail-pro/scripts/verify-backups.sh
```

## Disaster Recovery Procedures

### Scenario 1: Database Corruption

#### Recovery Steps
1. **Stop Application Services**
   ```bash
   sudo systemctl stop tempmail-api
   sudo systemctl stop tempmail-web
   ```

2. **Identify Corruption**
   ```sql
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   CHECKPOINT;
   ```

3. **Restore from Backup**
   ```bash
   # Download latest backup
   aws s3 cp s3://tempmail-pro-backups/database/tempmail-pro-YYYYMMDD.dump.gpg .

   # Decrypt backup
   gpg --output tempmail-pro.dump --decrypt tempmail-pro.dump.gpg

   # Restore database
   pg_restore -h localhost -U postgres -d tempmail-pro \
     --clean --if-exists --verbose tempmail-pro.dump
   ```

4. **Verify Data Integrity**
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM inboxes;
   SELECT COUNT(*) FROM messages;
   ```

5. **Restart Services**
   ```bash
   sudo systemctl start tempmail-api
   sudo systemctl start tempmail-web
   ```

### Scenario 2: Server Failure

#### Recovery Steps
1. **Launch New Server**
   ```bash
   # Using AWS CLI
   aws ec2 run-instances \
     --image-id ami-0abcdef123456789 \
     --instance-type t3.medium \
     --key-name tempmail-pro-key \
     --security-group-ids sg-903004f8 \
     --subnet-id subnet-6e7f829e \
     --user-data file://user-data.sh
   ```

2. **Install Dependencies**
   ```bash
   # user-data.sh content
   #!/bin/bash
   yum update -y
   yum install -y docker postgresql-client
   systemctl enable docker
   systemctl start docker
   ```

3. **Restore Application**
   ```bash
   # Pull latest images
   docker-compose pull

   # Restore database
   docker-compose exec db pg_restore -U postgres tempmail-pro \
     < /backup/tempmail-pro.dump

   # Start services
   docker-compose up -d
   ```

4. **Update DNS**
   ```bash
   # Update Route53 record
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z3A5ABCDEF123 \
     --change-batch file://dns-update.json
   ```

### Scenario 3: Ransomware Attack

#### Response Steps
1. **Isolate Affected Systems**
   ```bash
   # Disconnect from network
   ip link set eth0 down

   # Stop all services
   docker-compose down

   # Mount as read-only if needed
   mount -o remount,ro /
   ```

2. **Assess Damage**
   - Check which files are encrypted
   - Identify patient zero
   - Scan for malware signatures

3. **Restore from Clean Backup**
   - Use backup from before attack
   - Verify backup integrity
   - Restore to clean environment

4. **Post-Recovery**
   - Update all passwords and API keys
   - Patch vulnerabilities
   - Implement additional security measures

## Monitoring and Alerting

### Backup Monitoring

#### Prometheus Metrics
```yaml
# backup-monitoring.yml
groups:
  - name: backup
    rules:
      - alert: BackupFailed
        expr: backup_last_success_timestamp < time() - 86400
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "Backup has not succeeded in over 24 hours"

      - alert: BackupSizeAnomaly
        expr: backup_size_bytes < 1073741824 # < 1GB
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Backup size is unusually small"
```

### Health Checks

#### Database Health
```bash
#!/bin/bash
# check-db-health.sh

# Check connection
pg_isready -h localhost -p 5432 -U postgres

# Check replication lag
psql -h localhost -U postgres -d tempmail-pro -c "
  SELECT pg_last_wal_receive_lsn() - pg_last_wal_replay_lsn() AS lag_bytes;
"

# Check table sizes
psql -h localhost -U postgres -d tempmail-pro -c "
  SELECT schemaname, tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

## Testing Backups

### Monthly Recovery Test

```bash
#!/bin/bash
# test-backup-recovery.sh

TEST_DB="tempmail-pro-test-$(date +%Y%m)"
DATE=$(date +%Y%m%d)

# Create test database
createdb -h localhost -U postgres $TEST_DB

# Restore latest backup to test database
aws s3 cp s3://tempmail-pro-backups/database/tempmail-pro-$DATE.dump.gpg .
gpg --output tempmail-pro.dump --decrypt tempmail-pro-$DATE.dump.gpg
pg_restore -h localhost -U postgres -d $TEST_DB tempmail-pro.dump

# Run data integrity checks
psql -h localhost -U postgres -d $TEST_DB -c "
  -- Check foreign key constraints
  SELECT conname, conrelid::regclass, confrelid::regclass
  FROM pg_constraint
  WHERE contype = 'f';

  -- Check data counts
  SELECT 'users' as table_name, COUNT(*) as count FROM users
  UNION ALL
  SELECT 'inboxes', COUNT(*) FROM inboxes
  UNION ALL
  SELECT 'messages', COUNT(*) FROM messages;
"

# Cleanup
dropdb -h localhost -U postgres $TEST_DB
rm -f tempmail-pro.dump*
```

## Security Considerations

### Encryption
- All backups encrypted with AES-256
- GPG keys stored in AWS KMS
- Separate encryption keys for different backup types

### Access Control
- Backup access limited to essential personnel
- MFA required for backup system access
- Regular audit of backup access logs

### Compliance
- GDPR compliance for personal data
- Data retention policies enforced
- Backup locations documented

## Contact Information

### Primary Contacts
- DevOps Lead: devops@tempmail.pro
- DBA: dba@tempmail.pro
- Security Team: security@tempmail.pro

### Emergency Contacts
- On-call Engineer: +1-555-0123 (24/7)
- Management: manager@tempmail.pro

### External Providers
- AWS Support: 1-800-555-1234
- GitHub Support: support@github.com
- Security Incident: security@tempmail.pro

## Documentation

- [ ] Runbook: https://docs.tempmail.pro/runbooks
- [ ] Architecture: https://docs.tempmail.pro/architecture
- [ ] Security Policy: https://tempmail.pro/security

---

**Remember**: Test your backups regularly. A backup is only good if you can restore from it!

**Last Updated**: December 19, 2024
**Version**: 1.0