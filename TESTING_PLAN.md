# Email Platform - Testing Plan

## Test Strategy Overview

### Test Levels

| Level | Tool | Location | Status |
|-------|------|----------|--------|
| Unit Tests | Vitest | `src/test/*.test.ts` | ✅ Configured |
| Integration Tests | Vitest | `src/test/*.test.ts` | ⚠️ Needs DB |
| E2E Tests | Vitest | `src/test/smtp.e2e.test.ts` | ⚠️ Needs DB |
| Build Tests | TypeScript + Vite | CI | ✅ Passing |

---

## Pre-Deployment Checklist

### 1. Build Verification ✅
```bash
# API
cd services/api
npm run lint   # ✅ Passed
npm run build  # ✅ Passed

# Web
cd services/web
npm run build  # ✅ Passed (1690 modules)
```

### 2. Integration Tests (Requires Test DB)
```bash
# Start test database
docker run -d -p 5433:5432 -e POSTGRES_PASSWORD=postgres postgres:16-alpine

# Run migrations
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/email_service_test" npx prisma migrate deploy

# Run tests
npm test
```

### 3. Manual Testing Scenarios

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Login | Enter credentials | JWT token returned |
| Add Domain | Enter domain name | PENDING status, token shown |
| Verify Domain | Add TXT record, click verify | VERIFIED status |
| Create Inbox | Click +, enter name | Inbox created |
| Random Inbox | Click shuffle icon | 8-char inbox created |
| Receive Email | Send email to inbox | Message appears |

---

## Test Environment Setup

### Required Services
- PostgreSQL 16 (port 5433 for tests)
- Redis 7 (port 6380 for tests)

### Environment Variables
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/email_service_test
JWT_SECRET=test-secret
REDIS_HOST=localhost
REDIS_PORT=6380
```

---

## CI/CD Integration

### GitHub Actions (recommended)
```yaml
test:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16-alpine
      env:
        POSTGRES_PASSWORD: postgres
      ports:
        - 5433:5432
    redis:
      image: redis:7-alpine
      ports:
        - 6380:6379
```

---

## Test Results Summary

| Component | Build | Lint | Unit Tests |
|-----------|-------|------|------------|
| API | ✅ Pass | ✅ Pass | ⚠️ Needs DB |
| Web | ✅ Pass | N/A | ✅ Pass |
