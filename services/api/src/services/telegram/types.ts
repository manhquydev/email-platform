/**
 * Telegram Bot Types
 */

export interface TelegramUser {
    id: number;
    first_name: string;
    username?: string;
}

export interface TelegramChat {
    id: number;
    type: string;
}

export interface TelegramMessage {
    message_id: number;
    from?: TelegramUser;
    chat: TelegramChat;
    date: number;
    text?: string;
}

export interface TelegramCallbackQuery {
    id: string;
    from: TelegramUser;
    message?: {
        message_id: number;
        chat: TelegramChat;
    };
    data?: string;
}

export interface TelegramUpdate {
    update_id: number;
    message?: TelegramMessage;
    callback_query?: TelegramCallbackQuery;
}

export interface SendMessageOptions {
    parseMode?: 'Markdown' | 'HTML';
    replyMarkup?: object;
}

export interface CallbackQueryOptions {
    text?: string;
    showAlert?: boolean;
}

export interface LinkResult {
    success: boolean;
    error?: string;
    userId?: string;
    oldUserEmail?: string;
}

export interface InboxLinkResult {
    success: boolean;
    inboxEmail?: string;
    error?: string;
}
