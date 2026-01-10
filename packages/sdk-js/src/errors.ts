/**
 * Ephemera SDK Error Classes
 * Provides detailed error information with codes for programmatic handling
 */

export type ErrorCode =
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'RATE_LIMITED'
    | 'VALIDATION_ERROR'
    | 'QUOTA_EXCEEDED'
    | 'INBOX_EXPIRED'
    | 'DOMAIN_NOT_VERIFIED'
    | 'NETWORK_ERROR'
    | 'TIMEOUT'
    | 'UNKNOWN';

export class EphemeraError extends Error {
    constructor(
        message: string,
        public readonly code: ErrorCode,
        public readonly status: number,
        public readonly details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'EphemeraError';
        Object.setPrototypeOf(this, EphemeraError.prototype);
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            status: this.status,
            details: this.details,
        };
    }
}

export class UnauthorizedError extends EphemeraError {
    constructor(message = 'Invalid or missing API key') {
        super(message, 'UNAUTHORIZED', 401);
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends EphemeraError {
    constructor(message = 'You do not have permission to perform this action') {
        super(message, 'FORBIDDEN', 403);
        this.name = 'ForbiddenError';
    }
}

export class NotFoundError extends EphemeraError {
    constructor(resource: string, id?: string) {
        super(id ? `${resource} with id '${id}' not found` : `${resource} not found`, 'NOT_FOUND', 404);
        this.name = 'NotFoundError';
    }
}

export class RateLimitedError extends EphemeraError {
    constructor(
        message = 'Rate limit exceeded',
        public readonly retryAfter?: number
    ) {
        super(message, 'RATE_LIMITED', 429, { retryAfter });
        this.name = 'RateLimitedError';
    }
}

export class ValidationError extends EphemeraError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, 'VALIDATION_ERROR', 400, details);
        this.name = 'ValidationError';
    }
}

export class QuotaExceededError extends EphemeraError {
    constructor(resource: string) {
        super(`Quota exceeded for ${resource}`, 'QUOTA_EXCEEDED', 402);
        this.name = 'QuotaExceededError';
    }
}

export class NetworkError extends EphemeraError {
    constructor(message = 'Network request failed') {
        super(message, 'NETWORK_ERROR', 0);
        this.name = 'NetworkError';
    }
}

export class TimeoutError extends EphemeraError {
    constructor(message = 'Request timed out') {
        super(message, 'TIMEOUT', 0);
        this.name = 'TimeoutError';
    }
}

/**
 * Create an appropriate error from an API response
 */
export function createErrorFromResponse(status: number, body: unknown): EphemeraError {
    const message = typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: unknown }).error)
        : 'Unknown error';

    switch (status) {
        case 401:
            return new UnauthorizedError(message);
        case 403:
            return new ForbiddenError(message);
        case 404:
            return new NotFoundError('Resource', undefined);
        case 429:
            return new RateLimitedError(message);
        case 400:
            return new ValidationError(message, body as Record<string, unknown>);
        case 402:
            return new QuotaExceededError('resource');
        default:
            return new EphemeraError(message, 'UNKNOWN', status, body as Record<string, unknown>);
    }
}
