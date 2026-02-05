# Storage Restore Procedure

## ⚠️ WARNING
This will replace all email attachments.

## Prerequisites
- Encrypted backup file (.tar.gz.gpg)
- GPG private key available
- Docker access

## Restore Procedure

### Step 1: Stop API container
```bash
docker stop email-platform-api-1
```

### Step 2: Run restore script
```bash
./scripts/backup/storage-restore.sh backups/storage/encrypted/storage_YYYYMMDD.tar.gz.gpg
```

### Expected output:
```
WARNING: This will replace all email attachments!
Current storage volume will be overwritten.
Continue? (yes/no): yes
Decrypting backup...
Stopping API container...
Restoring to volume...
Starting API container...
Storage restore complete
```

### Step 3: Verify
```bash
docker exec email-platform-api-1 ls -lh /app/storage/attachments/ | head -20
```

## Restore from Google Drive
```bash
# Download from Google Drive
rclone copy gdrive:ephemera-backups/storage/storage_YYYYMMDD.tar.gz.gpg /tmp/

# Then run restore script
./scripts/backup/storage-restore.sh /tmp/storage_YYYYMMDD.tar.gz.gpg
```
