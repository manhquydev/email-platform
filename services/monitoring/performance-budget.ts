import EventEmitter from 'events';
import { createClient } from 'redis';
import { PrismaClient } from '@prisma/client';

interface BudgetRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  comparison: 'lt' | 'lte' | 'gt' | 'gte';
  period: number; // ms
  severity: 'warning' | 'error' | 'critical';
  enabled: boolean;
  actions: {
    block?: boolean;
    alert?: boolean;
    autoScale?: boolean;
    rollback?: boolean;
  };
}

interface BudgetMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface BudgetViolation {
  rule: BudgetRule;
  actualValue: number;
  threshold: number;
  percentage: number;
  timestamp: number;
  duration: number;
  resolved: boolean;
}

interface PerformanceBudgetConfig {
  enabled: boolean;
  enforcementMode: 'monitor' | 'warn' | 'block';
  gracePeriod: number; // ms
  maxViolationsPerPeriod: number;
  violationPeriod: number; // ms
}

/**
 * Performance budget enforcement system
 */
export class PerformanceBudget extends EventEmitter {
  private redis: ReturnType<typeof createClient>;
  private prisma: PrismaClient;
  private config: PerformanceBudgetConfig;
  private rules = new Map<string, BudgetRule>();
  private violations = new Map<string, BudgetViolation>();
  private metricsBuffer: BudgetMetric[] = [];
  private monitoringInterval?: NodeJS.Timeout;

  constructor(config: Partial<PerformanceBudgetConfig> = {}) {
    super();

    this.config = {
      enabled: true,
      enforcementMode: 'monitor',
      gracePeriod: 30000, // 30 seconds
      maxViolationsPerPeriod: 5,
      violationPeriod: 300000, // 5 minutes
      ...config
    };

    this.prisma = new PrismaClient();
    this.redis = createClient();

    this.initializeDefaultRules();
  }

  /**
   * Initialize default performance budget rules
   */
  private initializeDefaultRules(): void {
    // API Response Time Budgets
    this.addRule({
      id: 'api_response_time_p50',
      name: 'API Response Time P50',
      metric: 'api_response_time_p50',
      threshold: 100, // 100ms
      comparison: 'lte',
      period: 60000, // 1 minute
      severity: 'warning',
      enabled: true,
      actions: { alert: true }
    });

    this.addRule({
      id: 'api_response_time_p95',
      name: 'API Response Time P95',
      metric: 'api_response_time_p95',
      threshold: 500, // 500ms
      comparison: 'lte',
      period: 60000,
      severity: 'error',
      enabled: true,
      actions: { alert: true, autoScale: true }
    });

    this.addRule({
      id: 'api_response_time_p99',
      name: 'API Response Time P99',
      metric: 'api_response_time_p99',
      threshold: 1000, // 1s
      comparison: 'lte',
      period: 60000,
      severity: 'critical',
      enabled: true,
      actions: { block: true, alert: true, autoScale: true }
    });

    // Throughput Budgets
    this.addRule({
      id: 'api_requests_per_minute',
      name: 'API Requests Per Minute',
      metric: 'api_requests_per_minute',
      threshold: 10000,
      comparison: 'lte',
      period: 60000,
      severity: 'warning',
      enabled: true,
      actions: { alert: true }
    });

    // Error Rate Budgets
    this.addRule({
      id: 'api_error_rate',
      name: 'API Error Rate',
      metric: 'api_error_rate',
      threshold: 1, // 1%
      comparison: 'lte',
      period: 60000,
      severity: 'error',
      enabled: true,
      actions: { alert: true }
    });

    // Database Budgets
    this.addRule({
      id: 'db_query_time_p95',
      name: 'Database Query Time P95',
      metric: 'db_query_time_p95',
      threshold: 100, // 100ms
      comparison: 'lte',
      period: 60000,
      severity: 'error',
      enabled: true,
      actions: { alert: true }
    });

    this.addRule({
      id: 'db_connections_usage',
      name: 'Database Connections Usage',
      metric: 'db_connections_usage_percent',
      threshold: 80, // 80%
      comparison: 'lte',
      period: 30000,
      severity: 'warning',
      enabled: true,
      actions: { alert: true }
    });

    // Memory Budgets
    this.addRule({
      id: 'memory_usage_percent',
      name: 'Memory Usage',
      metric: 'memory_usage_percent',
      threshold: 85, // 85%
      comparison: 'lte',
      period: 30000,
      severity: 'error',
      enabled: true,
      actions: { alert: true }
    });

    // CPU Budgets
    this.addRule({
      id: 'cpu_usage_percent',
      name: 'CPU Usage',
      metric: 'cpu_usage_percent',
      threshold: 80, // 80%
      comparison: 'lte',
      period: 30000,
      severity: 'warning',
      enabled: true,
      actions: { alert: true }
    });

    // Frontend Budgets
    this.addRule({
      id: 'frontend_bundle_size',
      name: 'Frontend Bundle Size',
      metric: 'frontend_bundle_size_bytes',
      threshold: 1024 * 1024, // 1MB
      comparison: 'lte',
      period: 0, // Static check
      severity: 'error',
      enabled: true,
      actions: { alert: true }
    });

    this.addRule({
      id: 'frontend_first_contentful_paint',
      name: 'First Contentful Paint',
      metric: 'fcp_ms',
      threshold: 1500, // 1.5s
      comparison: 'lte',
      period: 0,
      severity: 'warning',
      enabled: true,
      actions: { alert: true }
    });

    this.addRule({
      id: 'frontend_largest_contentful_paint',
      name: 'Largest Contentful Paint',
      metric: 'lcp_ms',
      threshold: 2500, // 2.5s
      comparison: 'lte',
      period: 0,
      severity: 'error',
      enabled: true,
      actions: { alert: true }
    });
  }

  /**
   * Initialize the performance budget system
   */
  async initialize(): Promise<void> {
    try {
      await this.redis.connect();

      // Load existing rules from database
      await this.loadRules();

      // Start monitoring metrics
      this.startMonitoring();

      console.log('Performance budget system initialized');
    } catch (error) {
      console.error('Failed to initialize performance budget:', error);
      throw error;
    }
  }

  /**
   * Start monitoring metrics against budgets
   */
  private startMonitoring(): void {
    if (!this.config.enabled) return;

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkBudgets();
      } catch (error) {
        console.error('Failed to check budgets:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Check all budget rules against current metrics
   */
  private async checkBudgets(): Promise<void> {
    const now = Date.now();

    for (const [ruleId, rule] of this.rules.entries()) {
      if (!rule.enabled) continue;

      try {
        const metricValue = await this.getMetricValue(rule.metric, rule.period);
        if (metricValue === null) continue;

        const violation = this.evaluateRule(rule, metricValue, now);
        if (violation) {
          await this.handleViolation(violation);
        } else {
          // Check if this resolves an existing violation
          await this.resolveViolation(ruleId, now);
        }
      } catch (error) {
        console.error(`Failed to check rule ${ruleId}:`, error);
      }
    }
  }

  /**
   * Get current metric value
   */
  private async getMetricValue(metricName: string, period: number): Promise<number | null> {
    // Calculate percentiles for response time metrics
    if (metricName.includes('_p50') || metricName.includes('_p95') || metricName.includes('_p99')) {
      return await this.calculatePercentile(metricName.replace(/_p\d+$/, ''), period);
    }

    // Get latest value for simple metrics
    const key = `metric:${metricName}:latest`;
    const value = await this.redis.get(key);
    return value ? parseFloat(value) : null;
  }

  /**
   * Calculate percentile for a metric
   */
  private async calculatePercentile(metricBase: string, period: number): Promise<number | null> {
    const endTime = Date.now();
    const startTime = endTime - period;

    // Get metric values from Redis sorted set
    const values = await this.redis.zrange(
      `metrics:${metricBase}`,
      startTime,
      endTime,
      'BYSCORE'
    );

    if (values.length === 0) return null;

    // Parse values
    const parsedValues = values.map(v => {
      try {
        const parsed = JSON.parse(v);
        return parsed.value || 0;
      } catch {
        return 0;
      }
    }).sort((a, b) => a - b);

    // Calculate percentile
    if (metricBase.includes('_p50')) {
      const index = Math.floor(parsedValues.length * 0.5);
      return parsedValues[index] || 0;
    } else if (metricBase.includes('_p95')) {
      const index = Math.floor(parsedValues.length * 0.95);
      return parsedValues[index] || 0;
    } else if (metricBase.includes('_p99')) {
      const index = Math.floor(parsedValues.length * 0.99);
      return parsedValues[index] || 0;
    }

    return 0;
  }

  /**
   * Evaluate if a rule is violated
   */
  private evaluateRule(rule: BudgetRule, actualValue: number, timestamp: number): BudgetViolation | null {
    let violated = false;

    switch (rule.comparison) {
      case 'lt':
        violated = actualValue >= rule.threshold;
        break;
      case 'lte':
        violated = actualValue > rule.threshold;
        break;
      case 'gt':
        violated = actualValue <= rule.threshold;
        break;
      case 'gte':
        violated = actualValue < rule.threshold;
        break;
    }

    if (!violated) return null;

    const percentage = Math.abs((actualValue - rule.threshold) / rule.threshold * 100);

    return {
      rule,
      actualValue,
      threshold: rule.threshold,
      percentage,
      timestamp,
      duration: 0,
      resolved: false
    };
  }

  /**
   * Handle budget violation
   */
  private async handleViolation(violation: BudgetViolation): Promise<void> {
    const ruleId = violation.rule.id;
    const existingViolation = this.violations.get(ruleId);

    if (!existingViolation) {
      // New violation
      this.violations.set(ruleId, violation);

      // Store in database
      await this.prisma.budgetViolation.create({
        data: {
          ruleId: ruleId,
          ruleName: violation.rule.name,
          metric: violation.rule.metric,
          actualValue: violation.actualValue,
          threshold: violation.threshold,
          percentage: violation.percentage,
          severity: violation.rule.severity,
          violatedAt: new Date(violation.timestamp),
          resolved: false
        }
      });

      // Emit violation event
      this.emit('violation', violation);

      // Take action based on enforcement mode and severity
      await this.takeAction(violation);

      console.warn(`Budget violation: ${violation.rule.name} - ${violation.actualValue} > ${violation.threshold}`);
    } else {
      // Update existing violation
      existingViolation.duration = Date.now() - existingViolation.timestamp;
    }
  }

  /**
   * Take action based on violation and configuration
   */
  private async takeAction(violation: BudgetViolation): Promise<void> {
    const { actions, severity } = violation.rule;

    // Send alerts
    if (actions.alert) {
      await this.sendAlert(violation);
    }

    // Block requests if critical and in block mode
    if (actions.block && this.config.enforcementMode === 'block' && severity === 'critical') {
      await this.blockRequests(violation);
    }

    // Auto-scale resources
    if (actions.autoScale) {
      await this.triggerAutoScale(violation);
    }

    // Rollback recent changes
    if (actions.rollback && violation.percentage > 50) {
      await this.triggerRollback(violation);
    }
  }

  /**
   * Send alert for budget violation
   */
  private async sendAlert(violation: BudgetViolation): Promise<void> {
    const alert = {
      id: `budget-${violation.rule.id}-${Date.now()}`,
      type: 'budget_violation',
      severity: violation.rule.severity,
      title: `Performance Budget Violation: ${violation.rule.name}`,
      message: `${violation.rule.name} exceeded threshold by ${violation.percentage.toFixed(1)}%`,
      details: {
        rule: violation.rule.name,
        metric: violation.rule.metric,
        actualValue: violation.actualValue,
        threshold: violation.threshold,
        percentage: violation.percentage,
        timestamp: new Date(violation.timestamp).toISOString()
      }
    };

    // Store alert in Redis for dashboard
    await this.redis.lpush('alerts', JSON.stringify(alert));
    await this.redis.ltrim('alerts', 0, 99); // Keep last 100 alerts

    // Emit alert event
    this.emit('alert', alert);
  }

  /**
   * Block requests when critical budget is violated
   */
  private async blockRequests(violation: BudgetViolation): Promise<void> {
    console.log(`Blocking requests due to critical budget violation: ${violation.rule.name}`);

    // Set block flag in Redis
    await this.redis.set('budget_block_active', '1', {
      EX: this.config.gracePeriod / 1000 // Expire after grace period
    });

    // Emit block event
    this.emit('blocked', {
      reason: violation.rule.name,
      duration: this.config.gracePeriod,
      violation
    });
  }

  /**
   * Trigger auto-scaling for budget violations
   */
  private async triggerAutoScale(violation: BudgetViolation): Promise<void> {
    const scaleEvent = {
      metric: violation.rule.metric,
      currentValue: violation.actualValue,
      threshold: violation.threshold,
      severity: violation.rule.severity,
      timestamp: Date.now()
    };

    // Store scale event in Redis
    await this.redis.lpush('auto_scale_triggers', JSON.stringify(scaleEvent));
    await this.redis.ltrim('auto_scale_triggers', 0, 49); // Keep last 50

    // Emit scale event
    this.emit('auto_scale', scaleEvent);

    console.log(`Auto-scale triggered by budget violation: ${violation.rule.name}`);
  }

  /**
   * Trigger rollback for severe violations
   */
  private async triggerRollback(violation: BudgetViolation): Promise<void> {
    const rollbackEvent = {
      reason: violation.rule.name,
      percentage: violation.percentage,
      timestamp: Date.now()
    };

    // Store rollback event
    await this.redis.lpush('rollback_triggers', JSON.stringify(rollbackEvent));
    await this.redis.ltrim('rollback_triggers', 0, 19); // Keep last 20

    // Emit rollback event
    this.emit('rollback', rollbackEvent);

    console.warn(`Rollback triggered by severe budget violation: ${violation.rule.name}`);
  }

  /**
   * Resolve a budget violation
   */
  private async resolveViolation(ruleId: string, timestamp: number): Promise<void> {
    const violation = this.violations.get(ruleId);
    if (!violation) return;

    violation.resolved = true;
    violation.duration = timestamp - violation.timestamp;

    // Update in database
    await this.prisma.budgetViolation.updateMany({
      where: { ruleId, resolved: false },
      data: {
        resolved: true,
        resolvedAt: new Date(timestamp)
      }
    });

    // Remove from active violations
    this.violations.delete(ruleId);

    // Emit resolution event
    this.emit('resolved', violation);

    console.log(`Budget violation resolved: ${violation.rule.name} after ${violation.duration}ms`);
  }

  /**
   * Add a new budget rule
   */
  async addRule(rule: Omit<BudgetRule, 'id'>): Promise<void> {
    const id = rule.name.toLowerCase().replace(/\s+/g, '_');
    const newRule: BudgetRule = { id, ...rule };

    this.rules.set(id, newRule);

    // Store in database
    await this.prisma.budgetRule.create({
      data: {
        id,
        name: rule.name,
        metric: rule.metric,
        threshold: rule.threshold,
        comparison: rule.comparison,
        period: rule.period,
        severity: rule.severity,
        enabled: rule.enabled,
        actions: rule.actions
      }
    });
  }

  /**
   * Update an existing budget rule
   */
  async updateRule(id: string, updates: Partial<BudgetRule>): Promise<void> {
    const rule = this.rules.get(id);
    if (!rule) return;

    Object.assign(rule, updates);

    // Update in database
    await this.prisma.budgetRule.update({
      where: { id },
      data: updates
    });
  }

  /**
   * Remove a budget rule
   */
  async removeRule(id: string): Promise<void> {
    this.rules.delete(id);
    this.violations.delete(id);

    // Remove from database
    await this.prisma.budgetRule.delete({
      where: { id }
    });
  }

  /**
   * Load rules from database
   */
  private async loadRules(): Promise<void> {
    try {
      const rules = await this.prisma.budgetRule.findMany();

      for (const rule of rules) {
        this.rules.set(rule.id, {
          id: rule.id,
          name: rule.name,
          metric: rule.metric,
          threshold: rule.threshold,
          comparison: rule.comparison as any,
          period: rule.period,
          severity: rule.severity as any,
          enabled: rule.enabled,
          actions: rule.actions as any
        });
      }
    } catch (error) {
      console.error('Failed to load budget rules:', error);
    }
  }

  /**
   * Get current budget status
   */
  async getBudgetStatus(): Promise<{
    rules: Array<{
      id: string;
      name: string;
      metric: string;
      threshold: number;
      currentValue?: number;
      status: 'ok' | 'warning' | 'violation' | 'critical';
      violation?: BudgetViolation;
    }>;
    violations: BudgetViolation[];
    blockActive: boolean;
  }> {
    const status = {
      rules: [] as any[],
      violations: Array.from(this.violations.values()),
      blockActive: await this.redis.get('budget_block_active') === '1'
    };

    for (const [id, rule] of this.rules.entries()) {
      const currentValue = await this.getMetricValue(rule.metric, rule.period);
      const violation = this.violations.get(id);

      let statusLevel: 'ok' | 'warning' | 'violation' | 'critical' = 'ok';
      if (violation) {
        statusLevel = violation.rule.severity === 'critical' ? 'critical' : 'violation';
      } else if (currentValue !== null) {
        const percentage = Math.abs((currentValue - rule.threshold) / rule.threshold * 100);
        if (percentage > 80) statusLevel = 'warning';
      }

      status.rules.push({
        id,
        name: rule.name,
        metric: rule.metric,
        threshold: rule.threshold,
        currentValue: currentValue || undefined,
        status: statusLevel,
        violation: violation || undefined
      });
    }

    return status;
  }

  /**
   * Record a metric value
   */
  async recordMetric(name: string, value: number, tags?: Record<string, string>): Promise<void> {
    const metric: BudgetMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags
    };

    // Store in Redis sorted set for time-series queries
    await this.redis.zadd(
      `metrics:${name}`,
      metric.timestamp,
      JSON.stringify(metric)
    );

    // Store latest value
    await this.redis.set(`metric:${name}:latest`, value);

    // Clean up old data (keep last hour)
    const cutoff = Date.now() - 3600000;
    await this.redis.zremrangebyscore(`metrics:${name}`, 0, cutoff);
  }

  /**
   * Check if requests are currently blocked
   */
  async isBlocked(): Promise<boolean> {
    return await this.redis.get('budget_block_active') === '1';
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    await this.redis.quit();
    await this.prisma.$disconnect();
  }
}

// Export singleton instance
export const performanceBudget = new PerformanceBudget();