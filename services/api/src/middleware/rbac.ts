import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, OrganizationRole } from '@prisma/client';
import { AuthenticatedRequest } from '../types/auth';

// Re-export OrganizationRole for use in other modules
export { OrganizationRole } from '@prisma/client';

const prisma = new PrismaClient();

// Define permission enums
export enum Permission {
  // Organization permissions
  ORG_VIEW = 'org:view',
  ORG_EDIT = 'org:edit',
  ORG_DELETE = 'org:delete',
  ORG_INVITE = 'org:invite',
  ORG_MANAGE_MEMBERS = 'org:manage_members',
  ORG_VIEW_SETTINGS = 'org:view_settings',
  ORG_EDIT_SETTINGS = 'org:edit_settings',
  ORG_VIEW_BILLING = 'org:view_billing',
  ORG_MANAGE_BILLING = 'org:manage_billing',

  // Domain permissions
  DOMAIN_CREATE = 'domain:create',
  DOMAIN_VIEW = 'domain:view',
  DOMAIN_EDIT = 'domain:edit',
  DOMAIN_DELETE = 'domain:delete',
  DOMAIN_VERIFY = 'domain:verify',

  // Inbox permissions
  INBOX_CREATE = 'inbox:create',
  INBOX_VIEW = 'inbox:view',
  INBOX_EDIT = 'inbox:edit',
  INBOX_DELETE = 'inbox:delete',

  // Email permissions
  EMAIL_VIEW = 'email:view',
  EMAIL_DELETE = 'email:delete',
  EMAIL_EXPORT = 'email:export',

  // API permissions
  API_VIEW_KEYS = 'api:view_keys',
  API_CREATE_KEYS = 'api:create_keys',
  API_EDIT_KEYS = 'api:edit_keys',
  API_DELETE_KEYS = 'api:delete_keys',

  // Webhook permissions
  WEBHOOK_VIEW = 'webhook:view',
  WEBHOOK_CREATE = 'webhook:create',
  WEBHOOK_EDIT = 'webhook:edit',
  WEBHOOK_DELETE = 'webhook:delete',

  // Analytics permissions
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',
}

// Role to permission mapping
const ROLE_PERMISSIONS: Record<OrganizationRole, Permission[]> = {
  [OrganizationRole.OWNER]: [
    // Owner has all permissions
    Permission.ORG_VIEW,
    Permission.ORG_EDIT,
    Permission.ORG_DELETE,
    Permission.ORG_INVITE,
    Permission.ORG_MANAGE_MEMBERS,
    Permission.ORG_VIEW_SETTINGS,
    Permission.ORG_EDIT_SETTINGS,
    Permission.ORG_VIEW_BILLING,
    Permission.ORG_MANAGE_BILLING,
    Permission.DOMAIN_CREATE,
    Permission.DOMAIN_VIEW,
    Permission.DOMAIN_EDIT,
    Permission.DOMAIN_DELETE,
    Permission.DOMAIN_VERIFY,
    Permission.INBOX_CREATE,
    Permission.INBOX_VIEW,
    Permission.INBOX_EDIT,
    Permission.INBOX_DELETE,
    Permission.EMAIL_VIEW,
    Permission.EMAIL_DELETE,
    Permission.EMAIL_EXPORT,
    Permission.API_VIEW_KEYS,
    Permission.API_CREATE_KEYS,
    Permission.API_EDIT_KEYS,
    Permission.API_DELETE_KEYS,
    Permission.WEBHOOK_VIEW,
    Permission.WEBHOOK_CREATE,
    Permission.WEBHOOK_EDIT,
    Permission.WEBHOOK_DELETE,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
  ],
  [OrganizationRole.ADMIN]: [
    // Admin has most permissions except org deletion and billing management
    Permission.ORG_VIEW,
    Permission.ORG_EDIT,
    Permission.ORG_INVITE,
    Permission.ORG_MANAGE_MEMBERS,
    Permission.ORG_VIEW_SETTINGS,
    Permission.ORG_EDIT_SETTINGS,
    Permission.ORG_VIEW_BILLING,
    Permission.DOMAIN_CREATE,
    Permission.DOMAIN_VIEW,
    Permission.DOMAIN_EDIT,
    Permission.DOMAIN_DELETE,
    Permission.DOMAIN_VERIFY,
    Permission.INBOX_CREATE,
    Permission.INBOX_VIEW,
    Permission.INBOX_EDIT,
    Permission.INBOX_DELETE,
    Permission.EMAIL_VIEW,
    Permission.EMAIL_DELETE,
    Permission.EMAIL_EXPORT,
    Permission.API_VIEW_KEYS,
    Permission.API_CREATE_KEYS,
    Permission.API_EDIT_KEYS,
    Permission.API_DELETE_KEYS,
    Permission.WEBHOOK_VIEW,
    Permission.WEBHOOK_CREATE,
    Permission.WEBHOOK_EDIT,
    Permission.WEBHOOK_DELETE,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
  ],
  [OrganizationRole.MEMBER]: [
    // Member has basic permissions
    Permission.ORG_VIEW,
    Permission.DOMAIN_VIEW,
    Permission.INBOX_CREATE,
    Permission.INBOX_VIEW,
    Permission.INBOX_EDIT,
    Permission.EMAIL_VIEW,
    Permission.EMAIL_DELETE,
    Permission.API_VIEW_KEYS,
    Permission.ANALYTICS_VIEW,
  ],
  [OrganizationRole.VIEWER]: [
    // Viewer can only view
    Permission.ORG_VIEW,
    Permission.DOMAIN_VIEW,
    Permission.INBOX_VIEW,
    Permission.EMAIL_VIEW,
    Permission.ANALYTICS_VIEW,
  ],
};

/**
 * Check if a user has a specific permission in an organization
 */
export async function hasPermission(
  userId: string,
  organizationId: string,
  permission: Permission
): Promise<boolean> {
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    include: {
      organization: {
        include: {
          settingsObj: true,
        },
      },
    },
  });

  if (!member || !member.isActive) {
    return false;
  }

  // Check custom permissions first
  if (member.permissions) {
    const customPermissions = member.permissions as Permission[];
    if (customPermissions.includes(permission)) {
      return true;
    }
  }

  // Fall back to role-based permissions
  const rolePermissions = ROLE_PERMISSIONS[member.role];
  return rolePermissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export async function hasAnyPermission(
  userId: string,
  organizationId: string,
  permissions: Permission[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermission(userId, organizationId, permission)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a user has all of the specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  organizationId: string,
  permissions: Permission[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (!(await hasPermission(userId, organizationId, permission))) {
      return false;
    }
  }
  return true;
}

/**
 * Middleware to require organization membership
 */
export const requireOrgMembership = (organizationIdParam: string = 'organizationId') => {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const organizationId = (request.params as any)[organizationIdParam];

    if (!organizationId) {
      reply.status(400).send({ error: 'Organization ID is required' });
      return;
    }

    const userId = request.user!.userId;

    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!member || !member.isActive) {
      reply.status(403).send({ error: 'Access denied: Not a member of this organization' });
      return;
    }

    // Add member info to request
    request.organizationMember = member;
  };
};

/**
 * Middleware to require specific permission
 */
export const requirePermission = (permission: Permission, organizationIdParam: string = 'organizationId') => {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const organizationId = (request.params as any)[organizationIdParam];

    if (!organizationId) {
      reply.status(400).send({ error: 'Organization ID is required' });
      return;
    }

    const userId = request.user!.userId;

    const hasPerm = await hasPermission(userId, organizationId, permission);

    if (!hasPerm) {
      reply.status(403).send({
        error: 'Access denied: Insufficient permissions',
        required: permission,
      });
      return;
    }
  };
};

/**
 * Middleware to require any of the specified permissions
 */
export const requireAnyPermission = (permissions: Permission[], organizationIdParam: string = 'organizationId') => {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const organizationId = (request.params as any)[organizationIdParam];

    if (!organizationId) {
      reply.status(400).send({ error: 'Organization ID is required' });
      return;
    }

    const userId = request.user!.userId;

    const hasPerm = await hasAnyPermission(userId, organizationId, permissions);

    if (!hasPerm) {
      reply.status(403).send({
        error: 'Access denied: Insufficient permissions',
        required: permissions,
      });
      return;
    }
  };
};

/**
 * Middleware to require specific role
 */
export const requireRole = (roles: OrganizationRole[], organizationIdParam: string = 'organizationId') => {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const organizationId = (request.params as any)[organizationIdParam];

    if (!organizationId) {
      reply.status(400).send({ error: 'Organization ID is required' });
      return;
    }

    const userId = request.user!.userId;

    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!member || !member.isActive) {
      reply.status(403).send({ error: 'Access denied: Not a member of this organization' });
      return;
    }

    if (!roles.includes(member.role)) {
      reply.status(403).send({
        error: 'Access denied: Insufficient role',
        required: roles,
        current: member.role,
      });
      return;
    }

    // Add member info to request
    request.organizationMember = member;
  };
};

/**
 * Get all permissions for a user in an organization
 */
export async function getUserPermissions(
  userId: string,
  organizationId: string
): Promise<Permission[]> {
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });

  if (!member || !member.isActive) {
    return [];
  }

  // Start with role-based permissions
  let permissions = [...ROLE_PERMISSIONS[member.role]];

  // Add custom permissions if any
  if (member.permissions) {
    const customPermissions = member.permissions as Permission[];
    permissions = [...new Set([...permissions, ...customPermissions])];
  }

  return permissions;
}

/**
 * Check if user can perform action on a specific resource
 */
export async function canAccessResource(
  userId: string,
  organizationId: string,
  resourceType: 'domain' | 'inbox' | 'api_key' | 'webhook',
  resourceId: string,
  action: 'view' | 'edit' | 'delete'
): Promise<boolean> {
  // Check basic permission first
  const permissionMap = {
    domain: {
      view: Permission.DOMAIN_VIEW,
      edit: Permission.DOMAIN_EDIT,
      delete: Permission.DOMAIN_DELETE,
    },
    inbox: {
      view: Permission.INBOX_VIEW,
      edit: Permission.INBOX_EDIT,
      delete: Permission.INBOX_DELETE,
    },
    api_key: {
      view: Permission.API_VIEW_KEYS,
      edit: Permission.API_EDIT_KEYS,
      delete: Permission.API_DELETE_KEYS,
    },
    webhook: {
      view: Permission.WEBHOOK_VIEW,
      edit: Permission.WEBHOOK_EDIT,
      delete: Permission.WEBHOOK_DELETE,
    },
  };

  const requiredPermission = permissionMap[resourceType][action];
  return hasPermission(userId, organizationId, requiredPermission);
}