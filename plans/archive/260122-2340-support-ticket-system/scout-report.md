# Scout Report: Support Ticket System

## 1. Overview
The codebase is well-structured to support a ticket system using existing patterns found in the `AbuseReport` and `User` modules. The system will require a new database schema for tickets and messages, API endpoints for management, and UI interfaces for both users and admins.

## 2. Existing Patterns & Assets
- **Database**: `User` model exists with Role-based access (ADMIN/USER). `AbuseReport` provides a reference for issue tracking.
- **API**: Fastify + Zod validation (see `routes/abuse.ts`).
- **UI**: Admin panel exists (`Admin.tsx`). `AdminReports.tsx` is a strong reference for the Admin Ticket list.
- **Email**: Email infrastructure is ready (`services/emailTemplates.ts`).

## 3. Files to Modify

### Database
- **`services/api/prisma/schema.prisma`**
  - Add `SupportTicket` model (id, userId, subject, category, status, priority, createdAt, updatedAt).
  - Add `TicketMessage` model (id, ticketId, senderId, content, attachments, isInternal, createdAt).
  - Update `User` model to include `tickets SupportTicket[]`.

### API
- **`services/api/src/services/emailTemplates.ts`**
  - Add `ticketCreatedEmailTemplate`.
  - Add `ticketReplyEmailTemplate`.
  - Add `ticketClosedEmailTemplate`.
- **`services/api/src/routes/index.ts`** (if centralized routing exists, otherwise server.ts)
  - Register `supportRoutes`.

### Frontend
- **`services/web/src/components/admin-panel-modules/admin-nav-items.ts`**
  - Add "Support" navigation item for Admins.
- **`services/web/src/router/index.tsx`** (or `App.tsx`)
  - Add User routes: `/support`, `/support/:id`.
  - Add Admin routes: `/admin/support`, `/admin/support/:id`.

## 4. Files to Create

### API Service
- **`services/api/src/routes/support.ts`**
  - `POST /support/tickets`: Create ticket.
  - `GET /support/tickets`: List user tickets.
  - `GET /support/tickets/:id`: Get ticket details + messages.
  - `POST /support/tickets/:id/messages`: Reply to ticket.
  - `GET /admin/support/tickets`: List all tickets (Admin).
  - `PATCH /admin/support/tickets/:id`: Update status/priority (Admin).

### Frontend Components & Pages
- **`services/web/src/pages/SupportPage.tsx`** (User Dashboard)
- **`services/web/src/pages/SupportDetailPage.tsx`** (User Chat Interface)
- **`services/web/src/pages/admin/AdminSupportPage.tsx`** (Admin Dashboard - clone/adapt `AdminReports.tsx`)
- **`services/web/src/pages/admin/AdminSupportDetailPage.tsx`** (Admin Chat Interface)
- **`services/web/src/components/support/CreateTicketModal.tsx`**
- **`services/web/src/components/support/TicketStatusBadge.tsx`**

## 5. Dependencies & Risky Areas
- **Database Migration**: Requires `npx prisma migrate dev`.
- **Real-time**: If real-time chat is needed, WebSocket/polling integration (reference `services/api/src/types/realtime.ts` if exists, or standard polling).
- **File Attachments**: Re-use existing `Attachment` logic from `Message` model if possible, or create specific `TicketAttachment`.

## 6. Implementation Questions
- Should support tickets handle email replies via inbound parsing (like Help Scout/Zendesk)? *Recommendation: Start with web-only, add email-to-ticket later.*
- Should `TicketMessage` re-use the global `Message` model? *Recommendation: No, keep separate to avoid polluting the core email storage logic.*

