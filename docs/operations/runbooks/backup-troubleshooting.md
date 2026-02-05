# Backup Troubleshooting

## Common Issues

### PostgreSQL Backup Fails

**Error:** `pg_dump: error: connection failed`
```bash
# Check container is running
docker ps | grep postgres

# Check logs
docker logs email-platform-postgres-1

# Verify credentials
docker exec email-platform-postgres-1 psql -U postgres -c "\l"
```

### Redis BGSAVE Timeout

**Error:** `BGSAVE took longer than expected`
```bash
# Check Redis memory usage
docker exec email-platform-redis-1 redis-cli INFO memory

# Manual BGSAVE
docker exec email-platform-redis-1 redis-cli BGSAVE

# Check disk space
df -h
```

### GPG Encryption Fails

**Error:** `gpg: encryption failed: No public key`
```bash
# Import GPG key
gpg --import /path/to/public-key.asc

# List keys
gpg --list-keys

# Set GPG_RECIPIENT env var
export GPG_RECIPIENT=manhquydev@gmail.com
```

### Google Drive Sync Fails

**Error:** `rclone: command not found`
```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure rclone
rclone config
```

**Error:** `Failed to copy: couldn't find root directory`
```bash
# Reconfigure rclone remote
rclone config reconnect gdrive:

# Test connection
rclone lsd gdrive:
```

### Disk Space Full

**Error:** `No space left on device`
```bash
# Check disk usage
df -h

# Run cleanup immediately
./scripts/backup/cleanup-backups.sh

# Delete old backups manually
find backups/ -mtime +7 -delete
```

## Backup Verification

### Verify backup integrity
```bash
# PostgreSQL
gunzip -c backups/postgres/daily/email_service_*.sql.gz | head -100

# Redis
file backups/redis/dump_*.rdb

# Storage
tar -tzf backups/storage/encrypted/storage_*.tar.gz.gpg 2>&1 | head -10
```

### Test restore in dev environment
```bash
# Use restore scripts with --test flag (if implemented)
# Or restore to separate test database
```
