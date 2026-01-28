import { prisma } from "../lib/prisma";
import crypto from "crypto";

export class ThreadingService {
  static async computeThreadId(
    messageId: string | null,
    references: string | null,
    inReplyTo: string | null,
    inboxId: string
  ): Promise<string> {
    const refs = this.parseReferences(references);
    if (inReplyTo) {
      const cleaned = inReplyTo.replace(/^<|>$/g, '');
      if (cleaned) refs.push(cleaned);
    }

    if (refs.length === 0) {
      return messageId || crypto.randomUUID();
    }

    // Find any parent message in the reference chain within this inbox
    const parent = await prisma.message.findFirst({
      where: {
        inboxId,
        messageId: { in: refs },
        threadId: { not: null }
      },
      select: { threadId: true },
      orderBy: { receivedAt: 'desc' }
    });

    if (parent && parent.threadId) {
      return parent.threadId;
    }

    // No parent found locally, start new thread
    return messageId || crypto.randomUUID();
  }

  private static parseReferences(refs: string | null): string[] {
    if (!refs) return [];
    return refs.split(/\s+/).map(r => r.replace(/^<|>$/g, '')).filter(Boolean);
  }
}
