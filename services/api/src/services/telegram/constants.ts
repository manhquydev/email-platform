/**
 * Telegram Bot Constants
 */

// Telegram Bot API base URL
export const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

// Token generation characters (no confusing chars like 0,O,1,I)
export const TOKEN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const TOKEN_LENGTH = 6;
export const TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

// Content limits
export const MAX_MESSAGE_LENGTH = 3500;
export const PREVIEW_LENGTH = 200;

// Bot commands menu
export const BOT_COMMANDS = [
    { command: 'start', description: '🚀 Bắt đầu sử dụng bot' },
    { command: 'link', description: '🔗 Liên kết tài khoản (cần mã)' },
    { command: 'inboxes', description: '📬 Xem hộp thư đã liên kết' },
    { command: 'settings', description: '⚙️ Xem và thay đổi cài đặt' },
    { command: 'unlink', description: '🔓 Hủy liên kết Telegram' },
    { command: 'help', description: '❓ Xem hướng dẫn sử dụng' },
];

// Notification type emojis
export const NOTIFICATION_EMOJIS: Record<string, string> = {
    INFO: 'ℹ️',
    WARNING: '⚠️',
    SUCCESS: '✅',
    ERROR: '❌',
    PROMOTION: '🎉',
    DEFAULT: '📢',
};

// Get web URL with fallback
export const getWebUrl = () => process.env.WEB_URL || 'https://app.manhquy.click';

// Get bot token from environment
export const getBotToken = () => process.env.TELEGRAM_BOT_TOKEN;
