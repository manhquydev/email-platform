/**
 * Application Constants - Phase 4 Code Quality
 * Centralized configuration values to eliminate magic numbers
 */

/**
 * Pagination settings for list views
 */
export const PAGINATION = {
    /** Number of messages per page in inbox view */
    MESSAGES_PER_PAGE: 20,
    /** Number of inboxes per page in sidebar */
    INBOXES_PER_PAGE: 100,
    /** Number of domains per page in domain list */
    DOMAINS_PER_PAGE: 100,
    /** Number of team members per page */
    TEAM_MEMBERS_PER_PAGE: 50,
    /** Number of forwarding rules per page */
    FORWARDING_RULES_PER_PAGE: 50,
} as const;

/**
 * Timeout durations in milliseconds
 */
export const TIMEOUTS = {
    /** Debounce delay for search input */
    SEARCH_DEBOUNCE: 800,
    /** Default toast notification duration */
    TOAST_DURATION: 4000,
    /** Error toast duration (longer for reading) */
    TOAST_ERROR_DURATION: 5000,
    /** Fast animation duration */
    ANIMATION_FAST: 150,
    /** Normal animation duration */
    ANIMATION_NORMAL: 250,
    /** Slow animation duration */
    ANIMATION_SLOW: 350,
    /** API request timeout */
    API_TIMEOUT: 30000,
    /** Realtime reconnection delay */
    REALTIME_RECONNECT_DELAY: 3000,
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
    /** Theme preference */
    THEME: 'theme',
    /** Selected inbox ID */
    SELECTED_INBOX: 'selectedInbox',
    /** Sidebar collapsed state */
    SIDEBAR_COLLAPSED: 'sidebarCollapsed',
    /** Last viewed message ID */
    LAST_MESSAGE: 'lastMessage',
    /** User preferences */
    PREFERENCES: 'preferences',
} as const;

/**
 * API endpoints base paths
 */
export const API_PATHS = {
    /** Authentication endpoints */
    AUTH: '/auth',
    /** User endpoints */
    USERS: '/users',
    /** Inbox endpoints */
    INBOXES: '/inboxes',
    /** Message endpoints */
    MESSAGES: '/messages',
    /** Domain endpoints */
    DOMAINS: '/domains',
    /** Forwarding endpoints */
    FORWARDING: '/forwarding',
    /** Team endpoints */
    TEAMS: '/teams',
    /** Admin endpoints */
    ADMIN: '/admin',
} as const;

/**
 * Validation limits
 */
export const LIMITS = {
    /** Maximum inbox name length */
    INBOX_NAME_MAX: 64,
    /** Maximum email subject length for display */
    SUBJECT_DISPLAY_MAX: 100,
    /** Maximum preview text length */
    PREVIEW_MAX: 150,
    /** Maximum attachment size in bytes (10MB) */
    ATTACHMENT_MAX_SIZE: 10 * 1024 * 1024,
    /** Maximum number of attachments per message */
    ATTACHMENTS_MAX_COUNT: 10,
} as const;

/**
 * Feature flags (can be extended with remote config)
 */
export const FEATURES = {
    /** Enable realtime updates via WebSocket */
    REALTIME_ENABLED: true,
    /** Enable push notifications */
    PUSH_NOTIFICATIONS_ENABLED: true,
    /** Enable OTP auto-detection */
    OTP_DETECTION_ENABLED: true,
    /** Enable keyboard shortcuts */
    KEYBOARD_SHORTCUTS_ENABLED: true,
} as const;

/**
 * Keyboard shortcut keys
 */
export const SHORTCUTS = {
    /** Compose new message */
    COMPOSE: 'c',
    /** Search */
    SEARCH: '/',
    /** Delete selected */
    DELETE: 'd',
    /** Archive selected */
    ARCHIVE: 'e',
    /** Mark as read/unread */
    TOGGLE_READ: 'r',
    /** Navigate up */
    UP: 'k',
    /** Navigate down */
    DOWN: 'j',
    /** Open selected */
    OPEN: 'Enter',
    /** Go back */
    BACK: 'Escape',
} as const;

export type PaginationKey = keyof typeof PAGINATION;
export type TimeoutKey = keyof typeof TIMEOUTS;
export type StorageKey = keyof typeof STORAGE_KEYS;
export type ApiPath = keyof typeof API_PATHS;
