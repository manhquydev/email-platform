# Grafana Dashboard Research for Email Platform

## 1. Essential API Monitoring Panels
Focus on the **RED Method** (Rate, Errors, Duration) for Node.js/Express services.

*   **Request Rate**: Requests per second (RPS) grouped by status code (2xx, 4xx, 5xx) and route.
*   **Error Rate**: Percentage of failed requests. `sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))`.
*   **Latency/Duration**: p95 and p99 response times. `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m]) by (le)))`.
*   **Saturation**: Event loop lag, active handles, and memory usage (Heap Used vs Total).

## 2. Business Metrics Visualization
Metrics specific to email infrastructure, likely requiring custom instrumentation or SQL exporters.

*   **Email Throughput**: Emails sent/received per minute.
*   **Queue Health**: Current depth of Redis queues (e.g., Bull/BullMQ job counts: active, waiting, failed).
*   **Delivery Success Rate**: Ratio of successful sends vs. failures/bounces.
*   **User Growth**: Total registered users, active users (DAU) - best queried from Postgres periodically.

## 3. Infrastructure Monitoring (PostgreSQL & Redis)
### PostgreSQL
*   **Connections**: Active vs. Idle connections (alert on saturation).
*   **Cache Hit Ratio**: Effectiveness of the shared buffer cache (target > 99%).
*   **Transactions**: Commits vs. Rollbacks per second.
*   **Row Activity**: Fetched vs. Returned rows (detect inefficient queries).

### Redis
*   **Memory Usage**: Used memory vs. peak memory.
*   **Commands**: Ops per second (throughput).
*   **Evictions/Expired**: Keys removed due to maxmemory (critical for cache reliability).
*   **Hit Rate**: Keyspace hits vs. misses.

## 4. Recommended Pre-built Community Dashboards
Import these IDs directly into Grafana:

*   **Node.js Application**: ID `11159` (Requires `prom-client`). Best for generic Node.js metrics.
*   **PostgreSQL**: ID `9628` (Postgres Exporter). Industry standard for deep DB insights.
*   **Redis**: ID `763` (Redis Exporter) or `11835`. Covers memory, network, and command stats.
*   **Docker Containers**: ID `1860` (Node Exporter Full) or `893` (Cadvisor) for container-level resource usage.

## 5. Critical Alert Rules
Define these in Prometheus `alert.rules` or Grafana Alerting:

1.  **High API Error Rate**: `rate(http_requests_total{status=~"5.."}[5m]) > 5%` for 2 mins.
2.  **Elevated Latency**: p95 request duration `> 500ms` for 5 mins.
3.  **Email Queue Pile-up**: `job_queue_waiting_count > 1000` (Indicates stuck workers or huge load).
4.  **Database Connections High**: `pg_stat_activity_count > max_connections * 0.8`.
5.  **Low Disk Space**: `node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1` (10% free).

## Unresolved Questions
*   Does the current API use `prom-client` to expose metrics at `/metrics`?
*   Are `postgres-exporter` and `redis-exporter` containers added to `docker-compose.yml`?
*   Is there a structured logging system (e.g., Loki) to correlate metrics with logs?
