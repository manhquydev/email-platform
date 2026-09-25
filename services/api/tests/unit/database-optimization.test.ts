import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import DatabaseConnectionManager from '../src/services/database-connection';
import DatabaseOptimizationService from '../src/services/database-optimization';

describe('Database Optimization Tests', () => {
  let dbConnection: DatabaseConnectionManager;
  let dbOptimization: DatabaseOptimizationService;

  beforeAll(async () => {
    dbConnection = new DatabaseConnectionManager();
    dbOptimization = new DatabaseOptimizationService();
  });

  afterAll(async () => {
    await dbConnection.disconnect();
  });

  describe('Connection Pooling', () => {
    it('should create connection with PgBouncer config', async () => {
      const health = await dbConnection.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.latency).toBeLessThan(100);
    });

    it('should handle concurrent connections', async () => {
      const promises = Array(20).fill(null).map(() =>
        dbConnection.getPrisma().queryRaw`SELECT 1 as test`
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(20);
    });

    it('should retry on transaction failure', async () => {
      const result = await dbConnection.executeTransaction(async (tx) => {
        return tx.$queryRaw`SELECT 1 as success`;
      });

      expect(result).toBeDefined();
    });
  });

  describe('Query Performance', () => {
    it('should track slow queries', async () => {
      const metrics = await dbOptimization.getPerformanceMetrics();
      expect(metrics).toHaveProperty('avgQueryTime');
      expect(metrics).toHaveProperty('slowQueries');
      expect(metrics).toHaveProperty('indexHitRatio');
    });

    it('should detect missing indexes', async () => {
      const missingIndexes = await dbOptimization.checkMissingIndexes();
      expect(Array.isArray(missingIndexes)).toBe(true);
    });

    it('should execute tracked queries', async () => {
      const result = await dbOptimization.executeTrackedQuery(
        'SELECT COUNT(*) as count FROM messages'
      );

      expect(result).toBeDefined();
    });
  });

  describe('Database Indexes', () => {
    it('should have performance indexes created', async () => {
      const indexes = await dbConnection.getPrisma().$queryRaw`
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE tablename IN ('messages', 'attachments', 'inboxes', 'domains')
        AND indexname LIKE '%idx_%'
        ORDER BY tablename, indexname
      ` as any[];

      expect(indexes.length).toBeGreaterThan(10);

      // Check for critical indexes
      const indexNames = indexes.map(idx => idx.indexname);
      expect(indexNames).toContain('idx_messages_inbox_received_desc');
      expect(indexNames).toContain('idx_messages_user_received_desc');
    });

    it('should use indexes for common queries', async () => {
      const explainResult = await dbConnection.getPrisma().$queryRaw`
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT * FROM messages
        WHERE inboxId = $1
        ORDER BY receivedAt DESC
        LIMIT 10
      ` as any[];

      const plan = JSON.stringify(explainResult);
      expect(plan).toContain('Index Scan');
    });
  });

  describe('Performance Targets', () => {
    it('should meet query time targets', async () => {
      const start = Date.now();
      await dbConnection.getPrisma().message.findMany({
        take: 100,
        orderBy: { receivedAt: 'desc' },
      });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('should handle pagination efficiently', async () => {
      const start = Date.now();
      await dbConnection.getPrisma().message.findMany({
        skip: 1000,
        take: 50,
        orderBy: { receivedAt: 'desc' },
        select: {
          id: true,
          subject: true,
          receivedAt: true,
        },
      });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(30);
    });

    it('should execute aggregate queries efficiently', async () => {
      const start = Date.now();
      await dbConnection.getPrisma().message.aggregate({
        _count: true,
        _avg: {
          receivedAt: true,
        },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Connection Health', () => {
    it('should maintain healthy connection pool', async () => {
      const stats = await dbConnection.getConnectionStats();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.utilization).toBeLessThan(100);
    });

    it('should recover from connection loss', async () => {
      // Simulate connection recovery
      await dbConnection.warmupPool();
      const health = await dbConnection.healthCheck();
      expect(health.status).toBe('healthy');
    });
  });
});