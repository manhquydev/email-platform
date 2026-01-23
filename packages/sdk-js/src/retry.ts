/**
 * Retry utilities for Ephemera SDK
 * Implements exponential backoff with jitter
 */

import { RateLimitedError } from './errors';
import { parseRateLimitHeaders } from './rate-limit';

/** Retry configuration options */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Jitter factor 0-1 (default: 0.3) */
  jitter?: number;
  /** HTTP status codes to retry on (default: [429, 500, 502, 503, 504]) */
  retryableStatuses?: number[];
  /** Callback on each retry attempt */
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

const DEFAULT_RETRYABLE_STATUSES = [429, 500, 502, 503, 504];

/**
 * Calculate exponential backoff delay with jitter
 */
export function calculateBackoff(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  jitter: number
): number {
  const exponential = baseDelay * Math.pow(2, attempt);
  const jitterAmount = jitter * exponential * Math.random();
  return Math.min(exponential + jitterAmount, maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(
  error: unknown,
  retryableStatuses: number[]
): boolean {
  if (error instanceof RateLimitedError) {
    return true;
  }

  if (error instanceof Error && 'status' in error) {
    const status = (error as { status: number }).status;
    return retryableStatuses.includes(status);
  }

  // Network errors are retryable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  return false;
}

/**
 * Execute a function with automatic retry on failure
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => client.createInbox(),
 *   { maxRetries: 3, onRetry: (n, e) => console.log(`Retry ${n}`) }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    jitter = 0.3,
    retryableStatuses = DEFAULT_RETRYABLE_STATUSES,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt >= maxRetries || !isRetryableError(error, retryableStatuses)) {
        throw lastError;
      }

      // Use Retry-After header if available for 429 errors
      let delay: number;
      if (error instanceof RateLimitedError && error.retryAfter) {
        delay = error.retryAfter * 1000;
      } else {
        delay = calculateBackoff(attempt, baseDelay, maxDelay, jitter);
      }

      onRetry?.(attempt + 1, lastError, delay);
      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Create a retryable version of an async function
 */
export function makeRetryable<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => withRetry(() => fn(...args), options);
}
