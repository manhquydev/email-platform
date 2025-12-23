/**
 * Telegram Bot Service
 * Handles Telegram integration for email notifications
 */

import { prisma } from "../lib/prisma";
import { extractOTP } from "../utils/otpExtractor";

// Telegram Bot API base URL
const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

// Get bot token from environment
const getBotToken = () => process.env.TELEGRAM_BOT_TOKEN;

// Generate random 6-character alphanumeric token
export function generateLinkToken(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars like 0,O,1,I
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Send a message via Telegram Bot API
 */
export async function sendTelegramMessage(
    chatId: string,
    text: string,
    options?: {
        parseMode?: 'Markdown' | 'HTML';
        replyMarkup?: object;
    }
): Promise<boolean> {
    const token = getBotToken();
    if (!token) {
        console.error('[Telegram] Bot token not configured');
        return false;
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
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('[Telegram] Send message failed:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('[Telegram] Send message error:', error);
        return false;
    }
}

/**
 * Answer a callback query to acknowledge button presses
 */
export async function respondToCallbackQuery(
    callbackQueryId: string,
    options?: {
        text?: string;
        showAlert?: boolean;
    }
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

/**
 * Create a link token for user to connect Telegram
 */
export async function createTelegramLinkToken(userId: string): Promise<string> {
    // Delete any existing unused tokens for this user
    await prisma.telegramLinkToken.deleteMany({
        where: { userId, usedAt: null }
    });

    // Create new token
    const token = generateLinkToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.telegramLinkToken.create({
        data: {
            userId,
            token,
            expiresAt,
        }
    });

    return token;
}

/**
 * Link Telegram account using token
 */
export async function linkTelegramAccount(
    token: string,
    chatId: string
): Promise<{ success: boolean; error?: string; userId?: string }> {
    const linkToken = await prisma.telegramLinkToken.findFirst({
        where: {
            token: token.toUpperCase(),
            usedAt: null,
            expiresAt: { gt: new Date() }
        },
        include: { user: true }
    });

    if (!linkToken) {
        return { success: false, error: 'Mã không hợp lệ hoặc đã hết hạn' };
    }

    // Check if this Telegram account is already linked to another user
    const existingLink = await prisma.user.findFirst({
        where: { telegramChatId: chatId }
    });

    if (existingLink && existingLink.id !== linkToken.userId) {
        return { success: false, error: 'Tài khoản Telegram này đã được liên kết với người dùng khác' };
    }

    // Link the account
    await prisma.$transaction([
        prisma.user.update({
            where: { id: linkToken.userId },
            data: {
                telegramChatId: chatId,
                telegramLinkedAt: new Date(),
                notifyOnEmail: true,
            }
        }),
        prisma.telegramLinkToken.update({
            where: { id: linkToken.id },
            data: { usedAt: new Date() }
        })
    ]);

    return { success: true, userId: linkToken.userId };
}

/**
 * Unlink Telegram account
 */
export async function unlinkTelegramAccount(userId: string): Promise<boolean> {
    await prisma.user.update({
        where: { id: userId },
        data: {
            telegramChatId: null,
            telegramLinkedAt: null,
        }
    });
    return true;
}

/**
 * Get Telegram link status for user
 */
export async function getTelegramStatus(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            telegramChatId: true,
            telegramLinkedAt: true,
            notifyOnEmail: true,
        }
    });

    return {
        linked: !!user?.telegramChatId,
        linkedAt: user?.telegramLinkedAt,
        notifyOnEmail: user?.notifyOnEmail ?? true,
    };
}

/**
 * Update notification preferences
 */
export async function updateTelegramNotifyPreference(
    userId: string,
    notifyOnEmail: boolean
): Promise<void> {
    await prisma.user.update({
        where: { id: userId },
        data: { notifyOnEmail }
    });
}

/**
 * Send email notification via Telegram
 */
export async function notifyNewEmail(
    userId: string,
    message: {
        id: string;
        fromAddress: string | null;
        toAddress: string | null;
        subject: string | null;
        textBody: string | null;
        htmlBody: string | null;
    }
): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            telegramChatId: true,
            notifyOnEmail: true,
        }
    });

    if (!user?.telegramChatId || !user.notifyOnEmail) {
        return false;
    }

    // Extract OTP if present
    const content = message.textBody || message.htmlBody?.replace(/<[^>]*>/g, '') || '';
    const otpResult = extractOTP(content);
    const otp = otpResult?.code;

    // Format the message
    const lines = [
        '📩 *Email mới*',
        '',
        `📤 Từ: \`${message.fromAddress || 'Unknown'}\``,
        `📥 Đến: \`${message.toAddress || ''}\``,
        `📋 Tiêu đề: ${message.subject || '(Không có tiêu đề)'}`,
    ];

    if (otp) {
        lines.push('');
        lines.push(`🔢 *Mã OTP: \`${otp}\`*`);
    }

    // Inline keyboard for actions
    const replyMarkup = {
        inline_keyboard: [
            otp ? [
                { text: `📋 Copy OTP: ${otp}`, callback_data: `copy_otp:${otp}` },
            ] : [],
            [
                { text: '🌐 Xem chi tiết', url: `${process.env.WEB_URL || 'https://app.manhquy.click'}/app` },
            ]
        ].filter(row => row.length > 0)
    };

    return sendTelegramMessage(user.telegramChatId, lines.join('\n'), {
        parseMode: 'Markdown',
        replyMarkup,
    });
}

/**
 * Handle Telegram webhook updates
 */
export async function handleTelegramWebhook(update: TelegramUpdate): Promise<void> {
    // Handle /start command
    if (update.message?.text?.startsWith('/start')) {
        const chatId = update.message.chat.id.toString();
        const args = update.message.text.split(' ');

        if (args.length > 1) {
            // Link with token
            const token = args[1];
            const result = await linkTelegramAccount(token, chatId);

            if (result.success) {
                await sendTelegramMessage(chatId,
                    '✅ *Liên kết thành công!*\n\nBạn sẽ nhận thông báo khi có email mới.\n\nSử dụng /settings để tùy chỉnh.',
                    { parseMode: 'Markdown' }
                );
            } else {
                await sendTelegramMessage(chatId,
                    `❌ *Liên kết thất bại*\n\n${result.error}`,
                    { parseMode: 'Markdown' }
                );
            }
        } else {
            // Welcome message (use HTML to avoid Markdown escape issues)
            await sendTelegramMessage(chatId,
                '👋 <b>Chào mừng đến với TempMail Pro Bot!</b>\n\n' +
                'Để liên kết tài khoản, hãy:\n' +
                '1. Vào Settings trên web\n' +
                '2. Click "Liên kết Telegram"\n' +
                '3. Nhập mã code được cung cấp\n\n' +
                'Hoặc nhấn /link [mã code]',
                { parseMode: 'HTML' }
            );
        }
    }

    // Handle /link command
    else if (update.message?.text?.startsWith('/link')) {
        const chatId = update.message.chat.id.toString();
        const args = update.message.text.split(' ');

        if (args.length > 1) {
            const token = args[1];
            const result = await linkTelegramAccount(token, chatId);

            if (result.success) {
                await sendTelegramMessage(chatId,
                    '✅ *Liên kết thành công!*\n\nBạn sẽ nhận thông báo khi có email mới.',
                    { parseMode: 'Markdown' }
                );
            } else {
                await sendTelegramMessage(chatId,
                    `❌ *Lỗi*: ${result.error}`,
                    { parseMode: 'Markdown' }
                );
            }
        } else {
            await sendTelegramMessage(chatId,
                '💡 Sử dụng: /link [mã code]\n\nLấy mã code từ Settings trên web.'
            );
        }
    }

    // Handle /unlink command
    else if (update.message?.text === '/unlink') {
        const chatId = update.message.chat.id.toString();
        const user = await prisma.user.findFirst({
            where: { telegramChatId: chatId }
        });

        if (user) {
            await unlinkTelegramAccount(user.id);
            await sendTelegramMessage(chatId,
                '✅ Đã hủy liên kết tài khoản Telegram.',
                { parseMode: 'Markdown' }
            );
        } else {
            await sendTelegramMessage(chatId,
                '❌ Tài khoản Telegram này chưa được liên kết.',
                { parseMode: 'Markdown' }
            );
        }
    }

    // Handle /settings command
    else if (update.message?.text === '/settings') {
        const chatId = update.message.chat.id.toString();
        const user = await prisma.user.findFirst({
            where: { telegramChatId: chatId }
        });

        if (user) {
            const status = await getTelegramStatus(user.id);
            await sendTelegramMessage(chatId,
                '⚙️ *Cài đặt*\n\n' +
                `📧 Thông báo email: ${status.notifyOnEmail ? '✅ Bật' : '❌ Tắt'}\n\n` +
                'Sử dụng:\n' +
                '/notify\\_on - Bật thông báo\n' +
                '/notify\\_off - Tắt thông báo\n' +
                '/unlink - Hủy liên kết',
                { parseMode: 'Markdown' }
            );
        } else {
            await sendTelegramMessage(chatId,
                '❌ Tài khoản chưa được liên kết. Sử dụng /link <mã_code>',
                { parseMode: 'Markdown' }
            );
        }
    }

    // Handle /notify_on command
    else if (update.message?.text === '/notify_on') {
        const chatId = update.message.chat.id.toString();
        const user = await prisma.user.findFirst({ where: { telegramChatId: chatId } });
        if (user) {
            await updateTelegramNotifyPreference(user.id, true);
            await sendTelegramMessage(chatId, '✅ Đã bật thông báo email.', { parseMode: 'Markdown' });
        }
    }

    // Handle /notify_off command
    else if (update.message?.text === '/notify_off') {
        const chatId = update.message.chat.id.toString();
        const user = await prisma.user.findFirst({ where: { telegramChatId: chatId } });
        if (user) {
            await updateTelegramNotifyPreference(user.id, false);
            await sendTelegramMessage(chatId, '✅ Đã tắt thông báo email.', { parseMode: 'Markdown' });
        }
    }

    // Handle /help command
    else if (update.message?.text === '/help') {
        const chatId = update.message.chat.id.toString();
        await sendTelegramMessage(chatId,
            '📚 *Danh sách lệnh*\n\n' +
            '/start - Bắt đầu\n' +
            '/link <code> - Liên kết tài khoản\n' +
            '/unlink - Hủy liên kết\n' +
            '/settings - Xem cài đặt\n' +
            '/notify\\_on - Bật thông báo\n' +
            '/notify\\_off - Tắt thông báo\n' +
            '/help - Xem trợ giúp',
            { parseMode: 'Markdown' }
        );
    }

    // Handle Callback Queries (Button clicks)
    else if (update.callback_query) {
        const callbackData = update.callback_query.data;

        if (callbackData?.startsWith('copy_otp:')) {
            const otp = callbackData.split(':')[1];
            await respondToCallbackQuery(update.callback_query.id, {
                text: `Mã OTP đã được sao chép: ${otp}`,
                showAlert: true
            });
        } else {
            // Acknowledge other callbacks
            await respondToCallbackQuery(update.callback_query.id);
        }
    }
}

// Telegram Update type
interface TelegramUpdate {
    update_id: number;
    message?: {
        message_id: number;
        from?: {
            id: number;
            first_name: string;
            username?: string;
        };
        chat: {
            id: number;
            type: string;
        };
        date: number;
        text?: string;
    };
    callback_query?: {
        id: string;
        from: {
            id: number;
            first_name: string;
        };
        data?: string;
    };
}

export type { TelegramUpdate };
