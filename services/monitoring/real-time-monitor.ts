import EventEmitter from 'events';
import WebSocket from 'ws';
import { createClient } from 'redis';
import { PrismaClient } from '@prisma/client';

interface MetricData {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

interface Alert {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  duration: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  notifications: {
    email?: string[];
    slack?: string;
    webhook?: string;
  };
}

interface MonitoringConfig {
  metricsInterval: number;
  alertCheckInterval: number;
  retentionPeriod: number;
  enableRealTimeMonitoring: boolean;
  enableAutoTuning: boolean;
}

/**
 * Real-time monitoring system for application performance
 */
export class RealTimeMonitor extends EventEmitter {
  private redis: ReturnType<typeof createClient>;
  private prisma: PrismaClient;
  private wsServer: WebSocket.Server;
  private metrics = new Map<string, MetricData[]>();
  private alerts = new Map<string, Alert>();
  private config: MonitoringConfig;
  private metricsCollector?: NodeJS.Timeout;
  private alertChecker?: NodeJS.Timeout;

  constructor(config: Partial<MonitoringConfig> = {}) {
    super();

    this.config = {
      metricsInterval: 5000, // 5 seconds
      alertCheckInterval: 30000, // 30 seconds
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      enableRealTimeMonitoring: true,
      enableAutoTuning: false,
      ...config
    };

    this.prisma = new PrismaClient();
    this.redis = createClient();
    this.wsServer = new WebSocket.Server({ port: 8080 });
  }

  /**
   * Initialize the monitoring system
   */
  async initialize(): Promise<void> {
    try {
      // Connect to Redis
      await this.redis.connect();
      console.log('Connected to Redis for monitoring');

      // Initialize WebSocket server for real-time updates
      this.wsServer.on('connection', (ws) => {
        console.log('New monitoring client connected');

        // Send current metrics snapshot
        ws.send(JSON.stringify({
          type: 'snapshot',
          data: this.getMetricsSnapshot()
        }));

        ws.on('close', () => {
          console.log('Monitoring client disconnected');
        });
      });

      // Load existing alerts
      await this.loadAlerts();

      // Start metrics collection
      this.startMetricsCollection();

      // Start alert checking
      this.startAlertChecking();

      console.log('Real-time monitoring system initialized');
    } catch (error) {
      console.error('Failed to initialize monitoring:', error);
      throw error;
    }
  }

  /**
   * Start collecting system metrics
   */
  private startMetricsCollection(): void {
    if (!this.config.enableRealTimeMonitoring) return;

    this.metricsCollector = setInterval(async () => {
      try {
        const metrics = await this.collectSystemMetrics();

        for (const [name, value] of Object.entries(metrics)) {
          this.recordMetric(name, value);
        }

        // Broadcast to connected clients
        this.broadcastMetrics(metrics);
      } catch (error) {
        console.error('Failed to collect metrics:', error);
      }
    }, this.config.metricsInterval);
  }

  /**
   * Collect system performance metrics
   */
  private async collectSystemMetrics(): Promise<Record<string, number>> {
    const metrics: Record<string, number> = {};

    // Database metrics
    try {
      const dbStats = await this.collectDatabaseMetrics();
      Object.assign(metrics, dbStats);
    } catch (error) {
      console.error('Failed to collect database metrics:', error);
    }

    // Memory metrics
    const memUsage = process.memoryUsage();
    metrics.memory_used = memUsage.heapUsed;
    metrics.memory_total = memUsage.heapTotal;
    metrics.memory_external = memUsage.external;
    metrics.memory_rss = memUsage.rss;

    // CPU metrics (Node.js specific)
    const cpuUsage = process.cpuUsage();
    metrics.cpu_user = cpuUsage.user;
    metrics.cpu_system = cpuUsage.system;

    // Event loop metrics
    const start = Date.now();
    setImmediate(() => {
      metrics.event_loop_lag = Date.now() - start;
    });

    // Active connections
    metrics.active_connections = this.wsServer.clients.size;

    // API metrics from Redis
    try {
      const apiMetrics = await this.collectAPIMetrics();
      Object.assign(metrics, apiMetrics);
    } catch (error) {
      console.error('Failed to collect API metrics:', error);
    }

    return metrics;
  }

  /**
   * Collect database performance metrics
   */
  private async collectDatabaseMetrics(): Promise<Record<string, number>> {
    const metrics: Record<string, number> = {};

    try {
      // Connection pool status
      const poolStatus = await this.prisma.$queryRaw`SELECT
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity`;

      if (Array.isArray(poolStatus) && poolStatus[0]) {
        const status = poolStatus[0] as any;
        metrics.db_connections_total = Number(status.total_connections);
        metrics.db_connections_active = Number(status.active_connections);
        metrics.db_connections_idle = Number(status.idle_connections);
      }

      // Query performance stats
      const queryStats = await this.prisma.$queryRaw`SELECT
        avg(EXTRACT(EPOCH FROM (total_time - execution_time))) as planning_time,
        avg(EXTRACT(EPOCH FROM execution_time)) as execution_time,
        sum(calls) as total_calls
        FROM pg_stat_statements`;

      if (Array.isArray(queryStats) && queryStats[0]) {
        const stats = queryStats[0] as any;
        metrics.db_query_planning_time = Number(stats.planning_time || 0) * 1000; // Convert to ms
        metrics.db_query_execution_time = Number(stats.execution_time || 0) * 1000;
        metrics.db_total_queries = Number(stats.total_calls || 0);
      }

      // Database size
      const dbSize = await this.prisma.$queryRaw`SELECT pg_database_size(current_database()) as size`;
      if (Array.isArray(dbSize) && dbSize[0]) {
        metrics.db_size_bytes = Number((dbSize[0] as any).size);
      }
    } catch (error) {
      console.error('Database metrics collection error:', error);
    }

    return metrics;
  }

  /**
   * Collect API performance metrics from Redis
   */
  private async collectAPIMetrics(): Promise<Record<string, number>> {
    const metrics: Record<string, number> = {};

    try {
      // Get recent API metrics from Redis
      const keys = await this.redis.keys('api:*');

      for (const key of keys) {
        const value = await this.redis.get(key);
        if (value) {
          const metricName = key.replace('api:', '').replace(/_/g, '_');
          metrics[metricName] = parseFloat(value) || 0;
        }
      }

      // Calculate request rate from recent logs
      const recentRequests = await this.redis.zcount('api_requests',
        Date.now() - 60000, Date.now() // Last minute
      );
      metrics.api_requests_per_minute = recentRequests;

      // Calculate error rate
      const recentErrors = await this.redis.zcount('api_errors',
        Date.now() - 60000, Date.now()
      );
      metrics.api_errors_per_minute = recentErrors;
      metrics.api_error_rate = recentRequests > 0 ? (recentErrors / recentRequests) * 100 : 0;
    } catch (error) {
      console.error('API metrics collection error:', error);
    }

    return metrics;
  }

  /**
   * Record a metric value
   */
  recordMetric(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricData: MetricData = {
      timestamp: Date.now(),
      value,
      labels
    };

    const metricList = this.metrics.get(name)!;
    metricList.push(metricData);

    // Trim old data based on retention period
    const cutoffTime = Date.now() - this.config.retentionPeriod;
    const index = metricList.findIndex(m => m.timestamp > cutoffTime);
    if (index > 0) {
      metricList.splice(0, index);
    }

    // Store in Redis for persistence
    this.redis.zadd(`metrics:${name}`, metricData.timestamp, JSON.stringify(metricData));
    this.redis.zremrangebyscore(`metrics:${name}`, 0, cutoffTime);

    // Emit metric event
    this.emit('metric', { name, value, labels });
  }

  /**
   * Get metrics snapshot for dashboard
   */
  getMetricsSnapshot(): Record<string, any> {
    const snapshot: Record<string, any> = {};

    for (const [name, data] of this.metrics.entries()) {
      if (data.length > 0) {
        const latest = data[data.length - 1];
        const values = data.map(d => d.value);

        snapshot[name] = {
          current: latest.value,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          count: data.length,
          trend: this.calculateTrend(data)
        };
      }
    }

    return snapshot;
  }

  /**
   * Calculate trend direction for a metric
   */
  private calculateTrend(data: MetricData[]): 'up' | 'down' | 'stable' {
    if (data.length < 10) return 'stable';

    const recent = data.slice(-10);
    const older = data.slice(-20, -10);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, d) => sum + d.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.value, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg * 100;

    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'up' : 'down';
  }

  /**
   * Broadcast metrics to WebSocket clients
   */
  private broadcastMetrics(metrics: Record<string, number>): void {
    const message = JSON.stringify({
      type: 'metrics_update',
      timestamp: Date.now(),
      data: metrics
    });

    this.wsServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * Start alert checking system
   */
  private startAlertChecking(): void {
    this.alertChecker = setInterval(async () => {
      try {
        await this.checkAlerts();
      } catch (error) {
        console.error('Failed to check alerts:', error);
      }
    }, this.config.alertCheckInterval);
  }

  /**
   * Check all enabled alerts against current metrics
   */
  private async checkAlerts(): Promise<void> {
    for (const [id, alert] of this.alerts.entries()) {
      if (!alert.enabled) continue;

      try {
        const triggered = await this.evaluateAlert(alert);
        if (triggered) {
          await this.triggerAlert(alert);
        }
      } catch (error) {
        console.error(`Failed to evaluate alert ${id}:`, error);
      }
    }
  }

  /**
   * Evaluate alert condition against current metrics
   */
  private async evaluateAlert(alert: Alert): Promise<boolean> {
    // Extract metric name from condition
    const metricNameMatch = alert.condition.match(/(\w+)\s*(>|<|=|>=|<=)/);
    if (!metricNameMatch) return false;

    const metricName = metricNameMatch[1];
    const metricData = this.metrics.get(metricName);

    if (!metricData || metricData.length === 0) return false;

    const latestValue = metricData[metricData.length - 1].value;

    // Simple evaluation for demonstration
    // In production, use a proper expression parser
    try {
      const expression = alert.condition.replace(metricName, latestValue.toString());
      return eval(expression);
    } catch {
      return false;
    }
  }

  /**
   * Trigger alert and send notifications
   */
  private async triggerAlert(alert: Alert): Promise<void> {
    const alertData = {
      id: alert.id,
      name: alert.name,
      severity: alert.severity,
      timestamp: new Date().toISOString(),
      message: `Alert triggered: ${alert.name}`
    };

    // Emit alert event
    this.emit('alert', alertData);

    // Send notifications
    await this.sendNotifications(alert, alertData);

    // Store alert in database
    await this.prisma.alert.create({
      data: {
        name: alert.name,
        severity: alert.severity,
        message: alertData.message,
        triggeredAt: new Date()
      }
    });
  }

  /**
   * Send alert notifications
   */
  private async sendNotifications(alert: Alert, alertData: any): Promise<void> {
    // Email notifications
    if (alert.notifications.email?.length) {
      for (const email of alert.notifications.email) {
        // Send email logic here
        console.log(`Alert email sent to ${email}:`, alertData);
      }
    }

    // Slack notifications
    if (alert.notifications.slack) {
      // Send Slack message logic here
      console.log(`Alert Slack message sent to ${alert.notifications.slack}:`, alertData);
    }

    // Webhook notifications
    if (alert.notifications.webhook) {
      try {
        await fetch(alert.notifications.webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alertData)
        });
      } catch (error) {
        console.error('Failed to send webhook notification:', error);
      }
    }
  }

  /**
   * Add new alert
   */
  async addAlert(alert: Omit<Alert, 'id'>): Promise<void> {
    const id = Math.random().toString(36).substr(2, 9);
    const newAlert: Alert = { id, ...alert };

    this.alerts.set(id, newAlert);

    // Store in database
    await this.prisma.alertRule.create({
      data: {
        name: alert.name,
        condition: alert.condition,
        threshold: alert.threshold,
        duration: alert.duration,
        severity: alert.severity,
        enabled: alert.enabled,
        notifications: alert.notifications
      }
    });
  }

  /**
   * Load existing alerts from database
   */
  private async loadAlerts(): Promise<void> {
    try {
      const alertRules = await this.prisma.alertRule.findMany();

      for (const rule of alertRules) {
        this.alerts.set(rule.id, {
          id: rule.id,
          name: rule.name,
          condition: rule.condition,
          threshold: rule.threshold,
          duration: rule.duration,
          severity: rule.severity as any,
          enabled: rule.enabled,
          notifications: rule.notifications as any
        });
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.metricsCollector) {
      clearInterval(this.metricsCollector);
    }

    if (this.alertChecker) {
      clearInterval(this.alertChecker);
    }

    this.wsServer.close();
    await this.redis.quit();
    await this.prisma.$disconnect();
  }
}

// Export singleton instance
export const realTimeMonitor = new RealTimeMonitor();