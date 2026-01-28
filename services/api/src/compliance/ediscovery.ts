import { prisma } from "../lib/prisma";

export class EDiscovery {
  /**
   * Search across all mailboxes in an organization
   */
  static async search(organizationId: string, query: {
    keywords?: string[];
    senders?: string[];
    recipients?: string[];
    startDate?: Date;
    endDate?: Date;
    custodians?: string[]; // User IDs
  }) {
    const where: any = {
      inbox: {
        organizationId: organizationId,
      }
    };

    if (query.custodians && query.custodians.length > 0) {
      where.inbox.ownerId = { in: query.custodians };
    }

    if (query.startDate) {
      where.receivedAt = { ...where.receivedAt, gte: query.startDate };
    }

    if (query.endDate) {
      where.receivedAt = { ...where.receivedAt, lte: query.endDate };
    }

    if (query.senders && query.senders.length > 0) {
      where.fromAddress = { in: query.senders };
    }

    if (query.recipients && query.recipients.length > 0) {
      where.toAddress = { in: query.recipients };
    }

    const messages = await prisma.message.findMany({
      where,
      select: {
        id: true,
        subject: true,
        textBody: true,
        fromAddress: true,
        toAddress: true,
        receivedAt: true,
        inbox: {
          select: {
            owner: { select: { email: true } }
          }
        }
      },
      take: 1000 // Safeguard
    });

    // Post-filter for keywords if full-text search isn't enabled in DB
    // In production, use Postgres Full Text Search (tsvector)
    if (query.keywords && query.keywords.length > 0) {
      const keywords = query.keywords.map(k => k.toLowerCase());
      return messages.filter(msg => {
        const content = `${msg.subject || ""} ${msg.textBody || ""}`.toLowerCase();
        return keywords.some(k => content.includes(k));
      });
    }

    return messages;
  }
}
