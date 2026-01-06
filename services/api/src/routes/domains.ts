import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { generateToken } from "../utils/token";
import { recordAudit } from "../utils/audit";

export async function domainRoutes(app: FastifyInstance) {
  app.get("/domains", { preHandler: app.authenticate }, async (request, reply) => {
    const query = z
      .object({
        search: z.string().optional(),
        limit: z.coerce.number().min(1).max(200).optional(),
        offset: z.coerce.number().min(0).optional(),
        contributionStatus: z.enum(["NONE", "PENDING_REVIEW", "APPROVED", "REJECTED"]).optional(),
      })
      .safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: "Invalid query" });
    }

    const user = request.user as { userId: string; role: string };
    const isAdmin = user.role === "ADMIN";

    const baseWhere = isAdmin
      ? {}
      : {
        OR: [
          { ownerId: user.userId },
          { isPublic: true },
        ]
      };

    const contributionStatus = query.data.contributionStatus;
    const filterWhere = {
      ...(contributionStatus ? { contributionStatus } : {}),
      ...(query.data.search
        ? {
          name: {
            contains: query.data.search,
            mode: "insensitive" as const,
          },
        }
        : {}),
    };

    const where = {
      AND: [baseWhere, filterWhere],
    };

    const [domains, total] = await Promise.all([
      prisma.domain.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: query.data.limit ?? 100,
        skip: query.data.offset ?? 0,
        include: { owner: { select: { email: true } } },
      }),
      prisma.domain.count({ where }),
    ]);
    return { data: domains, meta: { total } };
  });

  // Get single domain by ID
  app.get("/domains/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid ID" });
    }

    const user = request.user as { userId: string; role: string };
    const isAdmin = user.role === "ADMIN";

    const domain = await prisma.domain.findUnique({
      where: { id: params.data.id },
      include: { owner: { select: { email: true } } },
    });

    if (!domain) {
      return reply.status(404).send({ error: "Domain not found" });
    }

    // Check access: admin, owner, or public domain
    if (!isAdmin && domain.ownerId !== user.userId && !domain.isPublic) {
      return reply.status(403).send({ error: "Not authorized to view this domain" });
    }

    return { domain };
  });

  // Check DNS records for a domain
  app.get("/domains/:id/dns-check", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid ID" });
    }

    const user = request.user as { userId: string; role: string };
    const isAdmin = user.role === "ADMIN";

    const domain = await prisma.domain.findUnique({ where: { id: params.data.id } });
    if (!domain) {
      return reply.status(404).send({ error: "Domain not found" });
    }

    // Only owner or admin can check DNS
    if (!isAdmin && domain.ownerId !== user.userId) {
      return reply.status(403).send({ error: "Not authorized to check DNS for this domain" });
    }

    try {
      const { checkDomainDns } = await import("../utils/dns");
      const dnsRecords = await checkDomainDns(domain.name, domain.verificationToken);
      return {
        domain: domain.name,
        verificationToken: domain.verificationToken,
        status: domain.status,
        dns: dnsRecords,
      };
    } catch (err) {
      request.log.error(err, "DNS check error");
      return reply.status(500).send({ error: "Failed to check DNS records" });
    }
  });

  app.post("/domains", { preHandler: app.authenticate }, async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().min(3),
    });
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const user = request.user as { userId: string; role: string };
    const { name } = parsed.data;

    const existing = await prisma.domain.findUnique({ where: { name } });
    if (existing) {
      return reply.status(409).send({ error: "Domain already exists", domain: existing });
    }

    // Create domain attached to current user
    // If admin creates domain, make it public automatically
    const isAdmin = user.role === "ADMIN";
    const domain = await prisma.domain.create({
      data: {
        name,
        verificationToken: generateToken(),
        ownerId: user.userId,
        isPublic: isAdmin, // Admin-created domains are public by default
      }
    });

    await recordAudit(user.userId, "DOMAIN_CREATED", {
      domainId: domain.id,
      name: domain.name,
      isPublic: isAdmin,
    });

    return reply.status(201).send({ domain });
  });

  app.post("/domains/:id/verify", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = z.object({ token: z.string().min(6) }).safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const domain = await prisma.domain.findUnique({ where: { id: params.data.id } });
    if (!domain) {
      return reply.status(404).send({ error: "Domain not found" });
    }

    const user = request.user as { userId: string; role: string };
    if (domain.ownerId !== user.userId && user.role !== "ADMIN") {
      return reply.status(403).send({ error: "Not authorized to verify this domain" });
    }

    try {
      const { verifyDomainOwnership } = await import("../utils/dns");
      const isVerified = await verifyDomainOwnership(domain.name, domain.verificationToken);

      if (!isVerified) {
        return reply.status(400).send({
          error: "DNS verification failed",
          details: `Could not find TXT record containing '${domain.verificationToken}' on ${domain.name}`
        });
      }
    } catch (err) {
      request.log.error(err, "DNS verification error");
      return reply.status(500).send({ error: "Internal DNS error" });
    }

    const updated = await prisma.domain.update({
      where: { id: domain.id },
      data: { status: "VERIFIED" },
    });

    await recordAudit(user.userId, "DOMAIN_VERIFIED", { domainId: domain.id, name: domain.name });

    return { domain: updated };
  });

  app.delete("/domains/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid ID" });
    }

    const domain = await prisma.domain.findUnique({ where: { id: params.data.id } });
    if (!domain) {
      return reply.status(404).send({ error: "Domain not found" });
    }

    const user = request.user as { userId: string; role: string };
    if (domain.ownerId !== user.userId && user.role !== "ADMIN") {
      return reply.status(403).send({ error: "Not authorized to delete this domain" });
    }

    await prisma.domain.delete({ where: { id: params.data.id } });

    await recordAudit(user.userId, "DOMAIN_DELETED", { domainId: params.data.id, name: domain.name });

    return { success: true };
  });

  // PATCH domain - update isPublic (admin only for isPublic)
  app.patch("/domains/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = z
      .object({
        isPublic: z.boolean().optional(),
        contributionStatus: z.enum(["NONE", "PENDING_REVIEW", "APPROVED", "REJECTED"]).optional(),
      })
      .safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const domain = await prisma.domain.findUnique({ where: { id: params.data.id } });
    if (!domain) {
      return reply.status(404).send({ error: "Domain not found" });
    }

    const user = request.user as { userId: string; role: string };

    // Check general permission (owner or admin)
    if (domain.ownerId !== user.userId && user.role !== "ADMIN") {
      return reply.status(403).send({ error: "Not authorized to update this domain" });
    }

    // Handle isPublic changes - allow owner or admin
    if (body.data.isPublic !== undefined) {
      // Domain must be verified before sharing
      if (body.data.isPublic && domain.status !== "VERIFIED") {
        return reply.status(400).send({
          error: "Domain phải được xác thực trước khi chia sẻ",
          code: "DOMAIN_NOT_VERIFIED"
        });
      }

      // Validate un-sharing: Check if others are using the domain
      if (domain.isPublic && body.data.isPublic === false) {
        const othersInboxes = await prisma.inbox.count({
          where: {
            domainId: domain.id,
            ownerId: { not: user.userId },
            deletedAt: null,
          }
        });

        if (othersInboxes > 0 && user.role !== "ADMIN") {
          return reply.status(400).send({
            error: "Không thể tắt chia sẻ khi người khác đang sử dụng domain",
            details: `Có ${othersInboxes} hộp thư của người dùng khác trên domain này`,
            code: "DOMAIN_HAS_DEPENDENTS"
          });
        }
      }
    }

    // Handle contributionStatus changes
    if (body.data.contributionStatus) {
      const status = body.data.contributionStatus;

      if (status === "PENDING_REVIEW") {
        // Owner requesting contribution
        if (domain.status !== "VERIFIED") {
          return reply.status(400).send({ error: "Domain must be verified before contributing" });
        }
      } else if (["APPROVED", "REJECTED"].includes(status)) {
        // Approval/Rejection
        if (user.role !== "ADMIN") {
          return reply.status(403).send({ error: "Only admin can approve or reject contributions" });
        }
      }
    }

    const dataToUpdate: any = { ...body.data };

    // Track when domain was shared
    if (body.data.isPublic === true && !domain.isPublic) {
      dataToUpdate.sharedAt = new Date();
    } else if (body.data.isPublic === false && domain.isPublic) {
      dataToUpdate.sharedAt = null;
    }

    // Auto-set isPublic on APPROVAL, unset on REJECTED/NONE
    if (body.data.contributionStatus === "APPROVED") {
      dataToUpdate.isPublic = true;
      dataToUpdate.sharedAt = new Date();
    } else if (
      body.data.contributionStatus === "REJECTED" ||
      body.data.contributionStatus === "NONE"
    ) {
      dataToUpdate.isPublic = false;
      dataToUpdate.sharedAt = null;
    }

    const updated = await prisma.domain.update({
      where: { id: params.data.id },
      data: dataToUpdate,
    });

    // Audit logs
    if (body.data.isPublic !== undefined) {
      await recordAudit(user.userId, "DOMAIN_VISIBILITY_CHANGED", {
        domainId: domain.id,
        name: domain.name,
        isPublic: body.data.isPublic,
      });
    }

    if (body.data.contributionStatus !== undefined) {
      await recordAudit(user.userId, "DOMAIN_CONTRIBUTION_STATUS_CHANGED", {
        domainId: domain.id,
        name: domain.name,
        status: body.data.contributionStatus,
      });
    }

    return { domain: updated };
  });
}
