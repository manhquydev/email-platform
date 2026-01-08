// services/api/src/services/inbox-telegram-service.ts
import { prisma } from "../lib/prisma";
import { generateLinkToken } from "./telegram";
import QRCode from "qrcode";

const MAX_LINKS_PER_INBOX = 5;
const TOKEN_EXPIRY_HOURS = 24;

export async function generateInboxLinkToken(inboxEmail: string): Promise<{
  token: string;
  qrCodeDataUrl: string;
  telegramLink: string;
  expiresAt: Date;
}> {
  // Validate inbox exists
  const [localPart, domainName] = inboxEmail.split("@");
  const inbox = await prisma.inbox.findFirst({
    where: {
      localPart,
      domain: { name: domainName, status: "VERIFIED" },
      deletedAt: null,
    },
  });

  if (!inbox) {
    throw new Error("Inbox not found");
  }

  // Check link count
  const linkCount = await prisma.inboxTelegramLink.count({
    where: { inboxEmail, status: "ACTIVE" },
  });

  if (linkCount >= MAX_LINKS_PER_INBOX) {
    throw new Error(`Maximum ${MAX_LINKS_PER_INBOX} Telegram links per inbox`);
  }

  // Delete existing unused tokens for this inbox
  await prisma.inboxTelegramAuthToken.deleteMany({
    where: { inboxEmail, usedAt: null },
  });

  // Generate new token with inbox_ prefix
  const rawToken = generateLinkToken();
  const token = `inbox_${rawToken}`;
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.inboxTelegramAuthToken.create({
    data: { inboxEmail, token, expiresAt },
  });

  // Generate Telegram deep link
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "EphemeraMailBot";
  const telegramLink = `https://t.me/${botUsername}?start=${token}`;

  // Generate QR code
  const qrCodeDataUrl = await QRCode.toDataURL(telegramLink, {
    width: 256,
    margin: 2,
  });

  return { token, qrCodeDataUrl, telegramLink, expiresAt };
}

export async function getTokenStatus(token: string): Promise<{
  valid: boolean;
  used: boolean;
  expired: boolean;
  linkedChatId?: string;
}> {
  const tokenRecord = await prisma.inboxTelegramAuthToken.findUnique({
    where: { token },
  });

  if (!tokenRecord) {
    return { valid: false, used: false, expired: false };
  }

  const now = new Date();
  const expired = tokenRecord.expiresAt < now;
  const used = !!tokenRecord.usedAt;

  // If used, find the linked chat
  let linkedChatId: string | undefined;
  if (used) {
    const link = await prisma.inboxTelegramLink.findFirst({
      where: { inboxEmail: tokenRecord.inboxEmail },
      orderBy: { createdAt: "desc" },
    });
    linkedChatId = link?.telegramChatId;
  }

  return { valid: true, used, expired, linkedChatId };
}

export async function linkInboxToTelegram(
  token: string,
  chatId: string,
  username?: string
): Promise<{ success: boolean; error?: string; inboxEmail?: string }> {
  const tokenRecord = await prisma.inboxTelegramAuthToken.findFirst({
    where: {
      token,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!tokenRecord) {
    return { success: false, error: "Token invalid or expired" };
  }

  // Check if already linked
  const existingLink = await prisma.inboxTelegramLink.findUnique({
    where: {
      inboxEmail_telegramChatId: {
        inboxEmail: tokenRecord.inboxEmail,
        telegramChatId: chatId,
      },
    },
  });

  if (existingLink) {
    // Reactivate if revoked
    if (existingLink.status !== "ACTIVE") {
      await prisma.inboxTelegramLink.update({
        where: { id: existingLink.id },
        data: { status: "ACTIVE" },
      });
    }
  } else {
    // Create new link
    await prisma.inboxTelegramLink.create({
      data: {
        inboxEmail: tokenRecord.inboxEmail,
        telegramChatId: chatId,
        telegramUsername: username,
        status: "ACTIVE",
      },
    });
  }

  // Mark token as used
  await prisma.inboxTelegramAuthToken.update({
    where: { id: tokenRecord.id },
    data: { usedAt: new Date() },
  });

  return { success: true, inboxEmail: tokenRecord.inboxEmail };
}

export async function unlinkInboxTelegram(
  inboxEmail: string,
  chatId: string
): Promise<boolean> {
  const result = await prisma.inboxTelegramLink.updateMany({
    where: { inboxEmail, telegramChatId: chatId },
    data: { status: "REVOKED" },
  });

  return result.count > 0;
}

export async function getInboxLinks(inboxEmail: string) {
  return prisma.inboxTelegramLink.findMany({
    where: { inboxEmail, status: "ACTIVE" },
    select: {
      id: true,
      telegramChatId: true,
      telegramUsername: true,
      createdAt: true,
    },
  });
}
