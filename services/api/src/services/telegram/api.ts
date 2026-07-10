/**
 * Telegram Bot API Functions
 * Low-level API calls to Telegram Bot API
 */

import { TELEGRAM_API_BASE, getApiUrl, getBotToken, BOT_COMMANDS } from './constants';
import type { SendMessageOptions, CallbackQueryOptions } from './types';

/**
 * Escape HTML entities for Telegram HTML parse mode
 */
export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Setup bot commands menu in Telegram
 * This should be called once on server startup
 */
export async function setupBotCommands(): Promise<boolean> {
    const token = getBotToken();
    if (!token) {
        console.log('[Telegram] Bot token not configured, skipping command setup');
        return false;
    }

    try {
        const response = await fetch(`${TELEGRAM_API_BASE}${token}/setMyCommands`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commands: BOT_COMMANDS }),
        });

        if (response.ok) {
            console.log('[Telegram] Bot commands menu set successfully');
            return true;
        } else {
            console.error('[Telegram] Failed to set commands:', await response.text());
            return false;
        }
    } catch (error) {
        console.error('[Telegram] Error setting commands:', error);
        return false;
    }
}

/**
 * Register the Telegram webhook to point at this deployment's public API.
 * Called on server startup so the webhook always tracks the current API_URL
 * (e.g. after a domain change) instead of requiring a manual reset. No-ops in
 * dev where API_URL is not a public HTTPS URL Telegram can reach.
 */
export async function registerWebhook(): Promise<boolean> {
    const token = getBotToken();
    if (!token) {
        console.log('[Telegram] Bot token not configured, skipping webhook registration');
        return false;
    }

    const apiUrl = getApiUrl();
    if (!/^https:\/\//i.test(apiUrl)) {
        console.log(`[Telegram] API_URL is not public HTTPS (${apiUrl}), skipping webhook registration`);
        return false;
    }

    const webhookUrl = `${apiUrl.replace(/\/$/, '')}/telegram/webhook`;
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

    try {
        const response = await fetch(`${TELEGRAM_API_BASE}${token}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: webhookUrl,
                allowed_updates: ['message', 'callback_query'],
                ...(secret ? { secret_token: secret } : {}),
            }),
        });

        if (response.ok) {
            console.log(`[Telegram] Webhook registered: ${webhookUrl}`);
            return true;
        } else {
            console.error('[Telegram] Failed to register webhook:', await response.text());
            return false;
        }
    } catch (error) {
        console.error('[Telegram] Error registering webhook:', error);
        return false;
    }
}

/**
 * Send a message via Telegram Bot API
 * Returns message_id on success, null on failure
 */
export async function sendTelegramMessage(
    chatId: string,
    text: string,
    options?: SendMessageOptions
): Promise<{ success: boolean; messageId?: number }> {
    const token = getBotToken();
    if (!token) {
        console.error('[Telegram] Bot token not configured');
        return { success: false };
    }

    try {
        const response = await fetch(`${TELEGRAM_API_BASE}${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: options?.parseMode || 'Markdown',
                reply_markup: options?.replyMarkup,
                disable_notification: options?.silent,
                protect_content: options?.protectContent,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('[Telegram] Send message failed:', error);
            return { success: false };
        }

        const result = await response.json();
        return { success: true, messageId: result.result?.message_id };
    } catch (error) {
        console.error('[Telegram] Send message error:', error);
        return { success: false };
    }
}

/**
 * Send a photo via Telegram Bot API
 */
export async function sendTelegramPhoto(
    chatId: string,
    photo: string,
    caption?: string,
    options?: SendMessageOptions
): Promise<boolean> {
    const token = getBotToken();
    if (!token) {
        console.error('[Telegram] Bot token not configured');
        return false;
    }

    try {
        const response = await fetch(`${TELEGRAM_API_BASE}${token}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                photo: photo,
                caption: caption,
                parse_mode: options?.parseMode || 'Markdown',
                reply_markup: options?.replyMarkup,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('[Telegram] Send photo failed:', error);
            // Fallback to text message if photo fails
            if (caption) {
                const result = await sendTelegramMessage(chatId, caption, options);
                return result.success;
            }
            return false;
        }

        return true;
    } catch (error) {
        console.error('[Telegram] Send photo error:', error);
        return false;
    }
}

/**
 * Answer a callback query to acknowledge button presses
 */
export async function respondToCallbackQuery(
    callbackQueryId: string,
    options?: CallbackQueryOptions
): Promise<boolean> {
    const token = getBotToken();
    if (!token) return false;

    try {
        const response = await fetch(`${TELEGRAM_API_BASE}${token}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                callback_query_id: callbackQueryId,
                text: options?.text,
                show_alert: options?.showAlert,
            }),
        });

        return response.ok;
    } catch (error) {
        console.error('[Telegram] Answer callback error:', error);
        return false;
    }
}
