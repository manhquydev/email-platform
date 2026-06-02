/**
 * Rate Limiting Configuration
 * Phase 3: Enhanced rate limiting with per-user limits and tier-based restrictions
 */
import { FastifyRequest } from "fastify";
import Redis from "ioredis";

// Redis config from environment
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
// Optional Redis auth/TLS — applied to every client below so production can require a password.
const REDIS_AUTH_OPTS = {
  ...(process.env.REDIS_USERNAME ? { username: process.env.REDIS_USERNAME } : {}),
  ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
  ...(process.env.REDIS_TLS === "true" ? { tls: {} } : {}),
};

// Tier-based rate limits (requests per minute)
export const TIER_RATE_LIMITS: Record<string, number> = {
  FREE: 100,
  STARTER: 500,
  PROFESSIONAL: 2000,
  ENTERPRISE: 10000,
};

// Auth endpoint specific limits
export const AUTH_RATE_LIMITS = {
  "/auth/login": { max: 10, timeWindow: "5 minutes" },
  "/auth/register": { max: 5, timeWindow: "1 hour" },
  "/auth/forgot-password": { max: 3, timeWindow: "15 minutes" },
  "/auth/resend-verification": { max: 3, timeWindow: "15 minutes" },
  "/auth/2fa/verify": { max: 3, timeWindow: "5 minutes" }, // Base, exponential backoff applied separately
};

/**
 * Create Redis client for rate limiting
 * Uses lazy connection to avoid blocking server startup
 */
export function createRateLimitRedis(): Redis | undefined {
  if (process.env.NODE_ENV === "test") {
    return undefined; // Use in-memory for tests
  }

  try {
    const redis = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableOfflineQueue: false,
      ...REDIS_AUTH_OPTS,
    });

    redis.on("error", (err) => {
      console.warn("[RateLimit] Redis error, falling back to in-memory:", err.message);
    });

    redis.connect().catch((err) => {
      console.warn("[RateLimit] Redis connection failed:", err.message);
    });

    return redis;
  } catch (err) {
    console.warn("[RateLimit] Failed to create Redis client:", err);
    return undefined;
  }
}

/**
 * Key generator for per-user rate limiting
 * Uses userId when authenticated, falls back to IP
 */
export function userKeyGenerator(request: FastifyRequest): string {
  const user = request.user as { userId?: string } | undefined;
  if (user?.userId) {
    return `user:${user.userId}`;
  }
  // Fall back to IP for unauthenticated requests
  return `ip:${request.ip}`;
}

/**
 * Dynamic max requests based on user tier
 */
export function getTierBasedMax(request: FastifyRequest): number {
  const user = request.user as { tier?: string } | undefined;
  const tier = user?.tier || "FREE";
  return TIER_RATE_LIMITS[tier] || TIER_RATE_LIMITS.FREE;
}

/**
 * Get rate limit config based on environment
 */
export function getRateLimitConfig() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    max: 100, // Default max
    timeWindow: "1 minute",
    // SECURITY: Remove localhost bypass in production
    allowList: isProduction ? [] : ["127.0.0.1", "::1"],
    // Add rate limit headers for client awareness
    addHeadersOnExceeding: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
    },
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
    },
  };
}

/**
 * 2FA Exponential Backoff Calculator
 * Increases wait time with each failed attempt
 */
export class TwoFactorBackoff {
  private redis: Redis | null = null;

  constructor() {
    if (process.env.NODE_ENV !== "test") {
      try {
        this.redis = new Redis({
          host: REDIS_HOST,
          port: REDIS_PORT,
          lazyConnect: true,
          ...REDIS_AUTH_OPTS,
        });
        this.redis.connect().catch(() => {});
      } catch {
        // Fallback to no backoff tracking
      }
    }
  }

  /**
   * Record a failed 2FA attempt
   */
  async recordFailure(key: string): Promise<void> {
    if (!this.redis) return;

    try {
      const failureKey = `2fa:failures:${key}`;
      await this.redis.incr(failureKey);
      await this.redis.expire(failureKey, 3600); // 1 hour TTL
    } catch {
      // Ignore Redis errors
    }
  }

  /**
   * Get current failure count
   */
  async getFailureCount(key: string): Promise<number> {
    if (!this.redis) return 0;

    try {
      const count = await this.redis.get(`2fa:failures:${key}`);
      return parseInt(count || "0", 10);
    } catch {
      return 0;
    }
  }

  /**
   * Calculate backoff time based on failures
   * Returns milliseconds to wait
   */
  async getBackoffTime(key: string): Promise<number> {
    const failures = await this.getFailureCount(key);
    // Exponential backoff: 0, 1min, 5min, 15min, 1hour
    const backoffs = [0, 60000, 300000, 900000, 3600000];
    return backoffs[Math.min(failures, backoffs.length - 1)];
  }

  /**
   * Check if user is in backoff period
   */
  async isInBackoff(key: string): Promise<{ blocked: boolean; waitTime: number }> {
    if (!this.redis) return { blocked: false, waitTime: 0 };

    try {
      const lockKey = `2fa:lock:${key}`;
      const lockUntil = await this.redis.get(lockKey);

      if (lockUntil) {
        const waitTime = parseInt(lockUntil, 10) - Date.now();
        if (waitTime > 0) {
          return { blocked: true, waitTime };
        }
      }

      return { blocked: false, waitTime: 0 };
    } catch {
      return { blocked: false, waitTime: 0 };
    }
  }

  /**
   * Apply backoff after failed attempt
   */
  async applyBackoff(key: string): Promise<void> {
    if (!this.redis) return;

    try {
      await this.recordFailure(key);
      const backoffTime = await this.getBackoffTime(key);

      if (backoffTime > 0) {
        const lockKey = `2fa:lock:${key}`;
        const lockUntil = Date.now() + backoffTime;
        await this.redis.setex(lockKey, Math.ceil(backoffTime / 1000), lockUntil.toString());
      }
    } catch {
      // Ignore Redis errors
    }
  }

  /**
   * Clear backoff after successful attempt
   */
  async clearBackoff(key: string): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.del(`2fa:failures:${key}`, `2fa:lock:${key}`);
    } catch {
      // Ignore Redis errors
    }
  }
}

// Singleton instance
export const twoFactorBackoff = new TwoFactorBackoff();
