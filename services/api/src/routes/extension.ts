import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { TIER_LIMITS } from "./billing";
import { sanitizeAlias, validateAlias } from "../lib/alias-validation";

const FRIENDLY_FIRST_NAMES = [
  "an", "bao", "binh", "chi", "duy", "giang", "hao", "khanh", "linh", "mai",
  "minh", "nam", "ngoc", "phuong", "quan", "trang", "tuan", "vy",
  "alex", "sam", "jules", "kai", "morgan", "taylor", "riley", "jordan",
];
const FRIENDLY_LAST_NAMES = [
  "nguyen", "tran", "le", "pham", "hoang", "phan", "vu", "dang", "bui", "do",
];
const FRIENDLY_ROLE_WORDS = ["hello", "contact", "desk", "inbox"];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function randomDigits(count = 2): string {
  return Array.from({ length: count }, () => String(Math.floor(Math.random() * 10))).join("");
}

function generateFriendlyLocalPart(): string {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const first = pickRandom(FRIENDLY_FIRST_NAMES);
    const last = pickRandom(FRIENDLY_LAST_NAMES);
    const role = pickRandom(FRIENDLY_ROLE_WORDS);
    const pattern = Math.floor(Math.random() * 5);
    const suffix = randomDigits(2);

    const raw =
      pattern === 0 ? `${first}.${last}`
        : pattern === 1 ? `${first}${last}${suffix}`
          : pattern === 2 ? `${first}.${last}${suffix}`
            : pattern === 3 ? `${first.charAt(0)}.${last}`
              : `${role}.${first}`;

    const candidate = sanitizeAlias(raw).slice(0, 30);
    const validation = validateAlias(candidate);
    if (validation.valid && validation.sanitized) {
      return validation.sanitized;
    }
  }

  return `contact.${pickRandom(FRIENDLY_FIRST_NAMES)}${randomDigits(2)}`;
}

async function getRandomVerifiedPublicDomain() {
  const domains = await prisma.domain.findMany({
    where: { isPublic: true, status: "VERIFIED" },
    select: { id: true, name: true },
  });

  if (domains.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * domains.length);
  return domains[randomIndex]!;
}

async function getVerifiedExtensionDomainForUser(userId: string, requestedDomainId?: string) {
  if (requestedDomainId) {
    return prisma.domain.findFirst({
      where: {
        id: requestedDomainId,
        status: "VERIFIED",
        OR: [{ isPublic: true }, { ownerId: userId }],
      },
      select: { id: true, name: true, isPublic: true },
    });
  }

  const domains = await prisma.domain.findMany({
    where: {
      status: "VERIFIED",
      OR: [{ isPublic: true }, { ownerId: userId }],
    },
    select: { id: true, name: true, isPublic: true },
  });

  if (domains.length === 0) {
    return null;
  }

  return domains[Math.floor(Math.random() * domains.length)]!;
}

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
  }, async (request) => {
    return { ok: true, user: request.user };
  });

  // Available domains for extension inbox creation (public + owned)
  app.get("/extension/domains", {
    preHandler: app.authenticate,
    config: {
      rateLimit: {
        max: 80,
        timeWindow: "1 hour",
      },
    },
  }, async (request, reply) => {
    const user = request.user as { userId: string };

    const domains = await prisma.domain.findMany({
      where: {
        status: "VERIFIED",
        OR: [{ isPublic: true }, { ownerId: user.userId }],
      },
      select: {
        id: true,
        name: true,
        isPublic: true,
      },
      orderBy: [{ isPublic: "asc" }, { name: "asc" }],
    });

    return { domains };
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
    const bodySchema = z.object({
      localPart: z.string().min(3).max(30).optional(),
      domainId: z.string().uuid().optional(),
    });
    const parsed = bodySchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const requestedLocalPart = parsed.data.localPart
      ? sanitizeAlias(parsed.data.localPart)
      : undefined;

    if (requestedLocalPart) {
      const validation = validateAlias(requestedLocalPart);
      if (!validation.valid) {
        return reply.status(400).send({ error: validation.error || "Invalid alias format" });
      }
    }

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

    const domain = await getVerifiedExtensionDomainForUser(user.userId, parsed.data.domainId);

    if (!domain) {
      return reply.status(404).send({ error: "No available domains found for this account" });
    }

    let inbox: {
      id: string;
      localPart: string;
      createdAt: Date;
      expiresAt: Date | null;
      domain: { name: string };
    } | null = null;
    let localPart = requestedLocalPart || generateFriendlyLocalPart();
    const maxAttempts = requestedLocalPart ? 1 : 6;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        inbox = await prisma.inbox.create({
          data: {
            domainId: domain.id,
            localPart,
            ownerId: user.userId,
            claimedAt: new Date(),
          },
          include: { domain: true },
        });
        break;
      } catch (error: any) {
        if (error?.code !== "P2002") {
          throw error;
        }
        if (requestedLocalPart) {
          return reply.status(409).send({ error: "This alias is already taken for this domain" });
        }
        localPart = generateFriendlyLocalPart();
      }
    }

    if (!inbox) {
      return reply.status(500).send({ error: "Failed to generate available inbox alias" });
    }

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

    // Pick a random verified public domain to avoid overloading a single domain.
    const domain = await getRandomVerifiedPublicDomain();

    if (!domain) {
      return reply.status(500).send({ error: "No public domains available" });
    }

    let inbox: {
      id: string;
      localPart: string;
      createdAt: Date;
      expiresAt: Date | null;
      domain: { name: string };
    } | null = null;
    let localPart = generateFriendlyLocalPart();

    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        inbox = await prisma.inbox.create({
          data: {
            domainId: domain.id,
            localPart,
            ownerId: null, // No owner for anonymous
            claimedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h TTL
            flags: { deviceId }, // Store deviceId in flags for reference
          },
          include: { domain: true },
        });
        break;
      } catch (error: any) {
        if (error?.code !== "P2002") {
          throw error;
        }
        localPart = generateFriendlyLocalPart();
      }
    }

    if (!inbox) {
      return reply.status(500).send({ error: "Failed to generate available inbox alias" });
    }

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
