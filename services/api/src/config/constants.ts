/**
 * Application Constants
 * Extracted magic numbers and configuration values
 */

// Rate limits (requests per window)
export const RATE_LIMITS = {
    AUTH: { max: 5, windowMs: 60 * 1000 },           // 5 per minute for auth
    API: { max: 100, windowMs: 60 * 1000 },          // 100 per minute for API
    PUBLIC: { max: 30, windowMs: 60 * 1000 },        // 30 per minute for public endpoints
    ADMIN: { max: 200, windowMs: 60 * 1000 },        // 200 per minute for admin
} as const;

// Time durations (in milliseconds)
export const DURATIONS = {
    TOKEN_EXPIRY: 15 * 60 * 1000,           // 15 minutes
    REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days
    MAGIC_LINK_EXPIRY: 15 * 60 * 1000,      // 15 minutes
    VERIFICATION_TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
    OTP_EXPIRY: 5 * 60 * 1000,              // 5 minutes
    SESSION_EXTEND: 10 * 60 * 1000,         // 10 minutes
    POLL_INTERVAL: 10 * 1000,               // 10 seconds
    DEBOUNCE: 500,                          // 500ms
    FETCH_TIMEOUT: 10 * 1000,               // 10 seconds for external API calls
    TELEGRAM_TIMEOUT: 15 * 1000,            // 15 seconds for Telegram API
} as const;

// Retention periods (in days)
export const RETENTION = {
    DEFAULT_MESSAGE_TTL_DAYS: 7,
    DEFAULT_INBOX_TTL_DAYS: 7,
    AUDIT_LOG_RETENTION_DAYS: 90,
    ATTACHMENT_RETENTION_DAYS: 30,
} as const;

// Pagination defaults
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    MESSAGES_PAGE_SIZE: 25,
    ADMIN_PAGE_SIZE: 50,
} as const;

// Tier limits - Use unified-tier-limits.ts as single source of truth
// Import: import { DEFAULT_TIER_LIMITS } from './unified-tier-limits';

// File size limits (in bytes)
export const SIZE_LIMITS = {
    MAX_ATTACHMENT: 5 * 1024 * 1024,        // 5 MB
    MAX_EMAIL_BODY: 1 * 1024 * 1024,        // 1 MB
    MAX_SUBJECT_LENGTH: 998,                // RFC 5322
    MAX_LOCAL_PART_LENGTH: 64,              // RFC 5321
} as const;

// Security constants
export const SECURITY = {
    BCRYPT_ROUNDS: 12,
    MIN_PASSWORD_LENGTH: 8,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MS: 15 * 60 * 1000,    // 15 minutes
    CSRF_TOKEN_LENGTH: 32,
} as const;

// Telegram constants
export const TELEGRAM = {
    MAX_MESSAGE_LENGTH: 4096,
    MAX_CAPTION_LENGTH: 1024,
    PARSE_MODE: 'HTML' as const,
    LINK_TOKEN_LENGTH: 16,
    LINK_TOKEN_EXPIRY_MS: 10 * 60 * 1000,   // 10 minutes
} as const;

// Email sending limits
export const EMAIL = {
    MAX_RECIPIENTS: 50,
    MAX_ATTACHMENTS: 10,
    QUEUE_RETRY_ATTEMPTS: 3,
    QUEUE_RETRY_DELAY_MS: 60 * 1000,        // 1 minute
} as const;
