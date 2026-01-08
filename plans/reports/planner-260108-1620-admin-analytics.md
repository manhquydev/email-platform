# Research Report: Admin Dashboard Analytics & Telegram Management

**Date**: 2026-01-08
**Agent**: planner
**Session**: a751d9b
**Plan**: `plans/260108-1620-admin-analytics-telegram/`

---

## Executive Summary

Researched and planned comprehensive admin dashboard enhancements for public inbox viewer analytics tracking and Telegram link management. **No database schema changes required** - leverages existing `AuditLog.meta` JSON field for analytics. Total effort: **12 hours** across 5 phases.

---

## Research Findings

### Current State Analysis

**Public Inbox Viewer** (`services/api/src/routes/public-inbox.ts`):
- ✅ **Exists**: Basic audit logging (`PUBLIC_INBOX_SEARCHED`, `PUBLIC_MESSAGE_VIEWED`)
- ✅ **Captures**: IP address in audit metadata
- ❌ **Missing**: User agent, session tracking, detailed analytics
- ❌ **No Admin UI**: Cannot view/analyze usage patterns

**Telegram Integration**:
- ✅ **User-level**: `User.telegramChatId`, `TelegramLinkToken` (user account linking)
- ✅ **Inbox-level**: `InboxTelegramLink`, `InboxTelegramAuthToken`, `TelegramNotificationLog` (per-inbox notifications)
- ✅ **Service exists**: `inbox-telegram-service.ts` handles linking/unlinking
- ❌ **No admin oversight**: Cannot view all links, force unlink, or monitor activity
- ❌ **No admin routes**: All endpoints are user-scoped or public

**Admin Dashboard** (`services/web/src/pages/admin/`):
- ✅ **Comprehensive stats**: Users, domains, inboxes, messages, revenue, trends
- ✅ **Activity feed**: Recent audit logs (last 5 actions)
- ✅ **Charts**: Timeseries, radar, trends (Recharts library)
- ❌ **No analytics section**: Public viewer usage not tracked
- ❌ **No Telegram management**: Links not visible to admins

**Audit System** (`services/api/src/utils/audit.ts`):
- ✅ **Simple implementation**: `recordAudit(userId, action, meta)` stores JSON metadata
- ✅ **Existing indexes**: `AuditLog` has `userId`, `action`, `createdAt`
- ❌ **Missing indexes**: No GIN index on `meta` JSON field for fast filtering
- ❌ **No retention policy**: Audit logs grow indefinitely

### Architecture Strengths

1. **JSON metadata flexibility**: `AuditLog.meta` can store arbitrary analytics data without schema migration
2. **Existing admin routes**: Modular structure in `services/api/src/routes/admin/` easy to extend
3. **Component reuse**: Admin dashboard uses glassmorphism cards, charts ready for new pages
4. **Rate limiting**: Public endpoints already protected (100 req/min)
5. **Separation of concerns**: Telegram service layer separate from routes

### Identified Gaps

| Component | Gap | Impact | Solution |
|-----------|-----|--------|----------|
| Public viewer audit | No session tracking | Cannot correlate user activity | Add sessionId to metadata |
| Public viewer audit | No user agent | Cannot detect bots/scrapers | Capture from `request.headers['user-agent']` |
| Admin API | No analytics endpoints | Cannot query usage stats | Create `/admin/analytics/*` routes |
| Admin API | No Telegram management | Cannot force unlink malicious accounts | Create `/admin/telegram/*` routes |
| Database | No JSON indexes | Slow analytics queries | Add GIN indexes on `meta->>'ip'`, `meta->>'sessionId'` |
| Frontend | No analytics UI | Admins cannot view metrics | Create `AnalyticsPage.tsx` |
| Frontend | No Telegram UI | Admins cannot manage links | Create `TelegramManagementPage.tsx` |
| Cron jobs | No audit cleanup | GDPR compliance risk | Add retention sweep (90 days) |

---

## Solution Architecture

### Design Principles

1. **YAGNI**: Use existing `AuditLog` table, avoid new analytics tables
2. **KISS**: Session = hash(IP + UserAgent + 15min window), no complex session store
3. **DRY**: Reuse existing admin components (GlassCard, charts, table patterns)

### Data Flow

```
Public Viewer Request
        ↓
  [public-inbox.ts]
        ↓
  recordAudit(null, action, {
    ip, userAgent, sessionId,
    email, messageId, timestamp
  })
        ↓
  [AuditLog.meta JSON]
        ↓
  [Admin Analytics API]
  - Aggregate by sessionId
  - Count unique IPs
  - Detect patterns
        ↓
  [Admin UI Charts]
```

### Session Tracking Strategy

**Session ID Generation**:
```typescript
sessionId = sha256(ip + userAgent + floor(timestamp / 15min)).slice(0, 16)
```

**Benefits**:
- No session storage needed
- Deterministic (same user = same sessionId within 15min window)
- Privacy-preserving (cannot reverse to original IP)
- Correlates user actions across requests

**Example**:
- User `123.45.67.89` with `Chrome/Win` searches at `14:05` → sessionId `abc123...`
- Same user views message at `14:10` → same sessionId `abc123...`
- After `14:20` → new sessionId `def456...` (new 15min window)

### Privacy & GDPR Compliance

**Data Collected**:
- IP address (pseudonymous identifier per GDPR Art. 4)
- User agent (device/browser fingerprint)
- Timestamps (when accessed)
- Email viewed (content identifier)

**Legal Basis**: Legitimate interest (GDPR Art. 6(1)(f)) - fraud prevention, security monitoring

**Safeguards**:
1. **Purpose limitation**: Analytics for abuse prevention only
2. **Storage limitation**: Auto-delete after 90 days (configurable)
3. **Data minimization**: No PII collected (no names, emails of viewers)
4. **Right to access**: CSV export provides audit trail
5. **Security**: Admin-only access, audit trail of who accessed analytics

**Optional IP Anonymization** (EU best practice):
```typescript
function anonymizeIP(ip: string): string {
  // Hash last octet for EU users
  // 123.45.67.89 → 123.45.67.XXX
  return ip.split('.').slice(0, 3).join('.') + '.0';
}
```

### Performance Strategy

**Database Indexes**:
```sql
-- Fast filtering by action type
CREATE INDEX idx_auditlog_action_created
  ON "AuditLog"(action, "createdAt");

-- Fast JSON queries (requires PostgreSQL GIN)
CREATE INDEX idx_auditlog_meta_ip
  ON "AuditLog" USING GIN((meta->>'ip'));

CREATE INDEX idx_auditlog_meta_session
  ON "AuditLog" USING GIN((meta->>'sessionId'));
```

**Caching** (Redis):
- Dashboard stats: 5-minute cache
- Top inboxes: 15-minute cache
- Session list: 1-minute cache
- Cache key pattern: `admin:analytics:{metric}:{timeRange}`

**Query Optimization**:
- Use `$queryRaw` for complex aggregations (faster than Prisma ORM)
- Paginate all lists (50 per page)
- Limit CSV exports (10,000 rows max)
- Background job for heavy analytics (>1M records)

---

## Implementation Breakdown

### Phase 1: Backend Analytics (5h)

**Files Modified**:
- `services/api/src/routes/public-inbox.ts` - 4 audit call sites
- `services/api/src/utils/audit.ts` - Add `generateSessionId()` helper

**Files Created**:
- `services/api/src/routes/admin/analytics.ts` - 4 endpoints (overview, sessions, details, export)

**Database**:
- Migration: `20260108_add_analytics_indexes.sql`

**Endpoints**:
```typescript
GET  /admin/analytics/public-viewer          // Dashboard stats
GET  /admin/analytics/public-viewer/sessions // Session breakdown
GET  /admin/analytics/public-viewer/details  // Detailed audit log
GET  /admin/analytics/public-viewer/export   // CSV export
```

**Testing**:
- Unit tests: Verify session ID generation, stats aggregation
- Integration tests: Verify audit logging, API responses
- Performance tests: Query time <500ms for 100k records

### Phase 2: Backend Telegram Management (2h)

**Files Created**:
- `services/api/src/routes/admin/telegram.ts` - 3 endpoints

**Endpoints**:
```typescript
GET    /admin/telegram/links              // List all links (user + inbox)
DELETE /admin/telegram/links/user/:userId // Force unlink user
DELETE /admin/telegram/links/inbox/:id    // Force unlink inbox
GET    /admin/telegram/activity           // Notification logs
```

**Audit Trail**:
- `ADMIN_TELEGRAM_USER_UNLINKED` - { userId, adminId, reason }
- `ADMIN_TELEGRAM_INBOX_UNLINKED` - { inboxEmail, linkId, adminId }

**Testing**:
- Integration tests: Verify force unlink removes link + creates audit log
- Security tests: Verify non-admin cannot access endpoints

### Phase 3: Frontend Analytics UI (3h)

**Files Created**:
- `services/web/src/pages/admin/AnalyticsPage.tsx` - Main page
- `services/web/src/components/admin/AnalyticsOverview.tsx` - Stats cards
- `services/web/src/components/admin/SessionTable.tsx` - Session list

**UI Features**:
- Time range selector (7d, 30d, all time)
- 4 stat cards: Searches, Views, Sessions, Unique IPs (count-up animation)
- Top inboxes bar chart (Recharts)
- Recent activity feed (live updates)
- Session table with filters (IP, date range)
- CSV export button

**Reused Components**:
- `GlassCard` - Existing glassmorphism card
- `useCountUp` hook - Existing animation
- Recharts library - Already configured

### Phase 4: Frontend Telegram UI (2h)

**Files Created**:
- `services/web/src/pages/admin/TelegramManagementPage.tsx` - Main page
- `services/web/src/components/admin/TelegramLinksTable.tsx` - Links table

**UI Features**:
- 3 stat cards: User links, Inbox links, Messages today
- User links table (email, chatId, linked date, unlink button)
- Inbox links table (inbox, chatId, username, msg count, unlink button)
- Notification activity chart (last 24h)
- Confirmation modal before force unlink
- Search/filter by inbox or chat ID

### Phase 5: Security & Cleanup (1h)

**Cron Job**:
```typescript
// services/api/src/cron/cleanup-audit-logs.ts
schedule.scheduleJob('0 2 * * *', async () => {
  const retentionDays = parseInt(process.env.ANALYTICS_RETENTION_DAYS || '90');
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  await prisma.auditLog.deleteMany({
    where: {
      action: { startsWith: 'PUBLIC_' },
      createdAt: { lt: cutoff }
    }
  });
});
```

**Suspicious Activity Detection**:
```typescript
// Flag sessions with >100 views in 1 hour
const suspicious = await prisma.$queryRaw`
  SELECT meta->>'sessionId' as session_id,
         meta->>'ip' as ip,
         COUNT(*) as view_count
  FROM "AuditLog"
  WHERE action = 'PUBLIC_MESSAGE_VIEWED'
    AND "createdAt" > NOW() - INTERVAL '1 hour'
  GROUP BY meta->>'sessionId', meta->>'ip'
  HAVING COUNT(*) > 100
`;
```

---

## Testing Strategy

### Unit Tests (4 files)

**Analytics API**:
```typescript
// services/api/src/routes/admin/analytics.test.ts
describe('GET /admin/analytics/public-viewer', () => {
  it('returns correct stats for 7d range', async () => {
    // Seed 10 searches, 50 views across 3 sessions
    // Call endpoint with timeRange=7d
    // Assert: totalSearches=10, totalViews=50, uniqueSessions=3
  });

  it('exports CSV with correct format', async () => {
    // Seed audit logs
    // Call /export endpoint
    // Assert: CSV headers, row count, escaping
  });
});
```

**Telegram API**:
```typescript
// services/api/src/routes/admin/telegram.test.ts
describe('DELETE /admin/telegram/links/user/:userId', () => {
  it('force unlinks user Telegram and creates audit log', async () => {
    // Link user Telegram
    // Admin calls DELETE endpoint
    // Assert: user.telegramChatId = null, audit log created
  });
});
```

### Integration Tests (2 files)

**E2E Analytics Flow**:
```typescript
// User searches public inbox → audit logged
// User views message → audit logged with sessionId
// Admin calls /analytics/sessions → session appears
// Session has 2 actions (search + view)
```

**E2E Telegram Flow**:
```typescript
// User links Telegram to inbox
// Inbox receives email → Telegram notified
// Admin views /telegram/links → link appears
// Admin force unlinks → notification stops
```

### Performance Tests

**Load Test Analytics API**:
- Seed 100k audit logs
- Query /admin/analytics/public-viewer
- Assert: Response time <500ms
- Assert: Database CPU <50%

**Concurrent Access**:
- 10 admin users simultaneously access analytics
- Assert: No race conditions, consistent results

---

## Risk Analysis

### High Risks

**1. GDPR Compliance - IP Storage**
- **Mitigation**: Document legal basis (legitimate interest), retention policy, provide CSV export for data subject requests
- **Alternative**: Hash last IP octet for EU users (reduces utility)

**2. Performance Degradation**
- **Cause**: Large audit log table (>1M rows)
- **Mitigation**: Database indexes, pagination, caching, auto-cleanup after 90 days
- **Monitoring**: Alert if query time >1s

### Medium Risks

**3. False Positive Abuse Detection**
- **Cause**: Shared IPs (NAT, corporate networks) flagged as suspicious
- **Mitigation**: Tune thresholds (100 views/hour reasonable for legitimate use), manual review before blocking

**4. Telegram API Rate Limits**
- **Cause**: High-volume notifications trigger rate limit (30 msg/sec)
- **Mitigation**: Queue notifications, exponential backoff, monitor `TelegramNotificationLog` failures

### Low Risks

**5. Admin Dashboard Slow Load**
- **Cause**: Too many charts rendering simultaneously
- **Mitigation**: Lazy load charts, skeleton loaders, stagger API calls

**6. CSV Export Memory Issues**
- **Cause**: Exporting 1M rows consumes excessive memory
- **Mitigation**: Limit export to 10k rows, use streaming for larger exports

---

## Success Metrics

**Adoption**:
- [ ] Admins check analytics >3x per week (track pageviews)
- [ ] CSV exports used >1x per month (compliance)
- [ ] Suspicious sessions detected and investigated

**Performance**:
- [ ] Analytics API p95 latency <500ms
- [ ] Dashboard load time <2s
- [ ] Zero database timeout errors

**Security**:
- [ ] Public viewer abuse rate <1% of total traffic
- [ ] Zero GDPR complaints
- [ ] Admin actions audited (100% coverage)

**Telegram Management**:
- [ ] Force unlink used in abuse cases (track usage)
- [ ] Average admin response time to Telegram issues <1h
- [ ] Notification failure rate <5%

---

## Open Questions (For Product/Legal Review)

### Privacy & Compliance

**Q1**: Should we anonymize IP addresses for EU users (hash last octet)?
- **Context**: GDPR recommends minimizing identifiers
- **Tradeoff**: Reduces ability to detect multi-IP abuse
- **Recommendation**: Make configurable via `ANONYMIZE_IPS_EU=true/false`

**Q2**: What retention period is required for compliance?
- **Current**: 90 days default
- **Question**: Does legal require longer (e.g., 1 year for fraud investigation)?
- **Action**: Confirm with legal team before finalizing

### Security & Operations

**Q3**: Should system auto-block IPs with suspicious patterns?
- **Context**: >100 views/hour could indicate scraping
- **Tradeoff**: False positives could block legitimate users
- **Recommendation**: Flag for admin review only, manual blocking

**Q4**: Enable real-time alerts for high-volume sessions?
- **Options**: Slack webhook, email, SMS
- **Tradeoff**: Alert fatigue vs early detection
- **Recommendation**: Start with daily digest, add real-time if needed

### Product

**Q5**: Should analytics be visible to non-admin users (per-inbox owners)?
- **Context**: Users might want to see who viewed their public inbox
- **Privacy concern**: Exposing IP addresses to users
- **Recommendation**: Phase 2 feature - show aggregate stats only (view count, no IPs)

**Q6**: Rate limit Telegram notifications per inbox?
- **Context**: Prevent spam if inbox receives flood of emails
- **Proposal**: Max 50 notifications/day per inbox
- **Question**: What's appropriate limit based on usage patterns?

---

## Next Steps

### Immediate (Pre-Implementation)

1. **Stakeholder Review** (1h)
   - Product team: Confirm feature scope, prioritize phases
   - Legal team: Approve IP storage, retention policy, GDPR compliance
   - DevOps team: Review database indexes, caching strategy

2. **Answer Open Questions** (30m)
   - Document decisions in `plan.md`
   - Update privacy policy if needed
   - Set retention policy env var

3. **Create GitHub Issues** (30m)
   - Issue #1: Backend Analytics API (Phase 1)
   - Issue #2: Backend Telegram Management (Phase 2)
   - Issue #3: Frontend Analytics UI (Phase 3)
   - Issue #4: Frontend Telegram UI (Phase 4)
   - Issue #5: Security & Cleanup (Phase 5)

### Implementation Order

**Week 1**: Backend (Phases 1-2)
- Day 1-2: Analytics API + DB indexes
- Day 3: Telegram management API
- Day 4: Testing + documentation
- Day 5: Code review, merge to main

**Week 2**: Frontend (Phases 3-4)
- Day 1-2: Analytics dashboard UI
- Day 3: Telegram management UI
- Day 4: E2E testing
- Day 5: Staging deployment

**Week 3**: Monitoring & Refinement (Phase 5)
- Day 1: Cron job + abuse detection
- Day 2: Grafana dashboards
- Day 3: Load testing
- Day 4: Documentation
- Day 5: Production deployment

### Post-Deployment

1. **Monitor Metrics** (First 2 weeks)
   - Analytics API response times
   - Dashboard load times
   - Suspicious session count
   - Admin adoption (pageviews)

2. **Iterate** (Based on usage)
   - Tune abuse detection thresholds
   - Add requested filters/charts
   - Optimize slow queries

3. **Documentation** (Ongoing)
   - Admin user guide
   - API documentation (OpenAPI)
   - Runbook for common issues

---

## Deliverables

### Comprehensive Plan Created

**File**: `plans/260108-1620-admin-analytics-telegram/plan.md`

**Contents**:
- Executive summary
- Problem statement & business impact
- Architecture analysis (current state + gaps)
- Solution design (5 phases, 12h total effort)
- Database schema (no changes needed, uses existing `AuditLog`)
- API endpoints (7 new routes)
- UI mockups (2 new admin pages)
- Security & GDPR compliance strategy
- Testing strategy (unit, integration, E2E)
- Performance optimization (indexes, caching, pagination)
- Monitoring & alerts (Grafana dashboards)
- Risk analysis & mitigation
- Success metrics
- Open questions for stakeholder review

### File Manifest

**Total**: 21 files (13 created, 8 modified)

**Backend** (7 files):
- Modified: `public-inbox.ts`, `audit.ts`, `admin/index.ts`, `cron/index.ts`
- Created: `admin/analytics.ts`, `admin/telegram.ts`, migration SQL

**Frontend** (6 files):
- Modified: `Admin.tsx`, `AdminPanel.tsx`
- Created: 4 new pages/components

**Tests** (4 files):
- Created: `analytics.test.ts`, `telegram.test.ts`, 2 UI tests

**Docs** (4 files):
- Modified: `system-architecture.md`, `project-overview-pdr.md`, `README.md`
- Created: `admin-analytics-guide.md`

---

## Conclusion

**Feasibility**: ✅ **High** - Leverages existing infrastructure, no schema changes

**Complexity**: 🟡 **Medium** - Moderate backend work, straightforward UI

**Value**: ✅ **High** - Critical for security, compliance, abuse prevention

**Timeline**: 📅 **2-3 weeks** (12h implementation + 4h testing + 2h deployment)

**Recommendation**: **Proceed with Phase 1 (Backend Analytics)** - highest value, enables future phases, no UI dependencies.

---

## Unresolved Questions

1. IP anonymization for EU users? (Legal decision needed)
2. Auto-blocking vs manual review? (Product + Security decision)
3. Real-time alerts configuration? (Operations decision)
4. Retention period confirmation? (Legal requirement)
5. Session window optimization? (Monitor usage patterns first)
6. Telegram notification rate limits? (Analyze current usage data)
