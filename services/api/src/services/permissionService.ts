import { PrismaClient, OrganizationRole } from '@prisma/client';
import { Permission } from '../middleware/rbac';

const prisma = new PrismaClient();

/**
 * Centralized permission checking service
 */
export class PermissionService {
  /**
   * Check if a user has permission to perform an action on an organization resource
   */
  static async checkOrganizationPermission(
    userId: string,
    organizationId: string,
    action: 'view' | 'edit' | 'delete' | 'invite' | 'manage_members' | 'manage_billing'
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

    // Owner can do everything
    if (member.role === OrganizationRole.OWNER) {
      return true;
    }

    // Check permissions based on role and action
    switch (action) {
      case 'view':
        return [OrganizationRole.ADMIN, OrganizationRole.MEMBER, OrganizationRole.VIEWER].includes(member.role);

      case 'edit':
        return [OrganizationRole.ADMIN].includes(member.role);

      case 'delete':
      case 'manage_billing':
        return false; // Only owners can do these

      case 'invite':
      case 'manage_members':
        return [OrganizationRole.ADMIN].includes(member.role);

      default:
        return false;
    }
  }

  /**
   * Check if user can manage a specific domain
   */
  static async canManageDomain(
    userId: string,
    domainId: string,
    action: 'view' | 'edit' | 'delete' | 'verify'
  ): Promise<boolean> {
    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
      include: {
        owner: true,
        organization: {
          include: {
            members: {
              where: {
                userId,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!domain) {
      return false;
    }

    // Owner can manage their own domains
    if (domain.ownerId === userId) {
      return true;
    }

    // Check organization permissions
    if (domain.organization) {
      const member = domain.organization.members[0];
      if (!member) {
        return false;
      }

      if (member.role === OrganizationRole.OWNER) {
        return true;
      }

      if (member.role === OrganizationRole.ADMIN) {
        return ['view', 'edit', 'verify'].includes(action);
      }

      if ([OrganizationRole.MEMBER, OrganizationRole.VIEWER].includes(member.role)) {
        return action === 'view';
      }
    }

    return false;
  }

  /**
   * Check if user can manage an inbox
   */
  static async canManageInbox(
    userId: string,
    inboxId: string,
    action: 'view' | 'edit' | 'delete'
  ): Promise<boolean> {
    const inbox = await prisma.inbox.findUnique({
      where: { id: inboxId },
      include: {
        domain: {
          include: {
            owner: true,
            organization: {
              include: {
                members: {
                  where: {
                    userId,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!inbox) {
      return false;
    }

    // Check domain ownership/permissions
    if (inbox.domain.ownerId === userId) {
      return true;
    }

    if (inbox.domain.organization) {
      const member = inbox.domain.organization.members[0];
      if (!member) {
        return false;
      }

      if (member.role === OrganizationRole.OWNER) {
        return true;
      }

      if (member.role === OrganizationRole.ADMIN) {
        return true;
      }

      if ([OrganizationRole.MEMBER].includes(member.role)) {
        return ['view', 'edit'].includes(action);
      }

      if (member.role === OrganizationRole.VIEWER) {
        return action === 'view';
      }
    }

    return false;
  }

  /**
   * Check if user can access API key
   */
  static async canAccessApiKey(
    userId: string,
    apiKeyId: string,
    action: 'view' | 'edit' | 'delete' | 'create'
  ): Promise<boolean> {
    if (action === 'create') {
      // For creating, check if user has permission in the organization
      return this.checkApiPermission(userId, 'create');
    }

    const apiKey = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
      include: {
        organization: {
          include: {
            members: {
              where: {
                userId,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!apiKey) {
      return false;
    }

    // Check if user is the creator
    if (apiKey.createdBy === userId) {
      return true;
    }

    // Check organization permissions
    if (apiKey.organization) {
      const member = apiKey.organization.members[0];
      if (!member) {
        return false;
      }

      if (member.role === OrganizationRole.OWNER) {
        return true;
      }

      if (member.role === OrganizationRole.ADMIN) {
        return true;
      }

      if ([OrganizationRole.MEMBER].includes(member.role)) {
        return ['view'].includes(action);
      }
    }

    return false;
  }

  /**
   * Check if user can manage webhooks
   */
  static async canManageWebhook(
    userId: string,
    webhookId: string | null,
    action: 'view' | 'create' | 'edit' | 'delete'
  ): Promise<boolean> {
    if (action === 'create') {
      return this.checkApiPermission(userId, 'webhook_create');
    }

    if (!webhookId) {
      return false;
    }

    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
      include: {
        organization: {
          include: {
            members: {
              where: {
                userId,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!webhook) {
      return false;
    }

    // Check if user is the creator
    if (webhook.createdBy === userId) {
      return true;
    }

    // Check organization permissions
    if (webhook.organization) {
      const member = webhook.organization.members[0];
      if (!member) {
        return false;
      }

      if (member.role === OrganizationRole.OWNER) {
        return true;
      }

      if (member.role === OrganizationRole.ADMIN) {
        return true;
      }
    }

    return false;
  }

  /**
   * General API permission check
   */
  private static async checkApiPermission(
    userId: string,
    permission: string
  ): Promise<boolean> {
    // This would typically check against user's organization memberships
    // and their roles/permissions
    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        organization: {
          include: {
            settingsObj: true,
          },
        },
      },
    });

    // Check if any organization allows this permission
    for (const membership of memberships) {
      if (membership.role === OrganizationRole.OWNER) {
        return true;
      }

      if (membership.role === OrganizationRole.ADMIN) {
        return true;
      }

      // Check organization settings for API access
      if (membership.organization.settingsObj?.apiAccessEnabled) {
        if (membership.role === OrganizationRole.MEMBER) {
          return ['view', 'create'].includes(permission);
        }
      }
    }

    return false;
  }

  /**
   * Get all organizations a user belongs to with their roles
   */
  static async getUserOrganizations(userId: string) {
    return prisma.organizationMember.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
      },
      orderBy: {
        organization: {
          name: 'asc',
        },
      },
    });
  }

  /**
   * Check if user is system admin
   */
  static async isSystemAdmin(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role === 'ADMIN';
  }

  /**
   * Get effective permissions for a user in an organization
   */
  static async getEffectivePermissions(
    userId: string,
    organizationId: string
  ): Promise<string[]> {
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
      return [];
    }

    // Base permissions from role
    let permissions: string[] = [];

    switch (member.role) {
      case OrganizationRole.OWNER:
        permissions = [
          'org:edit',
          'org:delete',
          'org:invite',
          'org:manage_members',
          'org:manage_billing',
          'domain:create',
          'domain:edit',
          'domain:delete',
          'inbox:create',
          'inbox:edit',
          'inbox:delete',
          'api:create',
          'api:edit',
          'api:delete',
          'webhook:create',
          'webhook:edit',
          'webhook:delete',
        ];
        break;

      case OrganizationRole.ADMIN:
        permissions = [
          'org:edit',
          'org:invite',
          'org:manage_members',
          'domain:create',
          'domain:edit',
          'domain:delete',
          'inbox:create',
          'inbox:edit',
          'inbox:delete',
          'api:create',
          'api:edit',
          'api:delete',
          'webhook:create',
          'webhook:edit',
          'webhook:delete',
        ];
        break;

      case OrganizationRole.MEMBER:
        permissions = [
          'inbox:create',
          'inbox:edit',
          'api:create',
        ];
        break;

      case OrganizationRole.VIEWER:
        permissions = [];
        break;
    }

    // Add custom permissions if any
    if (member.permissions) {
      const customPerms = member.permissions as string[];
      permissions = [...new Set([...permissions, ...customPerms])];
    }

    // Add view permission for all active members
    permissions.push('org:view', 'domain:view', 'inbox:view', 'api:view', 'webhook:view');

    return permissions;
  }
}