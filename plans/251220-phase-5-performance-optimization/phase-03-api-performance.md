# Phase 3: API Performance Optimization
**Timeline:** Week 5-6 (17 - 30 Jan 2026)
**Priority:** High
**Impact:** High - improves API response times and throughput

## Objectives

1. Optimize GraphQL resolvers with batching
2. Implement response compression
3. Add request batching capabilities
4. Optimize JSON serialization
5. Implement connection keep-alive and HTTP/2

## Success Metrics

- [ ] 95th percentile response time <200ms
- [ ] GraphQL resolver N+1 queries eliminated
- [ ] Response size reduced by 40% with compression
- [ ] Support 1000 concurrent requests
- [ ] JSON serialization time <5ms per request

## Implementation Steps

### 3.1 GraphQL Resolver Optimization

**File:** `services/api/src/graphql/resolvers/index.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { dataloader } from '../utils/dataloader';

// Create data loaders for batching
const createDataLoaders = (prisma: PrismaClient) => ({
  // Batch message loading
  messagesById: new DataLoader(async (ids: readonly string[]) => {
    const messages = await prisma.message.findMany({
      where: { id: { in: ids as string[] } },
      include: {
        inbox: { include: { domain: true } },
        attachments: {
          where: { deletedAt: null },
          select: {
            id: true,
            filename: true,
            mimeType: true,
            size: true
          }
        }
      }
    });

    // Map by ID for DataLoader
    const messageMap = new Map(
      messages.map(m => [m.id, m])
    );

    return ids.map(id => messageMap.get(id) || null);
  }),

  // Batch inbox loading
  inboxesById: new DataLoader(async (ids: readonly string[]) => {
    const inboxes = await prisma.inbox.findMany({
      where: { id: { in: ids as string[] } },
      include: {
        domain: true,
        _count: {
          select: {
            messages: {
              where: { deletedAt: null }
            }
          }
        }
      }
    });

    const inboxMap = new Map(
      inboxes.map(i => [i.id, i])
    );

    return ids.map(id => inboxMap.get(id) || null);
  }),

  // Batch domain loading
  domainsById: new DataLoader(async (ids: readonly string[]) => {
    const domains = await prisma.domain.findMany({
      where: { id: { in: ids as string[] } },
      include: {
        _count: {
          select: {
            inboxes: {
              where: { deletedAt: null }
            }
          }
        }
      }
    });

    const domainMap = new Map(
      domains.map(d => [d.id, d])
    );

    return ids.map(id => domainMap.get(id) || null);
  })
});

export const resolvers = {
  Query: {
    // BEFORE - N+1 queries
    async messages(parent: any, { inboxId, limit = 50, offset = 0 }: any, context: any) {
      const messages = await prisma.message.findMany({
        where: { inboxId, deletedAt: null },
        include: {
          inbox: { include: { domain: true } },
          attachments: true // This causes N+1
        },
        orderBy: { receivedAt: 'desc' },
        take: limit,
        skip: offset
      });
      return messages;
    },

    // AFTER - Optimized with DataLoader
    async messages(parent: any, { inboxId, limit = 50, offset = 0 }: any, context: any) {
      // Get message IDs first
      const messageIds = await prisma.message.findMany({
        where: { inboxId, deletedAt: null },
        select: { id: true },
        orderBy: { receivedAt: 'desc' },
        take: limit,
        skip: offset
      });

      // Batch load full messages
      const messages = await context.loaders.messagesById.loadMany(
        messageIds.map(m => m.id)
      );

      return messages.filter(Boolean);
    },

    // Optimized search resolver
    async searchMessages(parent: any, { query, filters = {} }: any, context: any) {
      const { q, limit = 50, offset = 0 } = query;

      // Use indexed search
      const whereClause: any = {
        deletedAt: null
      };

      if (context.userId) {
        whereClause.inbox = {
          userId: context.userId,
          deletedAt: null
        };
      }

      if (q) {
        whereClause.searchVector = {
          search: to_tsquery('english', q.split(' ').join(' & '))
        };
      }

      // Execute in parallel
      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where: whereClause,
          select: {
            id: true,
            subject: true,
            fromAddress: true,
            toAddress: true,
            receivedAt: true,
            inboxId: true,
            hasAttachments: true
          },
          orderBy: { receivedAt: 'desc' },
          take: Math.min(limit, 100),
          skip: offset
        }),
        prisma.message.count({ where: whereClause })
      ]);

      // Batch load additional data
      const messagesWithData = await Promise.all(
        messages.map(async (msg) => {
          const fullMessage = await context.loaders.messagesById.load(msg.id);
          return fullMessage;
        })
      );

      return {
        messages: messagesWithData,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + messages.length < total
        }
      };
    }
  },

  Mutation: {
    // Optimized mutation with cache invalidation
    async markMessageRead(parent: any, { messageId }: any, context: any) {
      const result = await prisma.message.updateMany({
        where: {
          id: messageId,
          inbox: { userId: context.userId },
          readAt: null
        },
        data: { readAt: new Date() }
      });

      if (result.count > 0) {
        // Invalidate caches
        await context.cache.invalidateByTag(`message:${messageId}`);
        await context.cache.invalidate(`messages:*`);
      }

      return result.count > 0;
    }
  },

  // Field resolvers with DataLoader
  Message: {
    async inbox(message: any, _: any, context: any) {
      return context.loaders.inboxesById.load(message.inboxId);
    },

    async attachments(message: any, _: any, context: any) {
      // Already loaded in message query, return from cache
      return message.attachments || [];
    }
  },

  Inbox: {
    async domain(inbox: any, _: any, context: any) {
      if (inbox.domain) return inbox.domain;
      return context.loaders.domainsById.load(inbox.domainId);
    },

    async messageCount(inbox: any, _: any, context: any) {
      // Use cached count
      const cacheKey = `count:inbox:${inbox.id}`;
      let count = await context.cache.get(cacheKey);

      if (!count) {
        count = await prisma.message.count({
          where: {
            inboxId: inbox.id,
            deletedAt: null
          }
        });

        await context.cache.set(cacheKey, count, { ttl: 60 });
      }

      return count;
    }
  }
};
```

### 3.2 Request Batching Implementation

**File:** `services/api/src/plugins/batching.ts`

```typescript
import { FastifyInstance, FastifyRequest } from 'fastify';

interface BatchRequest {
  id: string;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: any;
}

interface BatchResponse {
  id: string;
  status: number;
  headers?: Record<string, string>;
  body?: any;
  error?: string;
}

export async function batchingPlugin(instance: FastifyInstance) {
  instance.post('/batch', {
    config: {
      // Disable body parsing for batch requests
      bodyLimit: 10 * 1024 * 1024 // 10MB
    }
  }, async (request: FastifyRequest<{ Body: BatchRequest[] }>, reply) => {
    const { body: requests } = request;

    if (!Array.isArray(requests)) {
      reply.status(400);
      return { error: 'Batch requests must be an array' };
    }

    if (requests.length > 100) {
      reply.status(400);
      return { error: 'Maximum 100 requests per batch' };
    }

    // Execute requests in parallel
    const promises = requests.map(async (req): Promise<BatchResponse> => {
      try {
        // Create mock request object
        const mockRequest = {
          method: req.method || 'GET',
          url: req.path,
          headers: { ...request.headers, ...req.headers },
          body: req.body
        };

        // Route the request
        const response = await instance.inject(mockRequest);

        return {
          id: req.id,
          status: response.statusCode,
          headers: response.headers as Record<string, string>,
          body: response.json ? response.json() : response.payload
        };
      } catch (error) {
        return {
          id: req.id,
          status: 500,
          error: error.message
        };
      }
    });

    const responses = await Promise.all(promises);

    // Return batch response
    return {
      responses,
      total: responses.length,
      timestamp: new Date().toISOString()
    };
  });
}
```

### 3.3 Response Compression

**File:** `services/api/src/plugins/compression.ts`

```typescript
import { FastifyInstance } from 'fastify';
import zlib from 'zlib';

export async function compressionPlugin(instance: FastifyInstance) {
  // Register compression with custom settings
  await instance.register(import('@fastify/compress'), {
    global: false, // Don't compress all routes automatically
    threshold: 1024, // Only compress responses >1KB
    encodings: ['gzip', 'deflate', 'br'],
    brotliOptions: {
      params: {
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
        [zlib.constants.BROTLI_PARAM_QUALITY]: 6
      }
    },
    zlibOptions: {
      level: 6
    }
  });

  // Apply compression to specific routes
  instance.addHook('onRoute', (routeOptions) => {
    // Compress API routes with large responses
    if (routeOptions.url?.includes('/messages') ||
        routeOptions.url?.includes('/search') ||
        routeOptions.url?.includes('/admin/stats') ||
        routeOptions.url?.startsWith('/graphql')) {
      routeOptions.config = routeOptions.config || {};
      routeOptions.config.compress = {
        encodings: ['gzip', 'br'],
        threshold: 512
      };
    }
  });
}
```

### 3.4 Optimized JSON Serialization

**File:** `services/api/src/utils/fastJson.ts`

```typescript
import { FastifyReply } from 'fastify';

// Custom fast JSON serializer
export class FastJSON {
  private static encoder = new TextEncoder();
  private static decoder = new TextDecoder();

  // Fast stringify for simple objects
  static stringify(obj: any): string {
    // Use JSON.stringify for complex objects
    return JSON.stringify(obj);
  }

  // Fast parse with error handling
  static parse(str: string): any {
    try {
      return JSON.parse(str);
    } catch (error) {
      console.error('JSON parse error:', error);
      return null;
    }
  }

  // Stream large JSON responses
  static async streamJson(reply: FastifyReply, data: AsyncIterable<any>) {
    reply.header('Content-Type', 'application/json');

    // Start JSON array
    reply.raw.write('[\n');

    let first = true;
    for await (const item of data) {
      if (!first) {
        reply.raw.write(',\n');
      }
      first = false;

      const json = this.stringify(item);
      reply.raw.write(json);
    }

    // End JSON array
    reply.raw.write('\n]');
    reply.raw.end();
  }

  // Optimized response method
  static send(reply: FastifyReply, data: any) {
    // Check if response should be compressed
    const acceptEncoding = reply.request.headers['accept-encoding'] || '';
    const shouldCompress = acceptEncoding.includes('gzip') || acceptEncoding.includes('br');

    if (shouldCompress && Buffer.byteLength(JSON.stringify(data), 'utf8') > 1024) {
      // Use built-in compression for larger responses
      reply.send(data);
    } else {
      // Direct send for small responses
      reply.type('application/json').send(data);
    }
  }
}

// Helper for pagination responses
export function paginateResponse<T>(data: T[], total: number, offset: number, limit: number) {
  return {
    data,
    pagination: {
      total,
      offset,
      limit,
      hasMore: offset + data.length < total,
      pages: Math.ceil(total / limit),
      currentPage: Math.floor(offset / limit) + 1
    }
  };
}

// Helper for error responses
export function errorResponse(reply: FastifyReply, error: string, code: number = 500) {
  return reply.status(code).send({
    error: {
      message: error,
      code,
      timestamp: new Date().toISOString()
    }
  });
}
```

### 3.5 Connection Pooling & Keep-Alive

**File:** `services/api/src/server.ts` (update)

```typescript
import fastify from 'fastify';
import { fastifyHttp2 } from '@fastify/http2';

// Create server with HTTP/2 support
const app = fastify({
  logger: process.env.NODE_ENV === 'development',
  http2: true, // Enable HTTP/2
  https: process.env.NODE_ENV === 'production' ? {
    key: fs.readFileSync(path.join(__dirname, '../certs/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../certs/cert.pem'))
  } : undefined,
  // Connection settings
  keepAliveTimeout: 65000, // 65 seconds
  maxRequestsPerSocket: 1000,
  requestTimeout: 30000, // 30 seconds
  bodyLimit: 10 * 1024 * 1024, // 10MB
  // Performance settings
  pluginTimeout: 10000,
  trustProxy: true
});

// HTTP/2 server push for static assets
app.register(async function (app) {
  app.get('/api/*', async (request, reply) => {
    // Push related assets if HTTP/2
    if (reply.raw.stream && reply.raw.stream.push) {
      // Push common assets
      reply.raw.stream.push(
        { ':path': '/static/common.js' },
        // ... push options
      );
    }
  });
});

// Connection middleware
app.addHook('onRequest', async (request, reply) => {
  // Set connection headers
  reply.header('Connection', 'keep-alive');
  reply.header('Keep-Alive', 'timeout=65, max=1000');

  // Add request ID for tracing
  request.id = generateRequestId();
  reply.header('X-Request-ID', request.id);
});

// Response optimization
app.addHook('onSend', async (request, reply, payload) => {
  // Add performance headers
  reply.header('X-Response-Time', `${Date.now() - request.startTime}ms`);

  // Add cache headers for GET requests
  if (request.method === 'GET' && !request.url.includes('/api/')) {
    reply.header('Cache-Control', 'public, max-age=300');
  }

  return payload;
});

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15);
}
```

### 3.6 GraphQL Subscription Optimization

**File:** `services/api/src/graphql/subscriptions.ts`

```typescript
import { PubSub } from 'graphql-subscriptions';
import { withFilter } from 'graphql-subscriptions';
import Redis from 'ioredis';

// Redis-backed pubsub for scaling
const redisPublisher = new Redis(process.env.REDIS_URL);
const redisSubscriber = new Redis(process.env.REDIS_URL);

class RedisPubSub {
  private pubsub = new PubSub();
  private subscriptions = new Map<string, any>();

  async publish(trigger: string, payload: any): Promise<void> {
    // Publish to both local and Redis
    await Promise.all([
      this.pubsub.publish(trigger, payload),
      redisPublisher.publish(trigger, JSON.stringify(payload))
    ]);
  }

  async subscribe(trigger: string, filterFn?: Function): Promise<AsyncIterator<any>> {
    // Subscribe to local pubsub
    const localIterator = this.pubsub.asyncIterator([trigger]);

    // Subscribe to Redis for scaling
    const redisIterator = this.createRedisIterator(trigger);

    // Merge iterators
    return this.mergeIterators(localIterator, redisIterator, filterFn);
  }

  private async* createRedisIterator(trigger: string): AsyncGenerator<any> {
    redisSubscriber.subscribe(trigger);

    for await (const message of redisSubscriber) {
      yield JSON.parse(message);
    }
  }

  private async* mergeIterators(
    local: AsyncIterator<any>,
    redis: AsyncIterator<any>,
    filter?: Function
  ): AsyncGenerator<any> {
    const iterators = [local, redis];
    const promises = iterators.map(it => it.next());

    while (true) {
      const result = await Promise.race(promises);

      if (result.done) {
        // Remove completed iterator
        const index = promises.indexOf(result);
        if (index > -1) {
          iterators.splice(index, 1);
          promises.splice(index, 1);
        }
        if (iterators.length === 0) break;
      } else {
        // Apply filter if provided
        if (!filter || filter(result.value)) {
          yield result.value;
        }
        // Recreate the promise for this iterator
        const it = iterators[promises.indexOf(result)];
        promises[promises.indexOf(result)] = it.next();
      }
    }
  }
}

export const pubsub = new RedisPubSub();

// Optimized subscription resolvers
export const subscriptionResolvers = {
  messageAdded: {
    subscribe: withFilter(
      () => pubsub.subscribe('MESSAGE_ADDED'),
      (payload, variables) => {
        // Filter by inbox ID
        return payload.messageAdded.inboxId === variables.inboxId;
      }
    )
  },

  inboxUpdated: {
    subscribe: withFilter(
      () => pubsub.subscribe('INBOX_UPDATED'),
      (payload, variables) => {
        // Filter by user ID
        return payload.inboxUpdated.userId === variables.userId;
      }
    )
  }
};

// Batch subscription events
export class SubscriptionBatcher {
  private events: any[] = [];
  private timer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 50;
  private readonly BATCH_TIMEOUT = 100; // 100ms

  add(event: any) {
    this.events.push(event);

    if (this.events.length >= this.BATCH_SIZE) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.BATCH_TIMEOUT);
    }
  }

  private async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.events.length === 0) return;

    // Batch publish events
    const eventsByType = this.events.reduce((acc, event) => {
      acc[event.type] = acc[event.type] || [];
      acc[event.type].push(event);
      return acc;
    }, {});

    for (const [type, events] of Object.entries(eventsByType)) {
      await pubsub.publish(type, { [type]: events });
    }

    this.events = [];
  }
}

export const subscriptionBatcher = new SubscriptionBatcher();
```

### 3.7 Performance Monitoring Middleware

**File:** `services/api/src/middleware/performanceMonitor.ts`

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';

interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  startTime: number;
  duration: number;
  statusCode: number;
  responseSize?: number;
  cacheHit?: boolean;
}

const metrics: PerformanceMetrics[] = [];
const MAX_METRICS = 10000;

export function performanceMonitorPlugin(instance: any) {
  instance.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    (request as any).startTime = Date.now();
    (request as any).requestId = Math.random().toString(36).substring(2);
  });

  instance.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = (request as any).startTime;
    const duration = Date.now() - startTime;

    const metric: PerformanceMetrics = {
      requestId: (request as any).requestId,
      method: request.method,
      url: request.url,
      startTime,
      duration,
      statusCode: reply.statusCode,
      responseSize: reply.raw.getHeader('content-length')
        ? parseInt(reply.raw.getHeader('content-length') as string)
        : undefined,
      cacheHit: reply.raw.getHeader('x-cache') === 'HIT'
    };

    // Store metric
    metrics.push(metric);

    // Keep only recent metrics
    if (metrics.length > MAX_METRICS) {
      metrics.splice(0, metrics.length - MAX_METRICS);
    }

    // Log slow requests
    if (duration > 500) {
      console.warn('Slow request detected:', {
        url: request.url,
        duration: `${duration}ms`,
        statusCode: reply.statusCode
      });
    }

    // Track response size
    if (metric.responseSize && metric.responseSize > 1024 * 1024) {
      console.warn('Large response:', {
        url: request.url,
        size: `${(metric.responseSize / 1024 / 1024).toFixed(2)}MB`
      });
    }
  });
}

// Get performance statistics
export function getPerformanceStats() {
  const recent = metrics.filter(m => m.startTime > Date.now() - 60000); // Last minute

  if (recent.length === 0) {
    return null;
  }

  const durations = recent.map(m => m.duration);
  const sorted = [...durations].sort((a, b) => a - b);

  return {
    requestsPerMinute: recent.length,
    averageResponseTime: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p90: sorted[Math.floor(sorted.length * 0.9)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    cacheHitRate: recent.filter(m => m.cacheHit).length / recent.length,
    errorRate: recent.filter(m => m.statusCode >= 400).length / recent.length,
    averageResponseSize: recent.reduce((a, b) => a + (b.responseSize || 0), 0) / recent.length
  };
}
```

## Testing Requirements

### 1. API Performance Tests
```bash
# Run API load test
npm run test:api:load -- --concurrent=1000 --duration=60

# Test GraphQL batching
npm run test:graphql:batching

# Benchmark compression
npm run test:compression:benchmark
```

### 2. Load Test Script
**File:** `tests/performance/api-load-test.js`

```javascript
import { performance } from 'perf_hooks';

async function apiLoadTest() {
  const baseUrl = 'http://localhost:3001';
  const concurrent = 1000;
  const duration = 60; // seconds

  console.log(`Running API load test: ${concurrent} concurrent requests for ${duration}s`);

  const results = {
    total: 0,
    success: 0,
    errors: 0,
    responseTimes: [],
    startTime: Date.now()
  };

  const workers = [];
  const endTime = Date.now() + (duration * 1000);

  for (let i = 0; i < concurrent; i++) {
    workers.push(worker(baseUrl, endTime, results));
  }

  await Promise.all(workers);

  const totalTime = Date.now() - results.startTime;
  const responseTimes = results.responseTimes.sort((a, b) => a - b);

  console.log('\n=== Load Test Results ===');
  console.log(`Total requests: ${results.total}`);
  console.log(`Successful: ${results.success}`);
  console.log(`Errors: ${results.errors}`);
  console.log(`Duration: ${totalTime}ms`);
  console.log(`Requests/sec: ${Math.round(results.total / (totalTime / 1000))}`);
  console.log(`Success rate: ${((results.success / results.total) * 100).toFixed(2)}%`);
  console.log(`Average response time: ${Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)}ms`);
  console.log(`95th percentile: ${responseTimes[Math.floor(responseTimes.length * 0.95)]}ms`);
  console.log(`99th percentile: ${responseTimes[Math.floor(responseTimes.length * 0.99)]}ms`);
}

async function worker(baseUrl, endTime, results) {
  while (Date.now() < endTime) {
    const start = performance.now();

    try {
      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token',
          'Accept': 'application/json'
        }
      });

      const duration = performance.now() - start;
      results.responseTimes.push(duration);
      results.total++;

      if (response.ok) {
        results.success++;
      } else {
        results.errors++;
      }
    } catch (error) {
      results.errors++;
      results.total++;
    }

    // Small delay to prevent overwhelming
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

apiLoadTest().catch(console.error);
```

## Risk Assessment & Mitigation

### High Risk
- GraphQL batching causing complex queries
- Response compression increasing CPU usage
- HTTP/2 compatibility issues

### Mitigation
- Monitor query complexity
- Adjust compression levels
- Test with various clients
- Gradual rollout with feature flags

## Rollback Criteria

Phase must be rolled back if:
- API response time increases by >25%
- Error rate >2%
- Compression causes high CPU
- GraphQL subscriptions fail

## Success Verification

```javascript
// Monitor API performance
const stats = getPerformanceStats();
console.log('API Performance:', {
  requestsPerMinute: stats.requestsPerMinute,
  p95ResponseTime: stats.p95,
  cacheHitRate: stats.cacheHitRate,
  errorRate: stats.errorRate
});

// Test batch request
const batchResponse = await fetch('/batch', {
  method: 'POST',
  body: JSON.stringify([
    { id: '1', method: 'GET', path: '/api/messages' },
    { id: '2', method: 'GET', path: '/api/inboxes' }
  ])
});
console.log('Batch performance:', batchResponse.responses);
```

---

**Next:** Proceed to Phase 4 - Frontend Optimization