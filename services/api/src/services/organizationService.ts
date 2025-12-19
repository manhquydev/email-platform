import { PrismaClient, Organization, OrganizationRole, SubscriptionTier } from '@prisma/client';
import { hash } from 'bcryptjs';
import { generateSlug } from '../utils/slug';
import { auditLogger } from './auditService';

const prisma = new PrismaClient();

export interface CreateOrganizationData {
  name: string;
  description?: string;
  ownerId: string;
  billingEmail: string;
  tier?: SubscriptionTier;
}

export interface UpdateOrganizationData {
  name?: string;
  description?: string;
  logo?: string;
  domain?: string;
  settings?: any;
  isActive?: boolean;
}

export interface InviteMemberData {
  email: string;
  role: OrganizationRole;
  permissions?: any;
}

export interface OrganizationStats {
  domains: number;
  inboxes: number;
  members: number;
  apiKeys: number;
  webhooks: number;
  emailVolume: number;
  storageUsed: number;
}

class OrganizationService {
  /**
   * Create a new organization
   */
  async createOrganization(data: CreateOrganizationData): Promise<Organization> {
    const slug = await generateSlug(data.name);

    const organization = await prisma.organization.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        owner: {
          connect: { id: data.ownerId }
        },
        subscriptions: {
          create: {
            tier: data.tier || SubscriptionTier.FREE,
            billingEmail: data.billingEmail,
            billingPeriod: 'monthly',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            usage: {},
            limits: this.getDefaultLimits(data.tier || SubscriptionTier.FREE)
          }
        },
        settingsObj: {
          create: {
            ssoEnabled: false,
            apiAccessEnabled: true,
            webhooksEnabled: false,
            maxDomains: this.getMaxDomains(data.tier || SubscriptionTier.FREE),
            maxInboxes: this.getMaxInboxes(data.tier || SubscriptionTier.FREE),
            maxMembers: this.getMaxMembers(data.tier || SubscriptionTier.FREE),
            maxApiKeys: this.getMaxApiKeys(data.tier || SubscriptionTier.FREE),
            require2FA: false,
            sessionTimeout: 480 // 8 hours
          }
        }
      },
      include: {
        owner: true,
        subscriptions: true,
        settingsObj: true,
        members: true,
        _count: {
          select: {
            domains: true,
            apiKeys: true,
            webhooks: true
          }
        }
      }
    });

    // Add owner as first member with OWNER role
    await prisma.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: data.ownerId,
        role: OrganizationRole.OWNER,
        joinedAt: new Date(),
        isActive: true
      }
    });

    // Log the creation
    await auditLogger.logOrganizationAction(
      organization.id,
      data.ownerId,
      'CREATE_ORGANIZATION',
      {
        organizationId: organization.id,
        organizationName: organization.name,
        tier: data.tier || SubscriptionTier.FREE
      }
    );

    return organization;
  }

  /**
   * Get organization by ID
   */
  async getOrganizationById(id: string, includeRelations = false) {
    return prisma.organization.findUnique({
      where: { id },
      include: includeRelations ? {
        owner: {
          select: { id: true, email: true, role: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true, role: true }
            }
          }
        },
        subscriptions: true,
        settingsObj: true,
        domains: {
          select: { id: true, name: true, status: true, createdAt: true }
        },
        apiKeys: {
          select: { id: true, name: true, status: true, createdAt: true }
        },
        webhooks: {
          select: { id: true, name: true, status: true, createdAt: true }
        },
        _count: {
          select: {
            domains: true,
            apiKeys: true,
            webhooks: true
          }
        }
      } : undefined
    });
  }

  /**
   * Get organization by slug
   */
  async getOrganizationBySlug(slug: string) {
    return prisma.organization.findUnique({
      where: { slug },
      include: {
        owner: {
          select: { id: true, email: true }
        },
        subscriptions: true,
        settingsObj: true
      }
    });
  }

  /**
   * Update organization
   */
  async updateOrganization(id: string, data: UpdateOrganizationData, userId: string) {
    const organization = await prisma.organization.update({
      where: { id },
      data,
      include: {
        owner: {
          select: { id: true, email: true }
        }
      }
    });

    // Log the update
    await auditLogger.log({
      userId,
      action: 'UPDATE_ORGANIZATION',
      details: {
        organizationId: id,
        updatedFields: Object.keys(data)
      }
    });

    return organization;
  }

  /**
   * Delete organization (soft delete)
   */
  async deleteOrganization(id: string, userId: string) {
    await prisma.organization.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    // Log the deletion
    await auditLogger.log({
      userId,
      action: 'DELETE_ORGANIZATION',
      details: {
        organizationId: id
      }
    });
  }

  /**
   * Invite member to organization
   */
  async inviteMember(organizationId: string, inviterId: string, data: InviteMemberData) {
    // Check if inviter has permission
    const inviterMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: inviterId
        }
      }
    });

    if (!inviterMember || !this.canInviteMember(inviterMember.role)) {
      throw new Error('Insufficient permissions to invite members');
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      // Create user with temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await hash(tempPassword);

      user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash: hashedPassword,
          role: 'USER',
          emailVerified: null,
          verificationToken: Math.random().toString(36).substring(2),
          verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });
    }

    // Check if already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id
        }
      }
    });

    if (existingMember) {
      throw new Error('User is already a member of this organization');
    }

    // Create invitation
    const member = await prisma.organizationMember.create({
      data: {
        organizationId,
        userId: user.id,
        role: data.role,
        permissions: data.permissions,
        invitedBy: inviterId,
        invitedAt: new Date(),
        joinedAt: undefined, // Will be set when they accept
        isActive: false
      },
      include: {
        user: {
          select: { id: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    // Log the invitation
    await auditLogger.log({
      userId: inviterId,
      action: 'INVITE_MEMBER',
      details: {
        organizationId,
        invitedUserId: user.id,
        invitedEmail: data.email,
        role: data.role
      }
    });

    // TODO: Send invitation email
    // await emailService.sendInvitationEmail(data.email, member);

    return member;
  }

  /**
   * Accept organization invitation
   */
  async acceptInvitation(organizationId: string, userId: string) {
    const member = await prisma.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId,
          userId
        }
      },
      data: {
        isActive: true,
        joinedAt: new Date()
      }
    });

    // Log the acceptance
    await auditLogger.log({
      userId,
      action: 'ACCEPT_INVITATION',
      details: {
        organizationId
      }
    });

    return member;
  }

  /**
   * Remove member from organization
   */
  async removeMember(organizationId: string, memberUserId: string, removerId: string) {
    // Check permissions
    const removerMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: removerId
        }
      }
    });

    const targetMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: memberUserId
        }
      }
    });

    if (!removerMember || !targetMember) {
      throw new Error('Member not found');
    }

    // Can't remove owners unless you're the owner yourself
    if (targetMember.role === OrganizationRole.OWNER && removerMember.role !== OrganizationRole.OWNER) {
      throw new Error('Only owners can remove other owners');
    }

    // Can only remove members with equal or lower role
    if (!this.canRemoveMember(removerMember.role, targetMember.role)) {
      throw new Error('Insufficient permissions to remove this member');
    }

    await prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId,
          userId: memberUserId
        }
      }
    });

    // Log the removal
    await auditLogger.log({
      userId: removerId,
      action: 'REMOVE_MEMBER',
      details: {
        organizationId,
        removedUserId: memberUserId,
        removedRole: targetMember.role
      }
    });
  }

  /**
   * Update member role
   */
  async updateMemberRole(organizationId: string, memberUserId: string, newRole: OrganizationRole, updaterId: string) {
    // Check permissions
    const updaterMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: updaterId
        }
      }
    });

    if (!updaterMember || !this.canUpdateRole(updaterMember.role, newRole)) {
      throw new Error('Insufficient permissions to update this role');
    }

    const member = await prisma.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId,
          userId: memberUserId
        }
      },
      data: { role: newRole }
    });

    // Log the role change
    await auditLogger.log({
      userId: updaterId,
      action: 'UPDATE_MEMBER_ROLE',
      details: {
        organizationId,
        targetUserId: memberUserId,
        oldRole: member.role,
        newRole
      }
    });

    return member;
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(organizationId: string): Promise<OrganizationStats> {
    const [domains, inboxes, members, apiKeys, webhooks, emailVolume, storage] = await Promise.all([
      prisma.domain.count({
        where: { organizationId }
      }),
      prisma.inbox.count({
        where: {
          domain: {
            organizationId
          }
        }
      }),
      prisma.organizationMember.count({
        where: {
          organizationId,
          isActive: true
        }
      }),
      prisma.apiKey.count({
        where: {
          organizationId,
          status: 'ACTIVE'
        }
      }),
      prisma.webhook.count({
        where: {
          organizationId,
          status: 'ACTIVE'
        }
      }),
      prisma.message.count({
        where: {
          inbox: {
            domain: {
              organizationId
            }
          },
          receivedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      // Storage calculation would need to be implemented based on your storage system
      Promise.resolve(0) // Placeholder
    ]);

    return {
      domains,
      inboxes,
      members,
      apiKeys,
      webhooks,
      emailVolume,
      storageUsed: storage
    };
  }

  /**
   * Check if user can invite members
   */
  private canInviteMember(role: OrganizationRole): boolean {
    return [OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(role);
  }

  /**
   * Check if user can remove member
   */
  private canRemoveMember(removerRole: OrganizationRole, targetRole: OrganizationRole): boolean {
    if (removerRole === OrganizationRole.OWNER) return true;
    if (removerRole === OrganizationRole.ADMIN && targetRole !== OrganizationRole.OWNER) return true;
    return false;
  }

  /**
   * Check if user can update role
   */
  private canUpdateRole(updaterRole: OrganizationRole, newRole: OrganizationRole): boolean {
    if (updaterRole === OrganizationRole.OWNER) return true;
    if (updaterRole === OrganizationRole.ADMIN && newRole !== OrganizationRole.OWNER) return true;
    return false;
  }

  /**
   * Get default limits for subscription tier
   */
  private getDefaultLimits(tier: SubscriptionTier): any {
    switch (tier) {
      case SubscriptionTier.FREE:
        return {
          domains: 1,
          inboxes: 5,
          members: 2,
          apiKeys: 1,
          webhooks: 0,
          emailMonthly: 100,
          storageMB: 100
        };
      case SubscriptionTier.STARTER:
        return {
          domains: 3,
          inboxes: 25,
          members: 5,
          apiKeys: 5,
          webhooks: 3,
          emailMonthly: 1000,
          storageMB: 1000
        };
      case SubscriptionTier.PROFESSIONAL:
        return {
          domains: 10,
          inboxes: 100,
          members: 20,
          apiKeys: 20,
          webhooks: 10,
          emailMonthly: 10000,
          storageMB: 10000
        };
      case SubscriptionTier.ENTERPRISE:
        return {
          domains: null, // unlimited
          inboxes: null,
          members: null,
          apiKeys: null,
          webhooks: null,
          emailMonthly: null,
          storageMB: null
        };
      default:
        return this.getDefaultLimits(SubscriptionTier.FREE);
    }
  }

  /**
   * Get max domains for tier
   */
  private getMaxDomains(tier: SubscriptionTier): number | null {
    const limits = this.getDefaultLimits(tier);
    return limits.domains;
  }

  /**
   * Get max inboxes for tier
   */
  private getMaxInboxes(tier: SubscriptionTier): number | null {
    const limits = this.getDefaultLimits(tier);
    return limits.inboxes;
  }

  /**
   * Get max members for tier
   */
  private getMaxMembers(tier: SubscriptionTier): number | null {
    const limits = this.getDefaultLimits(tier);
    return limits.members;
  }

  /**
   * Get max API keys for tier
   */
  private getMaxApiKeys(tier: SubscriptionTier): number | null {
    const limits = this.getDefaultLimits(tier);
    return limits.apiKeys;
  }
}

export const organizationService = new OrganizationService();