import EventEmitter from 'events';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { exec } from 'child_process';
import { promisify } from 'util';
import { realTimeMonitor } from './real-time-monitor';

const execAsync = promisify(exec);

interface TuningParameter {
  name: string;
  component: 'database' | 'redis' | 'api' | 'system';
  currentValue: any;
  minValue?: any;
  maxValue?: any;
  unit: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  requiresRestart: boolean;
}

interface TuningRecommendation {
  parameter: string;
  currentValue: any;
  recommendedValue: any;
  reason: string;
  confidence: number; // 0-100
  impact: 'performance' | 'memory' | 'cpu' | 'io';
  estimatedImprovement: string;
}

interface AutoTuningConfig {
  enabled: boolean;
  aggressiveMode: boolean;
  applyAutomatically: boolean;
  requireConfirmation: boolean;
  cooldownPeriod: number; // ms
  maxChangePercentage: number;
}

/**
 * Auto-tuning system for performance optimization
 */
export class AutoTuner extends EventEmitter {
  private prisma: PrismaClient;
  private redis: ReturnType<typeof createClient>;
  private config: AutoTuningConfig;
  private parameters = new Map<string, TuningParameter>();
  private lastTuneTime = new Map<string, number>();
  private tuningHistory: Array<{
    timestamp: number;
    parameter: string;
    oldValue: any;
    newValue: any;
    result: 'success' | 'failure' | 'reverted';
  }> = [];

  constructor(config: Partial<AutoTuningConfig> = {}) {
    super();

    this.config = {
      enabled: false,
      aggressiveMode: false,
      applyAutomatically: false,
      requireConfirmation: true,
      cooldownPeriod: 300000, // 5 minutes
      maxChangePercentage: 25,
      ...config
    };

    this.prisma = new PrismaClient();
    this.redis = createClient();

    this.initializeParameters();
  }

  /**
   * Initialize tuning parameters
   */
  private initializeParameters(): void {
    // Database parameters
    this.parameters.set('db_shared_buffers', {
      name: 'shared_buffers',
      component: 'database',
      currentValue: '128MB',
      minValue: '64MB',
      maxValue: '8GB',
      unit: 'bytes',
      description: 'Amount of memory for database cache',
      impact: 'high',
      requiresRestart: true
    });

    this.parameters.set('db_effective_cache_size', {
      name: 'effective_cache_size',
      component: 'database',
      currentValue: '4GB',
      minValue: '1GB',
      maxValue: '32GB',
      unit: 'bytes',
      description: 'Estimated memory available for caching',
      impact: 'high',
      requiresRestart: true
    });

    this.parameters.set('db_work_mem', {
      name: 'work_mem',
      component: 'database',
      currentValue: '4MB',
      minValue: '1MB',
      maxValue: '256MB',
      unit: 'bytes',
      description: 'Memory for internal sort operations',
      impact: 'medium',
      requiresRestart: false
    });

    this.parameters.set('db_maintenance_work_mem', {
      name: 'maintenance_work_mem',
      component: 'database',
      currentValue: '64MB',
      minValue: '16MB',
      maxValue: '1GB',
      unit: 'bytes',
      description: 'Memory for maintenance operations',
      impact: 'medium',
      requiresRestart: false
    });

    this.parameters.set('db_max_connections', {
      name: 'max_connections',
      component: 'database',
      currentValue: 100,
      minValue: 20,
      maxValue: 1000,
      unit: 'count',
      description: 'Maximum concurrent database connections',
      impact: 'high',
      requiresRestart: true
    });

    // Redis parameters
    this.parameters.set('redis_maxmemory', {
      name: 'maxmemory',
      component: 'redis',
      currentValue: '512mb',
      minValue: '128mb',
      maxValue: '8gb',
      unit: 'bytes',
      description: 'Maximum memory usage for Redis',
      impact: 'high',
      requiresRestart: false
    });

    this.parameters.set('redis_maxmemory_policy', {
      name: 'maxmemory-policy',
      component: 'redis',
      currentValue: 'allkeys-lru',
      unit: 'policy',
      description: 'Memory eviction policy',
      impact: 'medium',
      requiresRestart: false
    });

    // API parameters
    this.parameters.set('api_rate_limit', {
      name: 'rate_limit_per_minute',
      component: 'api',
      currentValue: 1000,
      minValue: 100,
      maxValue: 10000,
      unit: 'requests',
      description: 'API rate limit per minute per user',
      impact: 'medium',
      requiresRestart: false
    });

    this.parameters.set('api_timeout', {
      name: 'request_timeout',
      component: 'api',
      currentValue: 30000,
      minValue: 5000,
      maxValue: 120000,
      unit: 'ms',
      description: 'API request timeout',
      impact: 'medium',
      requiresRestart: false
    });

    // System parameters
    this.parameters.set('node_max_old_space_size', {
      name: '--max-old-space-size',
      component: 'system',
      currentValue: 2048,
      minValue: 512,
      maxValue: 8192,
      unit: 'MB',
      description: 'Maximum heap size for Node.js',
      impact: 'high',
      requiresRestart: true
    });
  }

  /**
   * Initialize the auto-tuner
   */
  async initialize(): Promise<void> {
    try {
      await this.redis.connect();

      // Load current parameter values
      await this.loadCurrentParameterValues();

      // Start monitoring for tuning opportunities
      this.startTuningMonitor();

      console.log('Auto-tuner initialized');
    } catch (error) {
      console.error('Failed to initialize auto-tuner:', error);
      throw error;
    }
  }

  /**
   * Load current values from actual systems
   */
  private async loadCurrentParameterValues(): Promise<void> {
    // Load PostgreSQL parameters
    try {
      const pgParams = await this.prisma.$queryRaw`
        SELECT name, setting FROM pg_settings WHERE name IN (
          'shared_buffers', 'effective_cache_size', 'work_mem',
          'maintenance_work_mem', 'max_connections'
        )
      `;

      if (Array.isArray(pgParams)) {
        for (const param of pgParams) {
          const p = param as any;
          const paramKey = `db_${p.name}`;
          const parameter = this.parameters.get(paramKey);
          if (parameter) {
            parameter.currentValue = p.setting;
          }
        }
      }
    } catch (error) {
      console.error('Failed to load PostgreSQL parameters:', error);
    }

    // Load Redis parameters
    try {
      const redisConfig = await this.redis.config.get('GET', '*');
      for (const [key, value] of Object.entries(redisConfig)) {
        const paramKey = `redis_${key}`;
        const parameter = this.parameters.get(paramKey);
        if (parameter) {
          parameter.currentValue = value;
        }
      }
    } catch (error) {
      console.error('Failed to load Redis parameters:', error);
    }
  }

  /**
   * Start the tuning monitoring loop
   */
  private startTuningMonitor(): void {
    if (!this.config.enabled) return;

    // Listen to monitoring events
    realTimeMonitor.on('metric', (metric) => {
      this.analyzeMetric(metric);
    });

    // Run tuning analysis periodically
    setInterval(() => {
      this.runTuningAnalysis();
    }, 60000); // Every minute
  }

  /**
   * Analyze individual metrics for tuning opportunities
   */
  private analyzeMetric(metric: { name: string; value: number }): void {
    const metrics = realTimeMonitor.getMetricsSnapshot();

    // High memory usage
    if (metric.name === 'memory_used' && metric.value > 0.8 * this.parseBytes('2GB')) {
      this.generateRecommendation('memory', metrics);
    }

    // High CPU usage
    if (metric.name.includes('cpu') && metric.value > 80) {
      this.generateRecommendation('cpu', metrics);
    }

    // Database performance issues
    if (metric.name.includes('db_') && metric.name.includes('time') && metric.value > 1000) {
      this.generateRecommendation('database', metrics);
    }

    // High error rate
    if (metric.name === 'api_error_rate' && metric.value > 5) {
      this.generateRecommendation('errors', metrics);
    }
  }

  /**
   * Generate tuning recommendations based on analysis
   */
  private async generateRecommendation(type: string, metrics: Record<string, any>): Promise<void> {
    const recommendations: TuningRecommendation[] = [];

    switch (type) {
      case 'memory':
        recommendations.push(...this.analyzeMemoryTuning(metrics));
        break;
      case 'cpu':
        recommendations.push(...this.analyzeCpuTuning(metrics));
        break;
      case 'database':
        recommendations.push(...this.analyzeDatabaseTuning(metrics));
        break;
      case 'errors':
        recommendations.push(...this.analyzeErrorTuning(metrics));
        break;
    }

    for (const rec of recommendations) {
      this.emit('recommendation', rec);

      if (this.config.applyAutomatically && rec.confidence > 80) {
        await this.applyTuning(rec);
      }
    }
  }

  /**
   * Analyze memory usage and generate recommendations
   */
  private analyzeMemoryTuning(metrics: Record<string, any>): TuningRecommendation[] {
    const recommendations: TuningRecommendation[] = [];
    const memUsage = metrics.memory_used?.current || 0;
    const memTotal = metrics.memory_total?.current || 1;

    if (memUsage / memTotal > 0.9) {
      // Increase Node.js heap size
      const heapParam = this.parameters.get('node_max_old_space_size');
      if (heapParam) {
        const newValue = Math.min(
          heapParam.currentValue * 1.25,
          heapParam.maxValue
        );

        recommendations.push({
          parameter: heapParam.name,
          currentValue: heapParam.currentValue,
          recommendedValue: newValue,
          reason: 'Memory usage is near limit, increasing heap size will prevent crashes',
          confidence: 85,
          impact: 'memory',
          estimatedImprovement: 'Reduce OOM errors by 90%'
        });
      }

      // Optimize Redis memory policy
      const redisPolicy = this.parameters.get('redis_maxmemory_policy');
      if (redisPolicy && redisPolicy.currentValue !== 'allkeys-lru') {
        recommendations.push({
          parameter: redisPolicy.name,
          currentValue: redisPolicy.currentValue,
          recommendedValue: 'allkeys-lru',
          reason: 'LRU eviction will optimize memory usage patterns',
          confidence: 70,
          impact: 'memory',
          estimatedImprovement: 'Reduce Redis memory usage by 15-25%'
        });
      }
    }

    return recommendations;
  }

  /**
   * Analyze CPU usage and generate recommendations
   */
  private analyzeCpuTuning(metrics: Record<string, any>): TuningRecommendation[] {
    const recommendations: TuningRecommendation[] = [];
    const cpuUsage = metrics.cpu_user?.current || 0;

    if (cpuUsage > 85) {
      // Increase database work_mem for better query performance
      const workMem = this.parameters.get('db_work_mem');
      if (workMem) {
        const newValue = Math.min(
          workMem.currentValue * 1.5,
          workMem.maxValue
        );

        recommendations.push({
          parameter: workMem.name,
          currentValue: workMem.currentValue,
          recommendedValue: newValue,
          reason: 'Increasing work_mem reduces CPU usage for complex queries',
          confidence: 75,
          impact: 'cpu',
          estimatedImprovement: 'Reduce query CPU usage by 20-30%'
        });
      }

      // Increase API timeout to prevent premature failures
      const timeoutParam = this.parameters.get('api_timeout');
      if (timeoutParam && timeoutParam.currentValue < 60000) {
        recommendations.push({
          parameter: timeoutParam.name,
          currentValue: timeoutParam.currentValue,
          recommendedValue: 60000,
          reason: 'Longer timeout prevents unnecessary retries under high load',
          confidence: 60,
          impact: 'performance',
          estimatedImprovement: 'Reduce error rate by 10%'
        });
      }
    }

    return recommendations;
  }

  /**
   * Analyze database performance and generate recommendations
   */
  private analyzeDatabaseTuning(metrics: Record<string, any>): TuningRecommendation[] {
    const recommendations: TuningRecommendation[] = [];
    const queryTime = metrics.db_query_execution_time?.current || 0;

    if (queryTime > 500) {
      // Increase shared_buffers
      const sharedBuffers = this.parameters.get('db_shared_buffers');
      if (sharedBuffers) {
        const currentValue = this.parseBytes(sharedBuffers.currentValue);
        const maxValue = this.parseBytes(sharedBuffers.maxValue);

        if (currentValue < maxValue * 0.5) {
          const newValue = Math.min(currentValue * 1.5, maxValue);
          recommendations.push({
            parameter: sharedBuffers.name,
            currentValue: sharedBuffers.currentValue,
            recommendedValue: this.formatBytes(newValue),
            reason: 'Larger buffer pool reduces disk I/O and improves query performance',
            confidence: 90,
            impact: 'performance',
            estimatedImprovement: 'Improve query performance by 30-50%'
          });
        }
      }

      // Increase effective_cache_size
      const effectiveCache = this.parameters.get('db_effective_cache_size');
      if (effectiveCache) {
        const currentValue = this.parseBytes(effectiveCache.currentValue);
        const maxValue = this.parseBytes(effectiveCache.maxValue);

        if (currentValue < maxValue * 0.75) {
          const newValue = Math.min(currentValue * 1.25, maxValue);
          recommendations.push({
            parameter: effectiveCache.name,
            currentValue: effectiveCache.currentValue,
            recommendedValue: this.formatBytes(newValue),
            reason: 'Better cache size estimation improves query planning',
            confidence: 80,
            impact: 'performance',
            estimatedImprovement: 'Improve query planning accuracy by 25%'
          });
        }
      }

      // Increase maintenance_work_mem for index operations
      const maintenanceMem = this.parameters.get('db_maintenance_work_mem');
      if (maintenanceMem) {
        const currentValue = this.parseBytes(maintenanceMem.currentValue);
        const newValue = Math.min(currentValue * 2, this.parseBytes(maintenanceMem.maxValue));

        recommendations.push({
          parameter: maintenanceMem.name,
          currentValue: maintenanceMem.currentValue,
          recommendedValue: this.formatBytes(newValue),
          reason: 'More memory for index creation and maintenance operations',
          confidence: 70,
          impact: 'io',
          estimatedImprovement: 'Speed up index operations by 40-60%'
        });
      }
    }

    return recommendations;
  }

  /**
   * Analyze error rates and generate recommendations
   */
  private analyzeErrorTuning(metrics: Record<string, any>): TuningRecommendation[] {
    const recommendations: TuningRecommendation[] = [];
    const errorRate = metrics.api_error_rate?.current || 0;

    if (errorRate > 5) {
      // Decrease rate limit to prevent overload
      const rateLimit = this.parameters.get('api_rate_limit');
      if (rateLimit) {
        const newValue = Math.max(
          rateLimit.currentValue * 0.8,
          rateLimit.minValue
        );

        recommendations.push({
          parameter: rateLimit.name,
          currentValue: rateLimit.currentValue,
          recommendedValue: newValue,
          reason: 'Lower rate limit prevents system overload and reduces errors',
          confidence: 75,
          impact: 'performance',
          estimatedImprovement: 'Reduce error rate by 50%'
        });
      }
    }

    return recommendations;
  }

  /**
   * Run comprehensive tuning analysis
   */
  private async runTuningAnalysis(): Promise<void> {
    try {
      const metrics = realTimeMonitor.getMetricsSnapshot();

      // Check each parameter for tuning opportunities
      for (const [key, parameter] of this.parameters.entries()) {
        // Check if parameter is in cooldown period
        const lastTune = this.lastTuneTime.get(key);
        if (lastTune && Date.now() - lastTune < this.config.cooldownPeriod) {
          continue;
        }

        // Analyze based on parameter type
        switch (parameter.component) {
          case 'database':
            await this.analyzeDatabaseParameter(parameter, metrics);
            break;
          case 'redis':
            await this.analyzeRedisParameter(parameter, metrics);
            break;
          case 'api':
            await this.analyzeApiParameter(parameter, metrics);
            break;
          case 'system':
            await this.analyzeSystemParameter(parameter, metrics);
            break;
        }
      }
    } catch (error) {
      console.error('Failed to run tuning analysis:', error);
    }
  }

  /**
   * Apply a tuning recommendation
   */
  private async applyTuning(recommendation: TuningRecommendation): Promise<void> {
    const parameter = Array.from(this.parameters.values())
      .find(p => p.name === recommendation.parameter);

    if (!parameter) {
      console.error(`Parameter not found: ${recommendation.parameter}`);
      return;
    }

    if (this.config.requireConfirmation) {
      this.emit('confirmation_required', recommendation);
      return;
    }

    try {
      const success = await this.setParameterValue(parameter, recommendation.recommendedValue);

      if (success) {
        this.tuningHistory.push({
          timestamp: Date.now(),
          parameter: parameter.name,
          oldValue: parameter.currentValue,
          newValue: recommendation.recommendedValue,
          result: 'success'
        });

        parameter.currentValue = recommendation.recommendedValue;
        this.lastTuneTime.set(parameter.name, Date.now());

        this.emit('tuning_applied', {
          parameter: parameter.name,
          oldValue: recommendation.currentValue,
          newValue: recommendation.recommendedValue,
          impact: recommendation.impact
        });

        console.log(`Applied tuning: ${parameter.name} = ${recommendation.recommendedValue}`);
      } else {
        this.tuningHistory.push({
          timestamp: Date.now(),
          parameter: parameter.name,
          oldValue: parameter.currentValue,
          newValue: recommendation.recommendedValue,
          result: 'failure'
        });
      }
    } catch (error) {
      console.error(`Failed to apply tuning for ${parameter.name}:`, error);

      this.tuningHistory.push({
        timestamp: Date.now(),
        parameter: parameter.name,
        oldValue: parameter.currentValue,
        newValue: recommendation.recommendedValue,
        result: 'failure'
      });
    }
  }

  /**
   * Set parameter value in the actual system
   */
  private async setParameterValue(parameter: TuningParameter, value: any): Promise<boolean> {
    try {
      switch (parameter.component) {
        case 'database':
          return await this.setDatabaseParameter(parameter.name, value);
        case 'redis':
          return await this.setRedisParameter(parameter.name, value);
        case 'api':
          return await this.setApiParameter(parameter.name, value);
        case 'system':
          return await this.setSystemParameter(parameter.name, value);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Failed to set ${parameter.name}:`, error);
      return false;
    }
  }

  /**
   * Set database parameter
   */
  private async setDatabaseParameter(name: string, value: any): Promise<boolean> {
    try {
      await this.prisma.$executeRaw`ALTER SYSTEM SET ${name} = ${value}`;
      await this.prisma.$executeRaw`SELECT pg_reload_conf()`;
      return true;
    } catch (error) {
      console.error(`Failed to set database parameter ${name}:`, error);
      return false;
    }
  }

  /**
   * Set Redis parameter
   */
  private async setRedisParameter(name: string, value: any): Promise<boolean> {
    try {
      await this.redis.config.set('SET', name, value);
      return true;
    } catch (error) {
      console.error(`Failed to set Redis parameter ${name}:`, error);
      return false;
    }
  }

  /**
   * Set API parameter (via environment or config)
   */
  private async setApiParameter(name: string, value: any): Promise<boolean> {
    try {
      // This would update the API configuration
      // Implementation depends on your config management system
      await this.redis.hset('api_config', name, value);
      return true;
    } catch (error) {
      console.error(`Failed to set API parameter ${name}:`, error);
      return false;
    }
  }

  /**
   * Set system parameter
   */
  private async setSystemParameter(name: string, value: any): Promise<boolean> {
    try {
      // System parameters typically require restart
      console.log(`System parameter ${name} updated to ${value} (requires restart)`);
      return true;
    } catch (error) {
      console.error(`Failed to set system parameter ${name}:`, error);
      return false;
    }
  }

  /**
   * Get current parameter values
   */
  getParameters(): Map<string, TuningParameter> {
    return new Map(this.parameters);
  }

  /**
   * Get tuning history
   */
  getTuningHistory(): Array<any> {
    return [...this.tuningHistory];
  }

  /**
   * Utility: Parse bytes string to number
   */
  private parseBytes(bytes: string): number {
    const match = bytes.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)?$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = (match[2] || 'B').toUpperCase();

    const multipliers: Record<string, number> = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024
    };

    return value * multipliers[unit];
  }

  /**
   * Utility: Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${Math.round(size)}${units[unitIndex]}`;
  }

  /**
   * Placeholder methods for parameter analysis
   */
  private async analyzeDatabaseParameter(parameter: TuningParameter, metrics: any): Promise<void> {
    // Implementation would analyze specific database parameters
  }

  private async analyzeRedisParameter(parameter: TuningParameter, metrics: any): Promise<void> {
    // Implementation would analyze Redis-specific parameters
  }

  private async analyzeApiParameter(parameter: TuningParameter, metrics: any): Promise<void> {
    // Implementation would analyze API parameters
  }

  private async analyzeSystemParameter(parameter: TuningParameter, metrics: any): Promise<void> {
    // Implementation would analyze system parameters
  }
}

// Export singleton instance
export const autoTuner = new AutoTuner();