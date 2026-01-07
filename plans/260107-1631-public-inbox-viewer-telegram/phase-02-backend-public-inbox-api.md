# Phase 02: Backend - Public Inbox API

## Context

- **Plan:** [plan.md](./plan.md)
- **Research:** [researcher-01-public-inbox-viewer.md](./research/researcher-01-public-inbox-viewer.md)

## Parallelization Info

| Can Parallel With | Depends On | Blocks |
|-------------------|------------|--------|
| Phase 03 | Phase 01 | Phase 04, 06 |

## Overview

| Priority | Status | Effort |
|----------|--------|--------|
| P1 | pending | 3h |

Create public API endpoints for viewing inbox emails without authentication. Includes rate limiting, pagination, and attachment download.

## Key Insights

- Reuse existing pagination pattern from `messages.ts`
- Use existing `storageService.getReadStream()` for attachments
- Rate limit via existing `@fastify/rate-limit` plugin
- Domain must be VERIFIED status

## Requirements

1. `POST /api/public/inbox/search` - Validate inbox exists, return basic info
2. `GET /api/public/inbox/:email/messages` - Paginated message list
3. `GET /api/public/inbox/:email/messages/:messageId` - Full message detail
4. `GET /api/public/attachments/:id/download` - Attachment download
5. Rate limit: 100 req/min per IP

## Related Code Files (EXCLUSIVE)

| File | Action | Description |
|------|--------|-------------|
| `services/api/src/routes/public-inbox.ts` | Create | All public inbox endpoints |
| `services/api/src/server.ts` | Modify | Register new routes (1 line) |

## File Ownership

- **ONLY this phase** creates/modifies `public-inbox.ts`
- Minimal touch to `server.ts` (add import + register)

## Implementation Steps

### 1. Create public-inbox.ts route file

```typescript
// services/api/src/routes/public-inbox.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../utils/audit";
import { storageService } from "../services/storage";

export async function publicInboxRoutes(app: FastifyInstance) {
  // Rate limit configuration for public endpoints
  const publicRateLimit = {
    max: 100,
    timeWindow: "1 minute",
  };

  // ... endpoints below
}
```

### 2. POST /api/public/inbox/search

```typescript
app.post("/public/inbox/search", {
  config: { rateLimit: publicRateLimit }
}, async (request, reply) => {
  const body = z.object({
    email: z.string().email(),
  }).safeParse(request.body);

  if (!body.success) {
    return reply.status(400).send({ error: "Invalid email format" });
  }

  const [localPart, domainName] = body.data.email.split("@");

  const inbox = await prisma.inbox.findFirst({
    where: {
      localPart,
      domain: { name: domainName, status: "VERIFIED" },
      deletedAt: null,
    },
    include: { domain: { select: { name: true } } },
  });

  if (!inbox) {
    return reply.status(404).send({ error: "Inbox not found" });
  }

  await recordAudit(null, "PUBLIC_INBOX_SEARCHED", {
    email: body.data.email,
    ip: request.ip,
  });

  return {
    inbox: {
      id: inbox.id,
      email: `${inbox.localPart}@${inbox.domain.name}`,
      localPart: inbox.localPart,
      domain: inbox.domain.name,
    },
  };
});
```

### 3. GET /api/public/inbox/:email/messages

```typescript
app.get("/public/inbox/:email/messages", {
  config: { rateLimit: publicRateLimit }
}, async (request, reply) => {
  const params = z.object({ email: z.string() }).safeParse(request.params);
  const query = z.object({
    limit: z.coerce.number().min(1).max(50).default(20),
    offset: z.coerce.number().min(0).default(0),
    sort: z.enum(["asc", "desc"]).default("desc"),
  }).safeParse(request.query);

  if (!params.success || !query.success) {
    return reply.status(400).send({ error: "Invalid request" });
  }

  const [localPart, domainName] = params.data.email.split("@");

  const inbox = await prisma.inbox.findFirst({
    where: {
      localPart,
      domain: { name: domainName, status: "VERIFIED" },
      deletedAt: null,
    },
  });

  if (!inbox) {
    return reply.status(404).send({ error: "Inbox not found" });
  }

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { inboxId: inbox.id, deletedAt: null },
      orderBy: { receivedAt: query.data.sort },
      take: query.data.limit,
      skip: query.data.offset,
      select: {
        id: true,
        fromAddress: true,
        subject: true,
        receivedAt: true,
        isRead: true,
        textBody: true, // Truncate in response
        _count: { select: { attachments: true } },
      },
    }),
    prisma.message.count({ where: { inboxId: inbox.id, deletedAt: null } }),
  ]);

  // Truncate preview to 150 chars
  const messagesWithPreview = messages.map((m) => ({
    ...m,
    preview: m.textBody?.slice(0, 150) || "",
    textBody: undefined,
  }));

  return { data: messagesWithPreview, meta: { total } };
});
```

### 4. GET /api/public/inbox/:email/messages/:messageId

```typescript
app.get("/public/inbox/:email/messages/:messageId", {
  config: { rateLimit: publicRateLimit }
}, async (request, reply) => {
  const params = z.object({
    email: z.string(),
    messageId: z.string().uuid(),
  }).safeParse(request.params);

  if (!params.success) {
    return reply.status(400).send({ error: "Invalid request" });
  }

  const [localPart, domainName] = params.data.email.split("@");

  const inbox = await prisma.inbox.findFirst({
    where: {
      localPart,
      domain: { name: domainName, status: "VERIFIED" },
      deletedAt: null,
    },
  });

  if (!inbox) {
    return reply.status(404).send({ error: "Inbox not found" });
  }

  const message = await prisma.message.findFirst({
    where: {
      id: params.data.messageId,
      inboxId: inbox.id,
      deletedAt: null,
    },
    include: {
      attachments: {
        where: { deletedAt: null },
        select: { id: true, filename: true, mimeType: true, size: true },
      },
    },
  });

  if (!message) {
    return reply.status(404).send({ error: "Message not found" });
  }

  await recordAudit(null, "PUBLIC_MESSAGE_VIEWED", {
    email: params.data.email,
    messageId: message.id,
    ip: request.ip,
  });

  // Exclude internal fields
  const { sourceIp, ...safeMessage } = message as any;

  return { message: safeMessage };
});
```

### 5. GET /api/public/attachments/:id/download

```typescript
app.get("/public/attachments/:id/download", {
  config: { rateLimit: publicRateLimit }
}, async (request, reply) => {
  const params = z.object({ id: z.string().uuid() }).safeParse(request.params);

  if (!params.success) {
    return reply.status(400).send({ error: "Invalid attachment ID" });
  }

  const attachment = await prisma.attachment.findUnique({
    where: { id: params.data.id },
    include: {
      message: {
        include: {
          inbox: {
            include: { domain: true },
          },
        },
      },
    },
  });

  if (!attachment || attachment.deletedAt) {
    return reply.status(404).send({ error: "Attachment not found" });
  }

  // Verify domain is VERIFIED
  if (attachment.message.inbox.domain.status !== "VERIFIED") {
    return reply.status(403).send({ error: "Access denied" });
  }

  const stream = await storageService.getReadStream(attachment.storageKey);

  reply.header("Content-Type", attachment.mimeType || "application/octet-stream");
  reply.header("Content-Disposition", `attachment; filename="${attachment.filename}"`);

  return reply.send(stream);
});
```

### 6. Register routes in server.ts

```typescript
// Add import
import { publicInboxRoutes } from "./routes/public-inbox";

// Add registration (near other route registrations)
app.register(publicInboxRoutes);
```

## Todo Checklist

- [ ] Create `routes/public-inbox.ts`
- [ ] Implement POST /api/public/inbox/search
- [ ] Implement GET /api/public/inbox/:email/messages
- [ ] Implement GET /api/public/inbox/:email/messages/:messageId
- [ ] Implement GET /api/public/attachments/:id/download
- [ ] Register routes in server.ts
- [ ] Test endpoints manually with curl/Postman
- [ ] Verify rate limiting works

## Success Criteria

1. All 4 endpoints return expected responses
2. Rate limiting triggers at 100 req/min
3. Only VERIFIED domain inboxes accessible
4. Attachments download correctly
5. No internal fields (sourceIp, ownerId) exposed

## Conflict Prevention

- Only this phase touches `public-inbox.ts`
- Single line addition to `server.ts` (import + register)
- Does NOT modify existing `public.ts`

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Email parsing edge cases | Medium | Low | Validate with zod email() |
| Large attachment streaming | Low | Medium | Existing storageService handles |
| Rate limit bypass | Low | High | Use existing plugin, test IP detection |

## Security Considerations

1. **Domain verification** - Only VERIFIED domains accessible
2. **Rate limiting** - 100 req/min per IP
3. **Field exclusion** - No sourceIp, ownerId in responses
4. **Audit logging** - Log all public access
5. **Attachment access** - Verify parent message/inbox ownership
