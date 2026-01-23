/**
 * Rate Limit Headers Utility
 * Standardizes rate limit response headers according to RFC 6585 and draft-ietf-httpapi-ratelimit-headers
 */

import { FastifyReply } from 'fastify';

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
  retryAfter?: number; // Seconds until reset
}

/**
 * Add standardized rate limit headers to response
 */
export function setRateLimitHeaders(reply: FastifyReply, info: RateLimitInfo): void {
  reply.header('X-RateLimit-Limit', info.limit.toString());
  reply.header('X-RateLimit-Remaining', info.remaining.toString());
  reply.header('X-RateLimit-Reset', info.reset.toString());

  if (info.retryAfter !== undefined && info.retryAfter > 0) {
    reply.header('Retry-After', info.retryAfter.toString());
  }
}

/**
 * Parse rate limit info from response headers (for SDK use)
 */
export function parseRateLimitHeaders(headers: Record<string, string | undefined>): RateLimitInfo | null {
  const limit = headers['x-ratelimit-limit'];
  const remaining = headers['x-ratelimit-remaining'];
  const reset = headers['x-ratelimit-reset'];

  if (!limit || !remaining || !reset) {
    return null;
  }

  const resetTimestamp = parseInt(reset, 10);
  const now = Math.floor(Date.now() / 1000);

  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    reset: resetTimestamp,
    retryAfter: Math.max(0, resetTimestamp - now),
  };
}

/**
 * Create rate limit exceeded error response
 */
export function createRateLimitResponse(info: RateLimitInfo) {
  return {
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Try again in ${info.retryAfter || 60} seconds.`,
    retryAfter: info.retryAfter,
    limit: info.limit,
    reset: new Date(info.reset * 1000).toISOString(),
  };
}
