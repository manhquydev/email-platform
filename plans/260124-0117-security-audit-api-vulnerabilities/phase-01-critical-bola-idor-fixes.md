# Phase 1: Critical BOLA/IDOR Fixes

## Context Links
- **Parent Plan:** [plan.md](./plan.md)
- **Brainstorm:** [brainstorm-260124-0100-security-audit-api-vulnerabilities.md](../reports/brainstorm-260124-0100-security-audit-api-vulnerabilities.md)
- **Research:** [OWASP API Security](./research/researcher-01-owasp-api-security.md)

## Overview
| Field | Value |
|-------|-------|
| Date | 2026-01-24 |
| Priority | 🔴 P0 - Critical |
| Effort | 1-2 days |
| Status | ⬜ Pending |
| Review | ⬜ Not reviewed |

**Description:** Fix critical Broken Object Level Authorization (BOLA) and IDOR vulnerabilities identified in the security audit.

## Key Insights
- Fuzzy search endpoint exposes ALL messages to authenticated users
- Attachment download loads file before ownership verification
- API key deletion missing access control middleware

## Requirements

### Functional
- All data access must verify user ownership
- Consistent authorization pattern across all endpoints
- No data leakage through error responses

### Non-Functional
- No performance degradation >10%
- Maintain backward compatibility

## Architecture

```
Request → Auth Middleware → Ownership Check → Business Logic → Response
                              ↓
                    TeamService.canAccessInbox()
                    or direct ownerId verification
```

## Related Code Files

| Action | File |
|--------|------|
| 🔧 Modify | `services/api/src/routes/messages.ts` |
| 🔧 Modify | `services/api/src/routes/api-keys.ts` |
| 🔧 Modify | `services/api/src/routes/inboxes.ts` |
| ✅ Reference | `services/api/src/services/team.service.ts` |

## Implementation Steps

### 1. Fix Fuzzy Search BOLA (CRITICAL)
```typescript
// messages.ts:242-274 - Add ownership filter
const accessibleInboxIds = await TeamService.getAccessibleInboxIds(userId);

const messages = await prisma.$queryRaw`
  SELECT m.*, ...
  FROM "Message" m
  WHERE m."deletedAt" IS NULL
  AND m."inboxId" = ANY(${accessibleInboxIds}::uuid[])
  AND (similarity(m.subject, ${q}) > ${threshold}...)
`;
```

### 2. Fix Attachment Download IDOR
```typescript
// messages.ts:437 - Check ownership BEFORE loading file
const attachment = await prisma.attachment.findUnique({
  where: { id: params.data.id },
  select: { id: true, message: { select: { inboxId: true } } }
});
if (!attachment) return reply.status(404).send("Not found");

const hasAccess = await TeamService.canAccessInbox(userId, attachment.message.inboxId);
if (!hasAccess && role !== "ADMIN") return reply.status(403).send("Unauthorized");

// Only now load the full attachment and stream
```

### 3. Fix API Key Deletion
```typescript
// api-keys.ts:71 - Add enforceApiAccess middleware
app.delete("/api-keys/:id", {
  preHandler: [app.authenticate, enforceApiAccess]
}, async (req, reply) => { ... });
```

### 4. Fix Bulk Operations Info Leakage
```typescript
// inboxes.ts - Sanitize error responses
const failed = results
  .filter(r => r.status === "rejected")
  .map((r, i) => ({
    index: i,
    error: "Operation failed" // Don't expose specific IDs
  }));
```

## Todo List

- [ ] Fix fuzzy search BOLA vulnerability
- [ ] Add ownership check to attachment download
- [ ] Add `enforceApiAccess` to API key deletion
- [ ] Sanitize bulk operation error responses
- [ ] Write security tests for each fix
- [ ] Run existing test suite

## Success Criteria

- [ ] Fuzzy search only returns user's accessible messages
- [ ] Attachment download blocked for unauthorized users
- [ ] API key operations require proper tier access
- [ ] Bulk operations don't leak valid IDs
- [ ] All security tests pass
- [ ] No regression in existing tests

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance degradation | Medium | Low | Index optimization, caching |
| Breaking existing clients | Low | Medium | Maintain API contract |
| Incomplete fix | Low | High | Comprehensive test coverage |

## Security Considerations

- All fixes must be atomic (transaction where needed)
- Log security events for monitoring
- Consider rate limiting sensitive endpoints

## Next Steps

1. Implement fixes in order of severity
2. Write security tests
3. Code review
4. Deploy to staging
5. Proceed to Phase 2: JWT Security
