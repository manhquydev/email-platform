# Phase 2: API Instrumentation

## Context
- [Research: Prometheus Fastify](./research/researcher-prometheus-fastify-metrics.md)
- [server.ts](../../services/api/src/server.ts) - existing prom-client setup

## Overview
- Priority: P1
- Status: pending
- Effort: 1h

## Current State
- prom-client registered: `http_request_duration_seconds`, `security_events_total`
- Default metrics enabled via `collectDefaultMetrics()`
- **Missing:** `/metrics` route, business metrics (emails, queues, users)

## Files to Modify
- `services/api/src/routes/health.ts` - add /metrics endpoint
- `services/api/src/server.ts` - add business metric counters

## Implementation Steps

### 1. Add /metrics endpoint to health.ts
```typescript
import { register as promRegister } from "prom-client";

// Inside healthRoutes
fastify.get("/metrics", async (request, reply) => {
  reply.header("Content-Type", promRegister.contentType);
  return promRegister.metrics();
});
```

### 2. Add Business Metrics to server.ts
```typescript
// Email counters
const emailsReceivedCounter = new Counter({
  name: "emails_received_total",
  help: "Total emails received via SMTP",
  labelNames: ["domain"],
});

const emailsSentCounter = new Counter({
  name: "emails_sent_total",
  help: "Total outbound emails sent",
  labelNames: ["provider", "status"],
});

// Queue gauge (export for worker updates)
const queueJobsGauge = new Gauge({
  name: "queue_jobs_current",
  help: "Current job count by queue and state",
  labelNames: ["queue", "state"],
});

export { emailsReceivedCounter, emailsSentCounter, queueJobsGauge };
```

### 3. Instrument SMTP handler (smtp.ts)
```typescript
import { emailsReceivedCounter } from "./server";
// After successful email storage:
emailsReceivedCounter.labels(domain).inc();
```

### 4. Instrument outbound email service
```typescript
import { emailsSentCounter } from "./server";
// After send attempt:
emailsSentCounter.labels(provider, success ? "success" : "failed").inc();
```

## Todo
- [ ] Add /metrics route (internal only - block in Caddy)
- [ ] Add email counters
- [ ] Add queue gauge
- [ ] Instrument SMTP ingest
- [ ] Instrument outbound service
- [ ] Test: curl localhost:3001/metrics

## Security Note
Block `/metrics` in Caddyfile for external access:
```
@metrics path /metrics
respond @metrics "Forbidden" 403
```

## Success Criteria
- `/metrics` returns all default + custom metrics
- Email counters increment on send/receive
