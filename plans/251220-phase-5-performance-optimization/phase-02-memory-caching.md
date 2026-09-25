# Phase 2: Memory & Caching Optimization
**Timeline:** Week 3-4 (3 - 16 Jan 2026)
**Priority:** Critical
**Impact:** High - reduces memory usage and improves response times

## Objectives

1. Implement Redis caching layer for frequent queries
2. Fix memory leaks in email worker
3. Add streaming for large file downloads
4. Implement query result caching
5. Optimize memory usage in attachment handling

## Success Metrics

- [ ] Memory usage reduced by 50% (from 512MB to 256MB average)
- [ ] Cache hit ratio >80% for frequent queries
- [ ] Large file downloads use streaming (no full memory load)
- [ ] No memory leaks under sustained load
- [ ] Attachment processing memory <100MB per file

## Implementation Steps

### 2.1 Redis Cache Service Implementation

**File:** `services/api/src/services/cacheService.ts`

```typescript
import Redis from 'ioredis';
import { createHash } from 'crypto';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // For cache invalidation
  compress?: boolean; // Compress large values
}

interface CacheEntry<T> {
  data: T;
  expires: number;
  tags: string[];
  compressed: boolean;
}

export class CacheService {
  private redis: Redis;
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly MEMORY_CACHE_SIZE = 1000;
  private readonly MEMORY_CACHE_TTL = 60000; // 1 minute

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    // Set up error handling
    this.redis.on('error', (error) => {
      console.error('Redis error:', error);
    });

    // Clean expired memory cache entries every minute
    setInterval(() => this.cleanMemoryCache(), 60000);
  }

  private cleanMemoryCache() {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expires < now) {
        this.memoryCache.delete(key);
      }
    }

    // Limit memory cache size
    if (this.memoryCache.size > this.MEMORY_CACHE_SIZE) {
      const entries = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].expires - b[1].expires);

      const toDelete = entries.slice(0, this.memoryCache.size - this.MEMORY_CACHE_SIZE);
      toDelete.forEach(([key]) => this.memoryCache.delete(key));
    }
  }

  private generateKey(namespace: string, ...parts: (string | number)[]): string {
    const key = `${namespace}:${parts.join(':')}`;
    return createHash('md5').update(key).digest('hex');
  }

  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memEntry = this.memoryCache.get(key);
    if (memEntry && memEntry.expires > Date.now()) {
      return memEntry.data;
    }

    try {
      // Check Redis
      const cached = await this.redis.get(key);
      if (cached) {
        const entry: CacheEntry<T> = JSON.parse(cached);

        // Update memory cache
        this.memoryCache.set(key, {
          ...entry,
          expires: Date.now() + this.MEMORY_CACHE_TTL
        });

        return entry.data;
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }

    return null;
  }

  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const ttl = options.ttl || 300; // Default 5 minutes
    const tags = options.tags || [];

    const entry: CacheEntry<T> = {
      data,
      expires: Date.now() + (ttl * 1000),
      tags,
      compressed: options.compress || false
    };

    try {
      // Set in Redis
      const serialized = JSON.stringify(entry);
      if (options.compress && serialized.length > 1024) {
        // Compress large values
        const compressed = await this.compress(serialized);
        await this.redis.setex(key, ttl, compressed);
      } else {
        await this.redis.setex(key, ttl, serialized);
      }

      // Store in memory cache
      this.memoryCache.set(key, {
        ...entry,
        expires: Date.now() + this.MEMORY_CACHE_TTL
      });

      // Index by tags for invalidation
      if (tags.length > 0) {
        await this.indexByTags(key, tags, ttl);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(`*${pattern}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      // Also remove from memory cache
      for (const key of this.memoryCache.keys()) {
        if (key.includes(pattern)) {
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    try {
      const tagKey = `tag:${tag}`;
      const keys = await this.redis.smembers(tagKey);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        await this.redis.del(tagKey);
      }

      // Remove from memory cache
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.tags.includes(tag)) {
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      console.error('Cache invalidate by tag error:', error);
    }
  }

  private async indexByTags(key: string, tags: string[], ttl: number): Promise<void> {
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      await this.redis.sadd(tagKey, key);
      await this.redis.expire(tagKey, ttl);
    }
  }

  private async compress(data: string): Promise<string> {
    // Simple compression - replace with zlib in production
    return data;
  }

  private async decompress(data: string): Promise<string> {
    // Simple decompression - replace with zlib in production
    return data;
  }

  // Helper methods for specific cache types
  async getInboxMessages(inboxId: string, query: any): Promise<any[] | null> {
    const key = this.generateKey('messages', inboxId, JSON.stringify(query));
    return this.get(key);
  }

  async setInboxMessages(inboxId: string, query: any, messages: any[], ttl = 60): Promise<void> {
    const key = this.generateKey('messages', inboxId, JSON.stringify(query));
    await this.set(key, messages, { ttl, tags: [`inbox:${inboxId}`] });
  }

  async getUserStats(userId: string): Promise<any | null> {
    const key = this.generateKey('stats', 'user', userId);
    return this.get(key);
  }

  async setUserStats(userId: string, stats: any): Promise<void> {
    const key = this.generateKey('stats', 'user', userId);
    await this.set(key, stats, { ttl: 300, tags: [`user:${userId}`] });
  }

  async getSearchResults(query: string): Promise<any[] | null> {
    const key = this.generateKey('search', query);
    return this.get(key);
  }

  async setSearchResults(query: string, results: any[]): Promise<void> {
    const key = this.generateKey('search', query);
    await this.set(key, results, { ttl: 300, tags: ['search'] });
  }
}

export const cacheService = new CacheService();
```

### 2.2 Fix Email Worker Memory Leaks

**File:** `services/api/src/worker.ts`

```typescript
import fs from 'fs';
import { simpleParser } from 'mailparser';
import { ParsedMail } from 'mailparser';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';

// BEFORE - Memory inefficient
const rawContent = await fs.readFile(rawPath);
const mail: ParsedMail = await simpleParser(rawContent);

// AFTER - Memory efficient streaming
async function parseEmailStreaming(filePath: string): Promise<ParsedMail> {
  const stats = await fs.stat(filePath);

  if (stats.size > 10 * 1024 * 1024) { // 10MB threshold
    // Process large emails using streaming
    const readStream = fs.createReadStream(filePath);
    const mail = await simpleParser(readStream);
    return mail;
  } else {
    // Small emails can be read normally
    const rawContent = await fs.readFile(filePath);
    return await simpleParser(rawContent);
  }
}

// Memory-efficient attachment processing
async function processAttachments(attachments: any[]) {
  const MAX_CONCURRENT = 5;
  const chunks: any[][] = [];

  // Process attachments in batches to limit memory usage
  for (let i = 0; i < attachments.length; i += MAX_CONCURRENT) {
    chunks.push(attachments.slice(i, i + MAX_CONCURRENT));
  }

  for (const chunk of chunks) {
    await Promise.all(chunk.map(async (attachment) => {
      try {
        const stats = await fs.stat(attachment.path);

        if (stats.size > 50 * 1024 * 1024) { // 50MB threshold
          // Stream large attachments
          await processLargeAttachment(attachment);
        } else {
          // Process small attachments normally
          await processSmallAttachment(attachment);
        }
      } catch (error) {
        console.error('Attachment processing error:', error);
      }
    }));
  }
}

async function processLargeAttachment(attachment: any) {
  const readStream = fs.createReadStream(attachment.path);
  const writeStream = fs.createWriteStream(`/tmp/processing/${attachment.filename}`);

  // Transform stream to process data in chunks
  const processor = new Transform({
    transform(chunk: Buffer, encoding, callback) {
      // Process chunk without accumulating
      this.push(chunk);
      callback();
    }
  });

  await pipeline(readStream, processor, writeStream);

  // Update database with processed file location
  await updateAttachmentRecord(attachment.id, {
    processed: true,
    size: attachment.size,
    processedAt: new Date()
  });
}

// Clean up temporary files
async function cleanupTempFiles() {
  const tempDir = '/tmp/processing';
  const files = await fs.readdir(tempDir);

  for (const file of files) {
    const filePath = `${tempDir}/${file}`;
    const stats = await fs.stat(filePath);

    // Delete files older than 1 hour
    if (Date.now() - stats.mtime.getTime() > 3600000) {
      await fs.unlink(filePath).catch(console.error);
    }
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupTempFiles, 1800000);
```

### 2.3 Streaming File Downloads

**File:** `services/api/src/routes/messages.ts`

```typescript
// BEFORE - Loads entire file into memory
router.get('/:messageId/attachments/:attachmentId/download', async (request, reply) => {
  const { attachmentId } = request.params;

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId }
  });

  const streamOrBlob = await storageService.getReadStream(attachment.storageKey);
  let content: string;

  if (streamOrBlob instanceof Blob) {
    const buffer = Buffer.from(await streamOrBlob.arrayBuffer());
    content = buffer.toString("base64");
  } else {
    const chunks: Buffer[] = [];
    for await (const chunk of streamOrBlob) {
      chunks.push(Buffer.from(chunk));
    }
    content = Buffer.concat(chunks).toString("base64");
  }

  return reply.send(content);
});

// AFTER - Streaming with range support
router.get('/:messageId/attachments/:attachmentId/download', {
  preHandler: [authOptional]
}, async (request, reply) => {
  const { attachmentId } = request.params;
  const range = request.headers.range;

  // Get attachment info
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId, deletedAt: null },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      size: true,
      storageKey: true
    }
  });

  if (!attachment) {
    reply.status(404).send({ error: 'Attachment not found' });
    return;
  }

  try {
    const stream = await storageService.getReadStream(attachment.storageKey);
    const fileSize = attachment.size;

    // Set headers
    reply.header('Content-Type', attachment.mimeType || 'application/octet-stream');
    reply.header('Content-Disposition', `attachment; filename="${attachment.filename}"`);
    reply.header('Accept-Ranges', 'bytes');

    if (range) {
      // Handle range request
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Validate range
      if (start >= fileSize || end >= fileSize || start > end) {
        reply.status(416).send({ error: 'Requested range not satisfiable' });
        return;
      }

      const chunkSize = (end - start) + 1;

      reply.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      reply.header('Content-Length', chunkSize);
      reply.status(206); // Partial Content

      // Create stream for range
      const readable = fs.createReadStream(attachment.storageKey, { start, end });
      return reply.send(readable);
    } else {
      // Full file
      reply.header('Content-Length', fileSize);
      reply.status(200);

      if (stream instanceof ReadStream) {
        return reply.send(stream);
      } else {
        // Handle blob response by streaming
        const buffer = Buffer.from(await stream.arrayBuffer());
        return reply.send(buffer);
      }
    }
  } catch (error) {
    console.error('Download error:', error);
    reply.status(500).send({ error: 'Failed to download attachment' });
  }
});
```

### 2.4 Cached Message Service

**File:** `services/api/src/services/messageService.ts`

```typescript
import { cacheService } from './cacheService';

export class MessageService {
  private readonly CACHE_TTL = {
    messages: 60, // 1 minute
    message: 300, // 5 minutes
    inbox_count: 30, // 30 seconds
    user_stats: 300 // 5 minutes
  };

  async getInboxMessages(
    inboxId: string,
    options: {
      limit?: number;
      offset?: number;
      query?: string;
    } = {}
  ) {
    const { limit = 50, offset = 0, query } = options;

    // Try cache first
    const cacheKey = JSON.stringify({ limit, offset, query });
    const cached = await cacheService.getInboxMessages(inboxId, cacheKey);

    if (cached) {
      return cached;
    }

    // Build query
    const whereClause: any = {
      inboxId,
      deletedAt: null
    };

    if (query) {
      whereClause.searchVector = {
        search: to_tsquery('english', query.split(' ').join(' & '))
      };
    }

    // Execute with explicit select to reduce data
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: whereClause,
        select: {
          id: true,
          subject: true,
          fromAddress: true,
          toAddress: true,
          receivedAt: true,
          readAt: true,
          hasAttachments: true,
          size: true,
          attachments: {
            where: { deletedAt: null },
            select: {
              id: true,
              filename: true,
              mimeType: true,
              size: true
            }
          }
        },
        orderBy: { receivedAt: 'desc' },
        take: Math.min(limit, 100),
        skip: offset
      }),
      prisma.message.count({ where: whereClause })
    ]);

    const result = {
      messages,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + messages.length < total
      }
    };

    // Cache the result
    await cacheService.setInboxMessages(inboxId, cacheKey, messages, this.CACHE_TTL.messages);

    return result;
  }

  async getMessage(messageId: string, userId: string) {
    // Try cache
    const cacheKey = this.generateKey('message', messageId);
    const cached = await cacheService.get(cacheKey);

    if (cached && cached.inbox?.userId === userId) {
      return cached;
    }

    // Fetch from database with minimal fields
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        inbox: {
          userId
        },
        deletedAt: null
      },
      select: {
        id: true,
        subject: true,
        fromAddress: true,
        toAddress: true,
        ccAddress: true,
        bccAddress: true,
        textBody: true,
        htmlBody: true,
        receivedAt: true,
        readAt: true,
        size: true,
        headers: true,
        inbox: {
          select: {
            id: true,
            address: true,
            domain: {
              select: {
                name: true
              }
            }
          }
        },
        attachments: {
          where: { deletedAt: null },
          select: {
            id: true,
            filename: true,
            mimeType: true,
            size: true,
            storageKey: true
          }
        }
      }
    });

    if (message) {
      // Cache for longer period
      await cacheService.set(cacheKey, message, {
        ttl: this.CACHE_TTL.message,
        tags: [`message:${messageId}`, `inbox:${message.inbox.id}`]
      });
    }

    return message;
  }

  async markMessageRead(messageId: string, userId: string) {
    const message = await prisma.message.updateMany({
      where: {
        id: messageId,
        inbox: {
          userId
        },
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });

    // Invalidate caches
    await cacheService.invalidateByTag(`message:${messageId}`);
    await cacheService.invalidate(`inbox:*`);

    return message.count > 0;
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await prisma.message.updateMany({
      where: {
        id: messageId,
        inbox: {
          userId
        },
        deletedAt: null
      },
      data: {
        deletedAt: new Date()
      }
    });

    if (message.count > 0) {
      // Invalidate all related caches
      await Promise.all([
        cacheService.invalidateByTag(`message:${messageId}`),
        cacheService.invalidate(`messages:*`),
        cacheService.invalidateByTag(`inbox:*`),
        cacheService.invalidateByTag(`user:${userId}`)
      ]);
    }

    return message.count > 0;
  }

  async getInboxCount(inboxId: string) {
    const cacheKey = this.generateKey('count', 'inbox', inboxId);
    const cached = await cacheService.get(cacheKey);

    if (cached !== null) {
      return cached;
    }

    const count = await prisma.message.count({
      where: {
        inboxId,
        deletedAt: null,
        readAt: null
      }
    });

    // Cache for short period
    await cacheService.set(cacheKey, count, {
      ttl: this.CACHE_TTL.inbox_count,
      tags: [`inbox:${inboxId}`]
    });

    return count;
  }

  private generateKey(...parts: string[]) {
    return parts.join(':');
  }
}

export const messageService = new MessageService();
```

### 2.5 Memory Usage Monitoring

**File:** `services/api/src/middleware/memoryMonitor.ts`

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';

interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  timestamp: number;
}

const MEMORY_THRESHOLD = 500 * 1024 * 1024; // 500MB
const WARNING_THRESHOLD = 400 * 1024 * 1024; // 400MB

export function memoryMonitorPlugin(instance: any) {
  instance.addHook('onRequest', async (request: FastifyRequest) => {
    request.memoryStart = process.memoryUsage();
  });

  instance.addHook('onResponse', async (request: FastifyRequest) => {
    const memoryEnd = process.memoryUsage();
    const memoryStart = (request as any).memoryStart;

    if (memoryStart && memoryEnd.heapUsed > memoryStart.heapUsed + 10 * 1024 * 1024) {
      // Memory increased by more than 10MB in this request
      console.warn(`High memory usage in request ${request.url}`, {
        start: `${Math.round(memoryStart.heapUsed / 1024 / 1024)}MB`,
        end: `${Math.round(memoryEnd.heapUsed / 1024 / 1024)}MB`,
        increase: `${Math.round((memoryEnd.heapUsed - memoryStart.heapUsed) / 1024 / 1024)}MB`
      });
    }
  });
}

// Periodic memory monitoring
function monitorMemory() {
  const memory = process.memoryUsage();

  if (memory.heapUsed > MEMORY_THRESHOLD) {
    console.error('CRITICAL: Memory usage exceeded threshold', {
      heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memory.external / 1024 / 1024)}MB`,
      rss: `${Math.round(memory.rss / 1024 / 1024)}MB`
    });

    // Force garbage collection if available
    if (global.gc) {
      console.log('Forcing garbage collection...');
      global.gc();
    }
  } else if (memory.heapUsed > WARNING_THRESHOLD) {
    console.warn('WARNING: High memory usage detected', {
      heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`
    });
  }
}

// Monitor every 30 seconds
setInterval(monitorMemory, 30000);

// Export for health checks
export function getMemoryStats(): MemoryStats {
  return {
    ...process.memoryUsage(),
    timestamp: Date.now()
  };
}
```

### 2.6 Redis Cache Health Check

**File:** `services/api/src/routes/health.ts` (update)

```typescript
// Add to health check
router.get('/ready', async (request, reply) => {
  const checks: any = {
    status: 'ready',
    timestamp: new Date().toISOString(),
    database: 'unknown',
    cache: 'unknown',
    memory: 'unknown'
  };

  try {
    // Database check (existing)
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbTime = Date.now() - dbStart;
    checks.database = dbTime < 50 ? 'healthy' : dbTime < 100 ? 'degraded' : 'unhealthy';
    checks.databaseLatency = `${dbTime}ms`;

    // Cache check
    const cacheStart = Date.now();
    await cacheService.set('health-check', { timestamp: Date.now() }, { ttl: 10 });
    const cacheResult = await cacheService.get('health-check');
    const cacheTime = Date.now() - cacheStart;

    if (cacheResult && cacheResult.timestamp) {
      checks.cache = cacheTime < 10 ? 'healthy' : 'degraded';
    } else {
      checks.cache = 'unhealthy';
    }
    checks.cacheLatency = `${cacheTime}ms`;

    // Memory check
    const memory = process.memoryUsage();
    const memoryPercent = (memory.heapUsed / memory.heapTotal) * 100;

    if (memoryPercent < 70) {
      checks.memory = 'healthy';
    } else if (memoryPercent < 85) {
      checks.memory = 'degraded';
    } else {
      checks.memory = 'unhealthy';
    }

    checks.memoryUsage = {
      heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
      percent: `${Math.round(memoryPercent)}%`
    };

    // Overall status
    const isHealthy = checks.database === 'healthy' &&
                     checks.cache === 'healthy' &&
                     checks.memory === 'healthy';

    reply.status(isHealthy ? 200 : 503);

  } catch (error) {
    checks.status = 'error';
    checks.error = error.message;
    reply.status(503);
  }

  return checks;
});

// Add cache stats endpoint
router.get('/cache/stats', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
  try {
    const redisInfo = await cacheService.redis.info('memory');
    const memory = getMemoryStats();

    // Parse Redis info
    const redisMemory = redisInfo.split('\r\n')
      .filter(line => line.startsWith('used_memory_human:'))
      .map(line => line.split(':')[1])[0];

    return {
      timestamp: new Date().toISOString(),
      redis: {
        memoryUsage: redisMemory,
        connected: cacheService.redis.status === 'ready'
      },
      nodejs: memory
    };
  } catch (error) {
    reply.status(500);
    return { error: 'Failed to get cache stats' };
  }
});
```

## Testing Requirements

### 1. Memory Leak Tests
```bash
# Run memory leak detection
npm run test:memory:leak

# Monitor memory under load
npm run test:memory:load -- --duration=300 --concurrent=50

# Cache performance test
npm run test:cache:performance
```

### 2. Memory Test Script
**File:** `tests/performance/memory-leak-test.js`

```javascript
import { performance } from 'perf_hooks';

async function memoryLeakTest() {
  const iterations = 1000;
  const initialMemory = process.memoryUsage();

  console.log('Starting memory leak test...');
  console.log('Initial memory:', formatMemory(initialMemory));

  for (let i = 0; i < iterations; i++) {
    // Simulate email processing
    await simulateEmailProcessing();

    if (i % 100 === 0) {
      const memory = process.memoryUsage();
      const growth = memory.heapUsed - initialMemory.heapUsed;
      console.log(`Iteration ${i}: ${formatMemory(memory)} (+${formatBytes(growth)})`);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
  }

  const finalMemory = process.memoryUsage();
  const totalGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

  console.log('\nFinal memory:', formatMemory(finalMemory));
  console.log('Total growth:', formatBytes(totalGrowth));

  if (totalGrowth > 50 * 1024 * 1024) { // 50MB
    console.error('MEMORY LEAK DETECTED!');
    process.exit(1);
  } else {
    console.log('No significant memory leak detected');
  }
}

async function simulateEmailProcessing() {
  // Simulate creating and processing large objects
  const email = {
    id: Math.random().toString(36),
    from: `user${Math.random()}@example.com`,
    to: `dest${Math.random()}@example.com`,
    subject: 'Test'.repeat(100),
    body: 'Content'.repeat(1000),
    attachments: Array.from({ length: 5 }, (_, i) => ({
      filename: `file${i}.pdf`,
      content: Buffer.alloc(1024 * 1024) // 1MB each
    }))
  };

  // Process email (simulated)
  await new Promise(resolve => setTimeout(resolve, 1));

  // Clean up
  email.attachments = null;
}

function formatMemory(memory) {
  return `Heap: ${formatBytes(memory.heapUsed)} | RSS: ${formatBytes(memory.rss)}`;
}

function formatBytes(bytes) {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(2)}MB`;
}

memoryLeakTest().catch(console.error);
```

## Risk Assessment & Mitigation

### High Risk
- Cache invalidation bugs causing stale data
- Memory leaks in production
- Streaming implementation issues

### Mitigation
- Implement cache versioning
- Add memory monitoring alerts
- Test streaming with various file sizes
- Use canary deployment for cache changes

## Rollback Criteria

Phase must be rolled back if:
- Memory usage increases by >30%
- Cache hit ratio <50%
- Error rate increases due to caching
- Streaming fails for file downloads

## Success Verification

```javascript
// Monitor memory usage over time
const monitor = setInterval(() => {
  const memory = process.memoryUsage();
  console.log({
    heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(memory.external / 1024 / 1024)}MB`,
    rss: `${Math.round(memory.rss / 1024 / 1024)}MB`
  });
}, 30000);

// Check cache performance
const stats = await cacheService.getStats();
console.log('Cache hit ratio:', stats.hitRate);
console.log('Memory usage:', stats.memoryUsage);
```

---

**Next:** Proceed to Phase 3 - API Performance Optimization