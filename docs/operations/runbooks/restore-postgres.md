# PostgreSQL Restore Procedure

## ⚠️ WARNING
This procedure will replace database data. Ensure you have a backup of current state before proceeding.

## Prerequisites
- Backup file (.sql.gz or .sql.gz.gpg)
- Docker access
- Database container running

## Restore to New Database (Safe)

### Step 1: List available backups
```bash
ls -lh backups/postgres/daily/
ls -lh backups/postgres/encrypted/
```

### Step 2: Decrypt if needed
```bash
gpg --decrypt --output /tmp/backup.sql.gz backups/postgres/encrypted/backup.sql.gz.gpg
```

### Step 3: Restore to new database
```bash
./scripts/backup/postgres-restore.sh /tmp/backup.sql.gz
```

### Expected output:
```
WARNING: This will create a new database 'email_service_restored' from backup.
After verification, you can swap it with the original database.
Continue? (yes/no): yes
Dropping existing email_service_restored if present...
Creating database email_service_restored...
Restoring backup to email_service_restored...
Restore complete to email_service_restored
```

### Step 4: Verify restore
```bash
docker exec email-platform-postgres-1 psql -U postgres -d email_service_restored -c "\dt"
```

### Step 5: Swap databases (if verified)
```bash
# Stop API
docker stop email-platform-api-1

# Swap databases
docker exec email-platform-postgres-1 psql -U postgres -c "
  ALTER DATABASE email_service RENAME TO email_service_old;
  ALTER DATABASE email_service_restored RENAME TO email_service;
"

# Start API
docker start email-platform-api-1
```

## Full Cluster Restore
```bash
gunzip -c backups/postgres/weekly/cluster_YYYYMMDD.sql.gz | \
  docker exec -i email-platform-postgres-1 psql -U postgres
```

## Rollback
If restore fails:
```bash
# Restore from old database
docker exec email-platform-postgres-1 psql -U postgres -c "
  ALTER DATABASE email_service RENAME TO email_service_failed;
  ALTER DATABASE email_service_old RENAME TO email_service;
"
```
