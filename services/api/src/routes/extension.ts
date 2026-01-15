import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { TIER_LIMITS } from "./billing";

export async function extensionRoutes(app: FastifyInstance) {
  // Check auth status
  app.get("/extension/check-auth", { preHandler: app.authenticate }, async (request, reply) => {
    return { ok: true, user: request.user };
  });

  // Dashboard Sync - Aggregate view for extension popup
  app.get("/extension/dashboard", { preHandler: app.authenticate }, async (request, reply) => {
    const user = request.user as { userId: string; role: string; tier: string };

    // Fetch inboxes with message counts
    const inboxes = await prisma.inbox.findMany({
      where: {
        ownerId: user.userId,
        deletedAt: null
      },
      include: {
        domain: true,
        _count: {
          select: {
            messages: { where: { deletedAt: null, isRead: false } } // Unread count
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 20 // Limit for extension
    });

    // Calculate totals
    const totalUnread = inboxes.reduce((sum, inbox) => sum + (inbox._count?.messages || 0), 0);

    return {
      user: {
        id: user.userId,
        tier: user.tier,
      },
      stats: {
        totalInboxes: inboxes.length,
        totalUnread,
      },
      inboxes: inboxes.map(inbox => ({
        id: inbox.id,
        address: `${inbox.localPart}@${inbox.domain.name}`,
        localPart: inbox.localPart,
        domain: inbox.domain.name,
        unreadCount: inbox._count?.messages || 0,
        createdAt: inbox.createdAt,
        expiresAt: inbox.expiresAt
      }))
    };
  });

  // Quick Inbox Creation
  app.post("/extension/quick-inbox", { preHandler: app.authenticate }, async (request, reply) => {
    const user = request.user as { userId: string; role: string; tier?: string };

    // Check limits
    const limit = TIER_LIMITS[user.tier || "FREE"] || TIER_LIMITS["FREE"];
    const currentCount = await prisma.inbox.count({
      where: { ownerId: user.userId, deletedAt: null }
    });

    if (currentCount >= limit.maxInboxes) {
      return reply.status(403).send({
        error: "Inbox limit reached",
        upgradeUrl: "https://manhquy.click/pricing"
      });
    }

    // Get a public domain
    const domain = await prisma.domain.findFirst({
      where: { isPublic: true, status: "VERIFIED" },
      orderBy: { createdAt: "asc" } // Maybe random?
    });

    if (!domain) {
      return reply.status(500).send({ error: "No public domains available" });
    }

    // Generate random local part
    const localPart = Math.random().toString(36).substring(2, 10);

    const inbox = await prisma.inbox.create({
      data: {
        domainId: domain.id,
        localPart,
        ownerId: user.userId,
        claimedAt: new Date(),
        // Default expiry? Let's say 24h for quick extension inboxes if not specified
        // Or keep it null (permanent until deleted)
      },
      include: { domain: true }
    });

    return {
      success: true,
      inbox: {
        id: inbox.id,
        address: `${inbox.localPart}@${inbox.domain.name}`,
        localPart: inbox.localPart,
        domain: inbox.domain.name,
        createdAt: inbox.createdAt
      }
    };
  });
}
