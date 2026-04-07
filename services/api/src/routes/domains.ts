import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { generateToken } from "../utils/token";
import { recordAudit } from "../utils/audit";
import { addDomainToPostfix, removeDomainFromPostfix } from "../utils/postfix-sync";
import { isValidDomainFormat } from "../utils/email-validation";
import { ensureDefaultInboxesForVerifiedDomain } from "../services/domain-verification.service";

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
    const normalizedName = parsed.data.name.trim().toLowerCase();
    if (!isValidDomainFormat(normalizedName)) {
      return reply.status(400).send({
        error: "Invalid domain format",
        details: "Domain must be a valid format (e.g., example.com)"
      });
    }

    const existing = await prisma.domain.findUnique({ where: { name: normalizedName } });
    if (existing) {
      return reply.status(409).send({ error: "Domain already exists", domain: existing });
    }

    // Create domain attached to current user
    // If admin creates domain, make it public automatically
    const isAdmin = user.role === "ADMIN";
    const domain = await prisma.domain.create({
      data: {
        name: normalizedName,
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
    const body = z.object({ token: z.string().min(6).optional() }).safeParse(request.body ?? {});
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

    const previousStatus = domain.status;
    let statusChanged = false;
    if (domain.status !== "VERIFIED") {
      await prisma.domain.update({
        where: { id: domain.id },
        data: { status: "VERIFIED" },
      });
      statusChanged = true;
    }

    // Sync to Postfix relay_domains so it accepts mail for this domain
    const syncResult = await addDomainToPostfix(domain.name);
    if (!syncResult.success) {
      if (statusChanged) {
        await prisma.domain.update({
          where: { id: domain.id },
          data: { status: previousStatus },
        });
      }
      request.log.warn({ domain: domain.name, error: syncResult.error }, "Postfix sync failed");
      return reply.status(503).send({
        error: "Domain sync failed",
        details: "DNS verified but Postfix relay sync failed. Please retry verification.",
      });
    }

    await ensureDefaultInboxesForVerifiedDomain(domain.id);

    const updated = await prisma.domain.findUnique({ where: { id: domain.id } });
    if (!updated) {
      return reply.status(404).send({ error: "Domain not found after verification" });
    }

    await recordAudit(user.userId, "DOMAIN_VERIFIED", { domainId: domain.id, name: domain.name });

    return { domain: updated };
  });

  // Setup DKIM for a domain
  app.post("/domains/:id/dkim", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = z.object({ selector: z.string().min(1).default("ephemera") }).safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const domain = await prisma.domain.findUnique({ where: { id: params.data.id } });
    if (!domain) {
      return reply.status(404).send({ error: "Domain not found" });
    }

    const user = request.user as { userId: string; role: string };
    if (domain.ownerId !== user.userId && user.role !== "ADMIN") {
      return reply.status(403).send({ error: "Not authorized to manage DKIM for this domain" });
    }

    try {
      const { DkimService } = await import("../services/dkim.service");
      const dkim = await DkimService.setupDkim(domain.id, body.data.selector);

      await recordAudit(user.userId, "DOMAIN_DKIM_SETUP", { domainId: domain.id, selector: dkim.selector });

      return {
        selector: dkim.selector,
        publicKey: dkim.publicKey,
        dnsRecord: `${dkim.selector}._domainkey.${domain.name} IN TXT "v=DKIM1; k=rsa; p=${dkim.publicKey}"`
      };
    } catch (err) {
      request.log.error(err, "DKIM setup error");
      return reply.status(500).send({ error: "Failed to setup DKIM" });
    }
  });

  // Get DKIM info for a domain
  app.get("/domains/:id/dkim", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid ID" });
    }

    const domain = await prisma.domain.findUnique({
      where: { id: params.data.id },
      include: { dkim: true }
    });
    if (!domain) {
      return reply.status(404).send({ error: "Domain not found" });
    }

    const user = request.user as { userId: string; role: string };
    if (domain.ownerId !== user.userId && user.role !== "ADMIN") {
      return reply.status(403).send({ error: "Not authorized to view DKIM for this domain" });
    }

    try {
      const { DkimService } = await import("../services/dkim.service");
      const dkimInfo = await DkimService.getDkimInfo(domain.id);
      return {
        ...dkimInfo,
        domainName: domain.name,
      };
    } catch (err) {
      request.log.error(err, "DKIM info error");
      return reply.status(500).send({ error: "Failed to get DKIM info" });
    }
  });

  // Rotate DKIM key for a domain
  app.post("/domains/:id/dkim/rotate", { preHandler: app.authenticate }, async (request, reply) => {
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
      return reply.status(403).send({ error: "Not authorized to rotate DKIM for this domain" });
    }

    try {
      const { DkimService } = await import("../services/dkim.service");
      const dkim = await DkimService.rotateDkimKey(domain.id);

      await recordAudit(user.userId, "DOMAIN_DKIM_ROTATED", { domainId: domain.id, selector: dkim.selector });

      return {
        success: true,
        selector: dkim.selector,
        dnsRecord: dkim.dnsRecord,
        dnsHost: `${dkim.selector}._domainkey.${domain.name}`,
        message: "DKIM key rotated. Please update your DNS record.",
      };
    } catch (err) {
      request.log.error(err, "DKIM rotate error");
      return reply.status(500).send({ error: "Failed to rotate DKIM key" });
    }
  });

  // Verify DKIM DNS record
  app.post("/domains/:id/dkim/verify", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid ID" });
    }

    const domain = await prisma.domain.findUnique({
      where: { id: params.data.id },
      include: { dkim: true }
    });
    if (!domain) {
      return reply.status(404).send({ error: "Domain not found" });
    }

    const user = request.user as { userId: string; role: string };
    if (domain.ownerId !== user.userId && user.role !== "ADMIN") {
      return reply.status(403).send({ error: "Not authorized to verify DKIM for this domain" });
    }

    if (!domain.dkim) {
      return reply.status(400).send({ error: "DKIM not configured for this domain" });
    }

    try {
      const { DkimService } = await import("../services/dkim.service");
      const result = await DkimService.verifyDkimDns(domain.name, domain.dkim.selector);

      return {
        valid: result.valid,
        selector: domain.dkim.selector,
        dnsHost: `${domain.dkim.selector}._domainkey.${domain.name}`,
        found: result.found,
        expected: result.expected,
        error: result.error,
      };
    } catch (err) {
      request.log.error(err, "DKIM verify error");
      return reply.status(500).send({ error: "Failed to verify DKIM DNS" });
    }
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

    // Remove from Postfix relay_domains so it stops accepting mail for this domain
    if (domain.status === "VERIFIED") {
      const syncResult = await removeDomainFromPostfix(domain.name);
      if (!syncResult.success) {
        request.log.warn({ domain: domain.name, error: syncResult.error }, "Postfix sync failed on delete");
      }
    }

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

// Email validation endpoints (appended)
export async function emailValidationRoutes(app: import("fastify").FastifyInstance) {
  const { validateEmail, validateDomain, canReceiveEmail } = await import("../utils/email-validation");
  const { z } = await import("zod");

  // Validate email address (MX, SPF, format, disposable check)
  app.post("/domains/validate-email", { preHandler: app.authenticate }, async (request, reply) => {
    const body = z.object({ email: z.string().email() }).safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Invalid email format" });
    }
    try {
      const result = await validateEmail(body.data.email);
      return result;
    } catch (err) {
      request.log.error(err, "Email validation error");
      return reply.status(500).send({ error: "Failed to validate email" });
    }
  });

  // Validate domain configuration (MX, SPF, DMARC)
  app.post("/domains/validate", { preHandler: app.authenticate }, async (request, reply) => {
    const body = z.object({ domain: z.string().min(3) }).safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Invalid domain" });
    }
    try {
      const result = await validateDomain(body.data.domain);
      return result;
    } catch (err) {
      request.log.error(err, "Domain validation error");
      return reply.status(500).send({ error: "Failed to validate domain" });
    }
  });

  // Quick check if email can receive messages
  app.get("/domains/can-receive", { preHandler: app.authenticate }, async (request, reply) => {
    const query = z.object({ email: z.string().email() }).safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: "Invalid email" });
    }
    try {
      const canReceive = await canReceiveEmail(query.data.email);
      return { email: query.data.email, canReceive };
    } catch (err) {
      request.log.error(err, "Can receive check error");
      return reply.status(500).send({ error: "Failed to check email" });
    }
  });
}
