# Prometheus & Grafana Monitoring for Fastify

## 1. Instrumentation Strategy
We use **prom-client** for low-level system metrics (GC, memory, CPU) and **fastify-metrics** for HTTP layer observability.

### fastify-metrics Configuration
The plugin automatically exposes a `/metrics` endpoint and tracks request duration/status.

```typescript
import fastifyMetrics from 'fastify-metrics';

await app.register(fastifyMetrics, {
  endpoint: '/metrics',
  name: 'email_platform_api',
  defaultMetrics: { enabled: true }, // System metrics (CPU, RAM)
  routeMetrics: {
    enabled: true,
    overrides: {
      histogram: {
        // Customize buckets for sub-second API latency analysis
        buckets: [0.01, 0.05, 0.1, 0.5, 1, 3, 5, 10]
      },
      summary: false // Prefer histograms for aggregation
    }
  }
});
```

## 2. Best Practices for API Metrics
1.  **Metric Cardinality**: NEVER use high-cardinality values (e.g., `email`, `userId`, `messageId`) as labels. This causes memory explosions in Prometheus. Use generalized labels (e.g., `route`, `status_code`, `method`).
2.  **Security**: The `/metrics` endpoint must not be public.
    *   **Option A**: Run metrics on a separate internal port.
    *   **Option B**: Block external access via Caddy/Ingress.
3.  **Key Golden Signals**:
    *   **Latency**: `http_request_duration_seconds_bucket` (95th/99th percentile).
    *   **Traffic**: `rate(http_requests_total[5m])`.
    *   **Errors**: `rate(http_requests_total{status=~"5.."}[5m])`.
    *   **Saturation**: `nodejs_eventloop_lag_seconds`.

## 3. Docker Compose Infrastructure
Add these services to `docker-compose.yml`:

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./services/observability/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./services/observability/alerts.yml:/etc/prometheus/alerts.yml
      - prometheus_data:/prometheus
    ports: ["9090:9090"]

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
    volumes:
      - grafana_data:/var/lib/grafana
    ports: ["3001:3000"]
    depends_on: ["prometheus"]

  alertmanager:
    image: prom/alertmanager:latest
    volumes:
      - ./services/observability/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    ports: ["9093:9093"]

volumes:
  prometheus_data:
  grafana_data:
```

## 4. Configuration Basics

**prometheus.yml**:
```yaml
global:
  scrape_interval: 15s
rule_files:
  - "alerts.yml"
scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['api:3000']
```

**alerts.yml** (Alerting Rules):
```yaml
groups:
  - name: API_Health
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[1m]) / rate(http_requests_total[1m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High API Error Rate (>5%)"

      - alert: SlowResponses
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "95th Percentile Latency > 2s"
```

## Unresolved Questions
1. Do we want to monitor the `extension` service separately or aggregate it?
2. Should we add a `node-exporter` container for host machine metrics?
