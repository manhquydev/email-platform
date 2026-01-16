/**
 * Extension Constants
 * Centralized configuration values to avoid magic numbers
 */

// Timing constants
export const COUNTDOWN_INTERVAL_MS = 1000;
export const DEBOUNCE_DELAY_MS = 300;
export const ALARM_POLL_INTERVAL_MINUTES = 1;
export const INBOX_EXTENSION_MINUTES = 10;
export const TEMPORARY_INBOX_HOURS = 24;

// Limits
export const MAX_CONTEXT_MENU_INBOXES = 8;
export const MAX_DROPDOWN_INBOXES = 8;

// Tier limits (fallback values, should be fetched from API)
export const TIER_LIMITS = {
  FREE: 5,
  STARTER: 20,
  PRO: 100,
} as const;

// UI constants
export const ICON_SIZE = 24;
export const DROPDOWN_WIDTH = 260;
export const POPUP_WIDTH = 400;
export const POPUP_MIN_HEIGHT = 500;

// Retry configuration
export const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 4000,
} as const;

// Animation durations
export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

// Expiry warning threshold (5 minutes in ms)
export const EXPIRY_WARNING_MS = 5 * 60 * 1000;
