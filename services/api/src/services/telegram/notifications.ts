/**
 * Telegram Notification Service
 * Handles sending email notifications via Telegram
 */

import { prisma } from '../../lib/prisma';
import { extractOTP } from '../../utils/otpExtractor';
import { MAX_MESSAGE_LENGTH, PREVIEW_LENGTH, NOTIFICATION_EMOJIS, getWebUrl } from './constants';
import { sendTelegramMessage, sendTelegramPhoto, escapeHtml } from './api';

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
        content.length > MAX_MESSAGE_LENGTH
            ? content.substring(0, MAX_MESSAGE_LENGTH) + '...\n(Nội dung quá dài, vui lòng xem chi tiết trên web)'
            : content,
    ];

    if (otp) {
        lines.push('');
        lines.push(`🔢 *Mã OTP: \`${otp}\`*`);
    }

    const webUrl = getWebUrl();
    const replyMarkup = {
        inline_keyboard: [
            otp ? [{ text: `📋 Copy OTP: ${otp}`, callback_data: `copy_otp:${otp}` }] : [],
            [{ text: '🌐 Xem chi tiết', url: `${webUrl}/app` }]
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

    const webUrl = getWebUrl();
    const viewUrl = `${webUrl}/inbox-viewer?email=${encodeURIComponent(inboxEmail)}`;

    // Escape HTML entities to prevent Telegram parse errors
    const safeFrom = escapeHtml(message.fromAddress || "(unknown)");
    const safeSubject = escapeHtml(message.subject || "(no subject)");
    const safePreview = escapeHtml((message.textBody || "").slice(0, PREVIEW_LENGTH));

    const text = `📧 <b>New Email</b>

<b>To:</b> ${inboxEmail}
<b>From:</b> ${safeFrom}
<b>Subject:</b> ${safeSubject}

<i>${safePreview}${(message.textBody?.length || 0) > PREVIEW_LENGTH ? "..." : ""}</i>`;

    // Process all notifications in parallel
    await Promise.allSettled(
        links.map(async (link) => {
            let success = false;
            let errorMessage: string | null = null;

            try {
                success = await sendTelegramMessage(link.telegramChatId, text, {
                    parseMode: "HTML",
                    replyMarkup: {
                        inline_keyboard: [[{ text: "View Email", url: viewUrl }]],
                    },
                });
                if (!success) {
                    errorMessage = "Send failed";
                }
            } catch (err: any) {
                errorMessage = err.message || "Unknown error";
            }

            // Log notification
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

    const emoji = NOTIFICATION_EMOJIS[type] || NOTIFICATION_EMOJIS.DEFAULT;
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
