/**
 * Pagination utilities for Ephemera SDK
 * Provides async iterators for paginated API endpoints
 */

import type { PaginatedResponse } from './types';

/** Options for paginated requests */
export interface PaginateOptions {
  /** Initial cursor position */
  cursor?: string;
  /** Items per page (default: 50) */
  limit?: number;
  /** Maximum items to fetch (default: unlimited) */
  maxItems?: number;
}

/** Extended paginated response with cursor support */
export interface CursorPaginatedResponse<T> extends PaginatedResponse<T> {
  nextCursor?: string;
}

/** Request function type for pagination */
export type PaginatedRequestFn<T> = (
  params: URLSearchParams
) => Promise<CursorPaginatedResponse<T>>;

/**
 * Creates an async generator for paginated endpoints
 * Automatically handles cursor-based pagination
 *
 * @example
 * ```typescript
 * for await (const inbox of paginate(client, '/inboxes')) {
 *   console.log(inbox.address);
 * }
 * ```
 */
export async function* paginate<T>(
  requestFn: PaginatedRequestFn<T>,
  options: PaginateOptions = {}
): AsyncGenerator<T, void, undefined> {
  const limit = options.limit || 50;
  const maxItems = options.maxItems || Infinity;
  let cursor = options.cursor;
  let itemCount = 0;

  while (itemCount < maxItems) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) {
      params.set('cursor', cursor);
    }

    const response = await requestFn(params);

    for (const item of response.data) {
      if (itemCount >= maxItems) break;
      yield item;
      itemCount++;
    }

    if (!response.nextCursor || response.data.length === 0) {
      break;
    }
    cursor = response.nextCursor;
  }
}

/**
 * Collects all items from a paginated endpoint into an array
 * Use with caution for large datasets
 */
export async function collectAll<T>(
  requestFn: PaginatedRequestFn<T>,
  options: PaginateOptions = {}
): Promise<T[]> {
  const items: T[] = [];
  for await (const item of paginate(requestFn, options)) {
    items.push(item);
  }
  return items;
}

/**
 * Helper to create a paginated iterator for a specific endpoint
 */
export function createPaginatedIterator<T>(
  requestFn: PaginatedRequestFn<T>,
  options: PaginateOptions = {}
): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]: () => paginate(requestFn, options),
  };
}
