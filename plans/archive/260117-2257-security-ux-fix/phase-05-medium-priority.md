# Phase 5: Medium Priority Fixes

## Context
- **Parent Plan:** [plan.md](./plan.md)

## Overview
| Field | Value |
|-------|-------|
| Priority | P2 - Medium |
| Effort | 4h |
| Status | Pending |
| Dependencies | Phases 1-4 |

Address 12 medium-priority improvements for stability and compliance.

## Issues Addressed

| # | Issue | Effort |
|---|-------|--------|
| 1 | JWT revocation missing | 30min |
| 2 | Audit log retention undefined | 30min |
| 3 | Inbox list hard limit 100 | 30min |
| 4 | Optimistic UI missing | 45min |
| 5 | ARIA labels missing | 30min |
| 6 | IP anonymization in audit | 15min |
| 7 | Error retry UI | 30min |
| 8 | Self-role-change protection | 15min |
| 9 | Last admin check | 15min |
| 10 | Abuse report rate limit | 15min |
| 11 | Admin endpoint rate limits | 15min |
| 12 | WebSocket auth timeout | 15min |

## Implementation Summary

### 1. JWT Revocation
```typescript
// On logout
await redis.setex(`blacklist:${jti}`, JWT_REMAINING_TTL, '1');

// In authenticate
if (await redis.exists(`blacklist:${decoded.jti}`)) {
  throw app.httpErrors.unauthorized('Token revoked');
}
```

### 2. Audit Log Retention
```typescript
// cron/audit-cleanup.ts - Run daily
const RETENTION_DAYS = 90;
await prisma.auditLog.deleteMany({
  where: { createdAt: { lt: subDays(new Date(), RETENTION_DAYS) } }
});
```

### 3. Inbox Pagination
```typescript
// inboxes.ts - Add cursor pagination like messages
take: query.data.limit ?? 50,
cursor: query.data.cursor ? { id: query.data.cursor } : undefined,
```

### 4. Optimistic Delete
```tsx
// Dashboard.tsx
const handleDelete = async (msgId) => {
  // Optimistically remove
  setMessages(prev => prev.filter(m => m.id !== msgId));
  try {
    await api(`/messages/${msgId}`, { method: 'DELETE' });
  } catch {
    // Rollback on error
    setMessages(prev => [...prev, deletedMsg]);
    toast.error('Delete failed');
  }
};
```

### 5. ARIA Labels
```tsx
<button aria-label="Reply to email" title="Trả lời">
  <ReplyIcon />
</button>
```

### 6. IP Anonymization
```typescript
// audit.ts
import { anonymizeIp } from './ip-anonymizer';
ip: anonymizeIp(ctx.ip), // 192.168.1.xxx
```

### 7. Error Retry UI
```tsx
{error && (
  <div className="flex items-center gap-2 p-4 bg-red-50 rounded">
    <span>Lỗi tải dữ liệu</span>
    <button onClick={retry} className="underline">Thử lại</button>
  </div>
)}
```

### 8. Self-Role Protection
```typescript
// admin/users.ts
if (req.params.id === req.user.id && body.role !== req.user.role) {
  throw app.httpErrors.forbidden('Cannot change own role');
}
```

### 9. Last Admin Check
```typescript
if (body.role !== 'ADMIN') {
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  if (adminCount <= 1 && targetUser.role === 'ADMIN') {
    throw app.httpErrors.forbidden('Cannot demote last admin');
  }
}
```

### 10-12. Rate Limits
```typescript
// Abuse reports: 10 per 15 min per IP
// Admin endpoints: 30 per minute
// WebSocket auth timeout: increase to 30s
```

## Todo List

- [ ] Implement JWT blacklist on logout
- [ ] Add audit log cleanup cron
- [ ] Add pagination to inbox list
- [ ] Implement optimistic delete
- [ ] Add ARIA labels to all icon buttons
- [ ] Use ip-anonymizer in audit logs
- [ ] Add error retry UI component
- [ ] Block self-role changes
- [ ] Prevent last admin demotion
- [ ] Rate limit abuse reports
- [ ] Rate limit admin endpoints
- [ ] Increase WebSocket auth timeout

## Success Criteria

- [ ] Logged out tokens immediately invalid
- [ ] Audit logs cleaned after 90 days
- [ ] Can browse 100+ inboxes
- [ ] Delete feels instant
- [ ] Screen reader announces button purposes
- [ ] IPs anonymized in audit
- [ ] Retry button on errors
- [ ] Admin cannot demote self or last admin

## Next Steps

After Phase 5:
- Low priority items moved to backlog
- Security re-audit recommended
