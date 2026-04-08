/**
 * Telegram Command Handlers
 * Individual command implementations for the Telegram bot
 */

import { prisma } from '../../lib/prisma';
import { getWebUrl } from './constants';
import { sendTelegramMessage, respondToCallbackQuery } from './api';
import {
    linkTelegramAccount,
    forceLinkTelegramAccount,
    unlinkTelegramAccount,
    getTelegramStatus,
    updateTelegramNotifyPreference,
    getInboxLinksByChatId,
    deleteInboxLinkByChatId,
} from './link-service';
import type { TelegramMessage, TelegramCallbackQuery } from './types';

// ============ Command Handlers ============

export async function handleStart(chatId: string, args: string[], message: TelegramMessage): Promise<void> {
    const webUrl = getWebUrl();

    if (args.length > 0) {
        const token = args[0];

        // Check for inbox linking token (prefix: inbox_)
        if (token.startsWith("inbox_")) {
            const { linkInboxToTelegram } = await import("../inbox-telegram-service");
            const result = await linkInboxToTelegram(token, chatId, message.from?.username);

            if (result.success) {
                await sendTelegramMessage(chatId,
                    `✅ <b>Liên kết thành công!</b>\n\nBạn sẽ nhận thông báo khi có email mới đến <b>${result.inboxEmail}</b>`,
                    { parseMode: "HTML" }
                );
            } else {
                await sendTelegramMessage(chatId,
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
        } else if (result.error?.includes('đã được liên kết với người dùng khác')) {
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
    } else {
        // Welcome message
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
                        [{ text: '🔗 Mở Cài đặt', url: `${webUrl}/settings?tab=notifications` }],
                        [{ text: '❓ Trợ giúp', callback_data: 'show_help' }]
                    ]
                }
            }
        );
    }
}

export async function handleLink(chatId: string, args: string[]): Promise<void> {
    if (args.length > 0) {
        const token = args[0];
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

export async function handleUnlink(chatId: string): Promise<void> {
    const user = await prisma.user.findFirst({
        where: { telegramChatId: chatId }
    });

    if (user) {
        await unlinkTelegramAccount(user.id, false);
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

export async function handleSettings(chatId: string): Promise<void> {
    const user = await prisma.user.findFirst({
        where: { telegramChatId: chatId }
    });
    const webUrl = getWebUrl();

    if (user) {
        const status = await getTelegramStatus(user.id);
        await sendTelegramMessage(chatId,
            '⚙️ <b>Cài đặt Ephemera Bot</b>\n\n' +
            `📧 <b>Thông báo email:</b> ${status.notifyOnEmail ? '✅ Đang bật' : '❌ Đang tắt'}\n` +
            `📅 <b>Liên kết từ:</b> ${status.linkedAt ? new Date(status.linkedAt).toLocaleDateString('vi-VN') : 'N/A'}\n\n` +
            '💡 <i>Nhấn nút bên dưới để thay đổi cài đặt</i>',
            {
                parseMode: 'HTML',
                replyMarkup: {
                    inline_keyboard: [
                        [{ text: status.notifyOnEmail ? '🔔 Tắt thông báo' : '🔔 Bật thông báo', callback_data: status.notifyOnEmail ? 'toggle_notify_off' : 'toggle_notify_on' }],
                        [{ text: '🔓 Hủy liên kết', callback_data: 'confirm_unlink' }, { text: '🌐 Mở Web', url: `${webUrl}/app` }]
                    ]
                }
            }
        );
    } else {
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
                    inline_keyboard: [[{ text: '🔗 Mở Cài đặt', url: `${webUrl}/settings?tab=notifications` }]]
                }
            }
        );
    }
}

export async function handleNotifyOn(chatId: string): Promise<void> {
    const user = await prisma.user.findFirst({ where: { telegramChatId: chatId } });
    if (user) {
        await updateTelegramNotifyPreference(user.id, true);
        await sendTelegramMessage(chatId, '✅ Đã bật thông báo email.', { parseMode: 'Markdown' });
    }
}

export async function handleNotifyOff(chatId: string): Promise<void> {
    const user = await prisma.user.findFirst({ where: { telegramChatId: chatId } });
    if (user) {
        await updateTelegramNotifyPreference(user.id, false);
        await sendTelegramMessage(chatId, '✅ Đã tắt thông báo email.', { parseMode: 'Markdown' });
    }
}

export async function handleHelp(chatId: string): Promise<void> {
    const webUrl = getWebUrl();
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
                inline_keyboard: [[{ text: '🌐 Mở Ephemera Web', url: `${webUrl}/app` }]]
            }
        }
    );
}

export async function handleInboxes(chatId: string): Promise<void> {
    const inboxLinks = await getInboxLinksByChatId(chatId);
    const webUrl = getWebUrl();

    if (inboxLinks.length === 0) {
        await sendTelegramMessage(chatId,
            '📬 <b>Hộp thư đã liên kết</b>\n\n' +
            'Chưa có hộp thư nào được liên kết với Telegram này.\n\n' +
            '💡 <i>Để liên kết hộp thư, truy cập Public Inbox Viewer và nhấn "Link to Telegram"</i>',
            {
                parseMode: 'HTML',
                replyMarkup: {
                    inline_keyboard: [[{ text: '🌐 Mở Public Inbox', url: `${webUrl}/inbox-viewer` }]]
                }
            }
        );
    } else {
        const inlineKeyboard = inboxLinks.map(link => ([
            { text: `📧 ${link.inboxEmail}`, callback_data: 'noop' },
            { text: '🔓 Hủy', callback_data: `unlink_inbox:${link.id}` }
        ]));

        await sendTelegramMessage(chatId,
            `📬 <b>Hộp thư đã liên kết</b>\n\n` +
            `Bạn đang nhận thông báo cho ${inboxLinks.length} hộp thư:\n\n` +
            inboxLinks.map((l, i) => `${i + 1}. <code>${l.inboxEmail}</code>`).join('\n') +
            '\n\n💡 <i>Nhấn "Hủy" để ngừng nhận thông báo cho hộp thư đó</i>',
            {
                parseMode: 'HTML',
                replyMarkup: { inline_keyboard: inlineKeyboard }
            }
        );
    }
}

// ============ Callback Handlers ============

export async function handleCopyOtp(chatId: string, data: string, query: TelegramCallbackQuery): Promise<void> {
    await respondToCallbackQuery(query.id, { text: `Mã OTP: ${data}`, showAlert: true });
}

export async function handleShowHelp(chatId: string, _data: string, query: TelegramCallbackQuery): Promise<void> {
    await respondToCallbackQuery(query.id);
    await handleHelp(chatId);
}

export async function handleToggleNotifyOn(chatId: string, _data: string, query: TelegramCallbackQuery): Promise<void> {
    const user = await prisma.user.findFirst({ where: { telegramChatId: chatId } });
    if (user) {
        await updateTelegramNotifyPreference(user.id, true);
        await respondToCallbackQuery(query.id, { text: '✅ Đã bật thông báo!' });
        await sendTelegramMessage(chatId, '✅ Đã bật thông báo email.\n\nSử dụng /settings để xem cài đặt.', { parseMode: 'HTML' });
    }
}

export async function handleToggleNotifyOff(chatId: string, _data: string, query: TelegramCallbackQuery): Promise<void> {
    const user = await prisma.user.findFirst({ where: { telegramChatId: chatId } });
    if (user) {
        await updateTelegramNotifyPreference(user.id, false);
        await respondToCallbackQuery(query.id, { text: '✅ Đã tắt thông báo!' });
        await sendTelegramMessage(chatId, '✅ Đã tắt thông báo email.\n\nSử dụng /settings để xem cài đặt.', { parseMode: 'HTML' });
    }
}

export async function handleConfirmUnlink(chatId: string, _data: string, query: TelegramCallbackQuery): Promise<void> {
    await respondToCallbackQuery(query.id);
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

export async function handleDoUnlink(chatId: string, _data: string, query: TelegramCallbackQuery): Promise<void> {
    const user = await prisma.user.findFirst({ where: { telegramChatId: chatId } });
    if (user) {
        await unlinkTelegramAccount(user.id, false);
        await respondToCallbackQuery(query.id, { text: '✅ Đã hủy liên kết!' });
        await sendTelegramMessage(chatId,
            '✅ <b>Đã hủy liên kết</b>\n\nBạn có thể liên kết lại bất cứ lúc nào bằng lệnh /start',
            { parseMode: 'HTML' }
        );
    }
}

export async function handleCancelUnlink(_chatId: string, _data: string, query: TelegramCallbackQuery): Promise<void> {
    await respondToCallbackQuery(query.id, { text: 'Đã hủy thao tác' });
}

export async function handleForceLink(chatId: string, token: string, query: TelegramCallbackQuery): Promise<void> {
    const result = await forceLinkTelegramAccount(token, chatId);

    if (result.success) {
        await respondToCallbackQuery(query.id, { text: '✅ Liên kết thành công!' });
        await sendTelegramMessage(chatId,
            '✅ <b>Liên kết thành công!</b>\n\n' +
            'Đã hủy liên kết cũ và liên kết với tài khoản mới.\n\n' +
            'Bạn sẽ nhận thông báo khi có email mới. Sử dụng /settings để tùy chỉnh.',
            { parseMode: 'HTML' }
        );
    } else {
        await respondToCallbackQuery(query.id, { text: '❌ Thất bại!' });
        await sendTelegramMessage(chatId,
            `❌ <b>Liên kết thất bại</b>\n\n${result.error}`,
            { parseMode: 'HTML' }
        );
    }
}

export async function handleUnlinkInbox(chatId: string, linkId: string, query: TelegramCallbackQuery): Promise<void> {
    const result = await deleteInboxLinkByChatId(chatId, linkId);

    if (result.success) {
        await respondToCallbackQuery(query.id, { text: '✅ Đã hủy liên kết!' });
        await sendTelegramMessage(chatId,
            `✅ <b>Đã hủy liên kết hộp thư</b>\n\nBạn sẽ không nhận thông báo cho <code>${result.inboxEmail}</code> nữa.\n\nSử dụng /inboxes để xem các hộp thư còn lại.`,
            { parseMode: 'HTML' }
        );
    } else {
        await respondToCallbackQuery(query.id, { text: '❌ Thất bại!' });
        await sendTelegramMessage(chatId,
            `❌ <b>Không thể hủy liên kết</b>\n\n${result.error}`,
            { parseMode: 'HTML' }
        );
    }
}

export async function handleNoop(_chatId: string, _data: string, query: TelegramCallbackQuery): Promise<void> {
    await respondToCallbackQuery(query.id);
}

export async function handleCancelAction(_chatId: string, _data: string, query: TelegramCallbackQuery): Promise<void> {
    await respondToCallbackQuery(query.id, { text: 'Đã hủy thao tác' });
}

/**
 * Handle acknowledge button press for admin notifications
 */
export async function handleAcknowledge(chatId: string, notificationId: string, query: TelegramCallbackQuery): Promise<void> {
    try {
        // Update notification log to mark as acknowledged
        await prisma.notificationLog.updateMany({
            where: {
                notificationId,
                channel: 'TELEGRAM',
            },
            data: {
                metadata: {
                    acknowledgedAt: new Date().toISOString(),
                    acknowledgedBy: chatId,
                },
            },
        });

        await respondToCallbackQuery(query.id, { text: '✓ Đã xác nhận đọc thông báo' });
    } catch (error) {
        console.error('[Telegram] Acknowledge error:', error);
        await respondToCallbackQuery(query.id, { text: 'Có lỗi xảy ra' });
    }
}
