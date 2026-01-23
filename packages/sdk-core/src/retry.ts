/**
 * SDK Core - Retry Utility
 * Implements exponential backoff retry logic for API requests
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableStatuses?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      const status = error?.status || error?.statusCode;
      const isRetryable = status && opts.retryableStatuses.includes(status);

      if (!isRetryable || attempt >= opts.maxRetries) {
        throw error;
      }

      // Calculate delay (use Retry-After header if available)
      let delayMs = calculateBackoffDelay(attempt, opts.baseDelayMs, opts.maxDelayMs);
      if (error?.retryAfter) {
        delayMs = error.retryAfter * 1000;
      }

      await sleep(delayMs);
    }
  }

  throw lastError;
}
