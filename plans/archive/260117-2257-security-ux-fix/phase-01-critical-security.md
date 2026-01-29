# Phase 1: Critical Security Fixes

## Context
- **Parent Plan:** [plan.md](./plan.md)
- **Research:** [Security Patterns](./research/researcher-01-security-patterns.md)
- **Audit Report:** [Admin Security Audit](../reports/code-reviewer-260117-2302-admin-security-audit.md)

## Overview
| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Effort | 6h |
| Status | Pending |
| Dependencies | None |

Fix 3 critical security vulnerabilities that could lead to complete system compromise.

## Issues Addressed

### 1. TOTP Encryption Key Default `000...000`
- **File:** `services/api/src/config.ts:89`
- **Risk:** Complete 2FA bypass, account takeover
- **Impact:** All TOTP secrets decryptable with known key

### 2. Admin Route Race Condition
- **File:** `services/api/src/server.ts:278-294`
- **Risk:** Non-admin access to 30+ admin endpoints
- **Impact:** Privilege escalation

### 3. Incomplete Audit Logging
- **File:** `services/api/src/utils/audit.ts`
- **Risk:** No forensics for breach investigation
- **Impact:** GDPR/SOC2 compliance failure

## Related Code Files

### Modify
- `services/api/src/config.ts` - Add key validation
- `services/api/src/server.ts` - Fix requireAdmin decorator
- `services/api/src/utils/audit.ts` - Enhanced audit function

### Create
- `services/api/src/utils/validate-secrets.ts` - Secret validation utilities

## Implementation Steps

### Step 1: TOTP Key Validation (1.5h)

```typescript
// services/api/src/utils/validate-secrets.ts
export function validateTotpKey(key: string): void {
  if (!key || key.length !== 64) {
    throw new Error('TOTP_ENCRYPTION_KEY must be 64 hex chars');
  }
  if (/^0+$/.test(key)) {
    throw new Error('TOTP_ENCRYPTION_KEY cannot be all zeros - generate with: openssl rand -hex 32');
  }
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('TOTP_ENCRYPTION_KEY must be valid hex');
  }
}
```

**In config.ts:**
```typescript
// Remove default fallback
totpEncryptionKey: process.env.TOTP_ENCRYPTION_KEY ?? (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('TOTP_ENCRYPTION_KEY required in production');
  }
  return '0'.repeat(64); // Dev only warning
})(),
```

**In server.ts startup:**
```typescript
import { validateTotpKey } from './utils/validate-secrets';
// Before server.listen()
if (process.env.NODE_ENV === 'production') {
  validateTotpKey(appConfig.totpEncryptionKey);
}
```

### Step 2: Fix requireAdmin Race Condition (1.5h)

```typescript
// services/api/src/server.ts
// BEFORE (race condition)
app.decorate("requireAdmin", async (request, reply) => {
  await app.authenticate(request, reply);
  if (reply.sent) return;
  if (!request.user || request.user.role !== "ADMIN") {
    return reply.status(403).send({ error: "Admin access required" });
  }
});

// AFTER (throw to halt execution)
app.decorate("requireAdmin", async (request, reply) => {
  await app.authenticate(request, reply);
  if (!request.user) {
    throw app.httpErrors.unauthorized('Authentication required');
  }
  if (request.user.role !== "ADMIN") {
    throw app.httpErrors.forbidden('Admin access required');
  }
});
```

### Step 3: Enhanced Audit Logging (3h)

```typescript
// services/api/src/utils/audit.ts
interface AuditContext {
  userId: string | null;
  action: string;
  meta?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  success?: boolean;
}

export const recordAudit = async (ctx: AuditContext) => {
  await prisma.auditLog.create({
    data: {
      userId: ctx.userId ?? undefined,
      action: ctx.action,
      meta: ctx.meta as any,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
      success: ctx.success ?? true,
      createdAt: new Date(),
    },
  });
};

// Add to critical paths:
// - Failed login attempts
// - Password changes
// - 2FA enable/disable
// - API key creation/deletion
// - Admin actions
```

**Prisma schema addition:**
```prisma
model AuditLog {
  // existing fields...
  ip        String?
  userAgent String?
  requestId String?
  success   Boolean @default(true)
}
```

## Todo List

- [ ] Create validate-secrets.ts utility
- [ ] Update config.ts with key validation
- [ ] Add startup validation in server.ts
- [ ] Refactor requireAdmin to throw errors
- [ ] Test requireAdmin with non-admin user
- [ ] Update AuditLog schema
- [ ] Create Prisma migration
- [ ] Update recordAudit function signature
- [ ] Add audit calls to auth.ts (failed logins, password changes)
- [ ] Add audit calls to 2FA routes
- [ ] Add audit calls to API key routes
- [ ] Write unit tests for validation

## Success Criteria

- [ ] App fails to start with weak TOTP key in production
- [ ] Non-admin users get 403 on all /admin/* routes
- [ ] Failed login attempts logged with IP, user agent
- [ ] Password changes logged
- [ ] 2FA enable/disable logged
- [ ] All tests pass

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Existing 2FA users locked out if key changes | Medium | High | Don't change key, only validate |
| Audit log table grows large | Low | Medium | Add retention policy (Phase 5) |
| Breaking change to admin routes | Low | Low | Throw same HTTP status codes |

## Security Considerations

- Never log TOTP secrets or encryption keys
- Anonymize IP in audit logs for GDPR (use existing ip-anonymizer.ts)
- Rate limit audit log queries

## Next Steps

After Phase 1:
- Phase 2: Critical UX fixes
- Add security tests for new validation
