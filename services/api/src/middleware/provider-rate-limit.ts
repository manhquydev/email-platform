/**
 * Provider Rate Limiting Middleware
 * Limits provider API requests to 100/minute per providerId
 * Uses Redis for distributed rate limiting with in-memory fallback
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { createRateLimitRedis } from './rate-limit-config';

// Rate limit configuration
const PROVIDER_RATE_LIMIT = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
};

// In-memory fallback store (for when Redis unavailable)
const memoryStore = new Map<string, { count: number; resetAt: number }>();

// Redis client (lazy initialized)
let redis: ReturnType<typeof createRateLimitRedis>;

/**
 * Get or initialize Redis client
 */
function getRedis() {
  if (!redis) {
    redis = createRateLimitRedis();
  }
  return redis;
}

/**
 * Check rate limit using Redis
 */
async function checkRateLimitRedis(providerId: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
}> {
  const redisClient = getRedis();
  if (!redisClient) {
    return checkRateLimitMemory(providerId);
  }

  const key = `provider:ratelimit:${providerId}`;
  const now = Date.now();
  const windowStart = now - PROVIDER_RATE_LIMIT.windowMs;

  try {
    // Use sliding window with sorted set
    const multi = redisClient.multi();

    // Remove old entries outside window
    multi.zremrangebyscore(key, 0, windowStart);
    // Add current request
    multi.zadd(key, now.toString(), `${now}-${Math.random()}`);
    // Count requests in window
    multi.zcard(key);
    // Set expiry
    multi.expire(key, 120); // 2 minutes TTL

    const results = await multi.exec();
    const count = (results?.[2]?.[1] as number) || 0;
    const remaining = Math.max(0, PROVIDER_RATE_LIMIT.maxRequests - count);
    const resetAt = now + PROVIDER_RATE_LIMIT.windowMs;

    return {
      allowed: count <= PROVIDER_RATE_LIMIT.maxRequests,
      remaining,
      resetAt,
    };
  } catch (err) {
    console.warn('[ProviderRateLimit] Redis error, using memory fallback:', (err as Error).message);
    return checkRateLimitMemory(providerId);
  }
}

/**
 * Check rate limit using in-memory store (fallback)
 */
function checkRateLimitMemory(providerId: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const key = providerId;
  const entry = memoryStore.get(key);

  // Clean expired entries periodically
  if (Math.random() < 0.01) {
    for (const [k, v] of memoryStore.entries()) {
      if (v.resetAt < now) memoryStore.delete(k);
    }
  }

  if (!entry || entry.resetAt < now) {
    // New window
    const resetAt = now + PROVIDER_RATE_LIMIT.windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: PROVIDER_RATE_LIMIT.maxRequests - 1,
      resetAt,
    };
  }

  // Increment count
  entry.count++;
  const remaining = Math.max(0, PROVIDER_RATE_LIMIT.maxRequests - entry.count);

  return {
    allowed: entry.count <= PROVIDER_RATE_LIMIT.maxRequests,
    remaining,
    resetAt: entry.resetAt,
  };
}

/**
 * Provider Rate Limit Middleware
 * Apply after provider auth middleware (requires request.provider)
 */
export async function providerRateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const provider = request.provider as { providerId: string } | undefined;

  if (!provider?.providerId) {
    // No provider context, skip rate limiting (auth will fail anyway)
    return;
  }

  const { allowed, remaining, resetAt } = await checkRateLimitRedis(provider.providerId);
  const retryAfterSeconds = Math.ceil((resetAt - Date.now()) / 1000);

  // Add rate limit headers to all responses
  reply.header('X-RateLimit-Limit', PROVIDER_RATE_LIMIT.maxRequests.toString());
  reply.header('X-RateLimit-Remaining', remaining.toString());
  reply.header('X-RateLimit-Reset', Math.ceil(resetAt / 1000).toString());

  if (!allowed) {
    reply.header('Retry-After', retryAfterSeconds.toString());
    reply.status(429).send({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Maximum ${PROVIDER_RATE_LIMIT.maxRequests} requests per minute.`,
      retryAfter: retryAfterSeconds,
    });
    return;
  }
}
