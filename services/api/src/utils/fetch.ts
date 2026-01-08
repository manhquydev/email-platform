/**
 * Fetch with Timeout Utility
 * Wraps fetch with AbortController for timeout handling
 */

import { DURATIONS } from '../config/constants';

interface FetchWithTimeoutOptions extends RequestInit {
    timeout?: number;
}

/**
 * Fetch with automatic timeout
 * @param url - URL to fetch
 * @param options - Fetch options with optional timeout (default: 10s)
 * @returns Promise<Response>
 * @throws Error on timeout or network failure
 */
export async function fetchWithTimeout(
    url: string,
    options: FetchWithTimeoutOptions = {}
): Promise<Response> {
    const { timeout = DURATIONS.FETCH_TIMEOUT, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
        });
        return response;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeout}ms: ${url}`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Fetch JSON with timeout
 * @param url - URL to fetch
 * @param options - Fetch options with optional timeout
 * @returns Promise<T> - Parsed JSON response
 */
export async function fetchJsonWithTimeout<T>(
    url: string,
    options: FetchWithTimeoutOptions = {}
): Promise<T> {
    const response = await fetchWithTimeout(url, options);

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json() as Promise<T>;
}

/**
 * Post JSON with timeout
 * @param url - URL to post to
 * @param body - JSON body to send
 * @param options - Additional fetch options
 * @returns Promise<T> - Parsed JSON response
 */
export async function postJsonWithTimeout<T>(
    url: string,
    body: unknown,
    options: FetchWithTimeoutOptions = {}
): Promise<T> {
    return fetchJsonWithTimeout<T>(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        body: JSON.stringify(body),
        ...options,
    });
}
