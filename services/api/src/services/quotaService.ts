import { PrismaClient, OrganizationRole } from '@prisma/client';

const prisma = new PrismaClient();

export interface QuotaUsage {
  domainCount: number;
  inboxCount: number;
  memberCount: number;
  apiKeyCount: number;
  storageUsed: number;
  apiRequests: number;
}

export interface QuotaLimits {
  maxDomains: number;
  maxInboxes: number;
  maxMembers: number;
  maxApiKeys: number;
  maxStorage: number;
  maxApiRequests: number;
}

export class QuotaService {
  async checkQuota(orgId: string, type: keyof QuotaUsage): Promise<boolean> {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { subscription: true }
    });

    if (!org) return false;

    const subscription = org.subscription;
    const limits = this.getQuotaLimits(subscription?.tier || 'free');
    const usage = await this.getQuotaUsage(orgId);

    switch (type) {
      case 'domainCount':
        return usage.domainCount < limits.maxDomains;
      case 'inboxCount':
        return usage.inboxCount < limits.maxInboxes;
      case 'memberCount':
        return usage.memberCount < limits.maxMembers;
      case 'apiKeyCount':
        return usage.apiKeyCount < limits.maxApiKeys;
      case 'storageUsed':
        return usage.storageUsed < limits.maxStorage;
      case 'apiRequests':
        return usage.apiRequests < limits.maxApiRequests;
      default:
        return false;
    }
  }

  async getQuotaUsage(orgId: string): Promise<QuotaUsage> {
    const [
      domainCount,
      inboxCount,
      memberCount,
      apiKeyCount,
      storageUsed,
      apiRequests
    ] = await Promise.all([
      prisma.domain.count({ where: { organizationId: orgId } }),
      prisma.inbox.count({ where: { organizationId: orgId } }),
      prisma.organizationMember.count({ where: { organizationId: orgId } }),
      prisma.apiKey.count({ where: { organizationId: orgId } }),
      prisma.attachment.aggregate({ where: { organizationId: orgId }, _sum: { size: true } }),
      prisma.apiRequest.aggregate({ where: { organizationId: orgId }, _sum: { count: true } })
    ]);

    return {
      domainCount,
      inboxCount,
      memberCount,
      apiKeyCount,
      storageUsed: storageUsed._sum.size || 0,
      apiRequests: apiRequests._sum.count || 0
    };
  }

  getQuotaLimits(tier: string): QuotaLimits {
    const limits: Record<string, QuotaLimits> = {
      free: {
        maxDomains: 1,
        maxInboxes: 5,
        maxMembers: 3,
        maxApiKeys: 5,
        maxStorage: 100 * 1024 * 1024, // 100MB
        maxApiRequests: 1000
      },
      pro: {
        maxDomains: 5,
        maxInboxes: 50,
        maxMembers: 10,
        maxApiKeys: 20,
        maxStorage: 1000 * 1024 * 1024, // 1GB
        maxApiRequests: 10000
      },
      business: {
        maxDomains: 20,
        maxInboxes: 200,
        maxMembers: 50,
        maxApiKeys: 100,
        maxStorage: 5000 * 1024 * 1024, // 5GB
        maxApiRequests: 100000
      },
      enterprise: {
        maxDomains: 100,
        maxInboxes: 1000,
        maxMembers: 200,
        maxApiKeys: 500,
        maxStorage: 20000 * 1024 * 1024, // 20GB
        maxApiRequests: 1000000
      }
    };

    return limits[tier] || limits.free;
  }

  async incrementApiRequest(orgId: string): Promise<void> {
    await prisma.apiRequest.upsert({
      where: {
        organizationId: orgId
      },
      update: {
        count: { increment: 1 },
        lastRequest: new Date()
      },
      create: {
        organizationId: orgId,
        count: 1,
        lastRequest: new Date()
      }
    });
  }
}

export const quotaService = new QuotaService();