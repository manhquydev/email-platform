/**
 * Telegram Inline Keyboard Builder
 * Builds inline keyboards for notification actions
 */

interface KeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

interface InlineKeyboardOptions {
  showAcknowledge?: boolean;
  webUrl?: string;
  notificationId?: string;
}

/**
 * Build inline keyboard for notification messages
 */
export function buildNotificationKeyboard(options: InlineKeyboardOptions): { inline_keyboard: KeyboardButton[][] } {
  const keyboard: KeyboardButton[][] = [];

  // Acknowledge button
  if (options.showAcknowledge && options.notificationId) {
    keyboard.push([{
      text: '✓ Đã xem',
      callback_data: `ack:${options.notificationId}`,
    }]);
  }

  // Web URL button
  if (options.webUrl) {
    keyboard.push([{
      text: '🔗 Xem trên Web',
      url: options.webUrl,
    }]);
  }

  return { inline_keyboard: keyboard };
}

/**
 * Build empty keyboard (for removing buttons after acknowledge)
 */
export function buildEmptyKeyboard(): { inline_keyboard: KeyboardButton[][] } {
  return { inline_keyboard: [] };
}
