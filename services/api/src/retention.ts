import { prisma } from "./lib/prisma";
import { appConfig } from "./config";
import path from "path";
import { promises as fs } from "fs";

export const runRetentionSweep = async (log: { info: Function; error: Function; warn?: Function }) => {
  const now = new Date();
  const messageExpiry = new Date(now.getTime() - appConfig.messageTtlHours * 60 * 60 * 1000);
  const inboxExpiry = new Date(now.getTime() - appConfig.inboxTtlHours * 60 * 60 * 1000);

  const removeFiles = async (storageKeys: string[]) => {
    for (const key of storageKeys) {
      try {
        await fs.unlink(path.join(appConfig.storageDir, key));
      } catch (err) {
        // ignore if missing
        log.warn?.({ err, key }, "failed to remove attachment file during retention");
      }
    }
  };

  try {
    const expiredMessages = await prisma.message.findMany({
      where: {
        OR: [
          { receivedAt: { lt: messageExpiry } },
          { deletedAt: { lt: messageExpiry } },
        ],
      },
      include: { attachments: true },
    });
    const messageIds = expiredMessages.map((m) => m.id);
    await removeFiles(expiredMessages.flatMap((m) => m.attachments.map((a) => a.storageKey)));
    if (messageIds.length) {
      await prisma.attachment.deleteMany({ where: { messageId: { in: messageIds } } });
      await prisma.message.deleteMany({ where: { id: { in: messageIds } } });
    }

    const expiringInboxes = await prisma.inbox.findMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { deletedAt: { lt: inboxExpiry } },
        ],
      },
      select: { id: true },
    });
    const inboxIds = expiringInboxes.map((i) => i.id);
    if (inboxIds.length) {
      const inboxAttachments = await prisma.attachment.findMany({ where: { message: { inboxId: { in: inboxIds } } } });
      await removeFiles(inboxAttachments.map((a) => a.storageKey));
      await prisma.inbox.deleteMany({ where: { id: { in: inboxIds } } });
    }

    // Cleanup expired Telegram Link Tokens
    await prisma.telegramLinkToken.deleteMany({
      where: {
        expiresAt: { lt: now }
      }
    });

    // Cleanup expired Forward Verifications that were not verified
    await prisma.forwardVerification.deleteMany({
      where: {
        expiresAt: { lt: now },
        verifiedAt: null
      }
    });

    // Also cleanup successful verifications older than 24 hours
    await prisma.forwardVerification.deleteMany({
      where: {
        verifiedAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      }
    });

    log.info(
      {
        deletedMessages: messageIds.length,
        deletedInboxes: inboxIds.length,
      },
      "retention sweep done",
    );
  } catch (err) {
    log.error({ err }, "retention sweep failed");
  }
};
