# Phase 3: High Priority Security Fixes

## Context
- **Parent Plan:** [plan.md](./plan.md)
- **Research:** [Security Patterns](./research/researcher-01-security-patterns.md)

## Overview
| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Effort | 8h |
| Status | Pending |
| Dependencies | Phase 1 |

Fix 9 high-priority security issues.

## Issues Addressed

| # | Issue | File | Risk |
|---|-------|------|------|
| 1 | Rate limit bypass via API keys | server.ts:234-263 | API abuse |
| 2 | CORS wildcard extensions | server.ts:146-162 | Data exfiltration |
| 3 | JWT 30-day expiry | auth.ts:75 | Token theft |
| 4 | Password 6 chars min | auth.ts:27 | Brute force |
| 5 | SQL injection fuzzy search | messages.ts:249-263 | Data breach |
| 6 | No MIME type validation | attachments | Malware upload |
| 7 | CSP unsafe-eval | server.ts:116-137 | XSS |
| 8 | Login timing attack | auth.ts | User enumeration |
| 9 | Bulk ops non-atomic | admin/users.ts | Data corruption |

## Implementation Steps

### 1. API Key Rate Limiting (1h)
```typescript
// server.ts - Add separate rate limiter for API keys
const apiKeyRateLimiter = createRateLimiter({
  max: 1000,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.user?.id || req.ip,
});

// In authenticate decorator, after API key validation:
if (keyRecord) {
  await apiKeyRateLimiter.consume(request);
  // ...
}
```

### 2. CORS Whitelist Extensions (30min)
```typescript
// server.ts - Replace wildcard with specific ID
const ALLOWED_EXTENSION_IDS = [
  'abcdefghijklmnopqrstuvwxyz123456', // Our Chrome extension
];

if (origin.startsWith("chrome-extension://")) {
  const extensionId = origin.replace("chrome-extension://", "");
  if (ALLOWED_EXTENSION_IDS.includes(extensionId)) {
    return cb(null, true);
  }
  return cb(new Error("Extension not allowed"), false);
}
```

### 3. JWT Refresh Token (2h)
```typescript
// auth.ts - Short access token + refresh token
const accessToken = jwt.sign(payload, secret, { expiresIn: '15m' });
const refreshToken = crypto.randomUUID();

// Store refresh token in Redis
await redis.setex(`refresh:${refreshToken}`, 7 * 24 * 3600, userId);

// New endpoint: POST /auth/refresh
app.post('/auth/refresh', async (req, reply) => {
  const { refreshToken } = req.body;
  const userId = await redis.get(`refresh:${refreshToken}`);
  if (!userId) throw app.httpErrors.unauthorized('Invalid refresh token');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const newAccessToken = jwt.sign({ userId, role: user.role }, secret, { expiresIn: '15m' });

  // Rotate refresh token
  await redis.del(`refresh:${refreshToken}`);
  const newRefreshToken = crypto.randomUUID();
  await redis.setex(`refresh:${newRefreshToken}`, 7 * 24 * 3600, userId);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
});
```

### 4. Strengthen Password Policy (30min)
```typescript
// auth.ts - Update validation
password: z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase')
  .regex(/[a-z]/, 'Password must contain lowercase')
  .regex(/[0-9]/, 'Password must contain number'),
```

### 5. Fix SQL Injection in Fuzzy Search (1h)
```typescript
// messages.ts - Use Prisma.sql template
const messages = await prisma.$queryRaw`
  SELECT m.*,
    GREATEST(
      COALESCE(similarity(m.subject, ${q}), 0),
      COALESCE(similarity(m."textBody", ${q}), 0)
    ) as relevance
  FROM "Message" m
  WHERE m."deletedAt" IS NULL
    AND (
      similarity(m.subject, ${q}) > ${threshold}
      OR similarity(m."textBody", ${q}) > ${threshold}
    )
  ORDER BY relevance DESC
  LIMIT ${limit}
`;
```

### 6. MIME Type Validation (1h)
```typescript
// New file: services/api/src/utils/attachment-validator.ts
const BLOCKED_MIMES = [
  'application/x-executable',
  'application/x-msdownload',
  'application/x-sh',
];

const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.sh', '.ps1', '.cmd'];

export function validateAttachment(filename: string, mimeType: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) return false;
  if (BLOCKED_MIMES.includes(mimeType)) return false;
  return true;
}
```

### 7. Tighten CSP (30min)
```typescript
// server.ts - Separate CSP for Swagger
app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"], // Remove unsafe-eval/inline for API
      // ...
    }
  }
});

// Apply relaxed CSP only to /docs route
app.addHook('onRequest', async (req, reply) => {
  if (req.url.startsWith('/docs')) {
    reply.header('Content-Security-Policy', "script-src 'self' 'unsafe-inline' 'unsafe-eval'");
  }
});
```

### 8. Fix Login Timing Attack (1h)
```typescript
// auth.ts - Always hash, even for non-existent users
const DUMMY_HASH = await bcrypt.hash('dummy-password-for-timing', 10);

const user = await prisma.user.findUnique({ where: { email } });
const hashToCompare = user?.password || DUMMY_HASH;
const valid = await bcrypt.compare(password, hashToCompare);

if (!user || !valid) {
  throw app.httpErrors.unauthorized('Invalid credentials');
}
```

### 9. Atomic Bulk Operations (1h)
```typescript
// admin/users.ts - Wrap in transaction, collect errors
const results = await prisma.$transaction(async (tx) => {
  const successes = [];
  const failures = [];

  for (const userId of filteredIds) {
    try {
      await tx.user.delete({ where: { id: userId } });
      successes.push(userId);
    } catch (e) {
      failures.push({ userId, error: e.message });
    }
  }

  if (failures.length > 0 && successes.length === 0) {
    throw new Error('All operations failed');
  }

  return { successes, failures };
});

return { affected: results.successes.length, failures: results.failures };
```

## Todo List

- [ ] Add API key rate limiter
- [ ] Whitelist specific extension IDs
- [ ] Implement refresh token endpoint
- [ ] Update frontend to handle token refresh
- [ ] Strengthen password validation
- [ ] Fix fuzzy search SQL injection
- [ ] Add attachment MIME validation
- [ ] Tighten CSP for non-Swagger routes
- [ ] Fix login timing attack
- [ ] Make bulk operations atomic

## Success Criteria

- [ ] API keys rate limited at 1000 req/min
- [ ] Only whitelisted extensions allowed
- [ ] Access tokens expire in 15 minutes
- [ ] Passwords require 8+ chars with complexity
- [ ] Fuzzy search uses parameterized queries
- [ ] Executable attachments blocked
- [ ] CSP strict for API routes
- [ ] Login timing constant regardless of user existence
- [ ] Bulk operations report partial failures

## Next Steps
- Phase 4: High priority UX/Performance
