/**
 * Mock for fetch API
 * Used in unit tests to isolate network requests
 */
import { vi } from 'vitest';

export const mockFetch = vi.fn();

// Install mock globally
globalThis.fetch = mockFetch;

/**
 * Mock a successful API response
 */
export function mockApiResponse<T>(data: T, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

/**
 * Mock an API error response
 */
export function mockApiError(error: string, status = 400) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ error }),
    text: () => Promise.resolve(JSON.stringify({ error })),
  });
}

/**
 * Mock a network failure
 */
export function mockNetworkError(message = 'Network error') {
  mockFetch.mockRejectedValueOnce(new Error(message));
}

/**
 * Reset fetch mock
 */
export function resetFetchMock() {
  mockFetch.mockReset();
}

/**
 * Get all fetch calls for assertions
 */
export function getFetchCalls() {
  return mockFetch.mock.calls;
}

/**
 * Get the last fetch call
 */
export function getLastFetchCall() {
  const calls = mockFetch.mock.calls;
  return calls[calls.length - 1];
}
