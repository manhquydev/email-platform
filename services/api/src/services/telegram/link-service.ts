/**
 * Telegram Link Service
 * Handles account linking/unlinking and status management
 */

import { prisma } from '../../lib/prisma';
import { TOKEN_CHARS, TOKEN_LENGTH, TOKEN_EXPIRY_MS, getWebUrl } from './constants';
import { sendTelegramMessage } from './api';
import type { LinkResult, InboxLinkResult } from './types';

/**
 * Generate random 6-character alphanumeric token
 */
export function generateLinkToken(): string {
    let result = '';
    for (let i = 0; i < TOKEN_LENGTH; i++) {
        result += TOKEN_CHARS.charAt(Math.floor(Math.random() * TOKEN_CHARS.length));
    }
    return result;
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
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

    await prisma.telegramLinkToken.create({
        data: { userId, token, expiresAt }
    });

    return token;
}

/**
 * Link Telegram account using token
 */
export async function linkTelegramAccount(
    token: string,
    chatId: string
): Promise<LinkResult> {
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
): Promise<LinkResult> {
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
        const webUrl = getWebUrl();
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
                    { text: '🔗 Mở Cài đặt', url: `${webUrl}/settings?tab=notifications` }
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
 * Get inbox telegram links for a user
 */
export async function getUserInboxTelegramLinks(userId: string) {
    const userInboxes = await prisma.inbox.findMany({
        where: { ownerId: userId, deletedAt: null },
        include: { domain: true },
    });

    const inboxEmails = userInboxes.map(inbox =>
        `${inbox.localPart}@${inbox.domain.name}`
    );

    if (inboxEmails.length === 0) {
        return [];
    }

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
 * Delete an inbox telegram link (user-authorized)
 */
export async function deleteInboxTelegramLink(userId: string, linkId: string): Promise<InboxLinkResult> {
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

    await prisma.inboxTelegramLink.delete({
        where: { id: linkId },
    });

    // Notify user on Telegram
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
 */
export async function deleteInboxLinkByChatId(chatId: string, linkId: string): Promise<InboxLinkResult> {
    const link = await prisma.inboxTelegramLink.findUnique({
        where: { id: linkId },
    });

    if (!link) {
        return { success: false, error: "Link not found" };
    }

    if (link.telegramChatId !== chatId) {
        return { success: false, error: "Unauthorized" };
    }

    await prisma.inboxTelegramLink.delete({
        where: { id: linkId },
    });

    return { success: true, inboxEmail: link.inboxEmail };
}
