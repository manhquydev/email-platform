# Phase 1: Database Optimization
**Timeline:** Week 1-2 (20 Dec - 2 Jan 2026)
**Priority:** Critical
**Impact:** Highest - affects all other phases

## Objectives

1. Add missing indexes on critical query paths
2. Optimize slow queries (>100ms)
3. Implement connection pooling with PgBouncer
4. Fix N+1 query problems
5. Add full-text search capabilities

## Success Metrics

- [ ] Average query time <30ms (from 120ms)
- [ ] No queries >100ms
- [ ] Index hit ratio >95%
- [ ] Connection pool utilization <80%
- [ ] Search latency <200ms

## Implementation Steps

### 1.1 Database Schema Updates

**File:** `services/api/prisma/schema.prisma`

Add composite indexes for Message table:

```prisma
model Message {
  id          String     @id @default(cuid())
  // ... existing fields ...

  // NEW INDEXES - Add these
  @@index([inboxId, receivedAt, sort("desc")], name: "idx_inbox_received_desc")
  @@index([inboxId, deletedAt], name: "idx_inbox_deleted")
  @@index([domainId, receivedAt, sort("desc")], name: "idx_domain_received_desc")
  @@index([userId, receivedAt, sort("desc")], name: "idx_user_received_desc")
  @@index([fromAddress, receivedAt], name: "idx_from_received")
  @@index([subject, receivedAt], name: "idx_subject_received")
}
```

**Migration File:** `services/api/prisma/migrations/202_add_performance_indexes.sql`

```sql
-- Add performance indexes
CREATE INDEX CONCURRENTLY idx_inbox_received_desc ON messages (inboxId, receivedAt DESC);
CREATE INDEX CONCURRENTLY idx_inbox_deleted ON messages (inboxId, deletedAt) WHERE deletedAt IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_domain_received_desc ON messages (domainId, receivedAt DESC);
CREATE INDEX CONCURRENTLY idx_user_received_desc ON messages (userId, receivedAt DESC);
CREATE INDEX CONCURRENTLY idx_from_received ON messages (fromAddress, receivedAt DESC);
CREATE INDEX CONCURRENTLY idx_subject_received ON messages (subject, receivedAt DESC);

-- Full-text search index
ALTER TABLE messages ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', COALESCE(subject, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(textBody, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(fromAddress, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(toAddress, '')), 'C')
) STORED;

CREATE INDEX CONCURRENTLY idx_messages_search_vector ON messages USING GIN(search_vector);

-- Add index for inbox queries
CREATE INDEX CONCURRENTLY idx_inbox_domain_active ON inboxes (domainId, deletedAt) WHERE deletedAt IS NULL;
```

### 1.2 Fix N+1 Query in Search Service

**File:** `services/api/src/services/searchService.ts`

```typescript
// BEFORE - N+1 query problem
const domainFacets = await Promise.all(
  domains.map(async (d) => {
    const inbox = await prisma.inbox.findUnique({
      where: { id: d.inbox },
      include: { domain: true }
    });
    return {
      name: inbox?.domain?.name || 'Unknown',
      count: d._count
    };
  })
);

// AFTER - Single query with JOIN
export async function searchMessages(userId: string, query: SearchQuery) {
  const { q, filters = {}, pagination = {} } = query;
  const { offset = 0, limit = 50 } = pagination;

  // Build search query with JOINs
  const whereClause: any = {
    inbox: {
      userId,
      deletedAt: null,
      domain: filters.domainId ? { id: filters.domainId } : undefined
    },
    deletedAt: null
  };

  // Use full-text search if query provided
  if (q) {
    whereClause.searchVector = {
      search: to_tsquery('english', q.split(' ').join(' & '))
    };
  }

  // Single query with all data
  const [messages, total, domainFacets] = await Promise.all([
    // Get messages with joined data
    prisma.message.findMany({
      where: whereClause,
      include: {
        inbox: {
          include: {
            domain: true
          }
        },
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
      take: limit,
      skip: offset
    }),

    // Get total count
    prisma.message.count({ where: whereClause }),

    // Get domain facets in single query
    prisma.message.groupBy({
      by: ['inboxId'],
      where: {
        ...whereClause,
        inbox: {
          domain: {
            userId
          }
        }
      },
      _count: true,
      orderBy: {
        _count: {
          inboxId: 'desc'
        }
      },
      take: 10
    })
  ]);

  // Get domain names for facets
  const inboxIds = domainFacets.map(f => f.inboxId);
  const inboxes = await prisma.inbox.findMany({
    where: {
      id: { in: inboxIds },
      userId
    },
    include: {
      domain: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  const domainMap = new Map(
    inboxes.map(i => [i.id, i.domain?.name || 'Unknown'])
  );

  const facets = {
    domains: domainFacets.map(f => ({
      domainId: domainMap.get(f.inboxId),
      count: f._count
    })).filter(f => f.domainId !== 'Unknown')
  };

  return {
    messages,
    total,
    facets,
    hasMore: offset + messages.length < total
  };
}
```

### 1.3 Optimize Message List Query

**File:** `services/api/src/routes/messages.ts`

```typescript
// BEFORE - Inefficient query
router.get('/', async (request, reply) => {
  const { inboxId } = request.params as { inboxId: string };
  const { q, limit = 50, offset = 0 } = request.query as any;

  const where: any = { inboxId, deletedAt: null };

  if (q) {
    where.OR = [
      { subject: { contains: q, mode: "insensitive" } },
      { fromAddress: { contains: q, mode: "insensitive" } },
      { toAddress: { contains: q, mode: "insensitive" } },
      { textBody: { contains: q, mode: "insensitive" } }
    ];
  }

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      take: limit,
      skip: offset,
      include: { attachments: true }
    }),
    prisma.message.count({ where })
  ]);
});

// AFTER - Optimized with indexes and full-text search
router.get('/', async (request, reply) => {
  const { inboxId } = request.params as { inboxId: string };
  const { q, limit = 50, offset = 0 } = request.query as any;

  // Use optimized query with index hints
  const baseWhere = {
    inboxId,
    deletedAt: null
  };

  let whereClause = baseWhere;

  if (q) {
    // Use full-text search
    whereClause = {
      ...baseWhere,
      searchVector: {
        search: to_tsquery('english', q.split(' ').join(' & '))
      }
    };
  }

  // Use transaction for consistency
  const [messages, total] = await prisma.$transaction([
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
      orderBy: { receivedAt: "desc" },
      take: Math.min(limit, 100), // Cap max
      skip: offset
    }),
    prisma.message.count({ where: whereClause })
  ]);

  return {
    messages,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + messages.length < total
    }
  };
});
```

### 1.4 Implement Connection Pooling

**File:** `docker-compose.yml`

Add PgBouncer service:

```yaml
services:
  # ... existing services ...

  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    environment:
      DATABASES_HOST: postgres
      DATABASES_PORT: 5432
      DATABASES_USER: ${POSTGRES_USER}
      DATABASES_PASSWORD: ${POSTGRES_PASSWORD}
      DATABASES_DBNAME: ${POSTGRES_DB}
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 200
      DEFAULT_POOL_SIZE: 20
      MIN_POOL_SIZE: 5
      RESERVE_POOL_SIZE: 5
      RESERVE_POOL_TIMEOUT: 5
      SERVER_RESET_QUERY: DISCARD ALL
    ports:
      - "6432:6432"
    depends_on:
      - postgres
    volumes:
      - ./pgbouncer/pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini
      - ./pgbouncer/users.txt:/etc/pgbouncer/users.txt
```

**Config File:** `pgbouncer/pgbouncer.ini`

```ini
[databases]
* = host=postgres port=5432

[pgbouncer]
listen_port = 6432
listen_addr = 0.0.0.0
auth_type = md5
auth_file = /etc/pgbouncer/users.txt
logfile = /var/log/pgbouncer/pgbouncer.log
pidfile = /var/run/pgbouncer/pgbouncer.pid
admin_users = postgres
stats_users = stats, postgres

# Connection pooling
pool_mode = transaction
max_client_conn = 200
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 5
max_db_connections = 50
max_user_connections = 50

# Timeouts
server_reset_query = DISCARD ALL
server_check_delay = 30
server_check_query = select 1
server_lifetime = 3600
server_idle_timeout = 600

# Logging
log_disconnections = 1
log_connections = 1
log_pooler_errors = 1
```

**Update Database Config:** `services/api/src/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaClientOptions } from '@prisma/client/runtime/library';

// Get database URL from environment or use PgBouncer
const databaseUrl = process.env.DATABASE_URL ||
  process.env.DATABASE_URL_POOL ||
  'postgresql://postgres:changeme@localhost:6432/tempmail';

const prismaOptions: PrismaClientOptions = {
  datasources: {
    db: {
      url: databaseUrl
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  // Connection pool settings for direct connection (fallback)
  datasources: {
    db: {
      url: databaseUrl
    }
  }
};

// Singleton pattern
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Connection monitoring
prisma.$on('query', (e) => {
  if (e.duration > 100) {
    console.warn(`Slow query: ${e.duration}ms - ${e.query}`);
  }
});

prisma.$on('error', (e) => {
  console.error('Prisma error:', e);
});
```

### 1.5 Add Query Performance Monitoring

**File:** `services/api/src/middleware/queryMonitor.ts`

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';

interface QueryStats {
  count: number;
  totalDuration: number;
  slowQueries: number;
  errors: number;
}

const queryStats = new Map<string, QueryStats>();

export function queryMonitorPlugin(instance: any) {
  instance.addHook('onRequest', async (request: FastifyRequest) => {
    request.queryStats = {
      count: 0,
      totalDuration: 0,
      slowQueries: 0
    };
  });

  instance.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const stats = request.queryStats;
    if (stats && stats.count > 0) {
      const route = request.routeOptions?.url || 'unknown';
      const current = queryStats.get(route) || { count: 0, totalDuration: 0, slowQueries: 0, errors: 0 };

      queryStats.set(route, {
        count: current.count + stats.count,
        totalDuration: current.totalDuration + stats.totalDuration,
        slowQueries: current.slowQueries + stats.slowQueries,
        errors: current.errors
      });
    }
  });
}

// Middleware to track queries
export const queryMiddleware = {
  before: async (request: FastifyRequest) => {
    const startTime = Date.now();
    (request as any).queryStartTime = startTime;
  },

  after: async (request: FastifyRequest, result: any) => {
    const duration = Date.now() - (request as any).queryStartTime;
    const stats = request.queryStats;
    if (stats) {
      stats.count++;
      stats.totalDuration += duration;
      if (duration > 100) stats.slowQueries++;
    }
  }
};

// Get performance stats endpoint
export async function getQueryPerformance() {
  const stats = Array.from(queryStats.entries()).map(([route, data]) => ({
    route,
    ...data,
    avgDuration: data.count > 0 ? Math.round(data.totalDuration / data.count) : 0
  }));

  return stats.sort((a, b) => b.totalDuration - a.totalDuration);
}
```

### 1.6 Database Health Check

**File:** `services/api/src/routes/health.ts`

```typescript
// Add to existing health check
router.get('/ready', async (request, reply) => {
  const checks: any = {
    status: 'ready',
    timestamp: new Date().toISOString(),
    database: 'unknown',
    connections: 'unknown'
  };

  try {
    // Test database connection
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbTime = Date.now() - start;

    checks.database = dbTime < 50 ? 'healthy' : dbTime < 100 ? 'degraded' : 'unhealthy';
    checks.databaseLatency = `${dbTime}ms`;

    // Check connection pool
    const poolStats = await prisma.$queryRaw`
      SELECT
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;

    checks.connections = poolStats[0];

    // Overall status
    const isHealthy = checks.database === 'healthy' &&
                     (checks.connections as any).active_connections < 50;

    reply.status(isHealthy ? 200 : 503);

  } catch (error) {
    checks.status = 'error';
    checks.error = error.message;
    reply.status(503);
  }

  return checks;
});
```

## Testing Requirements

### 1. Performance Tests
```bash
# Run database performance tests
npm run test:perf:db

# Check query execution plans
npm run db:explain -- --query="SELECT * FROM messages WHERE inboxId = 'xxx' ORDER BY receivedAt DESC LIMIT 50"

# Verify indexes are being used
npm run db:index:usage
```

### 2. Load Testing Script
**File:** `tests/performance/database-load-test.js`

```javascript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runLoadTest() {
  const iterations = 1000;
  const concurrent = 50;

  console.log(`Running ${iterations} queries with ${concurrent} concurrent connections`);

  const promises = [];
  const start = Date.now();

  for (let i = 0; i < concurrent; i++) {
    promises.push(runQueries(iterations / concurrent));
  }

  const results = await Promise.all(promises);
  const totalTime = Date.now() - start;
  const totalQueries = results.reduce((sum, r) => sum + r.count, 0);
  const avgTime = totalTime / totalQueries;

  console.log(`Total queries: ${totalQueries}`);
  console.log(`Total time: ${totalTime}ms`);
  console.log(`Average time per query: ${avgTime}ms`);
  console.log(`Queries per second: ${Math.round(totalQueries / (totalTime / 1000))}`);
}

async function runQueries(count) {
  const results = { count: 0, totalTime: 0 };

  for (let i = 0; i < count; i++) {
    const start = Date.now();
    await prisma.message.findMany({
      take: 50,
      orderBy: { receivedAt: 'desc' },
      where: { deletedAt: null }
    });
    results.totalTime += Date.now() - start;
    results.count++;
  }

  return results;
}

runLoadTest().catch(console.error);
```

## Risk Assessment & Mitigation

### High Risk
- Schema changes may cause downtime
- Index creation on large tables
- Migration failures

### Mitigation
- Use `CREATE INDEX CONCURRENTLY` to avoid locks
- Schedule migrations during low traffic
- Have rollback scripts ready
- Test in staging first

## Rollback Criteria

Phase must be rolled back if:
- Query latency increases by >20%
- Error rate >1%
- Database locks cause timeouts
- Connection pool exhausts

## Success Verification

```sql
-- Verify indexes are being used
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM messages
WHERE inboxId = 'xxx'
ORDER BY receivedAt DESC
LIMIT 50;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'messages'
ORDER BY idx_scan DESC;

-- Monitor slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;
```

---

**Next:** Proceed to Phase 2 - Memory & Caching Optimization