/**
 * Ephemera SDK
 * Official JavaScript/TypeScript SDK for Ephemera temporary email platform
 *
 * @example
 * ```typescript
 * import { EphemeraClient } from '@ephemera/sdk';
 *
 * const client = new EphemeraClient('your-api-key');
 *
 * // Create a temporary inbox
 * const inbox = await client.createInbox();
 * console.log(`Inbox: ${inbox.address}`);
 *
 * // Wait for an email
 * const message = await client.waitForEmail(inbox.id, {
 *   subject: 'Verification',
 *   timeout: 60000
 * });
 *
 * // Extract OTP code
 * const code = client.extractCode(message);
 * console.log(`OTP: ${code}`);
 * ```
 */

export { EphemeraClient } from './client';

export type {
    EphemeraConfig,
    Domain,
    Inbox,
    Message,
    Attachment,
    PaginatedResponse,
    CreateInboxOptions,
    ListMessagesOptions,
    WaitForEmailOptions,
    BulkCreateInboxesOptions,
    BulkDeleteInboxesOptions,
    BulkResult,
} from './types';

export {
    EphemeraError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    RateLimitedError,
    ValidationError,
    QuotaExceededError,
    NetworkError,
    TimeoutError,
    type ErrorCode,
} from './errors';

// Pagination utilities
export {
    paginate,
    collectAll,
    createPaginatedIterator,
    type PaginateOptions,
    type CursorPaginatedResponse,
    type PaginatedRequestFn,
} from './pagination';

// Rate limit handling
export {
    parseRateLimitHeaders,
    calculateRateLimitDelay,
    isRateLimitWarning,
    RateLimitTracker,
    type RateLimitInfo,
    type RateLimitEvent,
    type RateLimitHandler,
} from './rate-limit';

// Retry utilities
export {
    withRetry,
    makeRetryable,
    calculateBackoff,
    sleep,
    isRetryableError,
    type RetryOptions,
} from './retry';

// Webhook verification
export {
    verifyWebhookSignature,
    extractWebhookHeaders,
    parseWebhook,
    type WebhookVerifyResult,
    type WebhookPayload,
    type WebhookEventType,
    type WebhookHeaders,
} from './webhook';

// Realtime SSE client
export {
    RealtimeClient,
    type RealtimeEventType,
    type RealtimeEvent,
    type RealtimeOptions,
    type RealtimeHandler,
} from './realtime';

// Default export for convenience
export { EphemeraClient as default } from './client';
