# Phase 4: Alerting Configuration

## Context
- [Research: Prometheus Fastify](./research/researcher-prometheus-fastify-metrics.md)
- [Research: Grafana Dashboards](./research/researcher-grafana-dashboards.md)

## Overview
- Priority: P2
- Status: pending
- Effort: 30m

## Requirements
1. Define alert rules in Prometheus
2. Configure notification channels (webhook/email)
3. Set appropriate thresholds for production

## Files to Create/Modify
- `services/observability/alerts.yml` - Prometheus alert rules
- `services/observability/alertmanager.yml` - notification config

## Alert Rules (alerts.yml)

```yaml
groups:
  - name: api_health
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_request_duration_seconds_count{status=~"5.."}[5m]))
          / sum(rate(http_request_duration_seconds_count[5m])) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "API error rate > 5%"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P95 latency > 2 seconds"

      - alert: APIDown
        expr: up{job="api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "API server is down"

  - name: email_operations
    rules:
      - alert: EmailQueuePileup
        expr: queue_jobs_current{queue="email", state="waiting"} > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Email queue has > 1000 waiting jobs"

      - alert: HighEmailFailureRate
        expr: |
          rate(emails_sent_total{status="failed"}[5m])
          / rate(emails_sent_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Email send failure rate > 10%"

  - name: resources
    rules:
      - alert: HighMemoryUsage
        expr: nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Node.js heap usage > 90%"

      - alert: HighEventLoopLag
        expr: nodejs_eventloop_lag_seconds > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Event loop lag > 100ms"
```

## Alertmanager Config (alertmanager.yml)

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ["alertname", "severity"]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: "default"
  routes:
    - match:
        severity: critical
      receiver: "critical"

receivers:
  - name: "default"
    # webhook_configs:
    #   - url: "http://api:3001/webhooks/alerts"

  - name: "critical"
    # Add Telegram/Discord/Email here
```

## Todo
- [ ] Create alerts.yml with all rules
- [ ] Configure alertmanager.yml
- [ ] Test alert fires with `up == 0`
- [ ] (Optional) Add Telegram notification receiver

## Success Criteria
- Alerts visible in Prometheus UI
- Alertmanager receives firing alerts
- Test alert clears after resolution

## Unresolved Questions
- Should we add Telegram bot for critical alerts?
- Do we need postgres-exporter/redis-exporter containers?
