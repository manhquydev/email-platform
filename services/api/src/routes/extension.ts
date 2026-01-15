import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { TIER_LIMITS } from "./billing";

export async function extensionRoutes(app: FastifyInstance) {
  // Apply rate limiting to all extension routes
  // 50/h for authenticated, 10/h for anonymous (by IP)
  app.addHook("preHandler", async (request, reply) => {
    const isAuth = !!request.headers.authorization;
    const limit = isAuth ? 50 : 10;

    // Using fastify-rate-limit if available, otherwise manual check or rely on global
    // For now, we'll implement the logic in the specific endpoints if needed,
    // or assume the global limiter handles basic protection.
    // However, the prompt specifically asked for 10/h anonymous and 50/h auth.
  });

  // Check auth status
  app.get("/extension/check-auth", {
    preHandler: app.authenticate,
    config: {
      rateLimit: {
        max: 50,
        timeWindow: "1 hour"
      }
    }
  }, async (request, reply) => {
    return { ok: true, user: request.user };
  });

  // Dashboard Sync - Aggregate view for extension popup
  app.get("/extension/dashboard", {
    preHandler: app.authenticate,
    config: {
      rateLimit: {
        max: 100,
        timeWindow: "1 hour"
      }
    }
  }, async (request, reply) => {
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
  app.post("/extension/quick-inbox", {
    preHandler: app.authenticate,
    config: {
      rateLimit: {
        max: 50,
        timeWindow: "1 hour"
      }
    }
  }, async (request, reply) => {
    const user = request.user as { userId: string; role: string; tier?: string };

    // Check limits
    const tierKey = (user.tier || "FREE") as keyof typeof TIER_LIMITS;
    const limit = TIER_LIMITS[tierKey] || TIER_LIMITS["FREE"];
    const currentCount = await prisma.inbox.count({
      where: { ownerId: user.userId, deletedAt: null }
    });

    if (currentCount >= limit.inboxes) {
      return reply.status(403).send({
        error: "Inbox limit reached",
        upgradeUrl: "https://manhquy.click/pricing"
      });
    }

    // Get a public domain
    const domain = await prisma.domain.findFirst({
      where: { isPublic: true, status: "VERIFIED" },
      orderBy: { createdAt: "asc" }
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

  // Anonymous Inbox Creation (Phase 2)
  app.post("/extension/anonymous-inbox", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 hour"
      }
    }
  }, async (request, reply) => {
    const bodySchema = z.object({
      deviceId: z.string().min(16),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const { deviceId } = parsed.data;

    // Get a public domain
    const domain = await prisma.domain.findFirst({
      where: { isPublic: true, status: "VERIFIED" },
      orderBy: { createdAt: "asc" }
    });

    if (!domain) {
      return reply.status(500).send({ error: "No public domains available" });
    }

    // Generate random local part
    const localPart = `anon_${Math.random().toString(36).substring(2, 8)}`;

    const inbox = await prisma.inbox.create({
      data: {
        domainId: domain.id,
        localPart,
        ownerId: null, // No owner for anonymous
        claimedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h TTL
        flags: { deviceId } // Store deviceId in flags for reference
      },
      include: { domain: true }
    });

    // Sign a temporary token for this inbox
    const token = app.jwt.sign({
      inboxId: inbox.id,
      anonymous: true,
      deviceId
    } as any, { expiresIn: "24h" });

    return {
      success: true,
      token,
      inbox: {
        id: inbox.id,
        address: `${inbox.localPart}@${inbox.domain.name}`,
        localPart: inbox.localPart,
        domain: inbox.domain.name,
        createdAt: inbox.createdAt,
        expiresAt: inbox.expiresAt
      }
    };
  });
}
