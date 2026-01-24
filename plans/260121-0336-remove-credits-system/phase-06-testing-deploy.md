# Phase 6: Testing & Deploy

**Effort:** 2 hours
**Status:** pending
**Risk:** MEDIUM

## Objective

Comprehensive testing and production deployment.

## Pre-Deploy Testing

### 6.1 Unit Tests

```bash
cd services/api
npm run test
```

Expected: All tests pass (credit tests deleted).

### 6.2 Build Verification

```bash
# API
cd services/api && npm run build

# Web
cd services/web && npm run build

# Mobile (optional)
cd services/mobile && npm run build
```

### 6.3 Local Integration Test

1. Start local environment
2. Create user, try to send email
3. Verify tier limits work (no credits involved)
4. Admin: Create TIME_BASED package
5. Admin: Change user tier to all 5 options

## Deployment

### 6.4 Commit & Push

```bash
git add -A
git commit -m "refactor: remove credits system, simplify to tier-based limits

BREAKING CHANGE: Credits system removed
- Delete CreditService and CreditTransaction
- Remove credits field from User
- Remove USAGE_BASED package type
- Email sending now uses tier-based daily limits only
- Add BUSINESS tier to admin dropdowns"

git push origin main
```

### 6.5 Monitor GitHub Action

```bash
gh run watch --exit-status
```

### 6.6 Run Database Migration on Production

```bash
ssh -i .ssh/id_ed25519 root@165.22.48.193 \
  "docker exec email-platform-api-1 npx prisma migrate deploy"
```

### 6.7 Verify Deployment

```bash
# Health check
ssh -i .ssh/id_ed25519 root@165.22.48.193 \
  "curl -sf https://api.manhquy.click/health"

# Container status
ssh -i .ssh/id_ed25519 root@165.22.48.193 \
  "docker ps --format 'table {{.Names}}\t{{.Status}}'"
```

### 6.8 Post-Deploy Verification

1. Login to admin panel
2. Go to /admin/users - verify 5 tiers in dropdown
3. Go to /admin/packages - verify only TIME_BASED available
4. Go to /admin/codes - verify packages listed
5. Test email sending as FREE user

## Todo

- [ ] Run all unit tests
- [ ] Verify builds
- [ ] Local integration test
- [ ] Commit with breaking change note
- [ ] Push and monitor deploy
- [ ] Run production migration
- [ ] Verify health
- [ ] Post-deploy verification

## Rollback Procedure

If issues occur:

```bash
# 1. Revert git
git revert HEAD
git push origin main

# 2. Restore DB from backup
ssh -i .ssh/id_ed25519 root@165.22.48.193 \
  "docker exec email-platform-postgres-1 psql -U postgres -d email_service -c \
  \"ALTER TABLE \\\"User\\\" ADD COLUMN IF NOT EXISTS credits INT DEFAULT 0;
  UPDATE \\\"User\\\" u SET credits = b.credits FROM _backup_user_credits b WHERE u.id = b.id;\""

# 3. Force rebuild
ssh -i .ssh/id_ed25519 root@165.22.48.193 \
  "cd ~/email-platform. && git pull && docker compose -f docker-compose.prod.yml build --no-cache api web && docker compose -f docker-compose.prod.yml up -d --force-recreate"
```

## Success Criteria

- [ ] All tests pass
- [ ] Production deploy successful
- [ ] API healthy
- [ ] Admin panels working
- [ ] Email sending works with tier limits
- [ ] No errors in logs
