import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { generateToken } from "../utils/token";
import { recordAudit } from "../utils/audit";
import { AuthenticatedRequest } from "../types/auth";
import { OrganizationRole } from "@prisma/client";
import { PermissionService } from "../services/permissionService";
import { checkQuota } from "../middleware/quota";

export async function domainRoutes(app: FastifyInstance) {
  app.get("/domains", { preHandler: app.authenticate }, async (request, reply) => {
    const query = z
      .object({
        search: z.string().optional(),
        limit: z.coerce.number().min(1).max(200).optional(),
        offset: z.coerce.number().min(0).optional(),
        organizationId: z.string().uuid().optional(),
      })
      .safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: "Invalid query" });
    }

    const user = request.user as { userId: string; role: string };
    const isAdmin = user.role === "ADMIN";

    // If organizationId is provided, check if user is member
    if (query.data.organizationId) {
      const isMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: query.data.organizationId,
            userId: user.userId
          }
        }
      });

      if (!isMember && !isAdmin) {
        return reply.status(403).send({ error: "Not a member of this organization" });
      }
    }

    const baseWhere = isAdmin
      ? query.data.organizationId
        ? { organizationId: query.data.organizationId }
        : {}
      : query.data.organizationId
      ? { organizationId: query.data.organizationId }
      : {
        OR: [
          { ownerId: user.userId },
          {
            organization: {
              members: {
                some: {
                  userId: user.userId,
                  isActive: true
                }
              }
            }
          },
          { isPublic: true },
        ]
      };

    const searchWhere = query.data.search
      ? {
        name: {
          contains: query.data.search,
          mode: "insensitive" as const,
        },
      }
      : {};

    const where = {
      AND: [baseWhere, searchWhere],
    };

    const [domains, total] = await Promise.all([
      prisma.domain.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: query.data.limit ?? 100,
        skip: query.data.offset ?? 0,
        include: {
          owner: {
            select: { id: true, email: true }
          },
          organization: {
            select: { id: true, name: true, slug: true }
          }
        },
      }),
      prisma.domain.count({ where }),
    ]);
    return { data: domains, meta: { total } };
  });

  app.post("/domains", { preHandler: [app.authenticate, checkQuota('domain')] }, async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().min(3),
      organizationId: z.string().uuid().optional(),
    });
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const user = request.user as { userId: string; role: string };
    const { name, organizationId } = parsed.data;

    const existing = await prisma.domain.findUnique({ where: { name } });
    if (existing) {
      return reply.status(409).send({ error: "Domain already exists", domain: existing });
    }

    let ownerId = user.userId;
    let orgId = null;

    // If organizationId is provided, check permissions
    if (organizationId) {
      const canCreate = await PermissionService.checkOrganizationPermission(
        user.userId,
        organizationId,
        'edit' // Domain creation requires organization edit permission
      );

      if (!canCreate) {
        return reply.status(403).send({ error: "Insufficient permissions to create domains" });
      }

      orgId = organizationId;
      // Don't set ownerId for organization domains
      ownerId = undefined;
    }

    // Create domain attached to user or organization
    // If admin creates domain, make it public automatically
    const isAdmin = user.role === "ADMIN";
    const domain = await prisma.domain.create({
      data: {
        name,
        verificationToken: generateToken(),
        ownerId,
        organizationId: orgId,
        isPublic: isAdmin, // Admin-created domains are public by default
      },
      include: {
        owner: {
          select: { id: true, email: true }
        },
        organization: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    await recordAudit(user.userId, "DOMAIN_CREATED", {
      domainId: domain.id,
      name: domain.name,
      isPublic: isAdmin,
      organizationId: orgId,
      ownerId,
    });

    return { domain };
  });

  app.post("/domains/:id/verify", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = z.object({ token: z.string().min(6) }).safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const userId = (request.user as any).userId;
    const isAdmin = await PermissionService.isSystemAdmin(userId);
    const canVerify = await PermissionService.canManageDomain(userId, params.data.id, 'verify');

    if (!canVerify && !isAdmin) {
      return reply.status(403).send({ error: "Not authorized to verify this domain" });
    }

    const domain = await prisma.domain.findUnique({
      where: { id: params.data.id }
    });

    if (!domain) {
      return reply.status(404).send({ error: "Domain not found" });
    }

    // [MODIFIED] Real DNS verification
    // 1. Check if token matches (legacy/local check or direct match in text)
    // 2. Perform DNS lookup

    // Allows admin to "force code" if they want, but usually we check DNS
    // If the body token matches the DB token, that just means the user *knows* the token.
    // We need to verify that the token IS ON THE DNS.
    // However, the previous logic was `domain.verificationToken !== body.data.token`
    // which effectively checked if the USER submitted the correct token. 
    // But the Point is to check if the DOMAIN OWNER put it in DNS.

    try {
      const { verifyDomainOwnership } = await import("../utils/dns");
      const isVerified = await verifyDomainOwnership(domain.name, domain.verificationToken);

      if (!isVerified) {
        // Fallback: If we are in "DEV" mode or specific env, maybe we allow strict equality?
        // But for Production Readiness as requested, we enforce DNS.
        // We return specific error
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

    const domain = await prisma.domain.findUnique({
      where: { id: params.data.id },
      include: {
        organization: {
          include: {
            members: {
              where: {
                userId: (request.user as any).id,
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!domain) {
      return reply.status(404).send({ error: "Domain not found" });
    }

    const user = request.user as { userId: string; role: string };
    const isAdmin = user.role === "ADMIN";
    const isOwner = domain.ownerId === user.userId;
    const isOrgMember = domain.organization?.members && domain.organization.members.length > 0 &&
      [OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(domain.organization.members[0].role);

    if (!isOwner && !isAdmin && !isOrgMember) {
      return reply.status(403).send({ error: "Not authorized to delete this domain" });
    }

    await prisma.domain.delete({ where: { id: params.data.id } });

    await recordAudit(user.userId, "DOMAIN_DELETED", {
      domainId: params.data.id,
      name: domain.name,
      organizationId: domain.organizationId
    });

    return { success: true };
  });

  // PATCH domain - update isPublic (admin only for isPublic)
  app.patch("/domains/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = z
      .object({
        isPublic: z.boolean().optional(),
      })
      .safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const domain = await prisma.domain.findUnique({
      where: { id: params.data.id },
      include: {
        organization: {
          include: {
            members: {
              where: {
                userId: (request.user as any).id,
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!domain) {
      return reply.status(404).send({ error: "Domain not found" });
    }

    const user = request.user as { userId: string; role: string };
    const isAdmin = user.role === "ADMIN";
    const isOwner = domain.ownerId === user.userId;
    const isOrgMember = domain.organization?.members && domain.organization.members.length > 0 &&
      [OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(domain.organization.members[0].role);

    // Only admin can toggle isPublic
    if (body.data.isPublic !== undefined && !isAdmin) {
      return reply.status(403).send({ error: "Only admin can change domain visibility" });
    }

    // Check if user has permission to edit domain
    if (!isOwner && !isAdmin && !isOrgMember) {
      return reply.status(403).send({ error: "Not authorized to edit this domain" });
    }

    const updated = await prisma.domain.update({
      where: { id: params.data.id },
      data: {
        ...(body.data.isPublic !== undefined ? { isPublic: body.data.isPublic } : {}),
      },
    });

    if (body.data.isPublic !== undefined) {
      await recordAudit(user.userId, "DOMAIN_VISIBILITY_CHANGED", {
        domainId: domain.id,
        name: domain.name,
        isPublic: body.data.isPublic,
      });
    }

    return { domain: updated };
  });
}
