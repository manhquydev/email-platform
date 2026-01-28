import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { OrganizationRole } from "@prisma/client";

export const organizationRoutes = async (app: FastifyInstance) => {
  // Create Organization
  app.post("/", {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { name, slug, settings } = request.body as any;
    const user = (request as any).user;

    // Check if slug exists
    const existing = await prisma.organization.findUnique({
      where: { slug }
    });

    if (existing) {
      return reply.status(409).send({ error: "Organization slug already exists" });
    }

    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        settings,
        members: {
          create: {
            userId: user.userId,
            role: OrganizationRole.OWNER
          }
        },
        // Auto-assign creator to organization if they don't have one?
        // Logic: Users can belong to multiple orgs via OrganizationMember,
        // but User model has organizationId for "primary" or "current" context?
        // For now, let's just create the relation.
      }
    });

    // Update user's primary organization if not set
    const userRecord = await prisma.user.findUnique({ where: { id: user.userId } });
    if (!userRecord?.organizationId) {
      await prisma.user.update({
        where: { id: user.userId },
        data: { organizationId: org.id }
      });
    }

    return org;
  });

  // Get User's Organizations
  app.get("/", {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const user = (request as any).user;

    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.userId },
      include: { organization: true }
    });

    return memberships.map(m => ({
      ...m.organization,
      role: m.role,
      joinedAt: m.joinedAt
    }));
  });

  // Get Organization Details
  app.get("/:id", {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { id } = request.params as any;
    const user = (request as any).user;

    // Verify membership
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId: user.userId
        }
      }
    });

    if (!membership) {
      return reply.status(403).send({ error: "Access denied" });
    }

    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: { members: true, domains: true, inboxes: true }
        }
      }
    });

    if (!org) {
      return reply.status(404).send({ error: "Organization not found" });
    }

    return org;
  });

  // Add Member
  app.post("/:id/members", {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { id } = request.params as any;
    const { email, role } = request.body as any;
    const user = (request as any).user;

    // Verify requester has admin/owner role
    const requesterMembership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId: user.userId
        }
      }
    });

    if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
      return reply.status(403).send({ error: "Insufficient permissions" });
    }

    // Find user by email
    const targetUser = await prisma.user.findUnique({
      where: { email }
    });

    if (!targetUser) {
      return reply.status(404).send({ error: "User not found" });
    }

    // Check if already member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId: targetUser.id
        }
      }
    });

    if (existingMember) {
      return reply.status(409).send({ error: "User already in organization" });
    }

    const member = await prisma.organizationMember.create({
      data: {
        organizationId: id,
        userId: targetUser.id,
        role: role || OrganizationRole.MEMBER
      }
    });

    return member;
  });

  // Remove Member
  app.delete("/:id/members/:userId", {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { id, userId: targetUserId } = request.params as any;
    const user = (request as any).user;

    // Verify requester has admin/owner role
    const requesterMembership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId: user.userId
        }
      }
    });

    if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
      return reply.status(403).send({ error: "Insufficient permissions" });
    }

    // Prevent removing self if owner (must transfer ownership first - not implemented yet)
    if (user.userId === targetUserId && requesterMembership.role === 'OWNER') {
        // Allow if not the only owner? For now block.
        // return reply.status(400).send({ error: "Cannot leave as Owner" });
    }

    await prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId: targetUserId
        }
      }
    });

    return { success: true };
  });
};
