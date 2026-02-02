# Phase 3: Analytics Dashboard

## Context Links
- **Parent Plan:** [plan.md](./plan.md)
- **Research:** [Analytics & Monitoring Research](./research/researcher-02-analytics-monitoring.md)
- **Documentation:** [System Architecture](../../docs/system-architecture.md)

## Overview
**Date:** 2026-02-01
**Priority:** P2
**Effort:** 10 hours
**Status:** 🔴 Pending

Admin dashboard for monitoring email deliverability, system health, and queue performance with real-time visualizations.

## Key Insights
- **Recharts** recommended for React-native charts (responsive, 11+ types)
- **BullMQ** already tracks job metrics in Redis (~120KB per queue for 2 weeks)
- **Bounce rate target:** <2% total, <0.5% hard bounces
- **Spam rate critical threshold:** <0.1%
- **Prometheus + Grafana** optional - prom-client exports custom metrics
- **React Query** for server state with 30s stale time (avoids excessive polling)

## Requirements

### Functional
1. Admin-only analytics page at `/admin/analytics`
2. Email deliverability metrics (bounce rate, spam rate, volume trends)
3. BullMQ queue monitoring (depth, processing latency, failures)
4. System health (Redis memory, PostgreSQL connections, API response time)
5. Time-series charts for inbound/outbound mail volume (24h, 7d, 30d)
6. Real-time updates via polling (30s interval)
7. Export metrics to Prometheus `/metrics` endpoint (optional)

### Non-Functional
- Dashboard loads in <2s (aggregate metrics server-side)
- Charts render in <500ms (use Recharts virtualization)
- API endpoints return in <200ms (cache aggregates in Redis)
- Support 1000+ concurrent admin users (stateless API)
- Prometheus scrape interval: 15s (standard)

## Architecture

### System Design
```
Admin Web UI (React Query)
  ├─► GET /api/admin/analytics/overview (cached 30s)
  ├─► GET /api/admin/analytics/email-metrics?range=7d
  ├─► GET /api/admin/analytics/queue-health
  └─► GET /api/admin/analytics/system-status

API Server
  ├─► analytics-service.ts (data aggregation)
  ├─► Redis (cache aggregates, 30s TTL)
  ├─► PostgreSQL (pg_stat_statements for slow queries)
  └─► BullMQ (job metrics from Redis)

Prometheus (optional)
  └─► Scrape /metrics every 15s
      └─► Grafana dashboards
```

### Data Flow
```
User opens /admin/analytics
  └─► React Query fetches 4 endpoints in parallel
      ├─► /overview (total users, inboxes, messages)
      ├─► /email-metrics (bounce/spam rate, volume chart)
      ├─► /queue-health (depth, latency, failures)
      └─► /system-status (Redis/PostgreSQL stats)
  └─► Recharts renders visualizations
  └─► Polling refetches every 30s (staleTime)
```

## Related Code Files

### Files to Create - Backend
- `services/api/src/routes/admin/analytics.ts` - Analytics API endpoints
- `services/api/src/services/analytics-service.ts` - Data aggregation logic
- `services/api/src/lib/prometheus-metrics.ts` - prom-client setup (optional)
- `services/api/src/middleware/admin-auth.ts` - Admin role check (if not exists)

### Files to Create - Frontend
- `services/web/src/pages/admin/AnalyticsDashboard.tsx` - Main dashboard page
- `services/web/src/components/analytics/EmailMetricsChart.tsx` - Line chart (volume)
- `services/web/src/components/analytics/DeliverabilityWidget.tsx` - Bounce/spam rates
- `services/web/src/components/analytics/QueueHealthWidget.tsx` - BullMQ stats
- `services/web/src/components/analytics/SystemStatusPanel.tsx` - Redis/PostgreSQL
- `services/web/src/hooks/useAnalytics.ts` - React Query hooks

### Files to Modify
- `services/web/src/router/index.tsx` - Add /admin/analytics route
- `services/web/package.json` - Add recharts, @tanstack/react-query
- `services/api/package.json` - Add prom-client (optional)

## Implementation Steps

1. **Install Dependencies** (0.5h)
   - Add `recharts` to web package.json
   - Add `@tanstack/react-query` if not installed
   - Add `prom-client` to api package.json (optional)

2. **Backend: Analytics Service** (2h)
   - Create `analytics-service.ts` with functions:
     - `getOverview()` - Total users, inboxes, messages from PostgreSQL
     - `getEmailMetrics(range)` - Bounce/spam rates, volume time-series
     - `getQueueHealth()` - BullMQ job counts, latency, failures
     - `getSystemStatus()` - Redis INFO, PostgreSQL pg_stat_database
   - Cache results in Redis with 30s TTL
   - Use `pg_stat_statements` for slow query detection

3. **Backend: API Endpoints** (1.5h)
   - Create `/api/admin/analytics/overview` (GET)
   - Create `/api/admin/analytics/email-metrics?range=7d` (GET)
   - Create `/api/admin/analytics/queue-health` (GET)
   - Create `/api/admin/analytics/system-status` (GET)
   - Add admin auth middleware (requireAdmin preHandler)

4. **Backend: Prometheus Metrics** (1h, optional)
   - Create `prometheus-metrics.ts` with prom-client
   - Define custom metrics:
     - `emails_sent_total` (Counter, labels: provider, status)
     - `emails_received_total` (Counter)
     - `queue_depth` (Gauge, labels: queue_name)
     - `api_response_time` (Histogram, labels: route)
   - Expose `/metrics` endpoint (no auth - internal only)

5. **Frontend: React Query Hooks** (1h)
   - Create `useAnalytics.ts` with hooks:
     - `useOverview()` - Fetch overview, 30s staleTime
     - `useEmailMetrics(range)` - Fetch email metrics
     - `useQueueHealth()` - Fetch queue health
     - `useSystemStatus()` - Fetch system status
   - Enable polling with `refetchInterval: 30000`

6. **Frontend: Dashboard Layout** (1.5h)
   - Create `AnalyticsDashboard.tsx` with grid layout
   - Top row: Overview cards (total users, inboxes, messages)
   - Second row: Email metrics chart + deliverability widget
   - Third row: Queue health + system status
   - Use Suspense + ErrorBoundary for loading states

7. **Frontend: Chart Components** (2h)
   - `EmailMetricsChart.tsx` - Recharts LineChart (inbound/outbound volume)
   - `DeliverabilityWidget.tsx` - Gauge charts (bounce rate, spam rate)
   - `QueueHealthWidget.tsx` - Bar chart (queue depth by queue name)
   - `SystemStatusPanel.tsx` - Table (Redis memory, PostgreSQL connections)

8. **Frontend: Routing** (0.5h)
   - Add `/admin/analytics` route to router
   - Protect with admin role check (redirect to /admin if not admin)
   - Add "Analytics" link to admin sidebar

9. **Testing** (1h)
   - Test dashboard load time (<2s target)
   - Test real-time updates (polling every 30s)
   - Test chart responsiveness (resize window)
   - Test admin auth (non-admin blocked)

## Todo List
- [ ] Install recharts, @tanstack/react-query, prom-client
- [ ] Create analytics-service.ts with getOverview()
- [ ] Implement getEmailMetrics(range) with time-series query
- [ ] Implement getQueueHealth() using BullMQ API
- [ ] Implement getSystemStatus() (Redis INFO, PostgreSQL stats)
- [ ] Cache analytics results in Redis (30s TTL)
- [ ] Create /api/admin/analytics/* endpoints
- [ ] Add admin auth middleware to routes
- [ ] Create prometheus-metrics.ts with custom metrics (optional)
- [ ] Expose /metrics endpoint (optional)
- [ ] Create useAnalytics.ts with React Query hooks
- [ ] Set up polling with refetchInterval: 30000
- [ ] Create AnalyticsDashboard.tsx with grid layout
- [ ] Implement EmailMetricsChart.tsx (Recharts LineChart)
- [ ] Implement DeliverabilityWidget.tsx (gauge charts)
- [ ] Implement QueueHealthWidget.tsx (bar chart)
- [ ] Implement SystemStatusPanel.tsx (table)
- [ ] Add /admin/analytics route to router
- [ ] Add "Analytics" link to admin sidebar
- [ ] Test dashboard performance (<2s load time)

## Success Criteria
- ✅ Dashboard loads in <2s
- ✅ Charts render in <500ms
- ✅ Real-time updates every 30s via polling
- ✅ Bounce rate displays with <2% target indicator
- ✅ Spam rate displays with <0.1% critical threshold
- ✅ Queue depth shows all BullMQ queues (outbound-email, etc.)
- ✅ System status shows Redis memory usage
- ✅ PostgreSQL slow queries listed (if any)
- ✅ Admin-only access enforced
- ✅ Prometheus /metrics endpoint works (optional)

## Risk Assessment

**Potential Issues:**
1. **High cardinality metrics** - Prometheus rejects metrics with >10k label combinations
2. **Dashboard performance** - Slow queries on large datasets (millions of messages)
3. **Real-time polling overhead** - 1000 admins polling every 30s = 33 req/s
4. **Redis memory** - Cached aggregates consume memory

**Mitigation:**
1. Limit Prometheus labels (provider, status only - no message IDs)
2. Pre-aggregate metrics in daily/hourly buckets (separate cron job)
3. Use React Query `staleTime: 30000` to deduplicate requests
4. Set Redis TTL to 30s, limit cache keys to 100 (LRU eviction)

## Security Considerations

**Authentication:**
- All `/api/admin/analytics/*` endpoints require JWT + admin role
- `/metrics` endpoint exposed only to internal Prometheus (no auth, firewall protected)

**Data Protection:**
- Metrics aggregated (no PII exposed - counts only, no email addresses)
- Slow queries sanitized (remove user data from query text)

**Authorization:**
- Admin role required for analytics access
- Non-admin users redirected to /admin (no 403 error)

**Rate Limiting:**
- Analytics endpoints exempt from rate limiting (admin-only, low volume)
- Prometheus scraper IP whitelisted (if external)

## Next Steps
1. Complete Phase 3 implementation
2. Test dashboard with production-like data (load testing)
3. Configure Prometheus scraping (if using Grafana)
4. Create Grafana dashboards (optional)
5. Monitor analytics API performance in production
6. **Final:** Review all 3 phases, run full integration tests
