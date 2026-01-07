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

// Escape HTML entities for Telegram HTML parse mode
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

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
 * Setup bot commands menu in Telegram
 * This should be called once on server startup
 */
export async function setupBotCommands(): Promise<boolean> {
    const token = getBotToken();
    if (!token) {
        console.log('[Telegram] Bot token not configured, skipping command setup');
        return false;
    }

    const commands = [
        { command: 'start', description: '🚀 Bắt đầu sử dụng bot' },
        { command: 'link', description: '🔗 Liên kết tài khoản (cần mã)' },
        { command: 'inboxes', description: '📬 Xem hộp thư đã liên kết' },
        { command: 'settings', description: '⚙️ Xem và thay đổi cài đặt' },
        { command: 'unlink', description: '🔓 Hủy liên kết Telegram' },
        { command: 'help', description: '❓ Xem hướng dẫn sử dụng' },
    ];

    try {
        const response = await fetch(`${TELEGRAM_API_BASE}${token}/setMyCommands`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commands }),
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
    // Check if there's an existing unused, unexpired token
    const existingToken = await prisma.telegramLinkToken.findFirst({
        where: {
            userId,
            usedAt: null,
            expiresAt: { gt: new Date() }
        }
    });

    if (existingToken) {
        return existingToken.token;
    }

    // Create new token
    const token = generateLinkToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.telegramLinkToken.create({
        data: {
            userId,
            token,
            expiresAt
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
 * Force link Telegram account - unlinks from old user and links to new user
 */
export async function forceLinkTelegramAccount(
    token: string,
    chatId: string
): Promise<{ success: boolean; error?: string; userId?: string; oldUserEmail?: string }> {
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

    // Find the old user linked to this Telegram account
    const oldUser = await prisma.user.findFirst({
        where: { telegramChatId: chatId }
    });

    // Unlink old user if exists
    if (oldUser && oldUser.id !== linkToken.userId) {
        await prisma.user.update({
            where: { id: oldUser.id },
            data: {
                telegramChatId: null,
                telegramLinkedAt: null,
                notifyOnEmail: false,
            }
        });
    }

    // Link the account to new user
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

    return {
        success: true,
        userId: linkToken.userId,
        oldUserEmail: oldUser?.email
    };
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

        await sendTelegramMessage(chatId, message, {
            parseMode: 'HTML',
            replyMarkup: {
                inline_keyboard: [[
                    { text: '🔗 Mở Cài đặt', url: `${webUrl}/app?tab=settings&section=notifications` }
                ]]
            }
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
        '',
        '📝 *Nội dung:*',
        content.length > 3500 ? content.substring(0, 3500) + '...\n(Nội dung quá dài, vui lòng xem chi tiết trên web)' : content,
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
 * Notify all Telegram subscribers for a specific inbox (per-inbox notifications)
 */
export async function notifyInboxTelegramSubscribers(
    inboxEmail: string,
    message: {
        id: string;
        fromAddress: string | null;
        subject: string | null;
        textBody: string | null;
    }
): Promise<void> {
    const links = await prisma.inboxTelegramLink.findMany({
        where: { inboxEmail, status: "ACTIVE" },
    });

    if (links.length === 0) return;

    const botToken = getBotToken();
    if (!botToken) return;

    const webUrl = process.env.WEB_URL || "https://app.manhquy.click";
    const viewUrl = `${webUrl}/inbox-viewer?email=${encodeURIComponent(inboxEmail)}`;

    // Escape HTML entities to prevent Telegram parse errors
    const safeFrom = escapeHtml(message.fromAddress || "(unknown)");
    const safeSubject = escapeHtml(message.subject || "(no subject)");
    const safePreview = escapeHtml((message.textBody || "").slice(0, 200));

    // Format message
    const text = `📧 <b>New Email</b>

<b>To:</b> ${inboxEmail}
<b>From:</b> ${safeFrom}
<b>Subject:</b> ${safeSubject}

<i>${safePreview}${
        (message.textBody?.length || 0) > 200 ? "..." : ""
    }</i>`;

    // Process all notifications in parallel using Promise.allSettled
    await Promise.allSettled(
        links.map(async (link) => {
            let success = false;
            let errorMessage: string | null = null;

            try {
                success = await sendTelegramMessage(link.telegramChatId, text, {
                    parseMode: "HTML",
                    replyMarkup: {
                        inline_keyboard: [
                            [{ text: "View Email", url: viewUrl }],
                        ],
                    },
                });
                if (!success) {
                    errorMessage = "Send failed";
                }
            } catch (err: any) {
                errorMessage = err.message || "Unknown error";
            }

            // Log notification - wrapped in try-catch to ensure loop continues
            try {
                await prisma.telegramNotificationLog.create({
                    data: {
                        inboxEmail,
                        messageId: message.id,
                        telegramChatId: link.telegramChatId,
                        status: success ? "SENT" : "FAILED",
                        errorMessage,
                    },
                });
            } catch (logErr) {
                console.error("[Telegram] Failed to log notification:", logErr);
            }
        })
    );
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
            const from = update.message.from;

            // Check for inbox linking token (prefix: inbox_)
            if (token.startsWith("inbox_")) {
                const { linkInboxToTelegram } = await import("./inbox-telegram-service");

                const result = await linkInboxToTelegram(
                    token,
                    chatId,
                    from?.username
                );

                if (result.success) {
                    await sendTelegramMessage(
                        chatId,
                        `✅ <b>Liên kết thành công!</b>\n\nBạn sẽ nhận thông báo khi có email mới đến <b>${result.inboxEmail}</b>`,
                        { parseMode: "HTML" }
                    );
                } else {
                    await sendTelegramMessage(
                        chatId,
                        `❌ <b>Liên kết thất bại</b>\n\n${result.error || "Token không hợp lệ hoặc đã hết hạn"}`,
                        { parseMode: "HTML" }
                    );
                }
                return;
            }

            // Handle user-level token linking
            const result = await linkTelegramAccount(token, chatId);

            if (result.success) {
                await sendTelegramMessage(chatId,
                    '✅ *Liên kết thành công!*\n\nBạn sẽ nhận thông báo khi có email mới.\n\nSử dụng /settings để tùy chỉnh.',
                    { parseMode: 'Markdown' }
                );
            } else {
                // Check if error is "already linked to another user" - offer force link option
                if (result.error?.includes('đã được liên kết với người dùng khác')) {
                    await sendTelegramMessage(chatId,
                        '❌ <b>Liên kết thất bại</b>\n\n' +
                        'Tài khoản Telegram này đã được liên kết với người dùng khác.\n\n' +
                        '💡 <i>Bạn có thể hủy liên kết cũ và liên kết với tài khoản mới bằng nút bên dưới.</i>',
                        {
                            parseMode: 'HTML',
                            replyMarkup: {
                                inline_keyboard: [
                                    [{ text: '🔄 Liên kết mạnh (Hủy liên kết cũ)', callback_data: `force_link:${token}` }],
                                    [{ text: '❌ Hủy bỏ', callback_data: 'cancel_action' }]
                                ]
                            }
                        }
                    );
                } else {
                    await sendTelegramMessage(chatId,
                        `❌ *Liên kết thất bại*\n\n${result.error}`,
                        { parseMode: 'Markdown' }
                    );
                }
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
                {
                    parseMode: 'HTML',
                    replyMarkup: {
                        inline_keyboard: [
                            [{ text: '🔗 Mở Cài đặt', url: `${webUrl}/app?tab=settings&section=notifications` }],
                            [{ text: '❓ Trợ giúp', callback_data: 'show_help' }]
                        ]
                    }
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
                {
                    parseMode: 'HTML',
                    replyMarkup: {
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
                {
                    parseMode: 'HTML',
                    replyMarkup: {
                        inline_keyboard: [
                            [{ text: '🔗 Mở Cài đặt', url: `${webUrl}/app?tab=settings&section=notifications` }]
                        ]
                    }
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
            '<b>🔗 Liên kết tài khoản:</b>\n' +
            '/start - Bắt đầu sử dụng bot\n' +
            '/link [mã] - Liên kết với tài khoản\n' +
            '/unlink - Hủy liên kết tài khoản\n\n' +
            '<b>📬 Hộp thư riêng lẻ:</b>\n' +
            '/inboxes - Xem hộp thư đã liên kết\n\n' +
            '<b>⚙️ Cài đặt:</b>\n' +
            '/settings - Xem và quản lý cài đặt\n' +
            '/notify_on - Bật thông báo email\n' +
            '/notify_off - Tắt thông báo email\n\n' +
            '<b>💡 Mẹo:</b> Bạn có thể nhấn nút trong tin nhắn để thao tác nhanh hơn!',
            {
                parseMode: 'HTML',
                replyMarkup: {
                    inline_keyboard: [
                        [{ text: '🌐 Mở Ephemera Web', url: `${webUrl}/app` }]
                    ]
                }
            }
        );
    }

    // Handle /inboxes command - show linked inboxes for this Telegram
    else if (update.message?.text === '/inboxes') {
        const chatId = update.message.chat.id.toString();
        const inboxLinks = await getInboxLinksByChatId(chatId);
        const webUrl = process.env.WEB_URL || 'https://app.manhquy.click';

        if (inboxLinks.length === 0) {
            await sendTelegramMessage(chatId,
                '📬 <b>Hộp thư đã liên kết</b>\n\n' +
                'Chưa có hộp thư nào được liên kết với Telegram này.\n\n' +
                '💡 <i>Để liên kết hộp thư, truy cập Public Inbox Viewer và nhấn "Link to Telegram"</i>',
                {
                    parseMode: 'HTML',
                    replyMarkup: {
                        inline_keyboard: [
                            [{ text: '🌐 Mở Public Inbox', url: `${webUrl}/inbox-viewer` }]
                        ]
                    }
                }
            );
        } else {
            // Build inline keyboard with unlink buttons for each inbox
            const inlineKeyboard = inboxLinks.map(link => ([
                { text: `📧 ${link.inboxEmail}`, callback_data: `noop` },
                { text: '🔓 Hủy', callback_data: `unlink_inbox:${link.id}` }
            ]));

            await sendTelegramMessage(chatId,
                `📬 <b>Hộp thư đã liên kết</b>\n\n` +
                `Bạn đang nhận thông báo cho ${inboxLinks.length} hộp thư:\n\n` +
                inboxLinks.map((l, i) => `${i + 1}. <code>${l.inboxEmail}</code>`).join('\n') +
                '\n\n💡 <i>Nhấn "Hủy" để ngừng nhận thông báo cho hộp thư đó</i>',
                {
                    parseMode: 'HTML',
                    replyMarkup: {
                        inline_keyboard: inlineKeyboard
                    }
                }
            );
        }
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
                { parseMode: 'HTML', replyMarkup: { inline_keyboard: [[{ text: '🌐 Mở Web', url: `${webUrl}/app` }]] } }
            );
        }
        // Toggle notification on
        else if (callbackData === 'toggle_notify_on') {
            const user = await prisma.user.findFirst({ where: { telegramChatId: chatId } });
            if (user) {
                await updateTelegramNotifyPreference(user.id, true);
                await respondToCallbackQuery(callbackQuery.id, { text: '✅ Đã bật thông báo!' });
                await sendTelegramMessage(chatId, '✅ Đã bật thông báo email.\n\nSử dụng /settings để xem cài đặt.', { parseMode: 'HTML' });
            }
        }
        // Toggle notification off
        else if (callbackData === 'toggle_notify_off') {
            const user = await prisma.user.findFirst({ where: { telegramChatId: chatId } });
            if (user) {
                await updateTelegramNotifyPreference(user.id, false);
                await respondToCallbackQuery(callbackQuery.id, { text: '✅ Đã tắt thông báo!' });
                await sendTelegramMessage(chatId, '✅ Đã tắt thông báo email.\n\nSử dụng /settings để xem cài đặt.', { parseMode: 'HTML' });
            }
        }
        // Confirm unlink
        else if (callbackData === 'confirm_unlink') {
            await respondToCallbackQuery(callbackQuery.id);
            await sendTelegramMessage(chatId,
                '⚠️ <b>Xác nhận hủy liên kết?</b>\n\n' +
                'Bạn sẽ không nhận được thông báo email nữa.\n\n' +
                'Nhấn nút bên dưới để xác nhận:',
                {
                    parseMode: 'HTML',
                    replyMarkup: {
                        inline_keyboard: [
                            [{ text: '✅ Xác nhận hủy', callback_data: 'do_unlink' }],
                            [{ text: '❌ Hủy bỏ', callback_data: 'cancel_unlink' }]
                        ]
                    }
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
                    { parseMode: 'HTML' }
                );
            }
        }
        // Cancel unlink
        else if (callbackData === 'cancel_unlink') {
            await respondToCallbackQuery(callbackQuery.id, { text: 'Đã hủy thao tác' });
        }
        // Force link - unlink old user and link new user
        else if (callbackData?.startsWith('force_link:')) {
            const token = callbackData.split(':')[1];
            const result = await forceLinkTelegramAccount(token, chatId);

            if (result.success) {
                await respondToCallbackQuery(callbackQuery.id, { text: '✅ Liên kết thành công!' });
                await sendTelegramMessage(chatId,
                    '✅ <b>Liên kết thành công!</b>\n\n' +
                    'Đã hủy liên kết cũ và liên kết với tài khoản mới.\n\n' +
                    'Bạn sẽ nhận thông báo khi có email mới. Sử dụng /settings để tùy chỉnh.',
                    { parseMode: 'HTML' }
                );
            } else {
                await respondToCallbackQuery(callbackQuery.id, { text: '❌ Thất bại!' });
                await sendTelegramMessage(chatId,
                    `❌ <b>Liên kết thất bại</b>\n\n${result.error}`,
                    { parseMode: 'HTML' }
                );
            }
        }
        // Unlink inbox - remove inbox telegram link
        else if (callbackData?.startsWith('unlink_inbox:')) {
            const linkId = callbackData.split(':')[1];
            const result = await deleteInboxLinkByChatId(chatId, linkId);

            if (result.success) {
                await respondToCallbackQuery(callbackQuery.id, { text: '✅ Đã hủy liên kết!' });
                await sendTelegramMessage(chatId,
                    `✅ <b>Đã hủy liên kết hộp thư</b>\n\nBạn sẽ không nhận thông báo cho <code>${result.inboxEmail}</code> nữa.\n\nSử dụng /inboxes để xem các hộp thư còn lại.`,
                    { parseMode: 'HTML' }
                );
            } else {
                await respondToCallbackQuery(callbackQuery.id, { text: '❌ Thất bại!' });
                await sendTelegramMessage(chatId,
                    `❌ <b>Không thể hủy liên kết</b>\n\n${result.error}`,
                    { parseMode: 'HTML' }
                );
            }
        }
        // Noop - do nothing (for display-only buttons)
        else if (callbackData === 'noop') {
            await respondToCallbackQuery(callbackQuery.id);
        }
        // Cancel action (generic)
        else if (callbackData === 'cancel_action') {
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
        message?: {
            message_id: number;
            chat: {
                id: number;
                type: string;
            };
        };
        data?: string;
    };
}

export type { TelegramUpdate };

/**
 * Send a photo via Telegram Bot API
 */
export async function sendTelegramPhoto(
    chatId: string,
    photo: string,
    caption?: string,
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
                return sendTelegramMessage(chatId, caption, options);
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
 * Send a notification to a user via Telegram
 */
export async function sendNotificationToUser(
    userId: string,
    title: string,
    message: string,
    type: string,
    imageUrl?: string
): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { telegramChatId: true }
    });

    if (!user?.telegramChatId) {
        return false;
    }

    let emoji = '📢';
    switch (type) {
        case 'INFO': emoji = 'ℹ️'; break;
        case 'WARNING': emoji = '⚠️'; break;
        case 'SUCCESS': emoji = '✅'; break;
        case 'ERROR': emoji = '❌'; break;
        case 'PROMOTION': emoji = '🎉'; break;
    }

    const text = `${emoji} *${title}*\n\n${message}`;

    if (imageUrl) {
        return sendTelegramPhoto(user.telegramChatId, imageUrl, text, {
            parseMode: 'Markdown'
        });
    }

    return sendTelegramMessage(user.telegramChatId, text, {
        parseMode: 'Markdown'
    });
}

/**
 * Get inbox telegram links for a user
 * Returns all inbox telegram links where the inbox belongs to the user
 */
export async function getUserInboxTelegramLinks(userId: string) {
    // Get all inboxes belonging to this user
    const userInboxes = await prisma.inbox.findMany({
        where: { ownerId: userId, deletedAt: null },
        include: { domain: true },
    });

    // Build list of inbox emails
    const inboxEmails = userInboxes.map(inbox =>
        `${inbox.localPart}@${inbox.domain.name}`
    );

    if (inboxEmails.length === 0) {
        return [];
    }

    // Get all inbox telegram links for these emails
    const links = await prisma.inboxTelegramLink.findMany({
        where: {
            inboxEmail: { in: inboxEmails },
            status: "ACTIVE",
        },
        orderBy: { createdAt: 'desc' },
    });

    return links;
}

/**
 * Delete an inbox telegram link
 * Only allows deletion if the inbox belongs to the user
 */
export async function deleteInboxTelegramLink(userId: string, linkId: string): Promise<{ success: boolean; error?: string }> {
    // Find the link
    const link = await prisma.inboxTelegramLink.findUnique({
        where: { id: linkId },
    });

    if (!link) {
        return { success: false, error: "Link not found" };
    }

    // Check if the inbox belongs to this user
    const [localPart, domainName] = link.inboxEmail.split("@");
    const inbox = await prisma.inbox.findFirst({
        where: {
            localPart,
            domain: { name: domainName },
            ownerId: userId,
            deletedAt: null,
        },
    });

    if (!inbox) {
        return { success: false, error: "Unauthorized" };
    }

    // Delete the link
    await prisma.inboxTelegramLink.delete({
        where: { id: linkId },
    });

    // Notify user on Telegram that the link was removed
    try {
        await sendTelegramMessage(
            link.telegramChatId,
            `🔓 <b>Hủy liên kết hộp thư</b>\n\nHộp thư <b>${link.inboxEmail}</b> đã được hủy liên kết với Telegram này.`,
            { parseMode: "HTML" }
        );
    } catch {
        // Ignore notification errors
    }

    return { success: true };
}

/**
 * Get inbox telegram links by Telegram chatId
 */
export async function getInboxLinksByChatId(chatId: string) {
    return prisma.inboxTelegramLink.findMany({
        where: { telegramChatId: chatId, status: "ACTIVE" },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Delete an inbox telegram link by chatId (for bot commands)
 * Allows deletion if the chatId matches the link's chatId
 */
export async function deleteInboxLinkByChatId(chatId: string, linkId: string): Promise<{ success: boolean; inboxEmail?: string; error?: string }> {
    const link = await prisma.inboxTelegramLink.findUnique({
        where: { id: linkId },
    });

    if (!link) {
        return { success: false, error: "Link not found" };
    }

    // Verify the chatId matches
    if (link.telegramChatId !== chatId) {
        return { success: false, error: "Unauthorized" };
    }

    // Delete the link
    await prisma.inboxTelegramLink.delete({
        where: { id: linkId },
    });

    return { success: true, inboxEmail: link.inboxEmail };
}

