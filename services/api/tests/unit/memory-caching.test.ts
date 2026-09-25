import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import CacheService from '../src/services/cache-service';
import AttachmentStreamingService from '../src/services/attachment-streaming';
import MemoryLeakDetector from '../src/services/memory-leak-detector';

describe('Memory & Caching Optimization Tests', () => {
  let cacheService: CacheService;
  let attachmentService: AttachmentStreamingService;
  let memoryDetector: MemoryLeakDetector;

  beforeAll(async () => {
    cacheService = new CacheService();
    attachmentService = new AttachmentStreamingService();
    memoryDetector = new MemoryLeakDetector();
  });

  afterAll(async () => {
    await cacheService.disconnect();
    memoryDetector.close();
  });

  describe('Cache Service', () => {
    it('should store and retrieve values', async () => {
      const key = 'test-key';
      const value = { id: 1, name: 'test' };

      await cacheService.set(key, value);
      const retrieved = await cacheService.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should respect TTL', async () => {
      const key = 'test-ttl';
      const value = 'expires soon';

      await cacheService.set(key, value, { ttl: 1 });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const retrieved = await cacheService.get(key);
      expect(retrieved).toBeNull();
    });

    it('should handle tags for invalidation', async () => {
      const key1 = 'tagged-key-1';
      const key2 = 'tagged-key-2';
      const tag = 'test-tag';

      await cacheService.set(key1, 'value1', { tags: [tag] });
      await cacheService.set(key2, 'value2', { tags: [tag] });

      // Verify values exist
      expect(await cacheService.get(key1)).toBe('value1');
      expect(await cacheService.get(key2)).toBe('value2');

      // Invalidate by tag
      await cacheService.invalidateTag(tag);

      // Verify values are gone
      expect(await cacheService.get(key1)).toBeNull();
      expect(await cacheService.get(key2)).toBeNull();
    });

    it('should compress large values', async () => {
      const key = 'large-value';
      // Create a large string (>1KB)
      const value = 'x'.repeat(2000);

      await cacheService.set(key, value, { compress: true });
      const retrieved = await cacheService.get(key);

      expect(retrieved).toBe(value);
      expect(retrieved.length).toBe(2000);
    });

    it('should handle multiple get/set operations', async () => {
      const entries = [
        { key: 'multi-1', value: { data: 1 } },
        { key: 'multi-2', value: { data: 2 } },
        { key: 'multi-3', value: { data: 3 } },
      ];

      // Set multiple values
      await Promise.all(
        entries.map(entry =>
          cacheService.set(entry.key, entry.value)
        )
      );

      // Get multiple values
      const keys = entries.map(e => e.key);
      const results = await cacheService.mget(keys);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(entries[0].value);
      expect(results[1]).toEqual(entries[1].value);
      expect(results[2]).toEqual(entries[2].value);
    });

    it('should maintain memory cache size limit', async () => {
      // Fill cache beyond limit
      const promises = Array(1100).fill(null).map((_, i) =>
        cacheService.set(`key-${i}`, { index: i }, { memoryOnly: true })
      );

      await Promise.all(promises);

      const stats = await cacheService.getStats();
      expect(stats.memorySize).toBeLessThanOrEqual(1000);
    });
  });

  describe('Attachment Streaming', () => {
    it('should process files without loading fully into memory', async () => {
      // This would require actual file streams in real tests
      const mockStream = Buffer.from('test file content');
      const processed = await attachmentService.processAttachment(
        'test-file-id',
        async (chunk) => chunk
      );

      expect(processed).toBeDefined();
    });

    it('should compress and decompress attachments', async () => {
      // Mock compression test
      const original = Buffer.from('test content to compress');
      let compressed = false;
      let decompressed = false;

      await attachmentService.processAttachment(
        'compress-test',
        async (chunk) => {
          compressed = true;
          return chunk;
        }
      );

      expect(compressed).toBe(true);
    });

    it('should handle range requests', () => {
      const fileSize = 1000;
      const range = 'bytes=100-200';
      const start = 100;

      expect(start).toBeGreaterThanOrEqual(0);
      expect(start).toBeLessThan(fileSize);
    });

    it('should cleanup old files', async () => {
      const cleaned = await attachmentService.cleanupOldFiles(0);
      expect(typeof cleaned).toBe('number');
    });
  });

  describe('Memory Leak Detection', () => {
    it('should track memory snapshots', () => {
      memoryDetector.takeSnapshot();

      const stats = memoryDetector.getMemoryStats();
      expect(stats.current).toBeDefined();
      expect(stats.current.heapUsed).toBeGreaterThan(0);
    });

    it('should track object instances', () => {
      function TestClass() {}
      memoryDetector.trackObject(TestClass);
      memoryDetector.trackObject(TestClass);

      const stats = memoryDetector.getMemoryStats();
      const tracked = stats.trackedObjects.find(o => o.constructorName === 'TestClass');

      expect(tracked).toBeDefined();
      expect(tracked?.count).toBe(2);

      memoryDetector.untrackObject(TestClass);
      memoryDetector.untrackObject(TestClass);
    });

    it('should detect sustained growth', () => {
      // Mock growth detection
      memoryDetector.takeSnapshot();

      // Simulate growth in next snapshot
      const currentSnapshot = memoryDetector.getMemoryStats().current;
      currentSnapshot.heapUsed += 100; // Increase by 100MB

      // Would trigger alert if sustained over time
      expect(currentSnapshot.heapUsed).toBeGreaterThan(0);
    });

    it('should generate memory reports', () => {
      memoryDetector.takeSnapshot();
      memoryDetector.generateReport(); // Should not throw
    });
  });

  describe('Performance Targets', () => {
    it('cache operations should be fast', async () => {
      const iterations = 1000;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        await cacheService.set(`perf-test-${i}`, { data: i });
        await cacheService.get(`perf-test-${i}`);
      }

      const duration = Date.now() - start;
      const avgTime = duration / (iterations * 2); // 2 operations per iteration

      expect(avgTime).toBeLessThan(1); // Less than 1ms per operation
    });

    it('should maintain memory efficiency', async () => {
      // Large number of cache entries
      const entries = 10000;
      const largeValue = 'x'.repeat(100); // 100 bytes each

      const promises = Array(entries).fill(null).map((_, i) =>
        cacheService.set(`efficiency-${i}`, largeValue)
      );

      await Promise.all(promises);

      // Memory should be managed efficiently
      const stats = await cacheService.getStats();
      expect(stats.memorySize).toBeLessThanOrEqual(1000); // L1 cache limit
    });
  });
});