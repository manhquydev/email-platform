import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../utils/audit";

export async function inboxRoutes(app: FastifyInstance) {
  app.get("/inboxes", { preHandler: app.authenticate }, async (request, reply) => {
    const query = z
      .object({
        domain: z.string().optional(),
        search: z.string().optional(),
        limit: z.coerce.number().min(1).max(200).optional(),
        offset: z.coerce.number().min(0).optional(),
        personal: z.enum(["true", "false"]).optional(),
      })
      .safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: "Invalid query" });
    }

    const user = request.user as { userId: string; role: string };
    const isAdmin = user.role === "ADMIN";
    const isPersonal = query.data.personal === "true";

    const domainFilter = query.data.domain;
    const where = {
      deletedAt: null,
      // Filter by owner - users only see their own inboxes
      // Admins see all UNLESS they explicitly ask for their personal ones
      ...((isAdmin && !isPersonal) ? {} : { ownerId: user.userId }),
      ...(domainFilter ? { domain: { name: domainFilter } } : {}),
      ...(query.data.search
        ? { localPart: { contains: query.data.search, mode: "insensitive" as const } }
        : {}),
    };
    const [inboxes, total] = await Promise.all([
      prisma.inbox.findMany({
        where,
        include: {
          domain: true,
          owner: { select: { email: true } },
          _count: { select: { messages: { where: { deletedAt: null } } } }
        },
        orderBy: { createdAt: "desc" },
        take: query.data.limit ?? 100,
        skip: query.data.offset ?? 0,
      }),
      prisma.inbox.count({ where }),
    ]);
    return { data: inboxes, meta: { total } };
  });

  app.post("/inboxes", { preHandler: app.authenticate }, async (request, reply) => {
    const bodySchema = z.object({
      domainId: z.string().uuid(),
      localPart: z.string().min(1),
      expiresAt: z.string().datetime().nullable().optional(),
    });
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const { domainId, localPart, expiresAt } = parsed.data;
    const domain = await prisma.domain.findUnique({ where: { id: domainId } });
    if (!domain) {
      return reply.status(404).send({ error: "Domain not found" });
    }

    // Kiểm tra domain đã verified chưa
    if (domain.status !== "VERIFIED") {
      return reply.status(403).send({
        error: "Domain chưa được xác thực",
        details: "Vui lòng xác thực domain trước khi tạo inbox. Thêm TXT record vào DNS và nhấn 'Xác thực ngay'.",
        code: "DOMAIN_NOT_VERIFIED"
      });
    }

    const user = request.user as { userId: string; role: string };
    if (!domain.isPublic && domain.ownerId !== user.userId && user.role !== "ADMIN") {
      return reply.status(403).send({ error: "Not authorized to create inbox for this domain" });
    }

    const existing = await prisma.inbox.findUnique({ where: { domainId_localPart: { domainId, localPart } } });
    if (existing && !existing.deletedAt) {
      return reply.status(409).send({ error: "Inbox exists", inbox: existing });
    }

    const inbox = existing
      ? await prisma.inbox.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          ownerId: user.userId, // Claim ownership on reactivation
          claimedAt: new Date(),
        },
      })
      : await prisma.inbox.create({
        data: {
          domainId,
          localPart,
          ownerId: user.userId, // Set owner on creation (first-come-first-served)
          claimedAt: new Date(),
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });

    await recordAudit(user.userId, "INBOX_CREATED", {
      inboxId: inbox.id,
      email: `${localPart}@${domain.name}`
    });

    return reply.status(201).send({ inbox });
  });

  // DELETE inbox (soft delete)
  app.delete("/inboxes/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid ID" });
    }

    const inbox = await prisma.inbox.findUnique({
      where: { id: params.data.id },
      include: { domain: true },
    });

    if (!inbox || inbox.deletedAt) {
      return reply.status(404).send({ error: "Inbox not found" });
    }

    const user = request.user as { userId: string; role: string };

    // Check permission: inbox owner or admin (NOT domain owner - ownership is per-inbox)
    if (inbox.ownerId !== user.userId && user.role !== "ADMIN") {
      return reply.status(403).send({ error: "Not authorized to delete this inbox" });
    }

    // Soft delete
    await prisma.inbox.update({
      where: { id: params.data.id },
      data: { deletedAt: new Date() },
    });

    await recordAudit(user.userId, "INBOX_DELETED", {
      inboxId: inbox.id,
      email: `${inbox.localPart}@${inbox.domain.name}`,
    });

    return { success: true };
  });

  // PATCH inbox - Admin update (transfer ownership)
  app.patch("/inboxes/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = z.object({
      ownerId: z.string().uuid().optional(),
      ownerEmail: z.string().email().optional(),
      expiresAt: z.string().datetime().nullable().optional(),
      retentionDays: z.number().min(1).max(365).nullable().optional(),
    }).safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const user = request.user as { userId: string; role: string; tier?: string };

    const inbox = await prisma.inbox.findUnique({
      where: { id: params.data.id },
      include: { domain: true },
    });

    if (!inbox) {
      return reply.status(404).send({ error: "Inbox not found" });
    }

    // Permission check: Admin OR Owner
    if (user.role !== "ADMIN" && inbox.ownerId !== user.userId) {
      return reply.status(403).send({ error: "Not authorized to update this inbox" });
    }

    const dataToUpdate: any = {};

    // Handle expiry update
    if (body.data.expiresAt !== undefined) {
      dataToUpdate.expiresAt = body.data.expiresAt ? new Date(body.data.expiresAt) : null;
    }

    // Handle retention days update (premium feature)
    if (body.data.retentionDays !== undefined) {
      // Check tier limits for retention
      const tierLimits: Record<string, number> = {
        FREE: 7,
        STARTER: 30,
        PROFESSIONAL: 90,
        ENTERPRISE: 365,
      };
      const maxRetention = tierLimits[user.tier || "FREE"] || 7;

      if (body.data.retentionDays && body.data.retentionDays > maxRetention) {
        return reply.status(403).send({
          error: "Retention limit exceeded",
          message: `Your ${user.tier || "FREE"} plan allows up to ${maxRetention} days retention. Upgrade for longer retention.`,
          maxAllowed: maxRetention
        });
      }
      dataToUpdate.retentionDays = body.data.retentionDays;
    }

    // Handle ownership transfer
    if (body.data.ownerId || body.data.ownerEmail) {
      let newOwnerId = body.data.ownerId;

      if (body.data.ownerEmail) {
        const targetUser = await prisma.user.findUnique({
          where: { email: body.data.ownerEmail }
        });
        if (!targetUser) {
          return reply.status(404).send({ error: "Target user not found" });
        }
        newOwnerId = targetUser.id;
      }

      if (newOwnerId && newOwnerId !== inbox.ownerId) {
        dataToUpdate.ownerId = newOwnerId;
        dataToUpdate.claimedAt = new Date(); // Reset claim time for new owner
      }
    }

    const updated = await prisma.inbox.update({
      where: { id: params.data.id },
      data: dataToUpdate,
      include: { owner: { select: { email: true } }, domain: true }
    });

    if (dataToUpdate.ownerId) {
      await recordAudit(user.userId, "INBOX_TRANSFERRED", {
        inboxId: inbox.id,
        email: `${inbox.localPart}@${inbox.domain.name}`,
        fromOwnerId: inbox.ownerId,
        toOwnerId: dataToUpdate.ownerId,
      });
    }

    return { inbox: updated };
  });

  // BULK CREATE inboxes
  app.post("/inboxes/bulk", { preHandler: app.authenticate }, async (request, reply) => {
    const bodySchema = z.object({
      inboxes: z.array(z.object({
        domainId: z.string().uuid().optional(),
        localPart: z.string().min(1).optional(),
        expiresAt: z.string().datetime().nullable().optional(),
      })).min(1).max(100),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const user = request.user as { userId: string; role: string };
    const { inboxes: inboxConfigs } = parsed.data;

    // Get default public domain if not specified
    const defaultDomain = await prisma.domain.findFirst({
      where: { isPublic: true, status: "VERIFIED" },
      orderBy: { createdAt: "asc" },
    });

    const results = await Promise.allSettled(
      inboxConfigs.map(async (config, index) => {
        const domainId = config.domainId || defaultDomain?.id;
        if (!domainId) {
          throw new Error("No domain specified and no public domain available");
        }

        const domain = await prisma.domain.findUnique({ where: { id: domainId } });
        if (!domain) {
          throw new Error(`Domain not found: ${domainId}`);
        }

        if (domain.status !== "VERIFIED") {
          throw new Error(`Domain not verified: ${domain.name}`);
        }

        if (!domain.isPublic && domain.ownerId !== user.userId && user.role !== "ADMIN") {
          throw new Error(`Not authorized for domain: ${domain.name}`);
        }

        // Generate random local part if not specified
        const localPart = config.localPart || Math.random().toString(36).substring(2, 10);

        const existing = await prisma.inbox.findUnique({
          where: { domainId_localPart: { domainId, localPart } }
        });

        if (existing && !existing.deletedAt) {
          throw new Error(`Inbox already exists: ${localPart}@${domain.name}`);
        }

        const inbox = existing
          ? await prisma.inbox.update({
              where: { id: existing.id },
              data: {
                deletedAt: null,
                expiresAt: config.expiresAt ? new Date(config.expiresAt) : null,
                ownerId: user.userId,
                claimedAt: new Date(),
              },
              include: { domain: true },
            })
          : await prisma.inbox.create({
              data: {
                domainId,
                localPart,
                ownerId: user.userId,
                claimedAt: new Date(),
                expiresAt: config.expiresAt ? new Date(config.expiresAt) : null,
              },
              include: { domain: true },
            });

        return {
          ...inbox,
          address: `${inbox.localPart}@${inbox.domain.name}`,
        };
      })
    );

    const success = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map(r => r.value);

    const failed = results
      .map((r, index) => ({ result: r, index }))
      .filter((item): item is { result: PromiseRejectedResult; index: number } =>
        item.result.status === "rejected"
      )
      .map(item => ({
        index: item.index,
        error: item.result.reason?.message || "Unknown error",
      }));

    return { success, failed };
  });

  // BULK DELETE inboxes
  app.delete("/inboxes/bulk", { preHandler: app.authenticate }, async (request, reply) => {
    const bodySchema = z.object({
      ids: z.array(z.string().uuid()).min(1).max(100),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const user = request.user as { userId: string; role: string };
    const { ids } = parsed.data;

    const results = await Promise.allSettled(
      ids.map(async (id, index) => {
        const inbox = await prisma.inbox.findUnique({
          where: { id },
          include: { domain: true },
        });

        if (!inbox || inbox.deletedAt) {
          throw new Error(`Inbox not found: ${id}`);
        }

        if (inbox.ownerId !== user.userId && user.role !== "ADMIN") {
          throw new Error(`Not authorized to delete inbox: ${id}`);
        }

        await prisma.inbox.update({
          where: { id },
          data: { deletedAt: new Date() },
        });

        return { id };
      })
    );

    const success = results
      .filter((r): r is PromiseFulfilledResult<{ id: string }> => r.status === "fulfilled")
      .map(r => r.value);

    const failed = results
      .map((r, index) => ({ result: r, index, id: ids[index] }))
      .filter((item): item is { result: PromiseRejectedResult; index: number; id: string } =>
        item.result.status === "rejected"
      )
      .map(item => ({
        index: item.index,
        id: item.id,
        error: item.result.reason?.message || "Unknown error",
      }));

    return { success, failed };
  });
}
