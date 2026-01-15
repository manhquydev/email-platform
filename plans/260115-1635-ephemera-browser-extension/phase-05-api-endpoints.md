# Phase 5: Backend API Endpoints

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Depends On:** [Phase 2: Authentication](./phase-02-authentication.md)
- **API Reference:** `services/api/src/routes/`

## Overview

| Field | Value |
|-------|-------|
| Priority | P1 - High Value |
| Status | Pending |
| Effort | 2-3 days |
| Dependencies | Phase 2 complete |

Create extension-optimized API endpoints that reduce HTTP calls and provide aggregated data for popup performance.

## Key Insights

- Extension popup needs fast data - aggregate multiple calls into single endpoint
- Anonymous mode requires device-based identification without full auth
- Rate limiting critical for abuse prevention on quick-inbox
- CORS must allow `chrome-extension://` origins

## Requirements

### Functional
- Quick inbox creation with single API call
- Dashboard endpoint returns all popup data in one call
- Auth check endpoint for token validation
- Anonymous inbox creation with device fingerprint

### Non-Functional
- < 200ms response time for dashboard
- Rate limit: 10 quick-inbox/hour for anonymous
- Rate limit: 50 quick-inbox/hour for authenticated

## Architecture

```
Extension Request Flow:
┌─────────────────────────────────────────────────────────────┐
│                      Extension                              │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │ Quick      │  │ Dashboard  │  │ Anonymous           │   │
│  │ Inbox      │  │ Sync       │  │ Quick Inbox         │   │
│  └─────┬──────┘  └─────┬──────┘  └──────────┬──────────┘   │
└────────┼───────────────┼────────────────────┼───────────────┘
         │               │                    │
         ▼               ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               /extension/* routes                    │   │
│  │  POST /quick-inbox     GET /dashboard                │   │
│  │  GET /check-auth       POST /anonymous-inbox         │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                   Rate Limiter                              │
│                   CORS Handler                              │
└─────────────────────────────────────────────────────────────┘
```

## Related Code Files

### Create
- `services/api/src/routes/extension.ts` - Extension routes
- `services/api/src/middleware/extension-cors.ts` - CORS for extensions
- `services/api/src/utils/device-fingerprint.ts` - Anonymous device ID

### Modify
- `services/api/src/index.ts` - Register extension routes
- `services/api/src/middleware/rate-limit.ts` - Add extension limits

### Reference
- `services/api/src/routes/inboxes.ts` - Inbox creation pattern
- `services/api/src/routes/auth.ts` - Auth patterns

## Implementation Steps

### Step 1: Create Extension Routes File (1h)

Create `services/api/src/routes/extension.ts`:
```typescript
import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import { prisma } from '../lib/prisma'
import { generateRandomString } from '../utils/random'

const extension = new Hono()

// Optional auth middleware - allows anonymous
const optionalAuth = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7)
      const payload = await verifyToken(token)
      c.set('user', payload)
    } catch {
      // Continue without auth
    }
  }
  await next()
}

// GET /extension/dashboard - Aggregated popup data
extension.get('/dashboard', jwt({ secret: process.env.JWT_SECRET }), async (c) => {
  const user = c.get('jwtPayload')

  const [inboxes, unreadCount, userTier] = await Promise.all([
    prisma.inbox.findMany({
      where: { userId: user.sub, deletedAt: null },
      include: {
        domain: { select: { name: true } },
        _count: { select: { messages: { where: { isRead: false } } } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.message.count({
      where: {
        inbox: { userId: user.sub, deletedAt: null },
        isRead: false
      }
    }),
    prisma.user.findUnique({
      where: { id: user.sub },
      select: { tier: true, email: true }
    })
  ])

  return c.json({
    inboxes: inboxes.map(i => ({
      id: i.id,
      email: `${i.localPart}@${i.domain.name}`,
      localPart: i.localPart,
      domain: i.domain,
      unreadCount: i._count.messages
    })),
    totalUnread: unreadCount,
    user: userTier
  })
})

// POST /extension/quick-inbox - Fast inbox creation
extension.post('/quick-inbox', jwt({ secret: process.env.JWT_SECRET }), async (c) => {
  const user = c.get('jwtPayload')
  const { domainId } = await c.req.json().catch(() => ({}))

  // Get domain (use specified or first available)
  const domain = domainId
    ? await prisma.domain.findUnique({ where: { id: domainId } })
    : await prisma.domain.findFirst({ where: { isActive: true } })

  if (!domain) {
    return c.json({ error: 'No domain available' }, 400)
  }

  // Generate random local part
  const localPart = generateRandomString(8)

  const inbox = await prisma.inbox.create({
    data: {
      localPart,
      domainId: domain.id,
      userId: user.sub
    },
    include: { domain: { select: { name: true } } }
  })

  return c.json({
    inbox: {
      id: inbox.id,
      email: `${inbox.localPart}@${inbox.domain.name}`,
      localPart: inbox.localPart,
      domain: inbox.domain
    }
  })
})

// GET /extension/check-auth - Verify token validity
extension.get('/check-auth', jwt({ secret: process.env.JWT_SECRET }), async (c) => {
  const user = c.get('jwtPayload')
  return c.json({ valid: true, userId: user.sub })
})

// POST /extension/anonymous-inbox - Create inbox without auth
extension.post('/anonymous-inbox', optionalAuth, async (c) => {
  const { deviceId } = await c.req.json()

  if (!deviceId || deviceId.length < 16) {
    return c.json({ error: 'Invalid device ID' }, 400)
  }

  // Rate limit by device ID (stored in Redis/memory)
  const rateKey = `anon:${deviceId}`
  const count = await getAnonymousRateCount(rateKey)
  if (count >= 10) {
    return c.json({ error: 'Rate limit exceeded. Login for more.' }, 429)
  }

  const domain = await prisma.domain.findFirst({ where: { isActive: true } })
  if (!domain) {
    return c.json({ error: 'No domain available' }, 400)
  }

  const localPart = generateRandomString(10)

  // Create anonymous inbox (no userId, short TTL)
  const inbox = await prisma.inbox.create({
    data: {
      localPart,
      domainId: domain.id,
      userId: null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h TTL
    },
    include: { domain: { select: { name: true } } }
  })

  await incrementAnonymousRateCount(rateKey)

  // Generate access token for this specific inbox
  const accessToken = await signInboxToken(inbox.id)

  return c.json({
    inbox: {
      id: inbox.id,
      email: `${inbox.localPart}@${inbox.domain.name}`,
      expiresAt: inbox.expiresAt
    },
    accessToken
  })
})

export default extension
```

### Step 2: Configure CORS for Extensions (30m)

Update CORS middleware to allow extension origins:
```typescript
// services/api/src/middleware/cors.ts
import { cors } from 'hono/cors'

export const extensionCors = cors({
  origin: (origin) => {
    // Allow chrome extensions
    if (origin?.startsWith('chrome-extension://')) return origin
    // Allow moz extensions
    if (origin?.startsWith('moz-extension://')) return origin
    // Allow configured origins
    if (process.env.ALLOWED_ORIGINS?.split(',').includes(origin)) return origin
    return null
  },
  credentials: true
})
```

### Step 3: Add Rate Limiting (1h)

Create rate limiter for extension endpoints:
```typescript
// services/api/src/middleware/extension-rate-limit.ts
import { rateLimiter } from 'hono-rate-limiter'

export const quickInboxLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 50, // 50 requests per hour for authenticated
  keyGenerator: (c) => c.get('jwtPayload')?.sub || c.req.header('x-device-id'),
  message: { error: 'Rate limit exceeded' }
})

export const anonymousLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10, // 10 per hour for anonymous
  keyGenerator: (c) => c.req.header('x-device-id'),
  message: { error: 'Rate limit exceeded. Create an account for more.' }
})
```

### Step 4: Register Routes (30m)

Update `services/api/src/index.ts`:
```typescript
import extension from './routes/extension'
import { extensionCors } from './middleware/cors'

// Apply extension CORS
app.use('/extension/*', extensionCors)

// Mount extension routes
app.route('/extension', extension)
```

### Step 5: Add Device Fingerprint Utility (30m)

Create `services/api/src/utils/device-fingerprint.ts`:
```typescript
import { createHash } from 'crypto'

export function generateDeviceId(
  userAgent: string,
  ip: string,
  acceptLanguage: string
): string {
  const raw = `${userAgent}|${ip}|${acceptLanguage}`
  return createHash('sha256').update(raw).digest('hex').slice(0, 32)
}

export function validateDeviceId(deviceId: string): boolean {
  return /^[a-f0-9]{16,64}$/.test(deviceId)
}
```

## Todo List

- [ ] Create extension routes file
- [ ] Implement GET /extension/dashboard
- [ ] Implement POST /extension/quick-inbox
- [ ] Implement GET /extension/check-auth
- [ ] Implement POST /extension/anonymous-inbox
- [ ] Configure CORS for chrome-extension:// origins
- [ ] Add rate limiting middleware
- [ ] Add device fingerprint utility
- [ ] Register routes in main app
- [ ] Test all endpoints with extension
- [ ] Add API documentation

## Success Criteria

- [ ] Dashboard returns data in < 200ms
- [ ] Quick inbox creates inbox in < 500ms
- [ ] Anonymous inbox works without auth
- [ ] Rate limits enforced correctly
- [ ] CORS allows extension origins
- [ ] Check-auth validates tokens properly

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Anonymous abuse | Medium | High | Strict rate limits, CAPTCHA fallback |
| CORS misconfiguration | Low | High | Test with actual extension |
| Rate limit bypass | Low | Medium | Use Redis for distributed limiting |

## Security Considerations

- Device fingerprint is hashed, not stored raw
- Anonymous inboxes have 24h TTL
- Rate limits prevent spam/abuse
- JWT validation on all authenticated endpoints
- No sensitive data in error messages

## Next Steps

→ [Phase 6: Real-time Notifications](./phase-06-notifications.md)
