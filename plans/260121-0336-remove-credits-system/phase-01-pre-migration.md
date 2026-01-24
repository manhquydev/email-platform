# Phase 1: Pre-migration Check

**Effort:** 1 hour
**Status:** pending
**Risk:** LOW

## Objective

Kiểm tra users có credits và backup data trước khi xóa.

## Tasks

### 1.1 Query Users với Credits > 0

```bash
# SSH vào production
ssh -i .ssh/id_ed25519 root@165.22.48.193 \
  "docker exec email-platform-postgres-1 psql -U postgres -d email_service -c \
  \"SELECT id, email, credits, tier FROM \\\"User\\\" WHERE credits > 0 ORDER BY credits DESC;\""
```

### 1.2 Backup CreditTransaction Table

```bash
ssh -i .ssh/id_ed25519 root@165.22.48.193 \
  "docker exec email-platform-postgres-1 psql -U postgres -d email_service -c \
  \"CREATE TABLE IF NOT EXISTS _backup_credit_transactions AS SELECT * FROM \\\"CreditTransaction\\\";\""
```

### 1.3 Backup User Credits

```bash
ssh -i .ssh/id_ed25519 root@165.22.48.193 \
  "docker exec email-platform-postgres-1 psql -U postgres -d email_service -c \
  \"CREATE TABLE IF NOT EXISTS _backup_user_credits AS SELECT id, email, credits FROM \\\"User\\\" WHERE credits > 0;\""
```

### 1.4 Decision Point

**If users have credits > 0:**
- Notify via email about deprecation
- Compensation: Extend subscription 30 days OR upgrade tier 1 month
- Wait 7 days before proceeding

**If no users have credits:**
- Proceed immediately to Phase 2

## Todo

- [ ] Run query to check users with credits
- [ ] Create backup tables
- [ ] Decide compensation (if needed)
- [ ] Proceed to Phase 2

## Success Criteria

- Backup tables created
- User impact documented
- Go/No-go decision made
