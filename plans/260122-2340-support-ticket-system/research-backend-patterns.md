# Backend Patterns Research for Support Ticket System

## 1. Prisma Patterns Used
The codebase uses a standard relational pattern with Prisma ORM. Key patterns relevant to the ticket system:
- **UUIDs**: All models use `@default(uuid())` for IDs.
- **Soft Deletes**: `deletedAt` field used for safe removal (e.g., `Message`, `Inbox`).
- **Audit Logs**: `AuditLog` model tracks critical user actions (`userId`, `action`, `meta`).
- **Enums**: Extensive use for status and types (e.g., `UserRole`, `AbuseReportStatus`).
- **Relations**: Clear parent-child relationships with `onDelete: Cascade` (e.g., User -> Inboxes).
- **Indexing**: Heavily indexed fields for query performance (timestamps, foreign keys, status).

## 2. API Route Structure
Built on **Fastify** with a consistent pattern:
- **Validation**: `zod` used for strict request body, query, and param validation.
- **Authentication**: `preHandler: app.authenticate` decorator used for protected routes.
- **Authorization**: Explicit ownership/permission checks inside handlers (e.g., `TeamService.canAccessInbox(userId, inboxId)`).
- **Error Handling**: Standardized error responses (400 for validation, 401/403 for auth, 404 for missing).
- **Pagination**: Standard `limit` (max 200) and `offset` pattern for lists.

## 3. Email Service Capabilities
- **Template System**: `services/emailTemplates.ts` generates HTML/Text emails with a consistent design system (Header, Footer, CTA).
- **Outbound**: `outboundService` handles sending, with `OutboundMessage` model tracking status.
- **Reply/Forward**: Logic exists to construct threading headers (`In-Reply-To`, `References`) and handle attachments.
- **MIME Building**: `mailbuild` library used for complex MIME structures (attachments, multipart).

## 4. Auth Middleware Patterns
- **Dual Auth**: Supports both JWT (Bearer token) and API Keys (`x-api-key`).
- **Decorators**: `app.authenticate` attaches user context (`userId`, `role`, `tier`) to request.
- **Admin Access**: `app.requireAdmin` ensures role is `ADMIN`.
- **Context**: Request object decorated with `user` object containing essential claims.

## 5. Recommendations for Ticket System

### Schema Design
Create `SupportTicket` and `TicketComment` models following existing patterns:
```prisma
model SupportTicket {
  id          String       @id @default(uuid())
  userId      String       // Requester
  subject     String
  status      TicketStatus @default(OPEN)
  priority    TicketPriority @default(NORMAL)
  category    String
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  // Relations
  user        User         @relation(fields: [userId], references: [id])
  comments    TicketComment[]

  @@index([userId])
  @@index([status])
}

model TicketComment {
  id        String   @id @default(uuid())
  ticketId  String
  userId    String   // Author (User or Admin)
  content   String   @db.Text
  isInternal Boolean @default(false) // For admin-only notes
  createdAt DateTime @default(now())

  ticket    SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  user      User          @relation(fields: [userId], references: [id])
}

enum TicketStatus {
  OPEN
  WAITING_FOR_USER
  WAITING_FOR_SUPPORT
  RESOLVED
  CLOSED
}

enum TicketPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

### Implementation Strategy
1. **Module Structure**: Create `services/api/src/routes/tickets.ts` and `services/api/src/services/ticket.service.ts`.
2. **Access Control**:
   - Users see only their tickets.
   - Admins see all tickets (use `requireAdmin` for management routes).
3. **Notifications**:
   - Trigger email notifications (using `emailTemplates`) when admin replies.
   - Trigger system `Notification` for in-app alerts.
4. **Validation**: Use strict Zod schemas for ticket creation and comments.
5. **Realtime**: Publish events via `realtimeEvents` service on ticket updates.
