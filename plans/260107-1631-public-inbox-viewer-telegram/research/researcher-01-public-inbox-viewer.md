# Research Report: Public Inbox Viewer Implementation

## Key Findings

### Existing Inbox/Message Routes
- `services/api/src/routes/inboxes.ts` - CRUD for inboxes (authenticated)
- `services/api/src/routes/messages.ts` - Message listing, search, detail (authenticated)
- `services/api/src/routes/public.ts` - Public inbox creation (no auth)

### Existing Patterns to Reuse

**Pagination Pattern (messages.ts:50-61)**
```typescript
const [messages, total] = await Promise.all([
  prisma.message.findMany({
    where, orderBy: { receivedAt: "desc" },
    take: query.data.limit ?? 50,
    skip: query.data.offset ?? 0,
    include: { attachments: { where: { deletedAt: null } } },
  }),
  prisma.message.count({ where }),
]);
return { data: messages, meta: { total } };
```

**Query Validation (Zod)**
```typescript
const query = z.object({
  limit: z.coerce.number().min(1).max(200).optional(),
  offset: z.coerce.number().min(0).optional(),
  q: z.string().optional(),
}).safeParse(request.query);
```

**Attachment Download (messages.ts:354-377)**
- Uses `storageService.getReadStream(storageKey)`
- Sets Content-Disposition header
- Checks ownership before download

### Database Schema (Relevant Models)

**Inbox**
- `id`, `domainId`, `localPart`, `ownerId`, `deletedAt`, `expiresAt`
- Unique constraint: `@@unique([domainId, localPart])`

**Message**
- `id`, `inboxId`, `fromAddress`, `toAddress`, `subject`, `receivedAt`
- `textBody`, `htmlBody`, `isRead`, `isPinned`, `spamScore`, `deletedAt`
- Indexed: `@@index([inboxId, receivedAt])`

**Attachment**
- `id`, `messageId`, `filename`, `mimeType`, `size`, `storageKey`, `deletedAt`

## Recommended API Structure

```
POST /api/public/inbox/search
  Body: { email: "john@domain.com" }
  Response: { inbox: { id, localPart, domain } } or error

GET /api/public/inbox/:email/messages
  Query: limit, offset, sort (asc/desc)
  Response: { data: messages[], meta: { total } }

GET /api/public/inbox/:email/messages/:messageId
  Response: { message: {..., attachments: [...]} }

GET /api/public/attachments/:id/download
  Response: File stream
```

## Database Queries Needed

**Validate Inbox Exists**
```typescript
const inbox = await prisma.inbox.findFirst({
  where: {
    localPart: emailLocalPart,
    domain: { name: emailDomain },
    deletedAt: null,
  },
  include: { domain: true }
});
```

**Get Messages (paginated)**
```typescript
const messages = await prisma.message.findMany({
  where: { inboxId: inbox.id, deletedAt: null },
  orderBy: { receivedAt: sort === 'asc' ? 'asc' : 'desc' },
  take: limit ?? 20,
  skip: offset ?? 0,
  select: {
    id: true, fromAddress: true, subject: true,
    receivedAt: true, isRead: true,
    textBody: true, // For preview (truncate to 100 chars)
    _count: { select: { attachments: true } }
  }
});
```

## Security Considerations

1. **Rate Limiting** - Required for public endpoints
   - Use `@fastify/rate-limit` plugin
   - Limit: 100 req/min per IP
   - Config in `appConfig`

2. **Audit Logging** - Log all public inbox access
   - Use existing `recordAudit(null, 'PUBLIC_INBOX_VIEWED', {...})`

3. **CAPTCHA** - Optional, controlled by config
   - Existing pattern in `public.ts`: `verifyCaptcha(token)`

4. **Domain Validation** - Only allow access to verified domains
   - Check `domain.status === 'VERIFIED'`

5. **No Sensitive Data Exposure**
   - Exclude internal fields (ownerId, sourceIp)
   - Sanitize HTML body before display

## Unresolved Questions

1. Should public inbox access be limited to specific domains (whitelist)?
2. Delete capability for public inbox messages - keep or remove?
3. Should message preview show first N chars of textBody or htmlBody?
4. Rate limit storage - Redis or in-memory?
