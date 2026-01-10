import { prisma } from "./lib/prisma";
import { appConfig } from "./config";
import path from "path";
import { promises as fs } from "fs";

// Tier-based retention limits (in days)
const TIER_RETENTION_LIMITS: Record<string, number> = {
  FREE: 7,
  STARTER: 30,
  PROFESSIONAL: 90,
  ENTERPRISE: 365,
};

// Get effective retention for a message based on inbox -> user -> tier -> global hierarchy
const getEffectiveRetentionHours = (
  inboxRetentionDays: number | null,
  userRetentionDays: number | null,
  userTier: string
): number => {
  // Priority: inbox-specific > user-specific > tier default > global config
  if (inboxRetentionDays !== null) {
    return inboxRetentionDays * 24;
  }
  if (userRetentionDays !== null) {
    return userRetentionDays * 24;
  }
  const tierDefault = TIER_RETENTION_LIMITS[userTier] || TIER_RETENTION_LIMITS.FREE;
  return tierDefault * 24;
};

export const runRetentionSweep = async (log: { info: Function; error: Function; warn?: Function }) => {
  const now = new Date();
  const globalMessageExpiry = new Date(now.getTime() - appConfig.messageTtlHours * 60 * 60 * 1000);
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
    // Fetch all inboxes with their owners for custom retention calculation
    const inboxesWithOwners = await prisma.inbox.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        retentionDays: true,
        owner: {
          select: {
            retentionDays: true,
            tier: true,
          }
        }
      }
    });

    // Build a map of inbox ID to effective retention hours
    const inboxRetentionMap = new Map<string, number>();
    for (const inbox of inboxesWithOwners) {
      const effectiveHours = getEffectiveRetentionHours(
        inbox.retentionDays,
        inbox.owner?.retentionDays ?? null,
        inbox.owner?.tier ?? "FREE"
      );
      inboxRetentionMap.set(inbox.id, effectiveHours);
    }

    // Find expired messages - check each message against its inbox's effective retention
    const allMessages = await prisma.message.findMany({
      where: {
        OR: [
          { receivedAt: { lt: globalMessageExpiry } }, // Global fallback
          { deletedAt: { lt: globalMessageExpiry } },
        ],
      },
      include: { attachments: true },
    });

    // Filter messages based on their inbox's custom retention
    const expiredMessages = allMessages.filter(msg => {
      const inboxRetentionHours = inboxRetentionMap.get(msg.inboxId) ?? appConfig.messageTtlHours;
      const messageExpiry = new Date(now.getTime() - inboxRetentionHours * 60 * 60 * 1000);
      return msg.receivedAt < messageExpiry || (msg.deletedAt && msg.deletedAt < messageExpiry);
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

    // GDPR Compliance: Cleanup old public viewer audit logs (90 days retention)
    const auditRetentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS || "90", 10);
    const auditExpiry = new Date(now.getTime() - auditRetentionDays * 24 * 60 * 60 * 1000);

    const deletedAuditLogs = await prisma.auditLog.deleteMany({
      where: {
        action: { startsWith: "PUBLIC_" },
        createdAt: { lt: auditExpiry }
      }
    });

    // Cleanup old notification logs (90 days retention)
    const deletedNotificationLogs = await prisma.telegramNotificationLog.deleteMany({
      where: {
        sentAt: { lt: auditExpiry }
      }
    });

    log.info(
      {
        deletedMessages: messageIds.length,
        deletedInboxes: inboxIds.length,
        deletedAuditLogs: deletedAuditLogs.count,
        deletedNotificationLogs: deletedNotificationLogs.count,
        auditRetentionDays,
      },
      "retention sweep done",
    );
  } catch (err) {
    log.error({ err }, "retention sweep failed");
  }
};
