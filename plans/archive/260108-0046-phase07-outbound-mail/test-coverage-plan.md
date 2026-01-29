# Test Coverage Expansion Plan

## Current Test Status

### Existing Tests (20 files)
| Test File | Coverage Area |
|-----------|--------------|
| auth.test.ts | Login, registration, 2FA |
| inbox-telegram.test.ts | Per-inbox Telegram linking |
| public-inbox.test.ts | Public inbox CRUD, messages |
| domain-endpoints.test.ts | Domain management |
| messages.security.test.ts | Message access control |
| magic-link.test.ts | Passwordless auth |
| notification_flow.test.ts | Telegram notifications |
| security.integration.test.ts | Security middleware |
| subscription.integration.test.ts | Billing flows |

### Coverage Gaps Identified

1. **Message Filtering with Multiple Params**
   - No tests for `?from=&subject=&after=&before=` combo queries
   - Missing pagination edge cases

2. **Attachment Download Authorization**
   - No tests for unauthorized attachment access
   - Missing MIME type validation tests

3. **Load Tests (SMTP Rate Limiting)**
   - No concurrent request tests
   - Missing rate limit saturation tests

4. **CAPTCHA Validation**
   - Limited mocking in public-inbox tests
   - Missing turnstile failure scenarios

5. **Webhook Delivery**
   - No tests for webhook retry logic
   - Missing signature verification tests

## New Test Files Needed

### 1. message-filtering.test.ts
```typescript
// Test cases:
// - Filter by sender email
// - Filter by subject (fuzzy)
// - Filter by date range (after/before)
// - Combine multiple filters
// - Pagination with filters
// - Empty results handling
// - Performance with large datasets
```

### 2. attachment-security.test.ts
```typescript
// Test cases:
// - Download requires authentication
// - User can only download own inbox attachments
// - Admin can download any attachment
// - Non-existent attachment 404
// - Deleted attachment handling
// - MIME type header correctness
```

### 3. smtp-rate-limit.test.ts
```typescript
// Test cases:
// - Per-IP limit enforcement
// - Per-domain limit enforcement
// - Per-inbox limit enforcement
// - Rate limit window reset
// - Concurrent request handling
// - Rate limit bypass for allowlisted IPs
```

### 4. captcha-validation.test.ts
```typescript
// Test cases:
// - Valid turnstile token accepted
// - Invalid token rejected
// - Missing token when required
// - Token reuse prevention
// - Mock turnstile API responses
```

### 5. webhook-delivery.test.ts
```typescript
// Test cases:
// - Webhook triggered on email.received
// - Signature header correctness
// - Retry on 5xx response
// - Timeout handling
// - WebhookLog creation
// - Disabled webhook skipped
```

## Implementation Priority

1. **High Priority**
   - attachment-security.test.ts (security critical)
   - message-filtering.test.ts (user-facing feature)

2. **Medium Priority**
   - captcha-validation.test.ts (anti-abuse)
   - webhook-delivery.test.ts (integration)

3. **Lower Priority**
   - smtp-rate-limit.test.ts (requires load testing setup)

## Test Structure Template

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { buildServer } from "../server";
import { prisma } from "../lib/prisma";
import { FastifyInstance } from "fastify";

describe("Feature Name", () => {
  let app: FastifyInstance;
  let testData: { /* typed test fixtures */ };

  beforeAll(async () => {
    app = buildServer();
    await app.ready();
    // Create test fixtures
  });

  afterAll(async () => {
    // Cleanup in reverse FK order
    await app.close();
  });

  describe("Endpoint/Function", () => {
    it("descriptive test case", async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## Mocking Strategy

### Telegram API
```typescript
vi.mock("../services/telegramBot", () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue(true),
}));
```

### CAPTCHA Service
```typescript
vi.mock("../utils/turnstile", () => ({
  verifyTurnstileToken: vi.fn().mockResolvedValue({ success: true }),
}));
```

### Email Delivery
```typescript
vi.mock("../services/outbound", () => ({
  outboundService: {
    sendEmail: vi.fn().mockResolvedValue({ messageId: "mock-id" }),
  },
}));
```

## Test Database Setup

Use Prisma test client with transactions for isolation:
```typescript
// In setup.ts or env-setup.ts
import { PrismaClient } from "@prisma/client";

export const testPrisma = new PrismaClient({
  datasources: { db: { url: process.env.TEST_DATABASE_URL } },
});
```

## Coverage Targets

| Area | Current | Target |
|------|---------|--------|
| Routes | ~60% | 80% |
| Services | ~40% | 75% |
| Utils | ~30% | 70% |
| Overall | ~45% | 75% |

## Execution

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific suite
npm test -- --run message-filtering
```
