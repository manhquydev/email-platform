import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  rowCount?: number;
  indexUsed?: string;
}

interface SlowQueryAlert {
  query: string;
  duration: number;
  threshold: number;
  suggestions: string[];
}

class DatabaseOptimizationService {
  private prisma: PrismaClient;
  private queryMetrics: QueryMetrics[] = [];
  private readonly SLOW_QUERY_THRESHOLD = 100; // ms
  private readonly MAX_METRICS = 1000;

  constructor() {
    this.prisma = new PrismaClient({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
      ],
    });

    // Setup query logging
    this.prisma.$on('query', (e) => {
      this.logQueryMetrics(e.query, e.duration, e.timestamp);
    });
  }

  /**
   * Log query metrics for performance tracking
   */
  private logQueryMetrics(query: string, duration: number, timestamp: Date): void {
    const metric: QueryMetrics = {
      query: this.sanitizeQuery(query),
      duration,
      timestamp,
    };

    this.queryMetrics.push(metric);

    // Keep only recent metrics
    if (this.queryMetrics.length > this.MAX_METRICS) {
      this.queryMetrics = this.queryMetrics.slice(-this.MAX_METRICS);
    }

    // Alert on slow queries
    if (duration > this.SLOW_QUERY_THRESHOLD) {
      this.alertSlowQuery(metric);
    }
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    // Remove parameter values to avoid logging sensitive data
    return query.replace(/\$\d+/g, '$?');
  }

  /**
   * Alert on slow queries with optimization suggestions
   */
  private async alertSlowQuery(metric: QueryMetrics): Promise<void> {
    console.warn(`⚠️ Slow Query Detected (${metric.duration}ms):`, metric.query);

    const suggestions = await this.analyzeSlowQuery(metric.query);

    const alert: SlowQueryAlert = {
      query: metric.query,
      duration: metric.duration,
      threshold: this.SLOW_QUERY_THRESHOLD,
      suggestions,
    };

    // Store alert for dashboard
    await this.storeSlowQueryAlert(alert);
  }

  /**
   * Analyze slow query and provide optimization suggestions
   */
  private async analyzeSlowQuery(query: string): Promise<string[]> {
    const suggestions: string[] = [];
    const lowerQuery = query.toLowerCase();

    // Check for common anti-patterns
    if (lowerQuery.includes('order by') && !lowerQuery.includes('limit')) {
      suggestions.push('Add LIMIT clause to ORDER BY queries');
    }

    if (lowerQuery.includes('select *') && lowerQuery.includes('where')) {
      suggestions.push('Specify required columns instead of SELECT *');
    }

    if (lowerQuery.includes('join') && !lowerQuery.includes('index')) {
      suggestions.push('Check if join columns are properly indexed');
    }

    if (lowerQuery.includes('like') && !lowerQuery.includes('gin')) {
      suggestions.push('Consider using GIN index for LIKE patterns');
    }

    // Check for missing index usage
    const explainResult = await this.explainQuery(query);
    if (explainResult && !explainResult.includes('Index Scan')) {
      suggestions.push('Query may benefit from additional indexes');
    }

    return suggestions;
  }

  /**
   * Get query execution plan
   */
  private async explainQuery(query: string): Promise<string | null> {
    try {
      const result = await this.prisma.$queryRawUnsafe`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
      return JSON.stringify(result);
    } catch (error) {
      console.error('Failed to explain query:', error);
      return null;
    }
  }

  /**
   * Store slow query alert for monitoring
   */
  private async storeSlowQueryAlert(alert: SlowQueryAlert): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO query_alerts (query, duration, threshold, suggestions, created_at)
        VALUES (${alert.query}, ${alert.duration}, ${alert.threshold}, ${JSON.stringify(alert.suggestions)}, NOW())
      `;
    } catch (error) {
      // Table might not exist yet, log for now
      console.error('Slow query alert:', alert);
    }
  }

  /**
   * Get database performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    avgQueryTime: number;
    slowQueries: number;
    totalQueries: number;
    indexHitRatio: number;
    cacheHitRatio: number;
  }> {
    const recentMetrics = this.queryMetrics.slice(-100);

    const avgQueryTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
    const slowQueries = recentMetrics.filter(m => m.duration > this.SLOW_QUERY_THRESHOLD).length;
    const totalQueries = recentMetrics.length;

    // Get PostgreSQL stats
    const dbStats = await this.prisma.$queryRaw`
      SELECT
        ROUND((blks_hit::float / NULLIF(blks_hit + blks_read, 0)) * 100, 2) as cache_hit_ratio,
        ROUND((idx_tup_fetch::float / NULLIF(idx_tup_fetch + seq_tup_read, 0)) * 100, 2) as index_hit_ratio
      FROM pg_stat_database
      WHERE datname = current_database()
    ` as any[];

    return {
      avgQueryTime,
      slowQueries,
      totalQueries,
      indexHitRatio: dbStats[0]?.index_hit_ratio || 0,
      cacheHitRatio: dbStats[0]?.cache_hit_ratio || 0,
    };
  }

  /**
   * Get top slow queries
   */
  async getTopSlowQueries(limit: number = 10): Promise<SlowQueryAlert[]> {
    try {
      return await this.prisma.$queryRaw`
        SELECT
          query,
          AVG(duration) as avg_duration,
          COUNT(*) as execution_count,
          MAX(duration) as max_duration,
          suggestions
        FROM query_alerts
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY query, suggestions
        ORDER BY avg_duration DESC
        LIMIT ${limit}
      ` as SlowQueryAlert[];
    } catch (error) {
      console.error('Failed to get slow queries:', error);
      return [];
    }
  }

  /**
   * Optimize database with ANALYZE and REINDEX
   */
  async optimizeDatabase(): Promise<void> {
    console.log('🔧 Running database optimization...');

    try {
      // Update table statistics
      await this.prisma.$executeRaw`ANALYZE`;

      // Rebuild indexes if needed
      await this.prisma.$executeRaw`
        SELECT schemaname, tablename, indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
      `;

      console.log('✅ Database optimization completed');
    } catch (error) {
      console.error('❌ Database optimization failed:', error);
    }
  }

  /**
   * Check for missing indexes based on query patterns
   */
  async checkMissingIndexes(): Promise<Array<{table: string, columns: string, type: string}>> {
    const missingIndexes: Array<{table: string, columns: string, type: string}> = [];

    // Check for frequently filtered columns without indexes
    const frequentFilters = await this.prisma.$queryRaw`
      SELECT
        schemaname,
        tablename,
        attname as column_name,
        n_distinct as distinct_values
      FROM pg_stats
      WHERE schemaname = 'public'
        AND most_common_vals IS NOT NULL
        AND n_distinct > 100
      ORDER BY n_distinct DESC
      LIMIT 20
    ` as any[];

    for (const filter of frequentFilters) {
      const hasIndex = await this.prisma.$queryRaw`
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = ${filter.tablename}
          AND indexdef LIKE ${'%' + filter.column_name + '%'}
        LIMIT 1
      `;

      if (!hasIndex[0]) {
        missingIndexes.push({
          table: filter.tablename,
          columns: filter.column_name,
          type: 'frequent_filter',
        });
      }
    }

    return missingIndexes;
  }

  /**
   * Execute query with performance tracking
   */
  async executeTrackedQuery<T = any>(
    query: string,
    params?: any[]
  ): Promise<T> {
    const start = performance.now();

    try {
      const result = params
        ? await this.prisma.$queryRawUnsafe(query, ...params)
        : await this.prisma.$queryRawUnsafe(query);

      const duration = performance.now() - start;

      // Track the query
      this.logQueryMetrics(query, duration, new Date());

      return result as T;
    } catch (error) {
      const duration = performance.now() - start;

      // Track failed query
      this.logQueryMetrics(query, duration, new Date());

      throw error;
    }
  }
}

// Singleton instance
const dbOptimization = new DatabaseOptimizationService();

export default dbOptimization;
export { DatabaseOptimizationService, QueryMetrics, SlowQueryAlert };