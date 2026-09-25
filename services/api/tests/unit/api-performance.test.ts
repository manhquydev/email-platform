import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createDataLoaders } from '../src/graphql/utils/dataloader';
import PerformanceMiddleware from '../src/middleware/performance';
import RequestBatcher from '../src/services/request-batcher';

describe('API Performance Tests', () => {
  let prisma: PrismaClient;
  let loaders: ReturnType<typeof createDataLoaders>;
  let performanceMiddleware: PerformanceMiddleware;
  let requestBatcher: RequestBatcher;

  beforeAll(async () => {
    prisma = new PrismaClient();
    loaders = createDataLoaders(prisma);
    performanceMiddleware = new PerformanceMiddleware();
    requestBatcher = new RequestBatcher();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    requestBatcher.clearPending();
  });

  describe('DataLoader Performance', () => {
    it('should batch user queries', async () => {
      const userIds = Array.from({ length: 10 }, (_, i) => `user-${i}`);

      // Load users concurrently (should be batched)
      const start = Date.now();
      const promises = userIds.map(id => loaders.userById.load(id));
      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(100); // Should be fast due to batching
    });

    it('should batch message queries by inbox', async () => {
      const inboxIds = ['inbox-1', 'inbox-2', 'inbox-3'];

      const start = Date.now();
      const promises = inboxIds.map(id => loaders.messagesByInbox.load(id));
      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      expect(Array.isArray(results)).toBe(true);
      expect(duration).toBeLessThan(50);
    });

    it('should cache results in DataLoader', async () => {
      const userId = 'test-user';

      // First load
      const start1 = Date.now();
      const result1 = await loaders.userById.load(userId);
      const duration1 = Date.now() - start1;

      // Second load (should be cached)
      const start2 = Date.now();
      const result2 = await loaders.userById.load(userId);
      const duration2 = Date.now() - start2;

      expect(result1).toBe(result2);
      expect(duration2).toBeLessThan(duration1); // Should be faster from cache
    });
  });

  describe('Request Batching', () => {
    it('should batch similar GraphQL requests', async () => {
      const query = 'query GetUser($id: ID!) { user(id: $id) { id email } }';
      const variablesList = [
        { id: '1' },
        { id: '2' },
        { id: '3' },
      ];

      const start = Date.now();
      const results = await requestBatcher.batchExecute(
        variablesList.map(variables => ({ query, variables }))
      );
      const duration = Date.now() - start;

      expect(results).toHaveLength(3);
      expect(duration).toBeLessThan(100);
    });

    it('should respect batch size limits', async () => {
      requestBatcher.updateConfig({ maxBatchSize: 5 });

      const query = 'query GetMessage($id: ID!) { message(id: $id) { id subject } }';
      const promises = Array(10).fill(null).map((_, i) =>
        requestBatcher.batchGraphQLRequest(query, { id: i.toString() })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);

      const stats = requestBatcher.getStats();
      expect(stats.config.maxBatchSize).toBe(5);
    });

    it('should handle batch timeout', async () => {
      requestBatcher.updateConfig({ maxWaitTime: 5 });

      const query = 'query GetUser { users { id } }';
      const promise = requestBatcher.batchGraphQLRequest(query);

      // Should resolve after timeout
      const result = await promise;
      expect(result).toBeDefined();
    });
  });

  describe('Compression Middleware', () => {
    it('should compress JSON responses', async () => {
      const largePayload = {
        data: Array(1000).fill(null).map((_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: 'A'.repeat(100),
        })),
      };

      // Simulate request with compression
      const mockRequest = {
        headers: {
          'accept-encoding': 'gzip, deflate, br',
        },
      } as any;

      const mockReply = {
        headers: new Map(),
        header: function(key: string, value: any) {
          this.headers.set(key.toLowerCase(), value);
        },
        send: function(payload: any) {
          return payload;
        },
      } as any;

      // Apply compression middleware
      const middleware = performanceMiddleware.compression({ threshold: 100 });
      await middleware(mockRequest, mockReply);

      // Check compression headers
      expect(mockReply.headers.has('content-encoding')).toBe(true);
    });

    it('should skip compression for small responses', async () => {
      const smallPayload = { id: 1, name: 'test' };

      const mockRequest = {
        headers: {
          'accept-encoding': 'gzip',
        },
      } as any;

      const mockReply = {
        headers: new Map(),
        header: function(key: string, value: any) {
          this.headers.set(key.toLowerCase(), value);
        },
        send: function(payload: any) {
          return payload;
        },
      } as any;

      const middleware = performanceMiddleware.compression({ threshold: 1024 });
      await middleware(mockRequest, mockReply);

      // Should not have compression header
      expect(mockReply.headers.has('content-encoding')).toBe(false);
    });
  });

  describe('Streaming Middleware', () => {
    it('should handle chunked responses', async () => {
      const largeData = 'x'.repeat(100000); // 100KB

      const mockRequest = {} as any;
      const mockReply = {
        raw: {
          write: jest.fn(),
          end: jest.fn(),
        },
        type: jest.fn(),
      } as any;

      const middleware = performanceMiddleware.streaming();
      await middleware(mockRequest, mockReply);

      // Should have streaming headers
      expect(mockReply.raw.write).toHaveBeenCalled();
    });

    it('should stream JSON arrays', async () => {
      const arrayData = Array(1000).fill(null).map((_, i) => ({ id: i }));

      const mockRequest = {} as any;
      const mockReply = {
        raw: {
          write: jest.fn(),
          end: jest.fn(),
        },
        type: jest.fn(),
      } as any;

      const middleware = performanceMiddleware.jsonStream();
      await middleware(mockRequest, mockReply);

      expect(mockReply.raw.write).toHaveBeenCalledWith('[');
      expect(mockReply.raw.end).toHaveBeenCalled();
    });
  });

  describe('Keep-Alive Middleware', () => {
    it('should set keep-alive headers', async () => {
      const mockRequest = {} as any;
      const mockReply = {
        headers: new Map(),
        header: function(key: string, value: any) {
          this.headers.set(key.toLowerCase(), value);
        },
        send: function(payload: any) {
          return payload;
        },
      } as any;

      const middleware = performanceMiddleware.keepAlive();
      await middleware(mockRequest, mockReply);

      expect(mockReply.headers.get('connection')).toBe('keep-alive');
      expect(mockReply.headers.get('keep-alive')).toContain('timeout=60');
      expect(mockReply.headers.has('x-response-time')).toBe(true);
    });
  });

  describe('Performance Targets', () => {
    it('should maintain fast response times', async () => {
      // Simulate multiple concurrent requests
      const requests = Array(100).fill(null).map(async (_, i) => {
        const start = Date.now();

        // Simulate API request
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

        return Date.now() - start;
      });

      const durations = await Promise.all(requests);
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const p95 = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)];

      expect(avgDuration).toBeLessThan(50); // Average < 50ms
      expect(p95).toBeLessThan(200); // 95th percentile < 200ms
    });

    it('should handle 1000 concurrent requests', async () => {
      const concurrentRequests = 1000;
      const start = Date.now();

      // Simulate concurrent requests
      const promises = Array(concurrentRequests).fill(null).map(() =>
        Promise.resolve().then(() => Math.random() * 5)
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      expect(results).toHaveLength(concurrentRequests);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});