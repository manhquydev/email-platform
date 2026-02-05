# Redis Restore Procedure

## ⚠️ WARNING
This will reset all sessions, queues, and cache data.

## Prerequisites
- Backup RDB file
- Docker access

## Restore Procedure

### Step 1: Stop Redis container
```bash
docker stop email-platform-redis-1
```

### Step 2: Backup current data (safety)
```bash
docker cp email-platform-redis-1:/data/dump.rdb /tmp/dump_backup_$(date +%s).rdb
```

### Step 3: Copy backup to container
```bash
docker cp backups/redis/dump_YYYYMMDD_HHMMSS.rdb email-platform-redis-1:/data/dump.rdb
```

### Step 4: Start Redis
```bash
docker start email-platform-redis-1
```

### Step 5: Verify
```bash
docker exec email-platform-redis-1 redis-cli PING
# Expected: PONG
```

## Impact
- Users will need to re-login
- Background jobs may reprocess
- Rate limit counters reset
