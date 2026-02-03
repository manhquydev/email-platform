# Phase 1: Prometheus Setup

## Context
- [Research: Prometheus Fastify](./research/researcher-prometheus-fastify-metrics.md)
- [docker-compose.yml](../../docker-compose.yml)
- [prometheus.yml](../../services/observability/prometheus.yml)

## Overview
- Priority: P1
- Status: pending
- Effort: 30m

## Requirements
1. Update prometheus.yml with proper scrape config
2. Add alertmanager container
3. Create alerts.yml with basic rules
4. Add persistent volumes

## Files to Modify
- `services/observability/prometheus.yml` - scrape config
- `services/observability/alerts.yml` - alert rules (create)
- `services/observability/alertmanager.yml` - notifications (create)
- `docker-compose.yml` - add alertmanager service

## Implementation Steps

### 1. Update prometheus.yml
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ["alertmanager:9093"]

scrape_configs:
  - job_name: "api"
    static_configs:
      - targets: ["api:3001"]
    metrics_path: /metrics
```

### 2. Add alertmanager to docker-compose.yml
```yaml
alertmanager:
  image: prom/alertmanager:v0.26.0
  volumes:
    - ./services/observability/alertmanager.yml:/etc/alertmanager/alertmanager.yml
  ports:
    - "9093:9093"
  restart: unless-stopped
```

### 3. Create alertmanager.yml (basic)
```yaml
global:
  resolve_timeout: 5m

route:
  receiver: "default"

receivers:
  - name: "default"
```

## Todo
- [ ] Update prometheus.yml
- [ ] Create alerts.yml stub
- [ ] Create alertmanager.yml
- [ ] Add alertmanager to docker-compose
- [ ] Restart stack, verify scrape targets

## Success Criteria
- Prometheus UI shows api target as UP
- Alertmanager accessible at :9093
