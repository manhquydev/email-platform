# Analytics Dashboard & System Monitoring Research

**Date:** 2026-02-01
**Research Focus:** Email deliverability metrics, real-time dashboards, system monitoring, Prometheus/Grafana integration, admin UI patterns

---

## 1. Email Deliverability Metrics

### Key Metrics to Track

**Bounce Rate**
- **Target:** <2% total bounce rate, <0.5% hard bounces
- **Hard Bounces:** Permanent delivery failures (invalid emails, non-existent domains)
- **Soft Bounces:** Temporary issues (full mailbox, server downtime)
- **Impact:** High bounce rates damage sender reputation and future deliverability

**Spam Complaint Rate**
- **Target:** <0.1% (critical threshold)
- **Risk Level:** ≥0.1% considered high-risk, damages ISP reputation
- **Tracking:** Monitor recipient spam reports via feedback loops

**Open Rate**
- **2026 Benchmark:** 43.46% average (30-55% industry range)
- **Caveat:** Less reliable due to Apple Mail Privacy Protection, Gmail AI summaries
- **Alternative Metrics:** Click-Through Rate (CTR), Click-to-Open Rate (CTOR) more meaningful

**Additional Metrics**
- Delivery rate, unsubscribe rate, engagement over time
- Domain/IP reputation scores
- Inbox placement rate (inbox vs spam folder)

**Data Collection Strategy:**
- Parse SMTP responses for bounce classification
- Track webhook events from email providers
- Store time-series data in PostgreSQL with aggregations
- Monitor sending patterns for anomaly detection

---

## 2. Real-Time Dashboard Technologies

### Chart Library Recommendations

**Recharts** (Recommended for React Native Integration)
- Built specifically for React, uses React components + SVG rendering
- Seamless integration, native React approach
- 11+ chart types, highly customizable
- `ResponsiveContainer` for adaptive layouts
- Easy styling with CSS/styled-components
- **Use Case:** Primary charting for web dashboard

**Chart.js with react-chartjs-2**
- Industry standard, massive community, extensive plugin ecosystem
- Tree-shakable (v4+), fast prototypes
- Can be verbose for complex configurations
- **Use Case:** Quick charts, legacy compatibility

### Data Fetching & Real-Time Updates

**React Query (TanStack Query)**
- Server state management with caching, background refetching
- Real-time synchronization with polling or WebSocket integration
- Stale-while-revalidate pattern for performance
- **Use Case:** All data fetching for dashboard

**Implementation Pattern:**
```typescript
// WebSocket + React Query integration
useQuery({
  queryKey: ['metrics', 'realtime'],
  queryFn: fetchMetrics,
  refetchInterval: 5000, // Poll every 5s
  staleTime: 3000
})
```

### UI Libraries
- **shadcn/ui** or **Chakra UI** for component foundation
- **Tailwind CSS** for styling
- **Next.js** for SSR/SSG dashboard pages

---

## 3. System Health Monitoring

### BullMQ Metrics

**Built-in Metrics:**
- Jobs processed per minute (completed/failed)
- Stored in Redis lists, queryable via `queue.getMetrics()`
- Minimal RAM usage: ~120KB per queue for 2 weeks of 1-min intervals
- Automatic data point disposal

**Key Metrics to Expose:**
- Active jobs count
- Completed/failed job rates
- Job processing latency (p50, p95, p99)
- Queue depth and backlog
- Worker concurrency utilization

**Implementation:**
```javascript
// Enable metrics on worker
const worker = new Worker('email-queue', processor, {
  metrics: { maxDataPoints: 20160 } // 2 weeks at 1-min
});

// Query metrics
const metrics = await queue.getMetrics('completed', 0, 3600000); // 1hr
```

### Redis Monitoring

**Critical Metrics:**
- Memory usage and eviction policy
- Key expiry patterns
- Command latency (should be <1ms)
- Connection pool utilization
- Pub/Sub message throughput

**Tools:** RedisInsight, Prometheus Redis Exporter

### PostgreSQL Performance

**Database Metrics:**
- Query execution time (slow query log)
- Connection pool stats (active/idle/waiting)
- Table/index sizes and bloat
- Cache hit ratio (buffer cache)
- Transaction throughput

**Collection Method:**
- `pg_stat_statements` extension for query analytics
- Custom metrics endpoint exposing connection pool stats
- Prometheus `postgres_exporter`

---

## 4. Prometheus/Grafana Integration

### Node.js Exporter Setup

**prom-client Library:**
```javascript
const client = require('prom-client');
const register = new client.Registry();

// Default Node.js metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const emailsSentCounter = new client.Counter({
  name: 'emails_sent_total',
  help: 'Total emails sent',
  labelNames: ['provider', 'status']
});

// Expose /metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

**Default Metrics:** Node.js version, restarts, CPU, memory, event loop latency, GC details

### Grafana Dashboard Templates

**Pre-built Dashboards:**
- **ID 1860:** Node Exporter Full (system metrics)
- **Node.js Application Dashboard:** Process metrics, heap usage, event loop
- **BullMQ Dashboard:** Custom dashboard for queue metrics

**Setup Flow:**
1. Configure `prom-client` in Node.js services
2. Configure Prometheus to scrape `/metrics` endpoints
3. Import Grafana dashboards by ID or JSON

**Integration Points:**
- API service metrics (request rates, errors, latency)
- Email worker metrics (BullMQ stats)
- Redis/PostgreSQL exporters for infrastructure

---

## 5. Admin Analytics UI Patterns

### Dashboard Template Options (2026)

**shadcn/admin** (Recommended)
- Open-source, Next.js + shadcn/ui + Tailwind CSS
- Modern aesthetics, highly customizable
- Clean component architecture

**Alternatives:**
- **Horizon UI:** Chakra UI-based, glassmorphism design
- **Mantis/Berry:** Material UI v5 templates
- **TailAdmin:** Tailwind-focused, free/pro versions

### Essential UI Components

**Time-Series Charts:**
- Line charts for email volume over time
- Area charts for cumulative metrics
- Multi-axis charts for correlated metrics (send rate vs bounce rate)

**Heatmaps:**
- Sending activity by hour/day of week
- Geographical distribution of recipients
- Error rate correlation matrix

**Real-Time Widgets:**
- Live job queue status (active/waiting/failed)
- Recent email activity feed
- Alert notifications for threshold breaches

**Data Tables:**
- Advanced filtering, sorting, pagination
- Export capabilities (CSV, Excel)
- Drill-down to detailed views

### Design Best Practices

- Global command menu for quick navigation
- Responsive layouts (mobile, tablet, desktop)
- Dark mode support
- Loading states and skeleton screens
- WebSocket connection status indicator

---

## Implementation Recommendations

### Tech Stack
- **Frontend:** React + Next.js + TypeScript + Tailwind CSS
- **Charts:** Recharts (primary), Chart.js (fallback)
- **Data Fetching:** React Query with 5s polling + WebSocket events
- **State Management:** Zustand or React Context for UI state
- **UI Components:** shadcn/ui

### Architecture
```
┌─────────────────┐
│  Admin Dashboard│
│   (Next.js)     │
└────────┬────────┘
         │
    ┌────┴─────┐
    │ React    │
    │ Query    │
    └────┬─────┘
         │
    ┌────┴──────────────────┐
    │                       │
┌───▼────┐          ┌──────▼─────┐
│ API    │          │ Prometheus │
│ Metrics│◄─────────┤  Scraper   │
│Endpoint│          └────────────┘
└───┬────┘
    │
┌───▼──────────────────────┐
│ BullMQ │ Redis │ Postgres│
└──────────────────────────┘
```

### Data Collection Strategy

1. **Application-Level Metrics:**
   - Custom counters/gauges in API/worker services
   - Expose via `/metrics` endpoint for Prometheus
   - Store aggregated data in PostgreSQL for historical analysis

2. **Infrastructure Metrics:**
   - Prometheus exporters for Redis, PostgreSQL, Node.js
   - Grafana dashboards for ops team

3. **Business Metrics:**
   - Custom analytics tables in PostgreSQL
   - Real-time aggregations via SQL views
   - API endpoints for dashboard consumption

---

## Sources

- [Email Deliverability Metrics](https://www.pushwoosh.com)
- [Recharts vs Chart.js Comparison](https://medium.com)
- [BullMQ Metrics Documentation](https://bullmq.io)
- [Prometheus Node.js Integration](https://grafana.com)
- [React Admin Dashboard Patterns](https://adminmart.com)

---

## Unresolved Questions

1. **Real-time vs Polling:** WebSocket overhead vs HTTP polling for 5s updates? Evaluate based on concurrent user count.
2. **Data Retention:** How long to store raw metrics in PostgreSQL before aggregation/archival?
3. **Multi-Tenancy:** Dashboard filtering strategy if platform supports multiple email accounts?
4. **Alert Thresholds:** What bounce/spam rate thresholds trigger automated alerts or sending pauses?
