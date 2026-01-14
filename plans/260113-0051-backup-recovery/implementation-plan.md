# Implementation Plan: Enterprise Backup & Recovery

## Overview
This plan details the technical steps to implement a robust backup system using Restic for volume backups and `pg_dump` for database snapshots, integrated directly into the Docker Compose stack.

## 1. Backup Infrastructure Setup

### Cloud Storage Preparation
1. **Cloudflare R2 / Backblaze B2:** Create a bucket named `email-platform-backups`.
2. **Access Keys:** Generate API keys (Access Key ID & Secret Access Key) with read/write permissions for that bucket.
3. **Repository Password:** Generate a strong random password for Restic encryption.

## 2. Docker Compose Integration

Add the following service to `docker-compose.prod.yml`:

```yaml
services:
  # ... existing services ...

  backup:
    image: lobatogit/restic-backup-docker:latest # or custom image with restic + postgres-client
    restart: unless-stopped
    environment:
      - RESTIC_REPOSITORY=s3:https://<endpoint>/email-platform-backups
      - RESTIC_PASSWORD=${RESTIC_PASSWORD}
      - AWS_ACCESS_KEY_ID=${BACKUP_S3_KEY}
      - AWS_SECRET_ACCESS_KEY=${BACKUP_S3_SECRET}
      - BACKUP_CRON=0 * * * * # Every hour
      - RESTIC_FORGET_ARGS=--keep-daily 7 --keep-weekly 4 --keep-monthly 12
      - POSTGRES_HOST=postgres
      - POSTGRES_DB=email_service
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/data/postgres:ro
      - api_storage:/data/api_storage:ro
      - maildir_data:/data/maildir:ro
      - ./backups:/pre-backup-scripts:ro
    depends_on:
      - postgres
```

## 3. Pre-Backup Script (`backups/pre-backup.sh`)
This script runs before Restic to ensure a fresh DB dump is included in the volume backup.

```bash
#!/bin/bash
echo "Starting PostgreSQL dump..."
mkdir -p /data/postgres_dumps
pg_dump -h postgres -U postgres -d email_service > /data/postgres_dumps/latest.sql
echo "Dump completed."
```

## 4. Disaster Recovery (Restore) Process

### Full Server Recovery
1. **Setup New Server:** Ubuntu 22.04 + Docker + Docker Compose.
2. **Initialize Restic:**
   ```bash
   export RESTIC_REPOSITORY="s3:https://<endpoint>/email-platform-backups"
   export RESTIC_PASSWORD="..."
   export AWS_ACCESS_KEY_ID="..."
   export AWS_SECRET_ACCESS_KEY="..."
   restic init
   ```
3. **Restore Volumes:**
   ```bash
   restic restore latest --target /
   ```
4. **Start Containers:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```
5. **Restore Database (if needed from dump):**
   ```bash
   docker exec -i $(docker ps -qf "name=postgres") psql -U postgres email_service < /data/postgres_dumps/latest.sql
   ```

## 5. Security Best Practices
- **Read-Only Mounts:** Always mount production volumes as `:ro` in the backup container to prevent accidental corruption.
- **Secret Management:** Store credentials in a `.env.backup` file (added to `.gitignore`).
- **Healthchecks:** Add a `curl` command at the end of the backup script to ping `healthchecks.io`.

## 6. Migration Guide (Host to Host)
1. **Sync initial data:** `rclone sync /var/lib/docker/volumes remote:target-server:/var/lib/docker/volumes`
2. **Stop old server services.**
3. **Final sync.**
4. **Update DNS.**
5. **Start services on new server.**
