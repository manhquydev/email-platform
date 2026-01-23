# Phase 4: Input Validation & Injection Prevention

## Context Links
- **Parent Plan:** [plan.md](./plan.md)
- **Depends on:** [Phase 3](./phase-03-rate-limiting-enhancement.md)
- **Research:** [OWASP API Security](./research/researcher-01-owasp-api-security.md)

## Overview
| Field | Value |
|-------|-------|
| Date | 2026-01-24 |
| Priority | 🟡 P1 - High |
| Effort | 1-2 days |
| Status | ⬜ Pending |
| Review | ⬜ Not reviewed |

**Description:** Audit and enhance input validation to prevent SQL injection, path traversal, and email header injection.

## Key Insights
- Raw SQL in fuzzy search needs parameterization audit
- Storage key validation needed for path traversal
- Email reply/forward has header injection risk
- Webhook URLs need SSRF protection

## Requirements

### Functional
- All raw SQL queries use parameterized queries
- Storage keys validated against traversal
- Email headers sanitized
- Webhook URLs validated (no internal IPs)

### Non-Functional
- No false positives blocking legitimate input
- Clear error messages for validation failures

## Related Code Files

| Action | File |
|--------|------|
| 🔧 Modify | `services/api/src/routes/messages.ts` |
| 🔧 Modify | `services/api/src/services/storage.ts` |
| 🔧 Modify | `services/api/src/services/outbound.ts` |
| 🔧 Modify | `services/api/src/routes/webhooks.ts` |
| ➕ Create | `services/api/src/utils/input-sanitizer.ts` |

## Implementation Steps

### 1. Audit Raw SQL Queries
```typescript
// messages.ts - Ensure proper parameterization
// Current (needs verification):
const messages = await prisma.$queryRaw`
  SELECT m.* FROM "Message" m
  WHERE similarity(m.subject, ${q}) > ${threshold}
`;
// Prisma $queryRaw with template literals is safe
// But verify all dynamic values are template variables
```

### 2. Path Traversal Prevention
```typescript
// input-sanitizer.ts
export function sanitizeStorageKey(key: string): string {
  // Remove path traversal attempts
  const sanitized = key
    .replace(/\.\./g, '')
    .replace(/^\/+/, '')
    .replace(/[<>:"|?*]/g, '');

  // Validate against allowed pattern
  if (!/^[a-zA-Z0-9\-_\/\.]+$/.test(sanitized)) {
    throw new Error('Invalid storage key');
  }

  return sanitized;
}

// storage.ts - Apply validation
async getReadStream(storageKey: string) {
  const safeKey = sanitizeStorageKey(storageKey);
  const filePath = path.join(this.baseDir, safeKey);

  // Ensure path is within base directory
  if (!filePath.startsWith(path.resolve(this.baseDir))) {
    throw new Error('Path traversal detected');
  }

  return fs.createReadStream(filePath);
}
```

### 3. Email Header Injection Prevention
```typescript
// input-sanitizer.ts
export function sanitizeEmailHeader(value: string): string {
  // Remove CR/LF to prevent header injection
  return value
    .replace(/[\r\n]/g, ' ')
    .replace(/\0/g, '')
    .trim();
}

// outbound.ts - Apply to all headers
const safeSubject = sanitizeEmailHeader(subject);
const safeFrom = sanitizeEmailHeader(fromAddress);
const safeTo = sanitizeEmailHeader(toAddress);
```

### 4. SSRF Protection for Webhooks
```typescript
// input-sanitizer.ts
import { isIP } from 'net';

export function validateWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Block internal protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // Block internal hostnames
    const blockedHosts = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];
    if (blockedHosts.includes(parsed.hostname)) {
      return false;
    }

    // Block private IP ranges
    if (isPrivateIP(parsed.hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function isPrivateIP(host: string): boolean {
  if (!isIP(host)) return false;
  // Check RFC 1918, RFC 4193, link-local ranges
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^fc00:/i,
    /^fe80:/i,
  ];
  return privateRanges.some(r => r.test(host));
}
```

### 5. Enhanced Zod Schemas
```typescript
// Add strict mode to prevent extra fields
const webhookSchema = z.object({
  url: z.string().url().refine(validateWebhookUrl, {
    message: "Invalid webhook URL (internal addresses blocked)"
  }),
  events: z.array(z.enum(['email.received', 'email.deleted'])),
  secret: z.string().min(16).optional(),
}).strict(); // Reject unknown fields
```

## Todo List

- [ ] Audit all `$queryRaw` usages
- [ ] Create input-sanitizer.ts utility
- [ ] Add path traversal protection to storage
- [ ] Sanitize email headers in outbound
- [ ] Add SSRF protection to webhooks
- [ ] Add `.strict()` to all Zod schemas
- [ ] Write injection test cases
- [ ] Security scan with SQLMap/Nuclei

## Success Criteria

- [ ] No SQL injection possible
- [ ] Path traversal blocked
- [ ] Email header injection blocked
- [ ] SSRF via webhooks blocked
- [ ] All security tests pass

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| False positives | Medium | Low | Thorough testing |
| Bypass via encoding | Low | High | Multiple layers of validation |
| Performance impact | Low | Low | Efficient regex patterns |

## Security Considerations

- Defense in depth: validate at multiple layers
- Log all blocked injection attempts
- Regular security scanning

## Next Steps

1. Implement sanitization utilities
2. Apply to all affected routes
3. Write comprehensive tests
4. Proceed to Phase 5: Testing & Documentation
