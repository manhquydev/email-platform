import { PrismaClient } from '@prisma/client';

interface ConnectionConfig {
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  maxLifetime: number;
}

/**
 * Optimized database connection manager
 * Implements connection pooling, retry logic, and performance monitoring
 */
class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private prisma: PrismaClient;
  private config: ConnectionConfig;

  private constructor() {
    this.config = {
      maxConnections: 25,
      connectionTimeout: 10000,
      idleTimeout: 30000,
      maxLifetime: 3600000, // 1 hour
    };

    this.prisma = new PrismaClient({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: this.buildConnectionString(),
        },
      },
      // Optimize for transaction pooling with PgBouncer
      transactionOptions: {
        timeout: 5000,
        useIsolationLevels: true,
      },
    });
  }

  public static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  /**
   * Build optimized connection string
   */
  private buildConnectionString(): string {
    const base = process.env.DATABASE_URL || process.env.DATABASE_POOL_URL;
    if (!base) {
      throw new Error('Database URL not configured');
    }

    // Add performance parameters
    const params = new URLSearchParams({
      connection_limit: this.config.maxConnections.toString(),
      pool_timeout: (this.config.connectionTimeout / 1000).toString(),
      connect_timeout: '10',
      statement_timeout: '30000',
      query_timeout: '30000',
    });

    return `${base}?${params.toString()}`;
  }

  /**
   * Get Prisma client instance
   */
  public getPrisma(): PrismaClient {
    return this.prisma;
  }

  /**
   * Execute a transaction with retry logic
   */
  async executeTransaction<T>(
    callback: (tx: PrismaClient) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.prisma.$transaction(callback, {
          timeout: 10000,
          isolationLevel: 'ReadCommitted',
        });
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        if (this.isRetryableError(error) && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          console.warn(`Transaction failed (attempt ${attempt}), retrying in ${delay}ms:`, error.message);
          await this.sleep(delay);
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableCodes = [
      '40001', // Serialization failure
      '40P01', // Deadlock detected
      '53300', // Too many connections
      '53000', // Insufficient resources
      '08006', // Connection failure
      '08001', // SQL client unable to establish connection
    ];

    return retryableCodes.some(code => error.code === code);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number; error?: string }> {
    const start = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;

      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
        error: error.message,
      };
    }
  }

  /**
   * Get connection pool statistics
   */
  async getConnectionStats(): Promise<{
    active: number;
    idle: number;
    total: number;
    utilization: number;
  }> {
    try {
      // Query PgBouncer stats if available
      const result = await this.prisma.$queryRaw`
        SELECT
          COUNT(*) FILTER (WHERE state = 'active') as active,
          COUNT(*) FILTER (WHERE state = 'idle') as idle,
          COUNT(*) as total
        FROM pg_stat_activity
        WHERE datname = current_database()
      ` as any[];

      const stats = result[0] || { active: 0, idle: 0, total: 0 };
      const utilization = (stats.active / this.config.maxConnections) * 100;

      return {
        active: stats.active,
        idle: stats.idle,
        total: stats.total,
        utilization: Math.round(utilization * 100) / 100,
      };
    } catch (error) {
      console.error('Failed to get connection stats:', error);
      return {
        active: 0,
        idle: 0,
        total: 0,
        utilization: 0,
      };
    }
  }

  /**
   * Close all connections
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  /**
   * Warm up connection pool
   */
  async warmupPool(): Promise<void> {
    try {
      // Pre-warm with a few simple queries
      const promises = Array(5).fill(null).map(() =>
        this.prisma.$queryRaw`SELECT 1`
      );

      await Promise.all(promises);
      console.log('✅ Database connection pool warmed up');
    } catch (error) {
      console.error('❌ Failed to warm up connection pool:', error);
    }
  }
}

// Export singleton instance
export default DatabaseConnectionManager.getInstance();

// Export class for testing
export { DatabaseConnectionManager };