# Phase 03: Premium Features

## Context
- **Parent Plan:** [plan.md](./plan.md)
- **Dependencies:** Phase 01 (privacy), Phase 02 (SDK for team features)
- **Code Standards:** [docs/code-standards.md](../../docs/code-standards.md)

## Overview
| Field | Value |
|-------|-------|
| Date | 2026-01-10 |
| Priority | P2 |
| Effort | 12h |
| Status | pending |

**Goal:** Monetize with send/reply, team collaboration, extended retention, and custom domain enhancements.

## Key Insights (from Research)
- DKIM: Use nodemailer built-in, `relaxed/relaxed` canonicalization, `rsa-sha256`
- Private keys: Store encrypted (AES-256-GCM), never in git
- Hybrid outbound: SES/Postmark/SendGrid recommended over self-hosted SMTP
- Bounce handling: Hard bounce → immediate suppression, soft → exponential backoff
- Team inboxes: Owned by Organization, not User
- RBAC: Owner > Admin > Member > Observer (4 roles sufficient)
- Permissions: `inbox:read`, `inbox:reply`, `inbox:delete`, `team:invite`

## Requirements

### R1: Send/Reply Functionality
- Reply to received emails from inbox
- Compose new email from verified domain
- DKIM signing per domain
- Credit-based billing (already exists: 1 credit/email)

### R2: Team Shared Inboxes
- Organization model with members
- Shared inbox ownership (org owns inbox)
- Role-based access control
- Assignment system for messages

### R3: Extended Retention
- Configurable per inbox: 1h, 24h, 7d, 30d, permanent
- Premium tiers unlock longer retention
- Storage quota per organization

### R4: Custom Domain Improvements
- Catch-all inbox per domain
- Subdomain support (*.example.com)
- Domain-level settings (retention, auto-reply)

## Architecture Decisions

### AD1: DKIM Key Storage
- Existing `DomainDkim` model used
- Private key encrypted with AES-256-GCM
- Encryption key from env `DKIM_ENCRYPTION_KEY`
- Rotation support via `rotatedAt` field

### AD2: Outbound Flow
```
User -> POST /messages/outbound -> Validate ownership
     -> Check suppression list -> Deduct credits
     -> Sign with DKIM -> Send via nodemailer
     -> Record in OutboundMessage -> Return messageId
```
- Existing route `services/api/src/routes/outbound.ts` handles this
- Need: Reply-to threading, compose UI

### AD3: Organization Model
```prisma
model Organization {
  id        String   @id @default(uuid())
  name      String
  ownerId   String
  createdAt DateTime @default(now())

  owner       User         @relation("OrgOwner", fields: [ownerId], references: [id])
  memberships Membership[]
  inboxes     Inbox[]      // Shared inboxes
}

model Membership {
  id        String         @id @default(uuid())
  userId    String
  orgId     String
  role      MembershipRole @default(MEMBER)
  createdAt DateTime       @default(now())

  user User         @relation(fields: [userId], references: [id])
  org  Organization @relation(fields: [orgId], references: [id])

  @@unique([userId, orgId])
}

enum MembershipRole {
  OWNER
  ADMIN
  MEMBER
  OBSERVER
}
```

### AD4: Retention Tiers
| Tier | Max Retention | Storage Quota |
|------|---------------|---------------|
| FREE | 1h | 50MB |
| STARTER | 24h | 500MB |
| PROFESSIONAL | 7d | 5GB |
| ENTERPRISE | 30d+ | Unlimited |

## Related Code Files
| File | Purpose |
|------|---------|
| `services/api/prisma/schema.prisma` | Add Organization, Membership |
| `services/api/src/routes/outbound.ts` | Existing, enhance for reply |
| `services/api/src/routes/organizations.ts` | New: org CRUD |
| `services/api/src/routes/inboxes.ts` | Add org ownership support |
| `services/api/src/services/outbound.ts` | Existing DKIM sending |
| `services/web/src/pages/InboxViewer.tsx` | Add reply/compose UI |
| `services/web/src/pages/Teams.tsx` | New: team management |
| `services/api/src/middleware/org-auth.ts` | New: org permission checks |

## Implementation Steps

### Step 1: Reply/Compose UI (3h)
1. Add reply button to message view in `InboxViewer.tsx`:
   ```tsx
   <Button onClick={() => setShowReplyForm(true)}>Reply</Button>
   ```

2. Create `services/web/src/components/compose-email.tsx`:
   - Form: To, Subject, Body (rich text or plain)
   - From: Dropdown of user's verified domains
   - Threading: Auto-populate `In-Reply-To` and `References` headers
   - Attachments: File upload (reuse existing upload component)

3. Create `services/web/src/components/reply-form.tsx`:
   - Pre-fill To (original sender), Subject (Re: original)
   - Quote original message in body

4. Connect to existing `POST /messages/outbound` endpoint

### Step 2: Organization & Membership (3h)
1. Add models to `schema.prisma`:
   ```prisma
   model Organization {
     id        String       @id @default(uuid())
     name      String
     ownerId   String
     createdAt DateTime     @default(now())
     owner     User         @relation("OrgOwner", fields: [ownerId], references: [id])
     memberships Membership[]
     sharedInboxes Inbox[]  @relation("OrgInboxes")
   }

   model Membership {
     id        String         @id @default(uuid())
     userId    String
     orgId     String
     role      MembershipRole @default(MEMBER)
     createdAt DateTime       @default(now())
     user      User           @relation(fields: [userId], references: [id])
     org       Organization   @relation(fields: [orgId], references: [id])
     @@unique([userId, orgId])
   }

   enum MembershipRole { OWNER ADMIN MEMBER OBSERVER }
   ```

2. Update `Inbox` model:
   ```prisma
   model Inbox {
     // ... existing fields
     organizationId String?
     organization   Organization? @relation("OrgInboxes", fields: [organizationId], references: [id])
   }
   ```

3. Run `npx prisma migrate dev --name add-organizations`

4. Create `services/api/src/routes/organizations.ts`:
   - `POST /organizations` - Create org (user becomes owner)
   - `GET /organizations` - List user's orgs
   - `GET /organizations/:id` - Org details with members
   - `POST /organizations/:id/members` - Invite member
   - `DELETE /organizations/:id/members/:userId` - Remove member
   - `PATCH /organizations/:id/members/:userId` - Change role

### Step 3: Org Permission Middleware (2h)
1. Create `services/api/src/middleware/org-auth.ts`:
   ```typescript
   export function requireOrgRole(roles: MembershipRole[]) {
     return async (request: FastifyRequest, reply: FastifyReply) => {
       const { orgId } = request.params as { orgId: string };
       const userId = (request.user as any).userId;

       const membership = await prisma.membership.findUnique({
         where: { userId_orgId: { userId, orgId } }
       });

       if (!membership || !roles.includes(membership.role)) {
         return reply.status(403).send({ error: 'Insufficient permissions' });
       }

       request.membership = membership;
     };
   }
   ```

2. Apply to org routes:
   ```typescript
   app.post('/organizations/:orgId/inboxes', {
     preHandler: [app.authenticate, requireOrgRole(['OWNER', 'ADMIN'])]
   }, handler);
   ```

3. Update inbox routes to check org membership for shared inboxes

### Step 4: Team Inbox Management UI (2h)
1. Create `services/web/src/pages/Teams.tsx`:
   - List organizations user belongs to
   - Create new organization button
   - For each org: member list, shared inboxes

2. Create `services/web/src/components/team-members.tsx`:
   - Table: name, email, role, joined date
   - Actions: change role, remove (for admins)
   - Invite form: email + role dropdown

3. Create `services/web/src/components/shared-inbox-list.tsx`:
   - Similar to personal inbox list
   - Shows org badge
   - Assignment status for messages

4. Add route in `App.tsx`: `/teams`

### Step 5: Extended Retention (1h)
1. Add to `Inbox` model:
   ```prisma
   retentionHours Int @default(1) // 1, 24, 168, 720, -1 (permanent)
   ```

2. Update inbox creation/edit endpoints to accept retention setting

3. Validate against user tier:
   ```typescript
   const maxRetention = { FREE: 1, STARTER: 24, PROFESSIONAL: 168, ENTERPRISE: -1 };
   if (retention > maxRetention[user.tier]) {
     return reply.status(403).send({ error: 'Upgrade required for longer retention' });
   }
   ```

4. Update retention sweep job to respect per-inbox setting

5. Add retention selector to inbox creation UI

### Step 6: Custom Domain Improvements (1h)
1. Add to `Domain` model:
   ```prisma
   catchAllInboxId  String?
   defaultRetention Int     @default(1)
   autoReplyEnabled Boolean @default(false)
   autoReplyMessage String?
   ```

2. Implement catch-all in SMTP handler:
   ```typescript
   let inbox = await prisma.inbox.findUnique({
     where: { domainId_localPart: { domainId, localPart } }
   });

   if (!inbox && domain.catchAllInboxId) {
     inbox = await prisma.inbox.findUnique({
       where: { id: domain.catchAllInboxId }
     });
   }
   ```

3. Add domain settings UI in `MyDomains.tsx`:
   - Catch-all inbox selector
   - Default retention for new inboxes
   - Auto-reply toggle and message

## Success Criteria
- [ ] Reply to email from inbox viewer works end-to-end
- [ ] Compose new email from verified domain works
- [ ] Create organization with 3 members, all can access shared inbox
- [ ] Role permissions enforced (observer can't reply)
- [ ] Extended retention respects tier limits
- [ ] Catch-all inbox receives unmatched emails

## Risk Assessment
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| DKIM misconfiguration | Medium | High | Validate DNS before enabling send |
| Permission bypass | Low | Critical | Unit tests for all role combinations |
| Retention abuse (permanent) | Medium | Medium | Storage quotas per tier |
| Reply threading breaks | Low | Low | Test with Gmail, Outlook, Apple Mail |

## Security Considerations
- Outbound: Verify domain ownership before every send
- DKIM keys: Encrypted at rest, never exposed in API responses
- Org access: Double-check user membership on every request
- Reply: Validate In-Reply-To references actual received message
- Attachments: Same size limits as inbound

## Unresolved Questions
1. "Send on Behalf" vs "Send As" for team emails? (Recommend: Send As for simplicity)
2. Attachment storage attribution in teams? (Recommend: Per-organization quota)
3. Draft state for team review? (Recommend: Phase 4, not MVP)

## Next Steps
After completion:
1. Update pricing page with new features
2. Create team onboarding guide
3. Add send/reply to SDK methods
4. Consider Phase 4: Advanced features (drafts, scheduling, templates)
