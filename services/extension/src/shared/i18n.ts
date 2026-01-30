import browser from 'webextension-polyfill';

/**
 * Internationalization utility for the extension.
 * Wraps browser.i18n.getMessage for type-safe translations.
 */

/** Available message keys from _locales/en/messages.json */
export type MessageKey =
  | 'extName'
  | 'extDescription'
  | 'signIn'
  | 'email'
  | 'emailAddress'
  | 'password'
  | 'loginFailed'
  | 'activeInboxes'
  | 'createNewInbox'
  | 'generateNew'
  | 'copied'
  | 'viewMessages'
  | 'dashboard'
  | 'settings'
  | 'logout'
  | 'noInboxes'
  | 'createFirstInbox'
  | 'loading'
  | 'signInRequired'
  | 'signInRequiredDesc'
  | 'goAnonymous'
  | 'secureEntry'
  | 'newToEphemera'
  | 'createAccount'
  | 'securityCheck'
  | 'verifyAndContinue'
  | 'backToLogin'
  | 'expired'
  | 'refresh'
  | 'reply'
  | 'forward'
  | 'send'
  | 'sending'
  | 'messageSent'
  | 'to'
  | 'subject'
  | 'composeBody'
  | 'searchAllMessages'
  | 'noSearchResults'
  | 'searchResultsCount'
  | 'pinInbox'
  | 'unpinInbox'
  | 'pinnedInboxes'
  | 'noMessages'
  | 'loadingPreview'
  | 'errorBoundary_title'
  | 'errorBoundary_message';

/**
 * Get a translated message by key.
 * Falls back to the key itself if translation not found.
 */
export function t(key: MessageKey, substitutions?: string | string[]): string {
  try {
    const message = browser.i18n.getMessage(key, substitutions);
    return message || key;
  } catch {
    // Fallback for environments where browser.i18n is not available
    return key;
  }
}

/**
 * Get the current UI language.
 */
export function getUILanguage(): string {
  try {
    return browser.i18n.getUILanguage();
  } catch {
    return 'en';
  }
}

/**
 * Check if the current language is RTL (right-to-left).
 */
export function isRTL(): boolean {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  const lang = getUILanguage().split('-')[0];
  return rtlLanguages.includes(lang);
}

/**
 * Format a date according to the user's locale.
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const locale = getUILanguage();

  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  return d.toLocaleString(locale, options || defaultOptions);
}

/**
 * Format a relative time (e.g., "2 minutes ago").
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = Date.now();
  const diff = now - d.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const locale = getUILanguage();

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (days > 0) return rtf.format(-days, 'day');
    if (hours > 0) return rtf.format(-hours, 'hour');
    if (minutes > 0) return rtf.format(-minutes, 'minute');
    return rtf.format(-seconds, 'second');
  } catch {
    // Fallback for older browsers
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }
}

/**
 * Format a number according to the user's locale.
 */
export function formatNumber(num: number): string {
  const locale = getUILanguage();
  return num.toLocaleString(locale);
}
