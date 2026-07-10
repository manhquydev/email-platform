# Backup & Disaster Recovery Guide

**Version:** 1.0 | **Updated:** 2026-01-13

---

## Table of Contents

1. [Overview](#1-overview)
2. [Current Backup System](#2-current-backup-system)
3. [3-2-1 Backup Strategy](#3-3-2-1-backup-strategy)
4. [PostgreSQL Backup Methods](#4-postgresql-backup-methods)
5. [Cloud Storage Setup](#5-cloud-storage-setup)
6. [Server Migration Guide](#6-server-migration-guide)
7. [Disaster Scenarios & Recovery](#7-disaster-scenarios--recovery)
8. [Monitoring & Alerts](#8-monitoring--alerts)
9. [Quick Reference Commands](#9-quick-reference-commands)

---

## 1. Overview

### Why This Matters

After the data loss incident on 2026-01-12 (Docker volume vs bind mount confusion), this guide establishes robust backup procedures to prevent future data loss.

### Key Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| **RPO** (Recovery Point Objective) | 6 hours | Max acceptable data loss |
| **RTO** (Recovery Time Objective) | 1 hour | Max acceptable downtime |
| **Retention** | 30 days | Backup history kept |

### Infrastructure Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Production Server                     │
│                  165.22.48.193 (DO VPS)                 │
├─────────────────────────────────────────────────────────┤
│  Docker Compose Stack:                                   │
│  ├── postgres:16-alpine   (Primary Database)            │
│  ├── redis:7-alpine       (Cache/Queue)                 │
│  ├── api (Node.js)        (Backend Service)             │
│  ├── web (React)          (Frontend)                    │
│  ├── caddy                (Reverse Proxy/SSL)           │
│  ├── backup               (Automated Backup Service)    │
│  └── mailpit/postfix      (Email)                       │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Current Backup System

### Existing Components

| Component | Status | Location |
|-----------|--------|----------|
| Backup script | ✅ Active | `scripts/backup.sh` |
| Backup container | ✅ Configured | `services/backup/Dockerfile` |
| Schedule | Every 6 hours | Cron in container |
| Local storage | `./backups/` | Bind mount |
| S3 upload | Optional | Requires config |

### Current Script Features

```bash
# Usage
./scripts/backup.sh [OPTIONS]

# Options
--s3           # Upload to S3
--retention N  # Keep N days (default: 7)
--dir PATH     # Backup directory
```

### Volumes to Backup

| Volume | Data | Priority |
|--------|------|----------|
| `email_postgres_data` | Database | 🔴 Critical |
| `email_storage` | Attachments | 🟠 High |
| `redis_data` | Cache/Sessions | 🟡 Medium |
| `caddy_data` | SSL certs | 🟢 Low (auto-renews) |

---

## 3. 3-2-1 Backup Strategy

### The Rule

> **3** copies of data, on **2** different media, with **1** off-site

### Implementation

```
┌─────────────────────────────────────────────────────────┐
│                    3-2-1 Implementation                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  COPY 1: Production Database (Primary)                   │
│  └── Location: Docker volume on VPS                      │
│                                                          │
│  COPY 2: Local Backup (Same Server)                      │
│  └── Location: ./backups/ directory                      │
│  └── Schedule: Every 6 hours                             │
│  └── Retention: 7 days                                   │
│                                                          │
│  COPY 3: Cloud Backup (Off-site) ← RECOMMENDED           │
│  └── Location: S3/Spaces/R2/Backblaze                    │
│  └── Schedule: Daily                                     │
│  └── Retention: 30-90 days                               │
│  └── Feature: Immutable/Object Lock                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Extended: 3-2-1-1-0 Rule

For ransomware protection:

- **3** copies
- **2** different media
- **1** off-site
- **1** offline/immutable (air-gapped or Object Lock)
- **0** errors (verified backups)

---

## 4. PostgreSQL Backup Methods

### Method Comparison

| Method | Speed | Size | PITR | Use Case |
|--------|-------|------|------|----------|
| `pg_dump` | Medium | Small | No | Daily logical backup |
| `pg_basebackup` | Fast | Large | Yes | Physical backup + replication |
| WAL Archiving | N/A | Medium | Yes | Continuous protection |

### 4.1 pg_dump (Current Method)

```bash
# Manual backup
docker exec postgres pg_dump -U postgres -d email_service | gzip > backup.sql.gz

# Restore
gunzip -c backup.sql.gz | docker exec -i postgres psql -U postgres -d email_service
```

### 4.2 pg_basebackup (Physical Backup)

```bash
# Full physical backup (for PITR setup)
docker exec postgres pg_basebackup -D /backup -Ft -z -P -U postgres

# Faster for large databases
# Required for streaming replication
```

### 4.3 Point-in-Time Recovery (PITR)

Enable in `postgresql.conf`:

```ini
wal_level = replica
archive_mode = on
archive_command = 'cp %p /archive/%f'
```

Recovery example:

```bash
# Restore to specific timestamp
recovery_target_time = '2026-01-12 15:00:00'
```

### 4.4 Streaming Replication (Hot Standby)

For high availability setup:

**Primary Server (`postgresql.conf`):**

```ini
wal_level = replica
max_wal_senders = 3
wal_keep_size = 1GB
```

**Primary Server (`pg_hba.conf`):**

```
host replication replicator standby_ip/32 scram-sha-256
```

**Standby Server:**

```bash
pg_basebackup -h primary_ip -D /var/lib/postgresql/data -U replicator -P -R
```

---

## 5. Cloud Storage Setup

### Provider Comparison

| Provider | Cost/TB | S3 Compatible | Object Lock | Egress |
|----------|---------|---------------|-------------|--------|
| DigitalOcean Spaces | $5/250GB | ✅ | ❌ | $10/TB |
| Backblaze B2 | $6/TB | ✅ | ✅ | Free* |
| Cloudflare R2 | $15/TB | ✅ | ❌ | Free |
| AWS S3 | $23/TB | ✅ | ✅ | $90/TB |
| Wasabi | $7/TB | ✅ | ✅ | Free |

*Backblaze free egress via Cloudflare partnership

### 5.1 DigitalOcean Spaces Setup

```bash
# Install rclone
curl -fsSL https://rclone.org/install.sh | sudo bash

# Configure
rclone config
# Type: s3
# Provider: DigitalOcean
# Endpoint: sgp1.digitaloceanspaces.com
# Access Key: <from DO dashboard>
# Secret Key: <from DO dashboard>
```

### 5.2 Backup Script with Cloud Upload

Create `/root/email-platform/scripts/cloud-backup.sh`:

```bash
#!/bin/bash
set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/root/email-platform/backups"
REMOTE="do-spaces:email-backups"

# 1. Create local backup
./scripts/backup.sh --dir "$BACKUP_DIR"

# 2. Upload to cloud
rclone copy "$BACKUP_DIR" "$REMOTE/postgres/" \
  --include "backup_postgres_*.sql.gz" \
  --min-age 0s \
  --max-age 1d

# 3. Backup Redis
docker exec redis redis-cli SAVE
docker cp redis:/data/dump.rdb "$BACKUP_DIR/redis_${TIMESTAMP}.rdb"
rclone copy "$BACKUP_DIR/redis_${TIMESTAMP}.rdb" "$REMOTE/redis/"

# 4. Backup storage attachments
rclone sync /var/lib/docker/volumes/email_storage/_data "$REMOTE/storage/"

# 5. Cloud retention (keep 30 days)
rclone delete "$REMOTE" --min-age 30d

echo "Cloud backup completed: $TIMESTAMP"
```

### 5.3 Cron Schedule

```bash
# Edit crontab
crontab -e

# Add entries
# Local backup every 6 hours
0 */6 * * * /root/email-platform/scripts/backup.sh >> /var/log/backup.log 2>&1

# Cloud backup daily at 3 AM
0 3 * * * /root/email-platform/scripts/cloud-backup.sh >> /var/log/cloud-backup.log 2>&1
```

### 5.4 Immutable Backups (Ransomware Protection)

For Backblaze B2 with Object Lock:

```bash
# Configure bucket with Object Lock
b2 create-bucket --lifecycleRules '[]' email-backups-immutable allPrivate --fileLockEnabled

# Upload with retention
b2 upload-file email-backups-immutable backup.sql.gz backups/backup.sql.gz \
  --fileRetentionMode governance \
  --fileRetentionRetainUntilTs $(($(date +%s) + 30*24*60*60))000
```

---

## 6. Server Migration Guide

### Pre-Migration Checklist

- [ ] DNS TTL lowered to 2-5 minutes (1 week before)
- [ ] New server provisioned and secured
- [ ] Docker & Docker Compose installed
- [ ] fail2ban configured
- [ ] UFW firewall rules configured
- [ ] SSH key authentication only

### 6.1 New Server Setup

```bash
# 1. Update system
apt update && apt upgrade -y

# 2. Install Docker
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin -y

# 3. Security hardening
apt install fail2ban -y
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 25
ufw allow 587
ufw allow 993
ufw enable

# 4. Create project directory
mkdir -p /root/email-platform
```

### 6.2 Data Transfer Methods

#### Method A: rsync (Recommended)

```bash
# On OLD server - initial sync
rsync -avzP --progress \
  /root/email-platform/ \
  root@NEW_SERVER_IP:/root/email-platform/

# Sync Docker volumes
rsync -avzP \
  /var/lib/docker/volumes/email_postgres_data/ \
  root@NEW_SERVER_IP:/var/lib/docker/volumes/email_postgres_data/
```

#### Method B: pg_dump + Restore

```bash
# On OLD server
docker exec postgres pg_dump -U postgres -d email_service > full_backup.sql
scp full_backup.sql root@NEW_SERVER_IP:/root/

# On NEW server
docker compose up -d postgres
cat full_backup.sql | docker exec -i postgres psql -U postgres -d email_service
```

#### Method C: Docker Volume Export

```bash
# On OLD server
docker run --rm \
  -v email_postgres_data:/source \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_volume.tar.gz -C /source .

scp postgres_volume.tar.gz root@NEW_SERVER_IP:/root/

# On NEW server
docker volume create email_postgres_data
docker run --rm \
  -v email_postgres_data:/dest \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres_volume.tar.gz -C /dest
```

### 6.3 Zero-Downtime Migration

```
┌─────────────────────────────────────────────────────────┐
│                Zero-Downtime Migration Flow              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Phase 1: Preparation (1 week before)                    │
│  ├── Lower DNS TTL to 300 seconds                        │
│  ├── Set up new server                                   │
│  └── Initial data sync                                   │
│                                                          │
│  Phase 2: Incremental Sync (ongoing)                     │
│  ├── Cron job: rsync every 10 minutes                    │
│  └── PostgreSQL streaming replication (optional)         │
│                                                          │
│  Phase 3: Cutover (maintenance window)                   │
│  ├── Stop writes on old server                           │
│  ├── Final rsync                                         │
│  ├── Update DNS to new server IP                         │
│  ├── Start services on new server                        │
│  └── Verify functionality                                │
│                                                          │
│  Phase 4: Post-Migration                                 │
│  ├── Monitor for 24-48 hours                             │
│  ├── Keep old server as fallback                         │
│  └── Decommission old server after 1 week                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 6.4 DNS Cutover

```bash
# Using Cloudflare API
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records/RECORD_ID" \
  -H "Authorization: Bearer API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"content":"NEW_SERVER_IP"}'
```

---

## 7. Disaster Scenarios & Recovery

### Scenario Matrix

| Scenario | RTO | RPO | Recovery Method |
|----------|-----|-----|-----------------|
| Accidental `docker compose down -v` | 30 min | 6 hrs | Cloud backup restore |
| Database corruption | 1 hr | Variable | PITR or last good backup |
| Ransomware attack | 2-4 hrs | 24 hrs | Immutable backup restore |
| Server hardware failure | 1-2 hrs | 6 hrs | New server + cloud restore |
| Data center outage | 2-4 hrs | 6 hrs | DNS failover + standby |
| Wrong DELETE query | 15 min | 0 | PITR (if enabled) |
| DDoS attack | 15 min | 0 | Cloudflare mitigation |

### 7.1 Accidental Volume Deletion

**Prevention:**

```bash
# NEVER use -v flag unless intentional
docker compose down      # Safe - keeps volumes
docker compose down -v   # DANGEROUS - deletes volumes!
```

**Recovery:**

```bash
# 1. Check if old volume still exists
docker volume ls | grep postgres

# 2. If named volume exists, copy to new mount
docker run --rm \
  -v OLD_VOLUME_NAME:/source \
  -v /root/email-platform/postgres-data:/dest \
  alpine cp -a /source/. /dest/

# 3. If not, restore from cloud backup
rclone copy do-spaces:email-backups/postgres/latest.sql.gz /tmp/
gunzip /tmp/latest.sql.gz
docker compose up -d postgres
cat /tmp/latest.sql | docker exec -i postgres psql -U postgres -d email_service
```

### 7.2 Database Corruption

**Detection:**

```bash
# Check for corruption
docker exec postgres pg_isready
docker exec postgres psql -U postgres -c "SELECT count(*) FROM users;"
```

**Recovery:**

```bash
# 1. Stop corrupted database
docker compose stop postgres

# 2. Backup corrupted data (for analysis)
mv postgres-data postgres-data-corrupted

# 3. Create fresh volume
mkdir postgres-data

# 4. Restore from backup
docker compose up -d postgres
# Wait for init...
gunzip -c backups/latest.sql.gz | docker exec -i postgres psql -U postgres
```

### 7.3 Ransomware Attack

**Indicators:**

- Files encrypted with strange extensions
- Ransom notes in directories
- Unable to access services

**Response:**

```bash
# 1. ISOLATE IMMEDIATELY
ufw deny from any

# 2. Assess damage from external machine
ssh -i key root@server "ls -la /root/email-platform"

# 3. If compromised, do NOT pay ransom
# Provision new server instead

# 4. Restore from IMMUTABLE backup (pre-attack)
# Use Backblaze B2 Object Lock backup
b2 download-file email-backups-immutable backups/backup_20260110.sql.gz ./

# 5. Full server rebuild
# See Section 6: Server Migration Guide
```

### 7.4 Accidental DELETE Query

**If PITR enabled:**

```bash
# 1. Find when deletion occurred
grep "DELETE" /var/log/postgresql/postgresql.log

# 2. Restore to point before deletion
recovery_target_time = '2026-01-12 14:55:00'

# 3. Perform recovery
docker compose stop postgres
# Configure recovery.conf
docker compose up postgres
```

**If no PITR:**

```bash
# Restore from last backup (data loss = time since last backup)
./scripts/restore.sh backups/backup_postgres_20260112_120000.sql.gz
```

### 7.5 Server Hardware Failure

```bash
# 1. Provision new server immediately
doctl compute droplet create email-platform-new \
  --size s-2vcpu-4gb \
  --image ubuntu-22-04-x64 \
  --region sgp1

# 2. Set up and restore (see Section 6)

# 3. Update DNS to new IP

# 4. Notify users of brief downtime
```

---

## 8. Monitoring & Alerts

### 8.1 Backup Monitoring Script

Create `/root/email-platform/scripts/check-backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/root/email-platform/backups"
MAX_AGE_HOURS=7  # Alert if no backup in 7 hours
TELEGRAM_BOT_TOKEN="your_bot_token"
TELEGRAM_CHAT_ID="your_chat_id"

# Find latest backup
LATEST=$(find "$BACKUP_DIR" -name "backup_postgres_*.sql.gz" -type f -mmin -$((MAX_AGE_HOURS * 60)) | head -1)

if [ -z "$LATEST" ]; then
    MSG="⚠️ BACKUP ALERT: No backup found in the last ${MAX_AGE_HOURS} hours!"
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d chat_id="$TELEGRAM_CHAT_ID" \
      -d text="$MSG"
fi
```

### 8.2 Health Check Endpoints

Add to monitoring:

```bash
# API health
curl -f https://api.manhquy.id.vn/health || alert "API down"

# Database health
docker exec postgres pg_isready || alert "DB down"

# Disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
[ "$DISK_USAGE" -gt 85 ] && alert "Disk usage critical: ${DISK_USAGE}%"
```

### 8.3 Grafana Dashboard

Add these Prometheus metrics:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'backup-monitor'
    static_configs:
      - targets: ['localhost:9100']
    metrics_path: /probe
```

---

## 9. Quick Reference Commands

### Daily Operations

```bash
# Manual backup
./scripts/backup.sh

# Check backup status
ls -lah backups/ | tail -10

# Verify backup integrity
gunzip -t backups/latest.sql.gz && echo "OK"

# Cloud backup status
rclone ls do-spaces:email-backups/postgres/ | tail -5
```

### Emergency Commands

```bash
# Quick database restore
gunzip -c backups/BACKUP_FILE.sql.gz | docker exec -i postgres psql -U postgres -d email_service

# Export single table
docker exec postgres pg_dump -U postgres -t users email_service > users_backup.sql

# Check database size
docker exec postgres psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('email_service'));"

# List all backups (local + cloud)
ls -lah backups/
rclone ls do-spaces:email-backups/
```

### Server Migration

```bash
# Pre-migration data sync
rsync -avzP /root/email-platform/ root@NEW_IP:/root/email-platform/

# Volume transfer
docker run --rm -v VOL:/src -v $(pwd):/bak alpine tar czf /bak/vol.tar.gz -C /src .
```

---

## Appendix A: Environment Variables

Required for cloud backups:

```bash
# DigitalOcean Spaces
SPACES_KEY=your_access_key
SPACES_SECRET=your_secret_key
SPACES_REGION=sgp1
SPACES_BUCKET=email-backups

# AWS S3 (alternative)
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
S3_BUCKET=your-bucket

# Backblaze B2 (for immutable)
B2_APPLICATION_KEY_ID=xxx
B2_APPLICATION_KEY=xxx
```

---

## Appendix B: Recommended Schedule

| Task | Frequency | Script |
|------|-----------|--------|
| Local pg_dump | Every 6 hours | `backup.sh` |
| Cloud upload | Daily 3 AM | `cloud-backup.sh` |
| Backup verification | Weekly | `check-backup.sh` |
| Restore test | Monthly | Manual |
| Full DR drill | Quarterly | Manual |

---

## Appendix C: Cost Estimation

| Item | Monthly Cost |
|------|--------------|
| DigitalOcean Spaces (10GB) | $5 |
| Backblaze B2 (50GB immutable) | $0.35 |
| Additional server (standby) | $12-24 |
| **Total** | **~$18-30** |

---

**Document Maintainer:** DevOps Team
**Last Review:** 2026-01-13
**Next Review:** 2026-04-13
