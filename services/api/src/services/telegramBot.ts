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
export async function unlinkTelegramAccount(userId: string, notifyUser: boolean = true): Promise<boolean> {
    // Get current chatId before unlinking
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { telegramChatId: true }
    });

    const chatId = user?.telegramChatId;

    // Clear the link
    await prisma.user.update({
        where: { id: userId },
        data: {
            telegramChatId: null,
            telegramLinkedAt: null,
        }
    });

    // Notify user via bot if they have a chatId and notifyUser is true
    if (chatId && notifyUser) {
        const webUrl = process.env.WEB_URL || 'https://app.manhquy.click';
        const message = `📱 <b>Hủy liên kết thành công</b>

Bạn đã hủy liên kết Telegram khỏi tài khoản email.

Để liên kết lại:
1. Vào <b>Cài đặt → Thông báo</b>
2. Nhấn "Liên kết Telegram"
3. Gửi mã liên kết cho bot này`;

        await sendTelegramMessage(chatId, message, 'HTML', {
            inline_keyboard: [[
                { text: '🔗 Mở Cài đặt', url: `${webUrl}/app?tab=settings&section=notifications` }
            ]]
        });
    }

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
            // Welcome message with Ephemera branding and inline keyboard
            const webUrl = process.env.WEB_URL || 'https://app.manhquy.click';
            await sendTelegramMessage(chatId,
                '👋 <b>Chào mừng đến với Ephemera Bot!</b>\n\n' +
                '📬 Bot này giúp bạn nhận thông báo email tức thì, bao gồm mã OTP và tin nhắn quan trọng.\n\n' +
                '<b>Để bắt đầu:</b>\n' +
                '1️⃣ Vào <b>Cài đặt → Thông báo</b> trên web\n' +
                '2️⃣ Nhấn "Liên kết Telegram"\n' +
                '3️⃣ Copy mã và gửi: /link [mã]\n\n' +
                '💡 <i>Hoặc nhấn nút bên dưới để mở trang cài đặt</i>',
                'HTML',
                {
                    inline_keyboard: [
                        [{ text: '🔗 Mở Cài đặt', url: `${webUrl}/app?tab=settings&section=notifications` }],
                        [{ text: '❓ Trợ giúp', callback_data: 'show_help' }]
                    ]
                }
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
            await unlinkTelegramAccount(user.id, false); // Don't send auto notification, we have custom message
            await sendTelegramMessage(chatId,
                '✅ Đã hủy liên kết tài khoản Telegram.\\n\\nBạn có thể liên kết lại bất cứ lúc nào bằng lệnh /link',
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
            const webUrl = process.env.WEB_URL || 'https://app.manhquy.click';
            await sendTelegramMessage(chatId,
                '⚙️ <b>Cài đặt Ephemera Bot</b>\n\n' +
                `📧 <b>Thông báo email:</b> ${status.notifyOnEmail ? '✅ Đang bật' : '❌ Đang tắt'}\n` +
                `📅 <b>Liên kết từ:</b> ${status.linkedAt ? new Date(status.linkedAt).toLocaleDateString('vi-VN') : 'N/A'}\n\n` +
                '💡 <i>Nhấn nút bên dưới để thay đổi cài đặt</i>',
                'HTML',
                {
                    inline_keyboard: [
                        [
                            { text: status.notifyOnEmail ? '🔔 Tắt thông báo' : '🔔 Bật thông báo', callback_data: status.notifyOnEmail ? 'toggle_notify_off' : 'toggle_notify_on' }
                        ],
                        [
                            { text: '🔓 Hủy liên kết', callback_data: 'confirm_unlink' },
                            { text: '🌐 Mở Web', url: `${webUrl}/app` }
                        ]
                    ]
                }
            );
        } else {
            const webUrl = process.env.WEB_URL || 'https://app.manhquy.click';
            await sendTelegramMessage(chatId,
                '❌ <b>Chưa liên kết</b>\n\n' +
                'Tài khoản Telegram này chưa được liên kết với Ephemera.\n\n' +
                '💡 Để liên kết, hãy:\n' +
                '1. Vào <b>Cài đặt → Thông báo</b> trên web\n' +
                '2. Nhấn "Liên kết Telegram" và lấy mã\n' +
                '3. Gửi: /link [mã]',
                'HTML',
                {
                    inline_keyboard: [
                        [{ text: '🔗 Mở Cài đặt', url: `${webUrl}/app?tab=settings&section=notifications` }]
                    ]
                }
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
        const webUrl = process.env.WEB_URL || 'https://app.manhquy.click';
        await sendTelegramMessage(chatId,
            '📚 <b>Trợ giúp Ephemera Bot</b>\n\n' +
            '<b>🔗 Liên kết:</b>\n' +
            '/start - Bắt đầu sử dụng bot\n' +
            '/link [mã] - Liên kết với tài khoản\n' +
            '/unlink - Hủy liên kết\n\n' +
            '<b>⚙️ Cài đặt:</b>\n' +
            '/settings - Xem và quản lý cài đặt\n' +
            '/notify_on - Bật thông báo email\n' +
            '/notify_off - Tắt thông báo email\n\n' +
            '<b>💡 Mẹo:</b> Bạn có thể nhấn nút trong tin nhắn để thao tác nhanh hơn!',
            'HTML',
            {
                inline_keyboard: [
                    [{ text: '🌐 Mở Ephemera Web', url: `${webUrl}/app` }]
                ]
            }
        );
    }

    // Handle Callback Queries (Button clicks)
    else if (update.callback_query) {
        const callbackQuery = update.callback_query;
        const callbackData = callbackQuery.data;
        const chatId = callbackQuery.message?.chat.id.toString();

        if (!chatId) {
            await respondToCallbackQuery(callbackQuery.id);
            return;
        }

        // Copy OTP
        if (callbackData?.startsWith('copy_otp:')) {
            const otp = callbackData.split(':')[1];
            await respondToCallbackQuery(callbackQuery.id, {
                text: `Mã OTP: ${otp}`,
                showAlert: true
            });
        }
        // Show help
        else if (callbackData === 'show_help') {
            await respondToCallbackQuery(callbackQuery.id);
            const webUrl = process.env.WEB_URL || 'https://app.manhquy.click';
            await sendTelegramMessage(chatId,
                '📚 <b>Trợ giúp Ephemera Bot</b>\n\n' +
                '<b>🔗 Liên kết:</b>\n' +
                '/start - Bắt đầu\n/link [mã] - Liên kết\n/unlink - Hủy liên kết\n\n' +
                '<b>⚙️ Cài đặt:</b>\n' +
                '/settings - Quản lý cài đặt\n/notify_on - Bật thông báo\n/notify_off - Tắt thông báo',
                'HTML',
                { inline_keyboard: [[{ text: '🌐 Mở Web', url: `${webUrl}/app` }]] }
            );
        }
        // Toggle notification on
        else if (callbackData === 'toggle_notify_on') {
            const user = await prisma.user.findFirst({ where: { telegramChatId: chatId } });
            if (user) {
                await updateTelegramNotifyPreference(user.id, true);
                await respondToCallbackQuery(callbackQuery.id, { text: '✅ Đã bật thông báo!' });
                await sendTelegramMessage(chatId, '✅ Đã bật thông báo email.\n\nSử dụng /settings để xem cài đặt.', 'HTML');
            }
        }
        // Toggle notification off
        else if (callbackData === 'toggle_notify_off') {
            const user = await prisma.user.findFirst({ where: { telegramChatId: chatId } });
            if (user) {
                await updateTelegramNotifyPreference(user.id, false);
                await respondToCallbackQuery(callbackQuery.id, { text: '✅ Đã tắt thông báo!' });
                await sendTelegramMessage(chatId, '✅ Đã tắt thông báo email.\n\nSử dụng /settings để xem cài đặt.', 'HTML');
            }
        }
        // Confirm unlink
        else if (callbackData === 'confirm_unlink') {
            await respondToCallbackQuery(callbackQuery.id);
            await sendTelegramMessage(chatId,
                '⚠️ <b>Xác nhận hủy liên kết?</b>\n\n' +
                'Bạn sẽ không nhận được thông báo email nữa.\n\n' +
                'Nhấn nút bên dưới để xác nhận:',
                'HTML',
                {
                    inline_keyboard: [
                        [{ text: '✅ Xác nhận hủy', callback_data: 'do_unlink' }],
                        [{ text: '❌ Hủy bỏ', callback_data: 'cancel_unlink' }]
                    ]
                }
            );
        }
        // Do unlink
        else if (callbackData === 'do_unlink') {
            const user = await prisma.user.findFirst({ where: { telegramChatId: chatId } });
            if (user) {
                await unlinkTelegramAccount(user.id, false);
                await respondToCallbackQuery(callbackQuery.id, { text: '✅ Đã hủy liên kết!' });
                await sendTelegramMessage(chatId,
                    '✅ <b>Đã hủy liên kết</b>\n\nBạn có thể liên kết lại bất cứ lúc nào bằng lệnh /start',
                    'HTML'
                );
            }
        }
        // Cancel unlink
        else if (callbackData === 'cancel_unlink') {
            await respondToCallbackQuery(callbackQuery.id, { text: 'Đã hủy thao tác' });
        }
        // Default
        else {
            await respondToCallbackQuery(callbackQuery.id);
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
