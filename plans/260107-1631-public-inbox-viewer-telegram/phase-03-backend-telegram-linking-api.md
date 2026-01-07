# Phase 03: Backend - Telegram Linking API

## Context

- **Plan:** [plan.md](./plan.md)
- **Research:** [researcher-02-telegram-integration.md](./research/researcher-02-telegram-integration.md)

## Parallelization Info

| Can Parallel With | Depends On | Blocks |
|-------------------|------------|--------|
| Phase 02 | Phase 01 | Phase 05, 06 |

## Overview

| Priority | Status | Effort |
|----------|--------|--------|
| P1 | pending | 3h |

Create API endpoints for generating inbox-Telegram link tokens, QR codes, and handling the linking process. Extend existing Telegram webhook to handle inbox-specific tokens.

## Key Insights

- Token prefix `inbox_` distinguishes from user tokens
- Reuse existing `generateLinkToken()` from telegramBot.ts
- QR code generated server-side using `qrcode` package
- Max 5 links per inbox to prevent abuse

## Requirements

1. `POST /api/public/telegram/generate-token` - Generate linking token + QR
2. `GET /api/public/telegram/status/:token` - Check if token was used
3. `DELETE /api/public/telegram/:inboxEmail` - Unlink Telegram from inbox
4. Create `inbox-telegram-service.ts` for business logic
5. Extend webhook handler for `inbox_` prefixed tokens

## Related Code Files (EXCLUSIVE)

| File | Action | Description |
|------|--------|-------------|
| `services/api/src/routes/public-telegram.ts` | Create | Public Telegram linking endpoints |
| `services/api/src/services/inbox-telegram-service.ts` | Create | Business logic for inbox linking |
| `services/api/src/server.ts` | Modify | Register new routes (1 line) |
| `services/api/package.json` | Modify | Add `qrcode` dependency |

## File Ownership

- **ONLY this phase** creates `public-telegram.ts` and `inbox-telegram-service.ts`
- Phase 06 will extend `telegramBot.ts` for webhook handling

## Implementation Steps

### 1. Install qrcode package

```bash
cd services/api
npm install qrcode
npm install -D @types/qrcode
```

### 2. Create inbox-telegram-service.ts

```typescript
// services/api/src/services/inbox-telegram-service.ts
import { prisma } from "../lib/prisma";
import { generateLinkToken } from "./telegramBot";
import QRCode from "qrcode";

const MAX_LINKS_PER_INBOX = 5;
const TOKEN_EXPIRY_HOURS = 24;

export async function generateInboxLinkToken(inboxEmail: string): Promise<{
  token: string;
  qrCodeDataUrl: string;
  telegramLink: string;
  expiresAt: Date;
}> {
  // Validate inbox exists
  const [localPart, domainName] = inboxEmail.split("@");
  const inbox = await prisma.inbox.findFirst({
    where: {
      localPart,
      domain: { name: domainName, status: "VERIFIED" },
      deletedAt: null,
    },
  });

  if (!inbox) {
    throw new Error("Inbox not found");
  }

  // Check link count
  const linkCount = await prisma.inboxTelegramLink.count({
    where: { inboxEmail, status: "ACTIVE" },
  });

  if (linkCount >= MAX_LINKS_PER_INBOX) {
    throw new Error(`Maximum ${MAX_LINKS_PER_INBOX} Telegram links per inbox`);
  }

  // Delete existing unused tokens for this inbox
  await prisma.inboxTelegramAuthToken.deleteMany({
    where: { inboxEmail, usedAt: null },
  });

  // Generate new token with inbox_ prefix
  const rawToken = generateLinkToken();
  const token = `inbox_${rawToken}`;
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.inboxTelegramAuthToken.create({
    data: { inboxEmail, token, expiresAt },
  });

  // Generate Telegram deep link
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "EphemeraMailBot";
  const telegramLink = `https://t.me/${botUsername}?start=${token}`;

  // Generate QR code
  const qrCodeDataUrl = await QRCode.toDataURL(telegramLink, {
    width: 256,
    margin: 2,
  });

  return { token, qrCodeDataUrl, telegramLink, expiresAt };
}

export async function getTokenStatus(token: string): Promise<{
  valid: boolean;
  used: boolean;
  expired: boolean;
  linkedChatId?: string;
}> {
  const tokenRecord = await prisma.inboxTelegramAuthToken.findUnique({
    where: { token },
  });

  if (!tokenRecord) {
    return { valid: false, used: false, expired: false };
  }

  const now = new Date();
  const expired = tokenRecord.expiresAt < now;
  const used = !!tokenRecord.usedAt;

  // If used, find the linked chat
  let linkedChatId: string | undefined;
  if (used) {
    const link = await prisma.inboxTelegramLink.findFirst({
      where: { inboxEmail: tokenRecord.inboxEmail },
      orderBy: { createdAt: "desc" },
    });
    linkedChatId = link?.telegramChatId;
  }

  return { valid: true, used, expired, linkedChatId };
}

export async function linkInboxToTelegram(
  token: string,
  chatId: string,
  username?: string
): Promise<{ success: boolean; error?: string; inboxEmail?: string }> {
  const tokenRecord = await prisma.inboxTelegramAuthToken.findFirst({
    where: {
      token,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!tokenRecord) {
    return { success: false, error: "Token invalid or expired" };
  }

  // Check if already linked
  const existingLink = await prisma.inboxTelegramLink.findUnique({
    where: {
      inboxEmail_telegramChatId: {
        inboxEmail: tokenRecord.inboxEmail,
        telegramChatId: chatId,
      },
    },
  });

  if (existingLink) {
    // Reactivate if revoked
    if (existingLink.status !== "ACTIVE") {
      await prisma.inboxTelegramLink.update({
        where: { id: existingLink.id },
        data: { status: "ACTIVE" },
      });
    }
  } else {
    // Create new link
    await prisma.inboxTelegramLink.create({
      data: {
        inboxEmail: tokenRecord.inboxEmail,
        telegramChatId: chatId,
        telegramUsername: username,
        status: "ACTIVE",
      },
    });
  }

  // Mark token as used
  await prisma.inboxTelegramAuthToken.update({
    where: { id: tokenRecord.id },
    data: { usedAt: new Date() },
  });

  return { success: true, inboxEmail: tokenRecord.inboxEmail };
}

export async function unlinkInboxTelegram(
  inboxEmail: string,
  chatId: string
): Promise<boolean> {
  const result = await prisma.inboxTelegramLink.updateMany({
    where: { inboxEmail, telegramChatId: chatId },
    data: { status: "REVOKED" },
  });

  return result.count > 0;
}

export async function getInboxLinks(inboxEmail: string) {
  return prisma.inboxTelegramLink.findMany({
    where: { inboxEmail, status: "ACTIVE" },
    select: {
      id: true,
      telegramChatId: true,
      telegramUsername: true,
      createdAt: true,
    },
  });
}
```

### 3. Create public-telegram.ts routes

```typescript
// services/api/src/routes/public-telegram.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  generateInboxLinkToken,
  getTokenStatus,
  getInboxLinks,
} from "../services/inbox-telegram-service";
import { recordAudit } from "../utils/audit";

export async function publicTelegramRoutes(app: FastifyInstance) {
  const publicRateLimit = { max: 20, timeWindow: "1 minute" };

  // Generate linking token
  app.post("/public/telegram/generate-token", {
    config: { rateLimit: publicRateLimit }
  }, async (request, reply) => {
    const body = z.object({
      inboxEmail: z.string().email(),
    }).safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({ error: "Invalid email format" });
    }

    try {
      const result = await generateInboxLinkToken(body.data.inboxEmail);

      await recordAudit(null, "INBOX_TELEGRAM_TOKEN_GENERATED", {
        inboxEmail: body.data.inboxEmail,
        ip: request.ip,
      });

      return result;
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // Check token status (for polling)
  app.get("/public/telegram/status/:token", {
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const params = z.object({ token: z.string() }).safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: "Invalid token" });
    }

    const status = await getTokenStatus(params.data.token);
    return status;
  });

  // Get linked accounts for inbox
  app.get("/public/telegram/:inboxEmail/links", {
    config: { rateLimit: publicRateLimit }
  }, async (request, reply) => {
    const params = z.object({
      inboxEmail: z.string().email(),
    }).safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: "Invalid email" });
    }

    const links = await getInboxLinks(params.data.inboxEmail);
    return { links };
  });
}
```

### 4. Register routes in server.ts

```typescript
// Add import
import { publicTelegramRoutes } from "./routes/public-telegram";

// Add registration
app.register(publicTelegramRoutes);
```

## Todo Checklist

- [ ] Install `qrcode` and `@types/qrcode`
- [ ] Create `services/inbox-telegram-service.ts`
- [ ] Implement `generateInboxLinkToken()`
- [ ] Implement `getTokenStatus()`
- [ ] Implement `linkInboxToTelegram()`
- [ ] Implement `unlinkInboxTelegram()`
- [ ] Create `routes/public-telegram.ts`
- [ ] Register routes in server.ts
- [ ] Test token generation returns QR code
- [ ] Test status polling endpoint

## Success Criteria

1. Token generation returns valid QR code data URL
2. Telegram deep link format: `https://t.me/BotName?start=inbox_XXXXXX`
3. Status polling returns `used: true` after linking
4. Max 5 links per inbox enforced
5. Tokens expire after 24 hours

## Conflict Prevention

- Only this phase creates `public-telegram.ts` and `inbox-telegram-service.ts`
- Phase 06 extends `telegramBot.ts` for webhook (different file)
- Single line in `server.ts` (import + register)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| QR code generation fails | Low | Medium | Fallback to text link |
| Token collision | Very Low | Low | UUID-based, unique constraint |
| Polling overload | Medium | Medium | Separate rate limit for status |

## Security Considerations

1. **Token expiry** - 24 hours max
2. **Rate limiting** - 20 req/min for token generation
3. **Max links** - 5 per inbox prevents abuse
4. **Token cleanup** - Old unused tokens deleted on new generation
5. **Audit logging** - Log all token generations
