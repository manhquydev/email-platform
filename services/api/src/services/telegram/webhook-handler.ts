/**
 * Telegram Webhook Handler
 * Handles incoming updates from Telegram using command pattern
 */

import { respondToCallbackQuery } from './api';
import {
    handleStart,
    handleLink,
    handleUnlink,
    handleSettings,
    handleNotifyOn,
    handleNotifyOff,
    handleHelp,
    handleInboxes,
    handleCopyOtp,
    handleShowHelp,
    handleToggleNotifyOn,
    handleToggleNotifyOff,
    handleConfirmUnlink,
    handleDoUnlink,
    handleCancelUnlink,
    handleForceLink,
    handleUnlinkInbox,
    handleNoop,
    handleCancelAction,
} from './commands';
import type { TelegramUpdate, TelegramMessage, TelegramCallbackQuery } from './types';

// Command handler type
type CommandHandler = (chatId: string, args: string[], message: TelegramMessage) => Promise<void>;
type CallbackHandler = (chatId: string, data: string, query: TelegramCallbackQuery) => Promise<void>;

// Command handlers registry
const commandHandlers: Record<string, CommandHandler> = {
    '/start': handleStart,
    '/link': handleLink,
    '/unlink': handleUnlink,
    '/settings': handleSettings,
    '/notify_on': handleNotifyOn,
    '/notify_off': handleNotifyOff,
    '/help': handleHelp,
    '/inboxes': handleInboxes,
};

// Callback handlers registry
const callbackHandlers: Record<string, CallbackHandler> = {
    'copy_otp': handleCopyOtp,
    'show_help': handleShowHelp,
    'toggle_notify_on': handleToggleNotifyOn,
    'toggle_notify_off': handleToggleNotifyOff,
    'confirm_unlink': handleConfirmUnlink,
    'do_unlink': handleDoUnlink,
    'cancel_unlink': handleCancelUnlink,
    'force_link': handleForceLink,
    'unlink_inbox': handleUnlinkInbox,
    'noop': handleNoop,
    'cancel_action': handleCancelAction,
};

/**
 * Handle Telegram webhook updates
 */
export async function handleTelegramWebhook(update: TelegramUpdate): Promise<void> {
    if (update.message?.text) {
        await handleMessageCommand(update.message);
    } else if (update.callback_query) {
        await handleCallbackQuery(update.callback_query);
    }
}

async function handleMessageCommand(message: TelegramMessage): Promise<void> {
    const chatId = message.chat.id.toString();
    const text = message.text || '';
    const parts = text.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Find exact command match first
    const handler = commandHandlers[command];
    if (handler) {
        await handler(chatId, args, message);
        return;
    }

    // Check for /start with args (deep link)
    if (text.startsWith('/start ')) {
        await commandHandlers['/start'](chatId, args, message);
    }
}

async function handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
    const chatId = query.message?.chat.id.toString();
    if (!chatId) {
        await respondToCallbackQuery(query.id);
        return;
    }

    const data = query.data || '';
    const [action, ...params] = data.split(':');

    const handler = callbackHandlers[action];
    if (handler) {
        await handler(chatId, params.join(':'), query);
    } else {
        await respondToCallbackQuery(query.id);
    }
}
