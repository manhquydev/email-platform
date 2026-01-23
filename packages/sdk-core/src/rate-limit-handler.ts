/**
 * SDK Core - Rate Limit Handler
 * Handles rate limit headers and automatic retry
 */

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Parse rate limit info from response headers
 */
export function parseRateLimitHeaders(
  headers: Record<string, string | string[] | undefined>
): RateLimitInfo | null {
  const getHeader = (name: string): string | undefined => {
    const value = headers[name] || headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  };

  const limit = getHeader('X-RateLimit-Limit');
  const remaining = getHeader('X-RateLimit-Remaining');
  const reset = getHeader('X-RateLimit-Reset');
  const retryAfter = getHeader('Retry-After');

  if (!limit || !remaining || !reset) {
    return null;
  }

  const resetTimestamp = parseInt(reset, 10);
  const now = Math.floor(Date.now() / 1000);

  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    reset: resetTimestamp,
    retryAfter: retryAfter ? parseInt(retryAfter, 10) : Math.max(0, resetTimestamp - now),
  };
}

/**
 * Check if request should be delayed due to rate limiting
 */
export function shouldDelayRequest(info: RateLimitInfo | null): number {
  if (!info || info.remaining > 0) {
    return 0;
  }

  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, (info.reset - now) * 1000);
}

/**
 * Rate limit aware request wrapper
 */
export class RateLimitHandler {
  private lastRateLimitInfo: RateLimitInfo | null = null;

  updateFromHeaders(headers: Record<string, string | string[] | undefined>): void {
    this.lastRateLimitInfo = parseRateLimitHeaders(headers);
  }

  getRateLimitInfo(): RateLimitInfo | null {
    return this.lastRateLimitInfo;
  }

  getDelayMs(): number {
    return shouldDelayRequest(this.lastRateLimitInfo);
  }

  async waitIfNeeded(): Promise<void> {
    const delayMs = this.getDelayMs();
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
