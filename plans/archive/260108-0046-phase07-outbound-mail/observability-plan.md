# Observability Stack Enhancement Plan

## 1. Current State

### Implemented
- Prometheus metrics endpoint (`/metrics`)
- Health checks (`/health`, `/ready`)
- Grafana dashboards (basic)
- Pino structured logging

### Gaps
- Log shipping to Loki not configured
- No distributed tracing
- Alert rules not defined
- Dashboards incomplete

## 2. Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     OBSERVABILITY STACK                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │   API       │───▶│   Promtail  │───▶│    Loki     │             │
│  │   Logs      │    │   (agent)   │    │   (store)   │             │
│  └─────────────┘    └─────────────┘    └──────┬──────┘             │
│                                               │                     │
│  ┌─────────────┐    ┌─────────────┐          │                     │
│  │   API       │───▶│  Prometheus │──────────┼────────▶ Grafana    │
│  │  /metrics   │    │  (scraper)  │          │           (viz)     │
│  └─────────────┘    └─────────────┘          │                     │
│                                               │                     │
│  ┌─────────────┐    ┌─────────────┐          │                     │
│  │   API       │───▶│   OTLP      │───▶ Tempo │                     │
│  │   Traces    │    │ (exporter)  │   (store) │                     │
│  └─────────────┘    └─────────────┘           │                     │
│                                               │                     │
│                           ┌───────────────────▼───────────────────┐ │
│                           │           ALERTMANAGER               │ │
│                           │  (Slack/Email/PagerDuty)             │ │
│                           └───────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 3. Implementation Steps

### Step 1: Log Shipping to Loki

#### Promtail Configuration
```yaml
# /etc/promtail/config.yml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: ephemera-api
    static_configs:
      - targets:
          - localhost
        labels:
          job: ephemera-api
          __path__: /var/log/ephemera/*.log

    pipeline_stages:
      - json:
          expressions:
            level: level
            msg: msg
            time: time
            service: name
            traceId: traceId
      - labels:
          level:
          service:
      - timestamp:
          source: time
          format: RFC3339Nano
```

#### Pino Log Formatting
```typescript
// Already JSON-formatted by Pino
// Add correlation IDs for tracing
app.addHook('onRequest', (request, reply, done) => {
  request.log = request.log.child({
    requestId: request.id,
    traceId: request.headers['x-trace-id'] || generateTraceId()
  });
  done();
});
```

### Step 2: OpenTelemetry Integration

#### Dependencies
```bash
npm install @opentelemetry/api \
            @opentelemetry/sdk-node \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/exporter-trace-otlp-http
```

#### Instrumentation
```typescript
// services/api/src/instrumentation.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  serviceName: 'ephemera-api',
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://tempo:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

#### Trace Email Flow
```typescript
// Custom spans for email processing
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('email-processor');

async function processEmail(job: Job) {
  return tracer.startActiveSpan('process-email', async (span) => {
    span.setAttribute('job.id', job.id);
    span.setAttribute('email.recipient', job.data.envelope.rcptTo[0]?.address);

    try {
      // ... processing logic
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### Step 3: Grafana Dashboards

#### Dashboard 1: Email Delivery Timeline
```json
{
  "title": "Email Delivery Timeline",
  "panels": [
    {
      "title": "Emails Received (Rate)",
      "type": "timeseries",
      "targets": [{
        "expr": "rate(ephemera_emails_received_total[5m])"
      }]
    },
    {
      "title": "Processing Latency (p95)",
      "type": "timeseries",
      "targets": [{
        "expr": "histogram_quantile(0.95, rate(ephemera_email_processing_duration_seconds_bucket[5m]))"
      }]
    },
    {
      "title": "Queue Depth",
      "type": "stat",
      "targets": [{
        "expr": "ephemera_email_queue_depth"
      }]
    }
  ]
}
```

#### Dashboard 2: Per-Inbox Metrics
```json
{
  "title": "Inbox Analytics",
  "panels": [
    {
      "title": "Messages per Inbox (Top 10)",
      "type": "table",
      "targets": [{
        "expr": "topk(10, ephemera_inbox_message_count)"
      }]
    },
    {
      "title": "Storage Usage by Domain",
      "type": "piechart",
      "targets": [{
        "expr": "sum by (domain) (ephemera_storage_bytes)"
      }]
    }
  ]
}
```

#### Dashboard 3: Telegram Notifications
```json
{
  "title": "Telegram Delivery",
  "panels": [
    {
      "title": "Notification Success Rate",
      "type": "gauge",
      "targets": [{
        "expr": "sum(rate(ephemera_telegram_sent_total{status='success'}[5m])) / sum(rate(ephemera_telegram_sent_total[5m])) * 100"
      }]
    },
    {
      "title": "Telegram Latency",
      "type": "timeseries",
      "targets": [{
        "expr": "histogram_quantile(0.99, rate(ephemera_telegram_latency_seconds_bucket[5m]))"
      }]
    }
  ]
}
```

#### Dashboard 4: Rate Limiting
```json
{
  "title": "Rate Limit Saturation",
  "panels": [
    {
      "title": "Rate Limited Requests",
      "type": "timeseries",
      "targets": [{
        "expr": "rate(ephemera_rate_limited_total[5m])"
      }]
    },
    {
      "title": "Rate Limit by Type",
      "type": "barchart",
      "targets": [{
        "expr": "sum by (limit_type) (ephemera_rate_limit_saturation)"
      }]
    }
  ]
}
```

### Step 4: Alert Rules

```yaml
# prometheus/alerts.yml
groups:
  - name: ephemera
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(ephemera_http_requests_total{status=~"5.."}[5m]))
          / sum(rate(ephemera_http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High 5xx error rate ({{ $value | humanizePercentage }})"

      - alert: EmailIngestFailures
        expr: rate(ephemera_email_ingest_failures_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Email ingest failure rate > 5%"

      - alert: SMTPConnectionTimeouts
        expr: rate(ephemera_smtp_timeout_total[5m]) > 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "SMTP connection timeouts detected"

      - alert: TelegramWebhookFailures
        expr: |
          sum(rate(ephemera_telegram_sent_total{status="failed"}[5m]))
          / sum(rate(ephemera_telegram_sent_total[5m])) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Telegram notification failure rate > 10%"

      - alert: HighQueueDepth
        expr: ephemera_email_queue_depth > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Email queue depth > 1000"
```

## 4. Metrics to Add

### API Metrics
```typescript
// services/api/src/metrics.ts
import { Counter, Histogram, Gauge, register } from 'prom-client';

export const httpRequestsTotal = new Counter({
  name: 'ephemera_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
});

export const httpRequestDuration = new Histogram({
  name: 'ephemera_http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const emailsReceivedTotal = new Counter({
  name: 'ephemera_emails_received_total',
  help: 'Total emails received',
  labelNames: ['domain'],
});

export const emailProcessingDuration = new Histogram({
  name: 'ephemera_email_processing_duration_seconds',
  help: 'Email processing duration',
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

export const telegramSentTotal = new Counter({
  name: 'ephemera_telegram_sent_total',
  help: 'Telegram notifications sent',
  labelNames: ['status'],
});

export const emailQueueDepth = new Gauge({
  name: 'ephemera_email_queue_depth',
  help: 'Current email queue depth',
});
```

## 5. Incident Runbook

### High 5xx Errors

```markdown
## Alert: High 5xx Error Rate

### Symptoms
- 5xx error rate > 1% for 5+ minutes
- User reports of failures

### Investigation
1. Check Grafana dashboard for error distribution
2. Query Loki for error logs:
   ```
   {job="ephemera-api"} |= "error" | json | level="error"
   ```
3. Check database connectivity
4. Verify Redis connection

### Common Causes
- Database connection pool exhausted
- Redis connection timeout
- External service (Telegram/Stripe) down

### Remediation
1. Restart API pods if connection pool issue
2. Scale up if traffic spike
3. Enable circuit breaker for external services
```

## 6. Files to Create/Modify

| File | Purpose |
|------|---------|
| `services/api/src/instrumentation.ts` | OpenTelemetry setup |
| `services/api/src/metrics.ts` | Prometheus metrics |
| `docker/promtail/config.yml` | Log shipping config |
| `docker/prometheus/alerts.yml` | Alert rules |
| `docker/grafana/dashboards/*.json` | Dashboard definitions |
| `docker-compose.monitoring.yml` | Stack composition |

## 7. Environment Variables

```bash
# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318
OTEL_SERVICE_NAME=ephemera-api

# Loki
LOKI_URL=http://loki:3100

# Alertmanager
ALERTMANAGER_SLACK_WEBHOOK=https://hooks.slack.com/...
ALERTMANAGER_EMAIL=ops@example.com
```
