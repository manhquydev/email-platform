# Disaster Recovery Procedure

## Purpose
Complete system recovery from scratch.

## Prerequisites
- Fresh server with Docker installed
- Access to Google Drive backups
- GPG private key
- Project repository access

## Recovery Order
1. Infrastructure (Docker, docker-compose)
2. Configuration files
3. PostgreSQL database
4. Redis cache
5. Storage volumes

## Step-by-Step

### 1. Clone repository
```bash
git clone <repo-url> email-platform
cd email-platform
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with production values
```

### 3. Start infrastructure
```bash
docker-compose up -d postgres redis caddy
```

### 4. Restore PostgreSQL
See [restore-postgres.md](./restore-postgres.md)

### 5. Restore Redis
See [restore-redis.md](./restore-redis.md)

### 6. Restore storage
See [restore-storage.md](./restore-storage.md)

### 7. Start application
```bash
docker-compose up -d
```

### 8. Verify
```bash
# Health check
curl https://api.manhquy.id.vn/health

# Check logs
docker-compose logs -f api
```

## Estimated RTO
- Infrastructure setup: 15 minutes
- Database restore: 10 minutes
- Storage restore: 5 minutes
- Verification: 5 minutes
- **Total: ~35 minutes**

## Escalation
If recovery fails after 2 attempts:
1. Contact: [Emergency contact]
2. Create incident ticket
3. Engage DBA for database issues
