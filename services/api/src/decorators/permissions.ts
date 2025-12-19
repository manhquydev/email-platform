import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Permission, OrganizationRole } from '../middleware/rbac';
import { AuthenticatedRequest } from '../types/auth';

/**
 * Permission decorator for Fastify routes
 */
export function withPermissions(fastify: FastifyInstance) {
  // Register decorators
  fastify.decorate('requirePermission', function(permission: Permission, organizationIdParam: string = 'organizationId') {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const organizationId = (request.params as any)[organizationIdParam];
      if (!organizationId) {
        reply.status(400).send({ error: 'Organization ID is required' });
        return;
      }

      const userId = (request.user as any)?.userId;
      if (!userId) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }

      // This would use the hasPermission function from rbac.ts
      // For now, we'll do a basic check
      const member = await fastify.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: { organizationId, userId }
        }
      });

      if (!member || !member.isActive) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      // For demo purposes, assume admins and owners have all permissions
      if (member.role === OrganizationRole.OWNER || member.role === OrganizationRole.ADMIN) {
        return;
      }

      // Otherwise, check custom permissions
      if (member.permissions && (member.permissions as any[]).includes(permission)) {
        return;
      }

      reply.status(403).send({ error: 'Insufficient permissions' });
    };
  });

  fastify.decorate('requireRole', function(roles: OrganizationRole[], organizationIdParam: string = 'organizationId') {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const organizationId = (request.params as any)[organizationIdParam];
      if (!organizationId) {
        reply.status(400).send({ error: 'Organization ID is required' });
        return;
      }

      const userId = (request.user as any)?.userId;
      if (!userId) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }

      const member = await fastify.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: { organizationId, userId }
        }
      });

      if (!member || !member.isActive) {
        reply.status(403).send({ error: 'Access denied: Not a member of this organization' });
        return;
      }

      if (!roles.includes(member.role)) {
        reply.status(403).send({
          error: 'Insufficient role',
          required: roles,
          current: member.role
        });
        return;
      }
    };
  });
}

// Extend FastifyInstance type
declare module 'fastify' {
  interface FastifyInstance {
    prisma: any; // PrismaClient instance
    requirePermission(permission: Permission, organizationIdParam?: string): any;
    requireRole(roles: OrganizationRole[], organizationIdParam?: string): any;
  }
}