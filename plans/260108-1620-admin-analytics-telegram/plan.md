---
title: "Admin Dashboard Analytics & Telegram Management"
description: "Public inbox viewer analytics tracking and comprehensive Telegram link management for administrators"
status: pending
priority: P2
effort: 12h
branch: main
tags: [admin, analytics, telegram, security, monitoring]
created: 2026-01-08
---

# Admin Dashboard Analytics & Telegram Management

## Executive Summary

Enhance admin dashboard with comprehensive analytics tracking for public inbox viewer usage and centralized Telegram link management. Enables security monitoring, abuse prevention, and system oversight.

## Problem Statement

### Current Gaps
1. **No public inbox viewer analytics** - Cannot track who views emails, search patterns, or detect abuse
2. **No admin Telegram oversight** - Admins cannot view/manage all Telegram links across system
3. **Limited security monitoring** - Missing IP tracking, session data, suspicious pattern detection
4. **No usage metrics** - Cannot analyze public viewer adoption, popular inboxes, traffic patterns

### Business Impact
- **Security Risk**: Public viewer abuse undetectable (scraping, spam reconnaissance)
- **Compliance**: GDPR requires tracking of data access (who viewed what, when)
- **Operations**: Cannot identify/prevent suspicious activity or optimize performance
- **Support**: No visibility into Telegram integration usage/issues

## Architecture Analysis

### Current Implementation

**Public Inbox Viewer** (`services/api/src/routes/public-inbox.ts`):
- Routes: `/public/inbox/search`, `/public/inbox/:email/messages`, `/public/inbox/:email/messages/:messageId`
- Basic audit logging: `PUBLIC_INBOX_SEARCHED`, `PUBLIC_MESSAGE_VIEWED` with IP
- Rate limiting: 100 req/min
- **Gap**: Audit logs lack session tracking, user agent, detailed metadata

**Telegram Integration** (`services/api/prisma/schema.prisma`):
- User-level: `User.telegramChatId`, `TelegramLinkToken`
- Inbox-level: `InboxTelegramLink`, `InboxTelegramAuthToken`, `TelegramNotificationLog`
- **Gap**: No admin endpoints to view all links, force unlink, audit history

**Admin Dashboard** (`services/web/src/pages/admin/`):
- Stats: users, domains, inboxes, messages, revenue
- Activity feed: Recent audit logs (limited)
- Charts: Timeseries, trends
- **Gap**: No analytics section, no Telegram management UI

### Database Schema (Existing)

```prisma
model AuditLog {
  id        String   @id @default(uuid())
  userId    String?
  action    String
  meta      Json?    // Currently stores: { email, ip, messageId }
  createdAt DateTime @default(now())
}

model InboxTelegramLink {
  id               String   @id @default(uuid())
  inboxEmail       String
  telegramChatId   String
  telegramUsername String?
  createdAt        DateTime @default(now())
  status           String   @default("ACTIVE") // ACTIVE, PAUSED, REVOKED

  @@unique([inboxEmail, telegramChatId])
}

model TelegramNotificationLog {
  id             String   @id @default(uuid())
  inboxEmail     String
  messageId      String
  telegramChatId String
  status         String   // SENT, FAILED
  errorMessage   String?
  sentAt         DateTime @default(now())
}
```

**Analysis**: Existing `AuditLog.meta` JSON field sufficient for analytics (no new table needed). Extend metadata.

## Solution Design

### Phase 1: Enhanced Analytics Tracking (3h)

**1.1 Extend Audit Metadata**

Update `recordAudit()` calls in `public-inbox.ts` to capture:

```typescript
// Extended audit metadata
interface PublicViewerAuditMeta {
  email: string;
  ip: string;
  userAgent: string;
  messageId?: string;
  searchQuery?: string;
  sessionId: string; // Generated from IP + User Agent hash
  referer?: string;
  timestamp: number;
}
```

**1.2 Session Tracking**

Generate session ID for correlation:
```typescript
function generateSessionId(ip: string, userAgent: string): string {
  return crypto.createHash('sha256')
    .update(`${ip}-${userAgent}-${Math.floor(Date.now() / (15 * 60 * 1000))}`) // 15min window
    .digest('hex')
    .slice(0, 16);
}
```

**1.3 Update Audit Calls**

Modify `public-inbox.ts`:
- `/public/inbox/search` → Log search query, session
- `/public/inbox/:email/messages` → Log pagination access
- `/public/inbox/:email/messages/:messageId` → Log full message view with session
- `/public/attachments/:id/download` → Log attachment download

**Files to modify**:
- `services/api/src/routes/public-inbox.ts` (4 audit calls)
- `services/api/src/utils/audit.ts` (add session helper)

### Phase 2: Admin Analytics API (4h)

**2.1 New Admin Routes** (`services/api/src/routes/admin/analytics.ts`)

```typescript
// GET /admin/analytics/public-viewer
// Dashboard stats for public inbox viewer
{
  totalSearches: number;
  totalMessageViews: number;
  totalAttachmentDownloads: number;
  uniqueIPs: number;
  uniqueSessions: number;
  topInboxes: Array<{ email: string; views: number }>;
  recentActivity: Array<AuditLog>;
  timeRange: '7d' | '30d' | 'all';
}

// GET /admin/analytics/public-viewer/sessions
// Session-based analytics
{
  sessions: Array<{
    sessionId: string;
    ip: string;
    userAgent: string;
    firstSeen: Date;
    lastSeen: Date;
    searchCount: number;
    viewCount: number;
    inboxesAccessed: string[];
  }>;
  meta: { total: number };
}

// GET /admin/analytics/public-viewer/details
// Detailed audit log with filters
// Query params: ?action=PUBLIC_MESSAGE_VIEWED&startDate=...&endDate=...&ip=...&limit=50&offset=0
{
  data: Array<AuditLog>;
  meta: { total: number };
}

// GET /admin/analytics/public-viewer/export
// CSV export for compliance
// Returns: audit-public-viewer-YYYY-MM-DD.csv
```

**2.2 Query Optimization**

Use aggregation queries for stats:
```typescript
const stats = await prisma.$queryRaw`
  SELECT
    COUNT(DISTINCT CASE WHEN action = 'PUBLIC_INBOX_SEARCHED' THEN id END) as searches,
    COUNT(DISTINCT CASE WHEN action = 'PUBLIC_MESSAGE_VIEWED' THEN id END) as views,
    COUNT(DISTINCT meta->>'ip') as unique_ips,
    COUNT(DISTINCT meta->>'sessionId') as unique_sessions
  FROM "AuditLog"
  WHERE action LIKE 'PUBLIC_%'
    AND "createdAt" >= $1
`;
```

**Files to create**:
- `services/api/src/routes/admin/analytics.ts` (new)
- Update `services/api/src/routes/admin/index.ts` (register route)

### Phase 3: Telegram Management API (2h)

**3.1 Admin Telegram Routes** (`services/api/src/routes/admin/telegram.ts`)

```typescript
// GET /admin/telegram/links
// List all Telegram links (user-level + inbox-level)
{
  userLinks: Array<{
    userId: string;
    userEmail: string;
    telegramChatId: string;
    linkedAt: Date;
    notifyOnEmail: boolean;
  }>;
  inboxLinks: Array<{
    id: string;
    inboxEmail: string;
    telegramChatId: string;
    telegramUsername: string | null;
    createdAt: Date;
    status: string;
    messagesSent: number; // From TelegramNotificationLog
  }>;
  stats: {
    totalUserLinks: number;
    totalInboxLinks: number;
    activeLinks: number;
  };
}

// DELETE /admin/telegram/links/user/:userId
// Force unlink user Telegram (security)
{ success: boolean }

// DELETE /admin/telegram/links/inbox/:linkId
// Force unlink inbox Telegram
{ success: boolean }

// GET /admin/telegram/activity
// Recent Telegram notification activity
{
  logs: Array<TelegramNotificationLog>;
  stats: {
    sentLast24h: number;
    failedLast24h: number;
    topInboxes: Array<{ inboxEmail: string; count: number }>;
  };
}
```

**3.2 Audit Trail**

Log admin actions:
- `ADMIN_TELEGRAM_USER_UNLINKED` - { userId, adminId, reason }
- `ADMIN_TELEGRAM_INBOX_UNLINKED` - { inboxEmail, linkId, adminId }

**Files to create**:
- `services/api/src/routes/admin/telegram.ts` (new)
- Update `services/api/src/routes/admin/index.ts`

### Phase 4: Admin UI - Analytics Dashboard (3h)

**4.1 Analytics Page** (`services/web/src/pages/admin/AnalyticsPage.tsx`)

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│ Public Inbox Viewer Analytics                          │
├─────────────────────────────────────────────────────────┤
│ [7 Days] [30 Days] [All Time]              [Export CSV]│
├─────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ │ Searches │ │ Views    │ │ Sessions │ │ Unique IP│   │
│ │  1,234   │ │  5,678   │ │   456    │ │   234    │   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
├─────────────────────────────────────────────────────────┤
│ Top Inboxes by Views          │ Recent Activity        │
│ 1. hello@domain.com (234)     │ • 123.45.67.89 viewed  │
│ 2. test@domain.com (123)      │   msg in test@...      │
│ 3. info@domain.com (89)       │ • 98.76.54.32 searched │
└─────────────────────────────────────────────────────────┘
│ Session Details (expandable table)                     │
│ SessionID    IP          Agent       Actions  Inboxes  │
│ abc123...   1.2.3.4   Chrome/Win   5 views  2 inboxes │
└─────────────────────────────────────────────────────────┘
```

**Components**:
- `AnalyticsOverviewCards` - Stats cards with count-up animation
- `TopInboxesChart` - Bar chart (Recharts)
- `RecentActivityFeed` - Live audit log feed
- `SessionTable` - Expandable session details with filters

**4.2 Route Registration**

Add to `services/web/src/pages/Admin.tsx`:
```tsx
<Route path="analytics" element={<AnalyticsPage />} />
```

**Files to create**:
- `services/web/src/pages/admin/AnalyticsPage.tsx`
- `services/web/src/components/admin/AnalyticsOverview.tsx`
- `services/web/src/components/admin/SessionTable.tsx`

### Phase 5: Admin UI - Telegram Management (2h)

**5.1 Telegram Management Page** (`services/web/src/pages/admin/TelegramManagementPage.tsx`)

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│ Telegram Integration Management                        │
├─────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│ │ User Links│ │Inbox Links│ │ Messages │                │
│ │    45    │ │    123   │ │  Today   │                │
│ │          │ │          │ │   456    │                │
│ └──────────┘ └──────────┘ └──────────┘                │
├─────────────────────────────────────────────────────────┤
│ User-Level Links                                        │
│ User              Chat ID     Linked      Actions       │
│ user@mail.com    123456789   2h ago      [Unlink]      │
│ admin@mail.com   987654321   1d ago      [Unlink]      │
├─────────────────────────────────────────────────────────┤
│ Inbox-Level Links                                       │
│ Inbox             Chat ID    Username   Msgs  Actions   │
│ hello@domain.com  12345678   @user123   45   [Unlink]  │
│ test@domain.com   87654321   @testuser  12   [Unlink]  │
├─────────────────────────────────────────────────────────┤
│ Notification Activity (Last 24h)                        │
│ Inbox             Sent  Failed  Last Sent               │
│ hello@domain.com   23     1     5m ago                  │
└─────────────────────────────────────────────────────────┘
```

**Features**:
- Search/filter by inbox, chat ID, username
- Pagination (50 per page)
- Confirm modal before force unlink
- Activity log after unlink action
- Export CSV of all links

**Files to create**:
- `services/web/src/pages/admin/TelegramManagementPage.tsx`
- `services/web/src/components/admin/TelegramLinksTable.tsx`

**5.2 Update Admin Navigation**

Add to `services/web/src/components/AdminPanel.tsx`:
```tsx
{ icon: BarChart, label: "Analytics", path: "/admin/analytics" },
{ icon: MessageCircle, label: "Telegram", path: "/admin/telegram" },
```

### Security & Privacy Considerations

**GDPR Compliance**:
1. **Data Minimization**: Only store IP (pseudonymous), User Agent, timestamps
2. **Purpose Limitation**: Analytics for security/abuse prevention only
3. **Storage Limitation**: Auto-delete audit logs > 90 days (configurable)
4. **Right to Access**: Admin export provides audit trail for data subject requests

**Implementation**:
```typescript
// Cron job to cleanup old analytics
async function cleanupOldAuditLogs() {
  const retentionDays = parseInt(process.env.ANALYTICS_RETENTION_DAYS || '90');
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  await prisma.auditLog.deleteMany({
    where: {
      action: { startsWith: 'PUBLIC_' },
      createdAt: { lt: cutoffDate }
    }
  });
}
```

**Security Best Practices**:
1. **Rate Limiting**: Keep 100 req/min on public endpoints
2. **Admin Auth**: All analytics endpoints use `app.requireAdmin`
3. **IP Anonymization**: Option to hash last octet (EU compliance)
4. **Suspicious Pattern Detection**: Flag sessions with >100 views/hour

**Anti-Abuse Rules**:
```typescript
// Detect suspicious sessions
interface SuspiciousPattern {
  type: 'HIGH_VOLUME' | 'RAPID_FIRE' | 'SCRAPING';
  sessionId: string;
  ip: string;
  threshold: number;
  actual: number;
}

async function detectSuspiciousActivity(): Promise<SuspiciousPattern[]> {
  // Query audit logs for patterns:
  // - >100 message views in 1 hour
  // - >50 searches in 10 minutes
  // - Sequential message ID access (scraping indicator)
}
```

### Performance Optimization

**1. Database Indexes**

```sql
-- Add indexes for analytics queries
CREATE INDEX idx_auditlog_action_created ON "AuditLog"(action, "createdAt");
CREATE INDEX idx_auditlog_meta_ip ON "AuditLog" USING GIN((meta->>'ip'));
CREATE INDEX idx_auditlog_meta_session ON "AuditLog" USING GIN((meta->>'sessionId'));

-- Telegram activity indexes
CREATE INDEX idx_telegram_notif_inbox_sent ON "TelegramNotificationLog"(inboxEmail, sentAt);
CREATE INDEX idx_telegram_notif_status ON "TelegramNotificationLog"(status, sentAt);
```

**2. Caching Strategy**

Use Redis for dashboard stats (5-minute cache):
```typescript
const cacheKey = `admin:analytics:overview:${timeRange}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const stats = await computeAnalytics();
await redis.setex(cacheKey, 300, JSON.stringify(stats));
return stats;
```

**3. Query Optimization**

- Use `$queryRaw` for complex aggregations
- Paginate large result sets (50 per page)
- Limit CSV export to 10,000 rows
- Background job for heavy analytics (> 1M records)

## Implementation Phases

### Phase 1: Backend Analytics (5h)
1. Extend audit metadata in `public-inbox.ts` (1h)
2. Create session helper in `audit.ts` (30m)
3. Create `admin/analytics.ts` API routes (2h)
4. Add database indexes (30m)
5. Testing (1h)

**Deliverables**:
- Enhanced audit logging with session tracking
- 4 new admin analytics endpoints
- Database indexes
- Unit tests

### Phase 2: Backend Telegram Management (2h)
1. Create `admin/telegram.ts` API routes (1h)
2. Add audit logging for admin actions (30m)
3. Testing (30m)

**Deliverables**:
- 3 new admin Telegram endpoints
- Audit trail for force unlink actions
- Integration tests

### Phase 3: Frontend Analytics UI (3h)
1. Create `AnalyticsPage.tsx` (1.5h)
2. Create analytics components (1h)
3. Add navigation link (15m)
4. Testing (15m)

**Deliverables**:
- Analytics dashboard page
- Reusable analytics components
- CSV export functionality

### Phase 4: Frontend Telegram UI (2h)
1. Create `TelegramManagementPage.tsx` (1h)
2. Create Telegram links table component (45m)
3. Add confirmation modals (15m)

**Deliverables**:
- Telegram management page
- Force unlink functionality
- Activity monitoring

### Phase 5: Security & Cleanup (1h)
1. Implement audit retention cron job (30m)
2. Add suspicious activity detection (30m)

**Deliverables**:
- Auto-cleanup job
- Abuse detection alerts

## Testing Strategy

### Unit Tests
```typescript
// services/api/src/routes/admin/analytics.test.ts
describe('Admin Analytics API', () => {
  it('should return public viewer stats', async () => {
    // Create test audit logs
    // Call /admin/analytics/public-viewer
    // Assert stats are correct
  });

  it('should filter by date range', async () => {
    // Test 7d, 30d, all time filters
  });

  it('should detect suspicious sessions', async () => {
    // Create 100 views from same IP
    // Assert session flagged
  });
});
```

### Integration Tests
```typescript
// services/api/src/routes/admin/telegram.test.ts
describe('Admin Telegram Management', () => {
  it('should list all Telegram links', async () => {
    // Create user and inbox links
    // Call /admin/telegram/links
    // Assert all links returned
  });

  it('should force unlink user Telegram', async () => {
    // Link user Telegram
    // Admin calls DELETE /admin/telegram/links/user/:userId
    // Assert link removed, audit log created
  });
});
```

### E2E Tests
- Navigate to /admin/analytics, verify charts render
- Search for specific session, verify filtering
- Export CSV, verify file format
- Force unlink Telegram, verify confirmation modal
- Verify audit log after admin action

## Monitoring & Alerts

**Metrics to Track**:
- Public viewer usage (searches, views per day)
- Suspicious session count
- Telegram link creation/removal rate
- Failed Telegram notifications

**Grafana Dashboard**:
```promql
# Public viewer activity
rate(audit_log_total{action="PUBLIC_MESSAGE_VIEWED"}[1h])

# Suspicious sessions
increase(suspicious_sessions_total[1h]) > 10

# Telegram notification failures
rate(telegram_notification_total{status="FAILED"}[5m]) > 0.1
```

**Alerts**:
- High-volume session detected (>100 views/hour)
- Telegram notification failure rate >10%
- Analytics API response time >2s

## Documentation Updates

**Files to update**:
1. `docs/system-architecture.md` - Add analytics flow diagram
2. `docs/project-overview-pdr.md` - Add admin features section
3. `README.md` - Update admin panel features list
4. Create `docs/admin-analytics-guide.md` - Admin user guide

**API Documentation** (OpenAPI):
```yaml
/admin/analytics/public-viewer:
  get:
    summary: Get public inbox viewer analytics
    tags: [Admin, Analytics]
    security: [BearerAuth: []]
    parameters:
      - name: timeRange
        in: query
        schema: { type: string, enum: [7d, 30d, all] }
    responses:
      200:
        description: Analytics overview
        content:
          application/json:
            schema:
              type: object
              properties:
                totalSearches: { type: number }
                totalMessageViews: { type: number }
                uniqueIPs: { type: number }
```

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performance degradation with large audit logs | High | Medium | Add indexes, pagination, caching, auto-cleanup |
| GDPR compliance issues with IP storage | High | Low | Anonymize IPs, retention policy, document purpose |
| False positive abuse detection | Medium | Medium | Tune thresholds, manual review before blocking |
| Telegram API rate limits | Medium | Low | Queue notifications, exponential backoff |
| Admin dashboard slow load | Medium | Medium | Cache stats, lazy load charts, paginate tables |

## Success Metrics

**Analytics Adoption**:
- Admins check analytics >3x per week
- Suspicious sessions detected and blocked
- CSV exports used for compliance

**Telegram Management**:
- Average admin response time to Telegram issues <1h
- Force unlink used in abuse cases
- Activity monitoring prevents spam

**System Health**:
- Analytics API p95 latency <500ms
- Zero GDPR complaints
- Public viewer abuse rate <1%

## Open Questions

1. **IP Anonymization**: Hash last octet for EU users? (GDPR recommendation)
2. **Auto-blocking**: Should system auto-block IPs with suspicious patterns, or just flag for admin?
3. **Retention Period**: 90 days sufficient for compliance? Configurable per region?
4. **Real-time Alerts**: Send admin notifications for high-volume sessions? (Slack/Email integration)
5. **Session Definition**: 15-minute window appropriate, or adjust based on usage patterns?
6. **Telegram Spam Prevention**: Rate limit notifications per inbox (e.g., max 50/day)?

## Files Modified/Created Summary

### Backend (7 files)
- **Modified**: `services/api/src/routes/public-inbox.ts` - Enhanced audit logging
- **Modified**: `services/api/src/utils/audit.ts` - Session helper
- **Created**: `services/api/src/routes/admin/analytics.ts` - Analytics API
- **Created**: `services/api/src/routes/admin/telegram.ts` - Telegram management API
- **Modified**: `services/api/src/routes/admin/index.ts` - Register new routes
- **Modified**: `services/api/prisma/migrations/xxx_add_analytics_indexes.sql` - DB indexes
- **Modified**: `services/api/src/cron/index.ts` - Add cleanup job

### Frontend (6 files)
- **Created**: `services/web/src/pages/admin/AnalyticsPage.tsx`
- **Created**: `services/web/src/pages/admin/TelegramManagementPage.tsx`
- **Created**: `services/web/src/components/admin/AnalyticsOverview.tsx`
- **Created**: `services/web/src/components/admin/SessionTable.tsx`
- **Created**: `services/web/src/components/admin/TelegramLinksTable.tsx`
- **Modified**: `services/web/src/pages/Admin.tsx` - Add routes
- **Modified**: `services/web/src/components/AdminPanel.tsx` - Add nav links

### Tests (4 files)
- **Created**: `services/api/src/routes/admin/analytics.test.ts`
- **Created**: `services/api/src/routes/admin/telegram.test.ts`
- **Created**: `services/web/src/pages/admin/AnalyticsPage.test.tsx`
- **Created**: `services/web/src/pages/admin/TelegramManagementPage.test.tsx`

### Documentation (4 files)
- **Modified**: `docs/system-architecture.md`
- **Modified**: `docs/project-overview-pdr.md`
- **Modified**: `README.md`
- **Created**: `docs/admin-analytics-guide.md`

**Total**: 21 files (13 created, 8 modified)

## Next Steps

1. Review plan with stakeholders
2. Answer open questions (IP anonymization, auto-blocking strategy)
3. Create GitHub issues for each phase
4. Start Phase 1 implementation (backend analytics)
5. Set up monitoring dashboards before production deployment
