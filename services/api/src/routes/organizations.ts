import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { organizationService } from '../services/organizationService';
import { auditLogger } from '../services/auditService';
import { OrganizationRole, SubscriptionTier } from '@prisma/client';
import { AuthenticatedRequest } from '../types/auth';
import { PrismaClient } from '@prisma/client';
import {
  requireOrgMembership,
  requirePermission,
  requireRole,
  Permission,
  hasPermission,
  hasAnyPermission
} from '../middleware/rbac';

const prisma = new PrismaClient();

export async function organizationRoutes(fastify: FastifyInstance) {
  // Middleware to check if user is member of organization
  const requireOrgMembership = async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { organizationId } = request.params as { organizationId: string };
    const userId = request.user!.userId;

    const member = await fastify.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId
        }
      }
    });

    if (!member || !member.isActive) {
      reply.code(403).send({ error: 'Access denied: Not a member of this organization' });
      return;
    }

    // Add member info to request
    request.organizationMember = member;
  };

  // Middleware to check organization role
  const requireRole = (roles: OrganizationRole[]) => {
    return async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.organizationMember || !roles.includes(request.organizationMember.role)) {
        reply.code(403).send({ error: 'Access denied: Insufficient permissions' });
        return;
      }
    };
  };

  // Get all organizations for current user
  fastify.get('/organizations', {
    preHandler: [fastify.authenticate]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const userId = request.user!.userId;

    const organizations = await fastify.prisma.organizationMember.findMany({
      where: {
        userId,
        isActive: true
      },
      include: {
        organization: {
          include: {
            owner: {
              select: { id: true, email: true }
            },
            subscriptions: true,
            _count: {
              select: {
                members: true,
                domains: true,
                apiKeys: true,
                webhooks: true
              }
            }
          }
        }
      },
      orderBy: {
        organization: {
          name: 'asc'
        }
      }
    });

    return {
      organizations: organizations.map(m => ({
        ...m.organization,
        userRole: m.role,
        joinedAt: m.joinedAt
      }))
    };
  });

  // Create new organization
  fastify.post('/organizations', {
    preHandler: [fastify.authenticate]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const userId = request.user!.userId;
    const data = request.body as {
      name: string;
      description?: string;
      billingEmail: string;
      tier?: SubscriptionTier;
    };

    try {
      const organization = await organizationService.createOrganization({
        name: data.name,
        description: data.description,
        ownerId: userId,
        billingEmail: data.billingEmail,
        tier: data.tier || SubscriptionTier.FREE
      });

      reply.code(201).send(organization);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Get organization by ID
  fastify.get('/organizations/:organizationId', {
    preHandler: [fastify.authenticate, requireOrgMembership('organizationId')]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { organizationId } = request.params as { organizationId: string };

    const organization = await organizationService.getOrganizationById(organizationId, true);

    if (!organization) {
      reply.code(404).send({ error: 'Organization not found' });
      return;
    }

    return organization;
  });

  // Update organization
  fastify.patch('/organizations/:organizationId', {
    preHandler: [fastify.authenticate, requireOrgMembership('organizationId'), requirePermission(Permission.ORG_EDIT, 'organizationId')]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { organizationId } = request.params as { organizationId: string };
    const userId = request.user!.userId;
    const data = request.body as {
      name?: string;
      description?: string;
      logo?: string;
      domain?: string;
      settings?: any;
      isActive?: boolean;
    };

    try {
      const organization = await organizationService.updateOrganization(organizationId, data, userId);
      return organization;
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Delete organization
  fastify.delete('/organizations/:organizationId', {
    preHandler: [fastify.authenticate, requireOrgMembership, requireRole([OrganizationRole.OWNER])]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { organizationId } = request.params as { organizationId: string };
    const userId = request.user!.userId;

    try {
      await organizationService.deleteOrganization(organizationId, userId);
      reply.code(204).send();
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Get organization statistics
  fastify.get('/organizations/:organizationId/stats', {
    preHandler: [fastify.authenticate, requireOrgMembership, requireRole([OrganizationRole.OWNER, OrganizationRole.ADMIN])]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { organizationId } = request.params as { organizationId: string };

    const stats = await organizationService.getOrganizationStats(organizationId);
    return stats;
  });

  // Get organization members
  fastify.get('/organizations/:organizationId/members', {
    preHandler: [fastify.authenticate, requireOrgMembership]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { organizationId } = request.params as { organizationId: string };

    const members = await fastify.prisma.organizationMember.findMany({
      where: {
        organizationId
      },
      include: {
        user: {
          select: { id: true, email: true, role: true, createdAt: true }
        }
      },
      orderBy: [
        { role: 'asc' },
        { joinedAt: 'asc' }
      ]
    });

    return {
      members: members.map(m => ({
        id: m.id,
        user: m.user,
        role: m.role,
        permissions: m.permissions,
        invitedBy: m.invitedBy,
        invitedAt: m.invitedAt,
        joinedAt: m.joinedAt,
        lastActiveAt: m.lastActiveAt,
        isActive: m.isActive
      }))
    };
  });

  // Invite member to organization
  fastify.post('/organizations/:organizationId/members/invite', {
    preHandler: [fastify.authenticate, requireOrgMembership, requireRole([OrganizationRole.OWNER, OrganizationRole.ADMIN])]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { organizationId } = request.params as { organizationId: string };
    const inviterId = request.user!.id;
    const data = request.body as {
      email: string;
      role: OrganizationRole;
      permissions?: any;
    };

    try {
      const member = await organizationService.inviteMember(organizationId, inviterId, data);
      reply.code(201).send(member);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Accept organization invitation
  fastify.post('/organizations/:organizationId/invite/accept', {
    preHandler: [fastify.authenticate]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { organizationId } = request.params as { organizationId: string };
    const userId = request.user!.userId;

    try {
      const member = await organizationService.acceptInvitation(organizationId, userId);
      return member;
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Update member role
  fastify.patch('/organizations/:organizationId/members/:memberId/role', {
    preHandler: [fastify.authenticate, requireOrgMembership, requireRole([OrganizationRole.OWNER, OrganizationRole.ADMIN])]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { organizationId, memberId } = request.params as { organizationId: string; memberId: string };
    const updaterId = request.user!.id;
    const { role } = request.body as { role: OrganizationRole };

    try {
      // Get the member to update
      const targetMember = await fastify.prisma.organizationMember.findUnique({
        where: { id: memberId }
      });

      if (!targetMember || targetMember.organizationId !== organizationId) {
        reply.code(404).send({ error: 'Member not found' });
        return;
      }

      const member = await organizationService.updateMemberRole(
        organizationId,
        targetMember.userId,
        role,
        updaterId
      );

      return member;
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Remove member from organization
  fastify.delete('/organizations/:organizationId/members/:memberId', {
    preHandler: [fastify.authenticate, requireOrgMembership, requireRole([OrganizationRole.OWNER, OrganizationRole.ADMIN])]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { organizationId, memberId } = request.params as { organizationId: string; memberId: string };
    const removerId = request.user!.id;

    try {
      // Get the member to remove
      const targetMember = await fastify.prisma.organizationMember.findUnique({
        where: { id: memberId }
      });

      if (!targetMember || targetMember.organizationId !== organizationId) {
        reply.code(404).send({ error: 'Member not found' });
        return;
      }

      await organizationService.removeMember(
        organizationId,
        targetMember.userId,
        removerId
      );

      reply.code(204).send();
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Get organization audit logs
  fastify.get('/organizations/:organizationId/audit-logs', {
    preHandler: [fastify.authenticate, requireOrgMembership, requireRole([OrganizationRole.OWNER, OrganizationRole.ADMIN])]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { organizationId } = request.params as { organizationId: string };
    const query = request.query as {
      limit?: string;
      offset?: string;
      actions?: string;
      userId?: string;
      fromDate?: string;
      toDate?: string;
    };

    const options = {
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
      actions: query.actions ? query.actions.split(',') : undefined,
      userId: query.userId,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined
    };

    const result = await auditLogger.getOrganizationLogs(organizationId, options);
    return result;
  });

  // Get organization settings
  fastify.get('/organizations/:organizationId/settings', {
    preHandler: [fastify.authenticate, requireOrgMembership, requireRole([OrganizationRole.OWNER, OrganizationRole.ADMIN])]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { organizationId } = request.params as { organizationId: string };

    const settings = await fastify.prisma.organizationSettings.findUnique({
      where: { organizationId }
    });

    if (!settings) {
      // Create default settings
      const defaultSettings = await fastify.prisma.organizationSettings.create({
        data: {
          organizationId,
          ssoEnabled: false,
          apiAccessEnabled: true,
          webhooksEnabled: false
        }
      });
      return defaultSettings;
    }

    return settings;
  });

  // Update organization settings
  fastify.patch('/organizations/:organizationId/settings', {
    preHandler: [fastify.authenticate, requireOrgMembership, requireRole([OrganizationRole.OWNER, OrganizationRole.ADMIN])]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const { organizationId } = request.params as { organizationId: string };
    const userId = request.user!.userId;
    const data = request.body as {
      ssoEnabled?: boolean;
      apiAccessEnabled?: boolean;
      webhooksEnabled?: boolean;
      maxDomains?: number;
      maxInboxes?: number;
      maxMembers?: number;
      maxApiKeys?: number;
      require2FA?: boolean;
      passwordPolicy?: any;
      sessionTimeout?: number;
      customTheme?: any;
    };

    try {
      const settings = await fastify.prisma.organizationSettings.update({
        where: { organizationId },
        data
      });

      // Log the update
      await auditLogger.log({
        userId,
        action: 'UPDATE_ORGANIZATION_SETTINGS',
        details: {
          organizationId,
          updatedFields: Object.keys(data)
        }
      });

      return settings;
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });
}