import { prisma } from "../lib/prisma";

export async function runAutomatedCleanup() {
    console.log("[Cleanup] Starting automated retention cleanup...");

    // 1. Get retention policy from DB or use default (30 days)
    const retentionSetting = await (prisma as any).systemSetting.findUnique({
        where: { key: "RETENTION_DAYS" }
    });

    const days = retentionSetting ? parseInt(retentionSetting.value) : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    try {
        // 2. Delete messages older than cutoff
        const deletedMessages = await prisma.message.deleteMany({
            where: {
                receivedAt: { lt: cutoff },
                isPinned: false // Don't delete pinned messages
            }
        });

        // 3. Delete expired inboxes
        const deletedInboxes = await prisma.inbox.deleteMany({
            where: {
                expiresAt: { lt: new Date() },
                deletedAt: null
            }
        });

        console.log(`[Cleanup] Completed. Purged ${deletedMessages.count} messages and ${deletedInboxes.count} inboxes.`);
        return { messages: deletedMessages.count, inboxes: deletedInboxes.count };
    } catch (error) {
        console.error("[Cleanup] Failed:", error);
        throw error;
    }
}
