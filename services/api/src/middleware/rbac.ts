import { FastifyRequest, FastifyReply } from 'fastify';

export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  HELPDESK = 'HELPDESK',
  COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER'
}

export function requireAdminRole(allowedRoles: AdminRole[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as any).user;

    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    if (!user.adminRole) {
      return reply.status(403).send({ error: 'Access denied: No admin role' });
    }

    if (user.adminRole === AdminRole.SUPER_ADMIN) {
      return; // Super admin has access to everything
    }

    if (!allowedRoles.includes(user.adminRole)) {
      return reply.status(403).send({ error: 'Access denied: Insufficient permissions' });
    }
  };
}

export function getOrgScope(user: any) {
  if (user.adminRole === AdminRole.SUPER_ADMIN) {
    return {}; // No filter
  }
  return { organizationId: user.organizationId };
}
