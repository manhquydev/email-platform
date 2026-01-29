import { prisma } from "../lib/prisma";
import { LegalHoldManager } from "./legal-hold";

export class RetentionManager {
  /**
   * Run retention sweep for organizations with policies
   */
  static async runPolicySweep(log: { info: Function; error: Function }) {
    try {
      // 1. Get enabled policies
      const policies = await prisma.retentionPolicy.findMany({
        where: { enabled: true },
        include: { organization: true }
      });

      for (const policy of policies) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retainDays);

        // Find applicable folders
        // Simple string match on folder name or special use
        // Note: This is resource intensive, optimized version would use batching
        const users = await prisma.user.findMany({
          where: { organizationId: policy.organizationId },
          select: { id: true }
        });

        for (const user of users) {
          const inboxes = await prisma.inbox.findMany({
             where: { ownerId: user.id },
             select: { id: true }
          });

          for (const inbox of inboxes) {
            // Find messages older than cutoff
            // TODO: Filter by folder if policy specifies foldersMatch
            const messages = await prisma.message.findMany({
              where: {
                inboxId: inbox.id,
                receivedAt: { lt: cutoffDate },
                deletedAt: null // Only active messages? Or trash too?
              },
              take: 100 // Process in chunks
            });

            for (const msg of messages) {
              // CHECK LEGAL HOLD
              const isHeld = await LegalHoldManager.isMessageHeld(msg.id, user.id, policy.organizationId);

              if (!isHeld) {
                if (policy.action === "DELETE") {
                  await prisma.message.update({
                    where: { id: msg.id },
                    data: { deletedAt: new Date() }
                  });
                } else if (policy.action === "PERMANENT_DELETE") {
                  // Hard delete
                  await prisma.message.delete({ where: { id: msg.id } });
                }
              }
            }
          }
        }
      }

      log.info(`Retention sweep completed for ${policies.length} policies`);
    } catch (err) {
      log.error({ err }, "Retention sweep failed");
    }
  }
}
