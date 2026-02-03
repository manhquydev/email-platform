---
title: "Prometheus + Grafana Monitoring Stack"
description: "Complete observability setup with API metrics, alerting, and dashboards"
status: completed
priority: P1
effort: 3h
branch: main
tags: [monitoring, prometheus, grafana, observability]
created: 2026-02-03
---

# Prometheus + Grafana Monitoring Stack

## Overview
Enhance existing monitoring infrastructure with complete metrics exposure, alerting, and business dashboards.

## Current State
- prom-client installed, metrics registered in server.ts
- Prometheus/Grafana containers running
- Basic dashboard (2 panels: RPS, P95 latency)
- **Missing:** /metrics endpoint, alerts, business metrics

## Phases

| Phase | Description | Status | Effort |
|-------|-------------|--------|--------|
| [Phase 1](./phase-01-prometheus-setup.md) | Prometheus config + alertmanager | completed | 30m |
| [Phase 2](./phase-02-api-instrumentation.md) | Expose /metrics, add business counters | completed | 1h |
| [Phase 3](./phase-03-grafana-dashboards.md) | Dashboard panels for all metrics | completed | 1h |
| [Phase 4](./phase-04-alerting-config.md) | Alert rules + notification channels | completed | 30m |

## Key Dependencies
- Docker Compose infrastructure (done)
- prom-client v15.1.3 (installed)
- Prometheus v2.45.0 (running)
- Grafana v10.0.3 (running)

## Success Criteria
- [x] `/metrics` returns Prometheus format data
- [x] Grafana shows API, email, queue metrics
- [x] Alerts fire on high error rate (>5%)
- [x] Alerts fire on queue pile-up (>1000 jobs)

## Architecture
```
API:3001/metrics ──► Prometheus:9090 ──► Grafana:3000
                           │
                    Alertmanager:9093
```
