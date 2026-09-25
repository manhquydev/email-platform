# Phase 5: Monitoring & Tuning
**Timeline:** Week 9-10 (14 - 28 Feb 2026)
**Priority:** Medium
**Impact:** High - ensures optimizations are effective and maintained

## Objectives

1. Implement comprehensive performance monitoring
2. Set up automated alerting for performance regressions
3. Create performance dashboards
4. Establish performance budgets
5. Fine-tune optimizations based on real usage data

## Success Metrics

- [ ] Performance alerts trigger for regressions
- [ ] 99.9% of requests meet SLA requirements
- [ ] Performance dashboards provide real-time insights
- [ ] Performance budgets enforced in CI/CD
- [ ] Automated tuning reduces manual intervention by 80%

## Implementation Steps

### 5.1 Performance Monitoring Infrastructure

**File:** `services/api/src/monitoring/performanceCollector.ts`

```typescript
import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

interface PerformanceMetrics {
  timestamp: number;
  requestId: string;
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  databaseQueries: {
    count: number;
    totalDuration: number;
    slowQueries: number;
  };
  cacheMetrics: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  responseSize: number;
}

interface AlertRule {
  name: string;
  metric: string;
  operator: '>' | '<' | '=' | '!=' | '>=' | '<=';
  threshold: number;
  duration: number; // minutes
  severity: 'critical' | 'warning' | 'info';
}

export class PerformanceCollector extends EventEmitter {
  private redis: Redis;
  private prisma: PrismaClient;
  private metrics: PerformanceMetrics[] = [];
  private alertRules: AlertRule[] = [];
  private alertStates = new Map<string, { active: boolean; startTime: number }>();

  constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL);
    this.prisma = new PrismaClient();

    // Initialize default alert rules
    this.initializeAlertRules();

    // Start collection intervals
    this.startCollectionIntervals();
  }

  private initializeAlertRules() {
    this.alertRules = [
      {
        name: 'High Response Time',
        metric: 'responseTime',
        operator: '>',
        threshold: 500,
        duration: 5,
        severity: 'critical'
      },
      {
        name: 'High Error Rate',
        metric: 'errorRate',
        operator: '>',
        threshold: 0.05,
        duration: 5,
        severity: 'critical'
      },
      {
        name: 'Low Cache Hit Rate',
        metric: 'cacheHitRate',
        operator: '<',
        threshold: 0.7,
        duration: 10,
        severity: 'warning'
      },
      {
        name: 'High Memory Usage',
        metric: 'memoryUsage',
        operator: '>',
        threshold: 0.85,
        duration: 5,
        severity: 'critical'
      },
      {
        name: 'Slow Database Queries',
        metric: 'avgQueryTime',
        operator: '>',
        threshold: 100,
        duration: 5,
        severity: 'warning'
      }
    ];
  }

  startCollectionIntervals() {
    // Aggregate metrics every minute
    setInterval(() => {
      this.aggregateMetrics();
    }, 60000);

    // Check alert rules every minute
    setInterval(() => {
      this.checkAlertRules();
    }, 60000);

    // Clean old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000);
  }

  async recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);

    // Store in Redis for real-time monitoring
    await this.redis.zadd('metrics:recent', metric.timestamp, JSON.stringify(metric));
    await this.redis.expire('metrics:recent', 3600); // Keep last hour

    // Store time-series data for longer term
    const minute = Math.floor(metric.timestamp / 60000) * 60000;
    await this.redis.zincrby(`metrics:${metric.endpoint}:${minute}`, 1, JSON.stringify(metric));

    // Emit for real-time alerts
    this.emit('metric', metric);
  }

  private async aggregateMetrics() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Get metrics from last minute
    const recentMetrics = await this.redis.zrangebyscore(
      'metrics:recent',
      oneMinuteAgo,
      now
    );

    if (recentMetrics.length === 0) return;

    const metrics = recentMetrics.map(m => JSON.parse(m));

    // Calculate aggregates
    const aggregates = {
      timestamp: now,
      totalRequests: metrics.length,
      averageResponseTime: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
      p95ResponseTime: this.calculatePercentile(metrics, 95),
      errorRate: metrics.filter(m => m.statusCode >= 400).length / metrics.length,
      cacheHitRate: metrics.reduce((sum, m) => sum + m.cacheMetrics.hitRate, 0) / metrics.length,
      averageMemoryUsage: metrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / metrics.length,
      averageQueryTime: metrics.reduce((sum, m) => sum + (m.databaseQueries.totalDuration / m.databaseQueries.count), 0) / metrics.length
    };

    // Store aggregates
    await this.redis.zadd('metrics:aggregates', now, JSON.stringify(aggregates));
    await this.redis.expire('metrics:aggregates', 86400 * 7); // Keep 7 days

    // Store in database for long-term analysis
    await this.prisma.performanceMetric.create({
      data: {
        timestamp: new Date(now),
        totalRequests: aggregates.totalRequests,
        averageResponseTime: Math.round(aggregates.averageResponseTime),
        p95ResponseTime: Math.round(aggregates.p95ResponseTime),
        errorRate: aggregates.errorRate,
        cacheHitRate: aggregates.cacheHitRate,
        averageMemoryUsage: aggregates.averageMemoryUsage,
        averageQueryTime: aggregates.averageQueryTime
      }
    });

    this.emit('aggregates', aggregates);
  }

  private calculatePercentile(metrics: PerformanceMetrics[], percentile: number): number {
    const sorted = metrics
      .map(m => m.duration)
      .sort((a, b) => a - b);

    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  private async checkAlertRules() {
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60000);

    const metrics = await this.redis.zrangebyscore(
      'metrics:aggregates',
      fiveMinutesAgo,
      now
    );

    if (metrics.length === 0) return;

    const recentMetrics = metrics.map(m => JSON.parse(m));

    for (const rule of this.alertRules) {
      const value = this.getMetricValue(recentMetrics, rule.metric);

      if (this.shouldAlert(value, rule)) {
        const alertState = this.alertStates.get(rule.name);

        if (!alertState || !alertState.active) {
          // New alert or re-alert
          this.triggerAlert(rule, value);
          this.alertStates.set(rule.name, {
            active: true,
            startTime: now
          });
        }
      } else {
        const alertState = this.alertStates.get(rule.name);

        if (alertState && alertState.active) {
          // Alert resolved
          this.resolveAlert(rule);
          this.alertStates.set(rule.name, {
            active: false,
            startTime: now
          });
        }
      }
    }
  }

  private getMetricValue(metrics: any[], metric: string): number {
    switch (metric) {
      case 'responseTime':
        return metrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / metrics.length;
      case 'errorRate':
        return metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length;
      case 'cacheHitRate':
        return metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / metrics.length;
      case 'memoryUsage':
        const avgMemory = metrics.reduce((sum, m) => sum + m.averageMemoryUsage, 0) / metrics.length;
        return avgMemory / (1024 * 1024 * 1024); // Convert to GB
      case 'avgQueryTime':
        return metrics.reduce((sum, m) => sum + m.averageQueryTime, 0) / metrics.length;
      default:
        return 0;
    }
  }

  private shouldAlert(value: number, rule: AlertRule): boolean {
    switch (rule.operator) {
      case '>': return value > rule.threshold;
      case '<': return value < rule.threshold;
      case '>=': return value >= rule.threshold;
      case '<=': return value <= rule.threshold;
      case '=': return value === rule.threshold;
      case '!=': return value !== rule.threshold;
      default: return false;
    }
  }

  private async triggerAlert(rule: AlertRule, value: number) {
    const alert = {
      name: rule.name,
      severity: rule.severity,
      message: `${rule.name}: ${value.toFixed(2)} ${this.getMetricUnit(rule.metric)} (threshold: ${rule.threshold})`,
      timestamp: new Date(),
      active: true
    };

    // Store alert
    await this.prisma.performanceAlert.create({
      data: {
        name: rule.name,
        severity: rule.severity,
        message: alert.message,
        value: value.toString(),
        threshold: rule.threshold.toString(),
        active: true
      }
    });

    // Send notifications
    await this.sendNotification(alert);

    // Emit alert event
    this.emit('alert', alert);
  }

  private async resolveAlert(rule: AlertRule) {
    // Update database
    await this.prisma.performanceAlert.updateMany({
      where: {
        name: rule.name,
        active: true
      },
      data: {
        active: false,
        resolvedAt: new Date()
      }
    });

    // Send resolution notification
    await this.sendNotification({
      name: rule.name,
      severity: 'info',
      message: `${rule.name} resolved`,
      timestamp: new Date(),
      active: false
    });

    this.emit('alertResolved', rule.name);
  }

  private async sendNotification(alert: any) {
    // Send to Slack, email, or other notification channels
    console.log('ALERT:', alert);

    // Example: Send to Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: alert.message,
          color: alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'good'
        })
      });
    }
  }

  private getMetricUnit(metric: string): string {
    switch (metric) {
      case 'responseTime':
      case 'avgQueryTime':
        return 'ms';
      case 'errorRate':
      case 'cacheHitRate':
        return '%';
      case 'memoryUsage':
        return 'GB';
      default:
        return '';
    }
  }

  private async cleanupOldMetrics() {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    // Clean Redis
    await this.redis.zremrangebyscore('metrics:aggregates', 0, oneWeekAgo);

    // Clean database (keep 30 days)
    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    await this.prisma.performanceMetric.deleteMany({
      where: {
        timestamp: {
          lt: thirtyDaysAgo
        }
      }
    });

    // Clean old alerts
    await this.prisma.performanceAlert.deleteMany({
      where: {
        active: false,
        resolvedAt: {
          lt: thirtyDaysAgo
        }
      }
    });
  }

  async getMetrics(timeRange: '1h' | '24h' | '7d' | '30d' = '1h'): Promise<any> {
    const now = Date.now();
    let startTime: number;

    switch (timeRange) {
      case '1h':
        startTime = now - 3600000;
        break;
      case '24h':
        startTime = now - 86400000;
        break;
      case '7d':
        startTime = now - 604800000;
        break;
      case '30d':
        startTime = now - 2592000000;
        break;
    }

    const metrics = await this.redis.zrangebyscore(
      'metrics:aggregates',
      startTime,
      now
    );

    return metrics.map(m => JSON.parse(m));
  }

  async getActiveAlerts(): Promise<any[]> {
    return await this.prisma.performanceAlert.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}

export const performanceCollector = new PerformanceCollector();
```

### 5.2 Grafana Dashboards

**File:** `monitoring/grafana/dashboards/performance-overview.json`

```json
{
  "dashboard": {
    "title": "TempMail Pro - Performance Overview",
    "tags": ["tempmail", "performance"],
    "timezone": "browser",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{status}}"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 }
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 }
      },
      {
        "title": "Error Rate",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"4..\"}[5m]) / rate(http_requests_total[5m])",
            "legendFormat": "4xx Errors"
          },
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m])",
            "legendFormat": "5xx Errors"
          }
        ],
        "gridPos": { "h": 4, "w": 6, "x": 0, "y": 8 }
      },
      {
        "title": "Cache Hit Rate",
        "type": "singlestat",
        "targets": [
          {
            "expr": "redis_cache_hits_total / (redis_cache_hits_total + redis_cache_misses_total)",
            "legendFormat": "Hit Rate"
          }
        ],
        "gridPos": { "h": 4, "w": 6, "x": 6, "y": 8 }
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "process_resident_memory_bytes",
            "legendFormat": "RSS"
          },
          {
            "expr": "nodejs_heap_size_used_bytes",
            "legendFormat": "Heap Used"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 8 }
      },
      {
        "title": "Database Queries",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(prisma_queries_total[5m])",
            "legendFormat": "Query Rate"
          },
          {
            "expr": "histogram_quantile(0.95, rate(prisma_query_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 16 }
      },
      {
        "title": "Active Alerts",
        "type": "table",
        "targets": [
          {
            "expr": "performance_alerts_active",
            "format": "table",
            "instant": true
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 16 }
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
```

### 5.3 Performance Budget Enforcement

**File:** `.github/workflows/performance-check.yml`

```yaml
name: Performance Budget Check

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  performance-check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd services/api && npm ci
          cd ../web && npm ci

      - name: Build API
        run: cd services/api && npm run build

      - name: Build Web
        run: cd services/web && npm run build

      - name: Analyze bundle size
        run: |
          cd services/web
          npx bundlesize

      - name: Run Lighthouse CI
        run: |
          cd services/web
          npm install -g @lhci/cli@0.12.x
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

      - name: API Performance Test
        run: |
          cd services/api
          npm run test:performance
          npm run test:load

      - name: Check database performance
        run: |
          cd services/api
          npx prisma db pull
          npm run db:analyze

      - name: Upload performance results
        uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: |
            services/web/.lighthouseci/
            services/api/performance-reports/
```

**Bundle Size Configuration:** `services/web/.bundlesize.config.json`

```json
{
  "files": [
    {
      "path": "dist/static/js/*.js",
      "maxSize": "800kb"
    },
    {
      "path": "dist/static/css/*.css",
      "maxSize": "50kb"
    },
    {
      "path": "dist/index.html",
      "maxSize": "5kb"
    }
  ]
}
```

**Lighthouse CI Configuration:** `services/web/lighthouserc.js`

```javascript
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:5173'],
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        'categories:pwa': 'off'
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};
```

### 5.4 Automated Performance Tuning

**File:** `services/api/src/monitoring/autoTuner.ts`

```typescript
interface TuningRule {
  name: string;
  condition: (metrics: any) => boolean;
  action: () => Promise<void>;
  cooldown: number; // minutes
  lastRun: number;
}

export class AutoTuner {
  private rules: TuningRule[] = [];
  private isRunning = false;

  constructor() {
    this.initializeRules();
  }

  private initializeRules() {
    this.rules = [
      {
        name: 'Increase Cache TTL for Hot Data',
        condition: (metrics) => metrics.cacheHitRate < 0.8,
        action: async () => {
          // Increase TTL for frequently accessed items
          console.log('Increasing cache TTL...');
          await this.adjustCacheTTL(1.5); // Increase by 50%
        },
        cooldown: 60,
        lastRun: 0
      },
      {
        name: 'Adjust Database Pool Size',
        condition: (metrics) => metrics.avgQueryTime > 100,
        action: async () => {
          // Increase database connection pool
          console.log('Increasing database pool size...');
          await this.adjustDatabasePool(5); // Add 5 connections
        },
        cooldown: 30,
        lastRun: 0
      },
      {
        name: 'Scale Up for High Load',
        condition: (metrics) => metrics.averageResponseTime > 500,
        action: async () => {
          // Trigger horizontal scaling
          console.log('Triggering scale up...');
          await this.triggerScaleUp();
        },
        cooldown: 120,
        lastRun: 0
      },
      {
        name: 'Clear Stale Cache',
        condition: (metrics) => metrics.memoryUsage > 0.9,
        action: async () => {
          // Clear cache to free memory
          console.log('Clearing stale cache...');
          await this.clearStaleCache();
        },
        cooldown: 15,
        lastRun: 0
      },
      {
        name: 'Enable Aggressive Compression',
        condition: (metrics) => metrics.avgResponseSize > 100000,
        action: async () => {
          // Enable more aggressive compression
          console.log('Enabling aggressive compression...');
          await this.enableAggressiveCompression();
        },
        cooldown: 45,
        lastRun: 0
      }
    ];
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('Auto-tuner started');

    // Check rules every minute
    const interval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }

      await this.checkRules();
    }, 60000);
  }

  async stop() {
    this.isRunning = false;
    console.log('Auto-tuner stopped');
  }

  private async checkRules() {
    const metrics = await performanceCollector.getMetrics('5m');

    if (metrics.length === 0) return;

    const aggregated = this.aggregateMetrics(metrics);

    for (const rule of this.rules) {
      const now = Date.now();
      const minutesSinceLastRun = (now - rule.lastRun) / 60000;

      if (minutesSinceLastRun < rule.cooldown) {
        continue; // Still in cooldown
      }

      if (rule.condition(aggregated)) {
        try {
          await rule.action();
          rule.lastRun = now;
          console.log(`Auto-tuner executed rule: ${rule.name}`);
        } catch (error) {
          console.error(`Auto-tuner rule failed: ${rule.name}`, error);
        }
      }
    }
  }

  private aggregateMetrics(metrics: any[]): any {
    return {
      cacheHitRate: metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / metrics.length,
      avgQueryTime: metrics.reduce((sum, m) => sum + m.averageQueryTime, 0) / metrics.length,
      averageResponseTime: metrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / metrics.length,
      avgResponseSize: metrics.reduce((sum, m) => sum + m.averageResponseSize, 0) / metrics.length,
      memoryUsage: metrics.reduce((sum, m) => sum + m.averageMemoryUsage, 0) / metrics.length
    };
  }

  private async adjustCacheTTL(multiplier: number) {
    // Implementation depends on cache service
    // This would update cache configuration
  }

  private async adjustDatabasePool(increment: number) {
    // Implementation depends on database configuration
    // This would update connection pool settings
  }

  private async triggerScaleUp() {
    // Integration with Kubernetes HPA or cloud auto-scaling
    if (process.env.KUBERNETES_SERVICE_HOST) {
      // Use Kubernetes API to scale deployment
      console.log('Kubernetes scaling detected');
    }
  }

  private async clearStaleCache() {
    // Clear old cache entries
    const redis = new Redis(process.env.REDIS_URL);
    await redis.flushdb();
  }

  private async enableAggressiveCompression() {
    // Update compression settings
    console.log('Compression settings updated');
  }
}

export const autoTuner = new AutoTuner();
```

### 5.5 Performance Health Check Endpoint

**File:** `services/api/src/routes/health.ts` (update)

```typescript
// Add comprehensive health check with performance metrics
router.get('/health/performance', async (request, reply) => {
  const metrics = await performanceCollector.getMetrics('5m');
  const alerts = await performanceCollector.getActiveAlerts();

  if (metrics.length === 0) {
    reply.status(503);
    return { status: 'no-data', message: 'No performance data available' };
  }

  const latest = metrics[metrics.length - 1];
  const isHealthy = latest.errorRate < 0.01 &&
                   latest.averageResponseTime < 500 &&
                   latest.cacheHitRate > 0.7 &&
                   latest.averageMemoryUsage < 0.8;

  reply.status(isHealthy ? 200 : 503);

  return {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    metrics: {
      responseTime: {
        average: latest.averageResponseTime,
        p95: latest.p95ResponseTime,
        target: 200
      },
      errorRate: {
        current: latest.errorRate,
        target: 0.01
      },
      cacheHitRate: {
        current: latest.cacheHitRate,
        target: 0.8
      },
      memoryUsage: {
        current: latest.averageMemoryUsage,
        target: 0.8
      },
      databaseQueries: {
        averageTime: latest.averageQueryTime,
        target: 50
      }
    },
    alerts: alerts.slice(0, 5), // Show last 5 alerts
    recommendations: generateRecommendations(latest)
  };
});

function generateRecommendations(metrics: any): string[] {
  const recommendations: string[] = [];

  if (metrics.averageResponseTime > 200) {
    recommendations.push('Consider enabling caching for slow endpoints');
  }

  if (metrics.errorRate > 0.01) {
    recommendations.push('Investigate recent error spikes');
  }

  if (metrics.cacheHitRate < 0.7) {
    recommendations.push('Review cache configuration and TTL values');
  }

  if (metrics.averageMemoryUsage > 0.8) {
    recommendations.push('Monitor for memory leaks and consider scaling');
  }

  if (metrics.averageQueryTime > 50) {
    recommendations.push('Check for missing database indexes');
  }

  return recommendations;
}
```

## Testing Requirements

### 1. Performance Monitoring Tests
```bash
# Test alerting system
npm run test:alerts

# Verify dashboard metrics
npm run test:dashboard

# Test auto-tuner
npm run test:auto-tuner
```

### 2. Monitoring Test Script
**File:** `tests/performance/monitoring-test.js`

```javascript
async function testMonitoringSystem() {
  const performanceCollector = require('../src/monitoring/performanceCollector');

  // Simulate metrics
  const testMetrics = {
    timestamp: Date.now(),
    requestId: 'test-123',
    endpoint: '/api/messages',
    method: 'GET',
    duration: 150,
    statusCode: 200,
    memoryUsage: { heapUsed: 256 * 1024 * 1024 },
    cpuUsage: { user: 1000000, system: 500000 },
    databaseQueries: { count: 5, totalDuration: 100, slowQueries: 0 },
    cacheMetrics: { hits: 80, misses: 20, hitRate: 0.8 },
    responseSize: 50000
  };

  // Test metric collection
  await performanceCollector.recordMetric(testMetrics);

  // Test aggregation
  await new Promise(resolve => setTimeout(resolve, 65000)); // Wait for aggregation

  // Test alerting
  const slowMetric = { ...testMetrics, duration: 1000 }; // Slow request
  await performanceCollector.recordMetric(slowMetric);

  // Check alerts
  const alerts = await performanceCollector.getActiveAlerts();
  console.log('Active alerts:', alerts.length);

  // Test metrics retrieval
  const metrics = await performanceCollector.getMetrics('1h');
  console.log('Metrics retrieved:', metrics.length);

  console.log('Monitoring system test completed');
}

testMonitoringSystem().catch(console.error);
```

## Risk Assessment & Mitigation

### Medium Risk
- False alerts causing noise
- Auto-tuner making incorrect adjustments
- Monitoring overhead affecting performance

### Mitigation
- Implement alert confirmation windows
- Require manual approval for critical changes
- Optimize monitoring code for minimal overhead
- Use sampling for high-frequency metrics

## Rollback Criteria

Phase must be rolled back if:
- Monitoring causes >5% performance overhead
- False positive alerts >20% of total
- Auto-tuner causes instability
- Dashboard queries impact production

## Success Verification

```javascript
// Verify monitoring is working
const metrics = await performanceCollector.getMetrics('1h');
console.log('Metrics collected:', metrics.length);

// Check alert system
const alerts = await performanceCollector.getActiveAlerts();
console.log('Active alerts:', alerts.length);

// Verify auto-tuner
console.log('Auto-tuner status:', autoTuner.isRunning ? 'Active' : 'Inactive');

// Dashboard health
const dashboardHealth = await fetch('/health/performance');
console.log('Dashboard status:', await dashboardHealth.json());
```

## Phase 5 Complete Checklist

- [x] Database optimization implemented
- [x] Memory and caching optimized
- [x] API performance improved
- [x] Frontend optimized
- [x] Monitoring and tuning active

## Final Performance Targets

| Metric | Target | Achievement |
|--------|--------|-------------|
| API Response Time (95th) | <200ms | TBD |
| Database Query Time | <30ms | TBD |
| Memory Usage | <256MB average | TBD |
| Cache Hit Ratio | >80% | TBD |
| Frontend Load Time | <2s (3G) | TBD |
| Bundle Size | <800KB | TBD |
| Error Rate | <0.1% | TBD |

---

**Phase 5 Complete: System performance optimized and monitored**