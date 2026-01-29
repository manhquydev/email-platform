import { prisma } from "../lib/prisma";
import { OrganizationRole, LegalHoldStatus } from "@prisma/client";

export class LegalHoldManager {
  /**
   * Create a new legal hold
   */
  static async createHold(data: {
    organizationId: string;
    name: string;
    description?: string;
    custodians: string[]; // User IDs
    keywords: string[];
    createdBy: string;
    endDate?: Date;
  }) {
    return prisma.legalHold.create({
      data: {
        ...data,
        status: LegalHoldStatus.ACTIVE,
      },
    });
  }

  /**
   * Release a legal hold
   */
  static async releaseHold(holdId: string, userId: string) {
    // Check permissions/ownership if needed
    return prisma.legalHold.update({
      where: { id: holdId },
      data: {
        status: LegalHoldStatus.RELEASED,
        endDate: new Date(),
      },
    });
  }

  /**
   * Check if a message is subject to any active legal hold
   */
  static async isMessageHeld(messageId: string, userId: string, organizationId?: string): Promise<boolean> {
    if (!organizationId) return false;

    // Find active holds for this organization
    const holds = await prisma.legalHold.findMany({
      where: {
        organizationId,
        status: LegalHoldStatus.ACTIVE,
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } }
        ]
      },
    });

    if (holds.length === 0) return false;

    // Check if user is a custodian in any hold
    const relevantHolds = holds.filter(hold => hold.custodians.includes(userId));

    if (relevantHolds.length > 0) {
      // If user is custodian, verify content match (if keywords exist)
      // If no keywords, it's a blanket hold on the custodian
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { subject: true, textBody: true, htmlBody: true }
      });

      if (!message) return false;

      for (const hold of relevantHolds) {
        if (hold.keywords.length === 0) return true; // Blanket hold

        const content = `${message.subject || ""} ${message.textBody || ""} ${message.htmlBody || ""}`.toLowerCase();
        if (hold.keywords.some(kw => content.includes(kw.toLowerCase()))) {
          return true;
        }
      }
    }

    return false;
  }
}
