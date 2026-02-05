# Backup Procedures

## Purpose
Document manual backup procedures for Ephemera email platform.

## Prerequisites
- SSH access to server
- Docker installed
- GPG key imported (for encryption)

## Manual Full Backup

### Step 1: Navigate to project directory
```bash
cd /path/to/email-platform
```

### Step 2: Run backup wrapper
```bash
./scripts/backup/backup-all.sh
```

### Expected output:
```
[2026-02-05 02:00:00] Starting backup batch: 20260205_020000
[2026-02-05 02:00:05] === PostgreSQL Backup ===
[2026-02-05 02:00:15] PostgreSQL backup: SUCCESS (10s)
[2026-02-05 02:00:15] === Redis Backup ===
[2026-02-05 02:00:17] Redis backup: SUCCESS (2s)
[2026-02-05 02:00:17] === Storage Backup ===
[2026-02-05 02:00:45] Storage backup: SUCCESS (28s)
[2026-02-05 02:00:45] === Google Drive Sync ===
[2026-02-05 02:01:30] GDrive sync: SUCCESS (45s)
[2026-02-05 02:01:30] Backup batch complete: 90s
```

### Step 3: Verify backups exist
```bash
ls -lh backups/
```

## Individual Component Backups

### PostgreSQL only
```bash
./scripts/backup/postgres-backup.sh
```

### Redis only
```bash
./scripts/backup/redis-backup.sh
```

### Storage only
```bash
./scripts/backup/storage-backup.sh
```

## Google Drive Manual Sync
```bash
./scripts/backup/storage-sync-gdrive.sh
```

## Troubleshooting
See [backup-troubleshooting.md](./backup-troubleshooting.md)
