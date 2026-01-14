# Disaster Recovery & Backup Strategy

This document outlines the procedures for backing up the Email Platform, recovering from data loss events, and migrating between servers.

## 1. Architecture Overview

To prevent data loss from accidental directory deletions on the host, we use **Docker Named Volumes** for persistence:
- `email_postgres_data`: PostgreSQL database files.
- `email_storage`: Email attachments and raw message files.
- `redis_data`: Redis persistence (job queues).
- `caddy_data` / `caddy_config`: SSL certificates and configuration.

**Backup Strategy:**
- **Database**: Daily `pg_dump` (SQL format) uploaded to S3.
- **Files**: Volume snapshots (TODO: Implementation via Restic).

## 2. Backup Procedures

### Automated Backups
The `scripts/backup.sh` script handles database backups. It supports local storage and S3 upload.

**Configuration:**
Ensure these environment variables are set in `.env` or the execution environment for S3 uploads:
```bash
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_DEFAULT_REGION=us-east-1
S3_BUCKET=your-backup-bucket
```

**Running Manually:**
```bash
# Local backup only
./scripts/backup.sh

# Upload to S3
./scripts/backup.sh --s3
```

**Scheduling (Cron):**
Add to `crontab -e` on the host:
```bash
# Backup every 6 hours
0 */6 * * * cd /path/to/email-platform && ./scripts/backup.sh --s3 >> /var/log/email-backup.log 2>&1
```

## 3. Recovery Procedures

### Scenario A: Accidental Data Corruption (Database)
If bad data was written or deleted, restore from the latest SQL dump.

**WARNING: This will overwrite the current database.**

1.  **Locate Backup:** Find the relevant `.sql.gz` file in `backups/` or download from S3.
2.  **Run Restore Script:**
    ```bash
    ./scripts/restore.sh backups/backup_postgres_20231027_120000.sql.gz
    ```

### Scenario B: Full Server Migration / Disaster Recovery
If the VPS is lost or you are migrating to a new server.

1.  **Provision New Server:**
    - Install Docker & Docker Compose.
    - Clone the repository.
    - Copy `.env` file (restore from secure storage).

2.  **Restore Data:**
    - **Database:** Download latest SQL dump from S3 and run `./scripts/restore.sh <file>`.
    - **Files (Attachments):**
        - *If you have Restic backups:* Restore to the volume path.
        - *If migrating:* Use `rsync` to copy `storage` volume contents from old server.

3.  **Start Services:**
    ```bash
    docker compose up -d
    ```

## 4. Migration Guide (Bind Mounts to Volumes)

If you are upgrading from the old setup (using `./postgres-data` folder) to Named Volumes.

**Pre-requisites:**
- Downtime is required (approx 1-5 mins depending on data size).

**Steps:**
1.  **Run Migration Script:**
    This script backs up your local folders, creates the new Docker volumes, and copies the data into them.
    ```bash
    ./scripts/migrate-to-volumes.sh
    ```

2.  **Verify Data:**
    Check `migration_backup_*` folder created by the script to ensure your data is safe.

3.  **Deploy:**
    The script instructs you to update `docker-compose.yml` (already done if you pulled the latest code).
    ```bash
    docker compose up -d
    ```

## 5. Troubleshooting

**"PostgreSQL container not found" during backup:**
- The script looks for a container named `email-platform-postgres-1` or any container matching `postgres`.
- Check running containers: `docker ps`.

**"Permission denied" on S3 upload:**
- Check `AWS_ACCESS_KEY_ID` and permissions on the S3 bucket.
- Ensure the user has `s3:PutObject` and `s3:ListBucket`.

**Restore fails with "Database is being accessed by other users":**
- The `restore.sh` script automatically kills active connections. If it fails, manually stop the api container: `docker stop email-platform-api-1`.
