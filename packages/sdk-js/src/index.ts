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

// Default export for convenience
export { EphemeraClient as default } from './client';
