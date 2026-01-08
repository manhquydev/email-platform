/**
 * Telegram Bot Service
 * Re-exports all modules for convenient imports
 */

// Types
export type {
    TelegramUpdate,
    TelegramMessage,
    TelegramCallbackQuery,
    TelegramUser,
    TelegramChat,
    SendMessageOptions,
    CallbackQueryOptions,
    LinkResult,
    InboxLinkResult,
} from './types';

// API functions
export {
    escapeHtml,
    setupBotCommands,
    sendTelegramMessage,
    sendTelegramPhoto,
    respondToCallbackQuery,
} from './api';

// Link service functions
export {
    generateLinkToken,
    createTelegramLinkToken,
    linkTelegramAccount,
    forceLinkTelegramAccount,
    unlinkTelegramAccount,
    getTelegramStatus,
    updateTelegramNotifyPreference,
    getUserInboxTelegramLinks,
    deleteInboxTelegramLink,
    getInboxLinksByChatId,
    deleteInboxLinkByChatId,
} from './link-service';

// Notification functions
export {
    notifyNewEmail,
    notifyInboxTelegramSubscribers,
    sendNotificationToUser,
} from './notifications';

// Webhook handler
export { handleTelegramWebhook } from './webhook-handler';

// Constants (for external use if needed)
export { getBotToken, getWebUrl } from './constants';
