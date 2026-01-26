/**
 * Telegram Notification Formatter
 * Formats notifications with MarkdownV2 and emoji
 */

type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'PROMOTION';

const TYPE_EMOJI: Record<NotificationType | string, string> = {
  INFO: 'ℹ️',
  WARNING: '⚠️',
  SUCCESS: '✅',
  ERROR: '❌',
  PROMOTION: '🎉',
};

/**
 * Escape special characters for MarkdownV2
 */
export function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

/**
 * Format notification message for Telegram with MarkdownV2
 */
export function formatNotificationMessage(notification: {
  title: string;
  message: string;
  type: string;
}): string {
  const emoji = TYPE_EMOJI[notification.type] || TYPE_EMOJI.INFO;
  const safeTitle = escapeMarkdownV2(notification.title);
  const safeMessage = escapeMarkdownV2(notification.message);

  return `${emoji} *${safeTitle}*\n\n${safeMessage}`;
}

/**
 * Strip HTML tags from message for Telegram
 */
export function stripHtmlForTelegram(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}
