# Phase 3: Grafana Dashboards

## Context
- [Research: Grafana Dashboards](./research/researcher-grafana-dashboards.md)
- [Existing dashboard](../../services/observability/grafana/dashboards/email_service.json)

## Overview
- Priority: P2
- Status: pending
- Effort: 1h

## Current State
- Basic dashboard with 2 panels (RPS, P95 Latency)
- Prometheus datasource configured

## Requirements
Expand dashboard with RED method + business metrics:
1. **Rate:** Request rate by route/status
2. **Errors:** Error rate %, 4xx/5xx breakdown
3. **Duration:** P50/P95/P99 latency
4. **Saturation:** Event loop lag, memory, CPU
5. **Business:** Emails received/sent, queue depth

## Files to Modify
- `services/observability/grafana/dashboards/email_service.json`

## Dashboard Panels (add to existing)

### Row 1: API Health (existing + expand)
| Panel | Query |
|-------|-------|
| Request Rate | `rate(http_request_duration_seconds_count[5m])` |
| Error Rate % | `rate(http_request_duration_seconds_count{status=~"5.."}[5m]) / rate(http_request_duration_seconds_count[5m]) * 100` |
| P95 Latency | `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))` |
| P99 Latency | `histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))` |

### Row 2: Node.js Runtime
| Panel | Query |
|-------|-------|
| Heap Used | `nodejs_heap_size_used_bytes` |
| Event Loop Lag | `nodejs_eventloop_lag_seconds` |
| Active Handles | `nodejs_active_handles_total` |

### Row 3: Email Operations
| Panel | Query |
|-------|-------|
| Emails Received | `rate(emails_received_total[5m])` |
| Emails Sent | `rate(emails_sent_total[5m])` |
| Send Success Rate | `rate(emails_sent_total{status="success"}[5m]) / rate(emails_sent_total[5m]) * 100` |

### Row 4: Queue Health
| Panel | Query |
|-------|-------|
| Queue Waiting | `queue_jobs_current{state="waiting"}` |
| Queue Active | `queue_jobs_current{state="active"}` |
| Queue Failed | `queue_jobs_current{state="failed"}` |

## Todo
- [ ] Add error rate panel
- [ ] Add P99 latency panel
- [ ] Add Node.js runtime row
- [ ] Add email operations row
- [ ] Add queue health row
- [ ] Test dashboard loads correctly

## Success Criteria
- Dashboard shows all 4 rows
- Metrics update in real-time (5s refresh)
