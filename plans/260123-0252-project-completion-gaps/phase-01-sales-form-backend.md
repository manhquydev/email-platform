# Phase 1: Sales Form Backend

## Overview
- **Priority:** CRITICAL
- **Status:** Pending
- **Effort:** 30min (A) / 1.5h (B)

Create API endpoint to receive sales inquiry submissions.

## Context Links
- [Sales Form Research](./research/researcher-sales-form-patterns.md)
- [Current Support Routes](../../services/api/src/routes/support.ts)

## Approach A: Minimal MVP

### Files to Modify
- `services/api/src/routes/public.ts`

### Implementation Steps

1. **Add sales contact endpoint to public routes**
   ```typescript
   // POST /api/contact/sales
   app.post("/contact/sales", async (request, reply) => {
     const body = z.object({
       name: z.string().min(2).max(100),
       email: z.string().email(),
       company: z.string().min(1).max(100),
       companySize: z.string(),
       message: z.string().min(10).max(2000),
     }).safeParse(request.body);

     if (!body.success) {
       return reply.status(400).send({ error: "Invalid payload" });
     }

     // Send email notification to sales team
     await emailService.send({
       to: "sales@manhquy.click",
       subject: `[Sales Inquiry] ${body.data.company}`,
       text: `Name: ${body.data.name}\nEmail: ${body.data.email}\nCompany: ${body.data.company}\nSize: ${body.data.companySize}\n\nMessage:\n${body.data.message}`
     });

     return { success: true };
   });
   ```

2. **Import dependencies at top of file**
   - Import `z` from zod
   - Import email service

### Success Criteria
- [ ] POST `/api/contact/sales` returns 200 on valid payload
- [ ] Sales team receives email notification
- [ ] Invalid payloads return 400

---

## Approach B: Full Implementation

### Files to Create
- `services/api/src/routes/contact.ts`
- `services/api/src/services/contact-notification.service.ts`

### Files to Modify
- `services/api/prisma/schema.prisma` - Add SalesInquiry model
- `services/api/src/index.ts` - Register contact routes

### Database Schema Addition
```prisma
model SalesInquiry {
  id          String   @id @default(uuid())
  name        String
  email       String
  company     String
  companySize String
  message     String
  source      String?  // utm_source
  createdAt   DateTime @default(now())

  @@map("sales_inquiries")
}
```

### Implementation Steps

1. **Create contact routes file**
   - Rate limiting: 3 requests/hour per IP
   - Honeypot field validation
   - Zod schema validation
   - Persist to database
   - Return 200 immediately

2. **Create notification service**
   - Send email to sales team (async)
   - Send auto-responder to user (async)
   - Log to console for debugging

3. **Run Prisma migration**
   ```bash
   cd services/api && npx prisma migrate dev --name add_sales_inquiries
   ```

4. **Register routes in main app**

### Success Criteria
- [ ] POST `/api/contact/sales` returns 200 on valid payload
- [ ] Honeypot rejects bot submissions silently
- [ ] Rate limiting blocks excessive requests
- [ ] Sales inquiry persisted to database
- [ ] Sales team receives email notification
- [ ] User receives auto-responder

---

## Risk Assessment
- **Low:** Email service failure - User gets success but email not sent. Mitigation: DB persistence (Approach B).
- **Low:** Spam abuse - Mitigation: Honeypot + rate limiting (Approach B).

## Security Considerations
- Sanitize all input before email/DB
- No sensitive data logged
- Rate limit by IP
