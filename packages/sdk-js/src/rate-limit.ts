/**
 * Rate limit handling for Ephemera SDK
 * Automatically handles 429 responses with proper backoff
 */

/** Rate limit information from response headers */
export interface RateLimitInfo {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Remaining requests in current window */
  remaining: number;
  /** Unix timestamp when the rate limit resets */
  reset: number;
  /** Seconds to wait before retrying (only on 429) */
  retryAfter?: number;
}

/** Rate limit event for monitoring */
export interface RateLimitEvent {
  type: 'warning' | 'exceeded';
  info: RateLimitInfo;
  endpoint: string;
}

/** Rate limit event handler */
export type RateLimitHandler = (event: RateLimitEvent) => void;

/**
 * Parse rate limit headers from API response
 */
export function parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
  const limit = headers.get('X-RateLimit-Limit');
  const remaining = headers.get('X-RateLimit-Remaining');
  const reset = headers.get('X-RateLimit-Reset');

  if (!limit || !remaining || !reset) {
    return null;
  }

  const info: RateLimitInfo = {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    reset: parseInt(reset, 10),
  };

  const retryAfter = headers.get('Retry-After');
  if (retryAfter) {
    info.retryAfter = parseInt(retryAfter, 10);
  }

  return info;
}

/**
 * Calculate delay based on rate limit info
 * Returns milliseconds to wait before next request
 */
export function calculateRateLimitDelay(info: RateLimitInfo): number {
  if (info.retryAfter) {
    return info.retryAfter * 1000;
  }

  if (info.remaining <= 0) {
    const now = Math.floor(Date.now() / 1000);
    const waitSeconds = Math.max(0, info.reset - now);
    return waitSeconds * 1000;
  }

  return 0;
}

/**
 * Check if rate limit threshold is approaching
 * Useful for preemptive throttling
 */
export function isRateLimitWarning(
  info: RateLimitInfo,
  threshold = 0.1
): boolean {
  return info.remaining / info.limit <= threshold;
}

/**
 * Rate limit tracker for managing request timing
 */
export class RateLimitTracker {
  private lastInfo: RateLimitInfo | null = null;
  private handlers: RateLimitHandler[] = [];

  /** Add a rate limit event handler */
  onRateLimit(handler: RateLimitHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const index = this.handlers.indexOf(handler);
      if (index > -1) this.handlers.splice(index, 1);
    };
  }

  /** Update rate limit info from response */
  update(headers: Headers, endpoint: string): void {
    const info = parseRateLimitHeaders(headers);
    if (!info) return;

    this.lastInfo = info;

    if (info.remaining <= 0) {
      this.emit({ type: 'exceeded', info, endpoint });
    } else if (isRateLimitWarning(info)) {
      this.emit({ type: 'warning', info, endpoint });
    }
  }

  /** Get current rate limit info */
  getInfo(): RateLimitInfo | null {
    return this.lastInfo;
  }

  /** Check if we should delay the next request */
  getRequiredDelay(): number {
    if (!this.lastInfo) return 0;
    return calculateRateLimitDelay(this.lastInfo);
  }

  private emit(event: RateLimitEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }
  }
}
