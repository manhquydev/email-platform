/**
 * API Types - Phase 4 Code Quality
 * Shared type definitions for API responses
 */

/**
 * Paginated response wrapper for list endpoints
 */
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

/**
 * Generic API error response
 */
export interface ApiError {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
}

/**
 * API request options
 */
export interface ApiRequestOptions extends RequestInit {
    timeout?: number;
}
