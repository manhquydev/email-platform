import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, SubscriptionTier } from '@prisma/client';
import { AuthenticatedRequest } from '../types/auth';
import { PermissionService } from '../services/permissionService';

const prisma = new PrismaClient();

/**
 * Quota limits configuration
 */
const QUOTA_LIMITS = {
  [SubscriptionTier.FREE]: {
    domains: 1,
    inboxes: 5,
    members: 2,
    apiKeys: 1,
    webhooks: 0,
    emailsPerMonth: 100,
    storageMB: 100,
    apiCallsPerMinute: 60,
    attachmentsPerEmail: 3,
    emailSizeKB: 10240, // 10MB
  },
  [SubscriptionTier.STARTER]: {
    domains: 3,
    inboxes: 25,
    members: 5,
    apiKeys: 5,
    webhooks: 3,
    emailsPerMonth: 1000,
    storageMB: 1000,
    apiCallsPerMinute: 300,
    attachmentsPerEmail: 5,
    emailSizeKB: 25600, // 25MB
  },
  [SubscriptionTier.PRO]: {
    domains: 10,
    inboxes: 100,
    members: 20,
    apiKeys: 20,
    webhooks: 10,
    emailsPerMonth: 10000,
    storageMB: 10000,
    apiCallsPerMinute: 1000,
    attachmentsPerEmail: 10,
    emailSizeKB: 51200, // 50MB
  },
  [SubscriptionTier.ENTERPRISE]: {
    domains: null, // unlimited
    inboxes: null,
    members: null,
    apiKeys: null,
    webhooks: null,
    emailsPerMonth: 100000,
    storageMB: 100000,
    apiCallsPerMinute: 5000,
    attachmentsPerEmail: 25,
    emailSizeKB: 102400, // 100MB
  },
};

export interface QuotaUsage {
  domains: number;
  inboxes: number;
  members: number;
  apiKeys: number;
  webhooks: number;
  emailsThisMonth: number;
  storageMB: number;
}

/**
 * Get quota limits for an organization
 */
export async function getQuotaLimits(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      subscription: true
    }
  });

  if (!org?.subscription || !org.subscription.tier) {
    return QUOTA_LIMITS[SubscriptionTier.FREE];
  }

  // Check for custom limits in settings
  const customLimits = org.subscription.limits as any;
  const settingsLimits = org.settings as any;

  const baseLimits = QUOTA_LIMITS[org.subscription.tier as keyof typeof QUOTA_LIMITS];

  return {
    domains: settingsLimits?.maxDomains ?? customLimits?.domains ?? baseLimits.domains,
    inboxes: settingsLimits?.maxInboxes ?? customLimits?.inboxes ?? baseLimits.inboxes,
    members: settingsLimits?.maxMembers ?? customLimits?.members ?? baseLimits.members,
    apiKeys: settingsLimits?.maxApiKeys ?? customLimits?.apiKeys ?? baseLimits.apiKeys,
    webhooks: settingsLimits?.webhooksEnabled ? (customLimits?.webhooks ?? baseLimits.webhooks) : 0,
    emailsPerMonth: customLimits?.emails ?? baseLimits.emailsPerMonth,
    storageMB: customLimits?.storageMB ?? baseLimits.storageMB,
    apiCallsPerMinute: customLimits?.apiCallsPerMinute ?? baseLimits.apiCallsPerMinute,
    attachmentsPerEmail: customLimits?.attachmentsPerEmail ?? baseLimits.attachmentsPerEmail,
    emailSizeKB: customLimits?.emailSizeKB ?? baseLimits.emailSizeKB,
  };
}

/**
 * Get current usage for an organization
 */
export async function getCurrentUsage(organizationId: string): Promise<QuotaUsage> {
  const [domains, inboxes, members, apiKeys, webhooks, emailsThisMonth] = await Promise.all([
    prisma.domain.count({
      where: { organizationId }
    }),
    prisma.inbox.count({
      where: {
        domain: { organizationId },
        deletedAt: null
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
          domain: { organizationId }
        },
        receivedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    })
  ]);

  // Calculate storage usage (simplified - would need actual file storage integration)
  const storageMB = 0; // TODO: Calculate from S3/local storage

  return {
    domains,
    inboxes,
    members,
    apiKeys,
    webhooks,
    emailsThisMonth,
    storageMB
  };
}

/**
 * Check if organization has exceeded quota
 */
export async function checkQuotaExceeded(organizationId: string): Promise<{
  exceeded: boolean;
  warnings: string[];
  usage: QuotaUsage;
  limits: any;
}> {
  const [usage, limits] = await Promise.all([
    getCurrentUsage(organizationId),
    getQuotaLimits(organizationId)
  ]);

  const warnings: string[] = [];
  let exceeded = false;

  // Check each quota
  if (limits.domains && usage.domains >= limits.domains) {
    exceeded = true;
    warnings.push(`Domain limit exceeded: ${usage.domains}/${limits.domains}`);
  } else if (limits.domains && usage.domains >= limits.domains * 0.9) {
    warnings.push(`Domain limit nearly reached: ${usage.domains}/${limits.domains}`);
  }

  if (limits.inboxes && usage.inboxes >= limits.inboxes) {
    exceeded = true;
    warnings.push(`Inbox limit exceeded: ${usage.inboxes}/${limits.inboxes}`);
  } else if (limits.inboxes && usage.inboxes >= limits.inboxes * 0.9) {
    warnings.push(`Inbox limit nearly reached: ${usage.inboxes}/${limits.inboxes}`);
  }

  if (limits.members && usage.members >= limits.members) {
    exceeded = true;
    warnings.push(`Member limit exceeded: ${usage.members}/${limits.members}`);
  } else if (limits.members && usage.members >= limits.members * 0.9) {
    warnings.push(`Member limit nearly reached: ${usage.members}/${limits.members}`);
  }

  if (limits.apiKeys && usage.apiKeys >= limits.apiKeys) {
    exceeded = true;
    warnings.push(`API key limit exceeded: ${usage.apiKeys}/${limits.apiKeys}`);
  }

  if (limits.webhooks && usage.webhooks >= limits.webhooks) {
    exceeded = true;
    warnings.push(`Webhook limit exceeded: ${usage.webhooks}/${limits.webhooks}`);
  }

  if (limits.emailsPerMonth && usage.emailsThisMonth >= limits.emailsPerMonth) {
    exceeded = true;
    warnings.push(`Email limit exceeded: ${usage.emailsThisMonth}/${limits.emailsPerMonth}`);
  } else if (limits.emailsPerMonth && usage.emailsThisMonth >= limits.emailsPerMonth * 0.9) {
    warnings.push(`Email limit nearly reached: ${usage.emailsThisMonth}/${limits.emailsPerMonth}`);
  }

  if (limits.storageMB && usage.storageMB >= limits.storageMB) {
    exceeded = true;
    warnings.push(`Storage limit exceeded: ${usage.storageMB}MB/${limits.storageMB}MB`);
  } else if (limits.storageMB && usage.storageMB >= limits.storageMB * 0.9) {
    warnings.push(`Storage limit nearly reached: ${usage.storageMB}MB/${limits.storageMB}MB`);
  }

  return { exceeded, warnings, usage, limits };
}

/**
 * Middleware to check resource quotas
 */
export const checkQuota = (resource: 'domain' | 'inbox' | 'api_key' | 'webhook' | 'email') => {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    // Only check quotas for organization-owned resources
    if (!request.organizationMember) {
      return; // Skip for non-organization routes
    }

    const organizationId = (request.params as any).organizationId || (request.body as any)?.organizationId;
    if (!organizationId) {
      return;
    }

    const quotaCheck = await checkQuotaExceeded(organizationId);

    if (quotaCheck.exceeded) {
      reply.status(403).send({
        error: 'Quota exceeded',
        message: 'Your organization has reached its plan limits',
        warnings: quotaCheck.warnings,
        upgradeUrl: '/billing',
        usage: quotaCheck.usage,
        limits: quotaCheck.limits
      });
      return;
    }

    // Add quota info to request for downstream use
    (request as any).quotaInfo = {
      usage: quotaCheck.usage,
      limits: quotaCheck.limits,
      warnings: quotaCheck.warnings
    };
  };
};

/**
 * Middleware to check specific resource quota
 */
export const checkSpecificQuota = (resource: keyof QuotaUsage) => {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    if (!request.organizationMember) {
      return;
    }

    const organizationId = (request.params as any).organizationId;
    if (!organizationId) {
      return;
    }

    const [usage, limits] = await Promise.all([
      getCurrentUsage(organizationId),
      getQuotaLimits(organizationId)
    ]);

    const limit = (limits as any)[resource];
    const current = usage[resource];

    if (limit && current >= limit) {
      reply.status(403).send({
        error: `${resource} quota exceeded`,
        message: `Your organization has reached its limit for ${resource}s (${current}/${limit})`,
        upgradeUrl: '/billing'
      });
      return;
    }

    // Warn if near limit
    if (limit && current >= limit * 0.9) {
      reply.header('X-Quota-Warning', `${resource} quota nearly reached: ${current}/${limit}`);
    }
  };
};

/**
 * Check API rate limits
 */
export const checkApiRateLimit = async (
  organizationId: string,
  apiKeyId?: string
): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> => {
  const limits = await getQuotaLimits(organizationId);
  const rateLimit = limits.apiCallsPerMinute || 60;

  // Use Redis or similar for production rate limiting
  // For now, just return based on basic checks
  return {
    allowed: true,
    remaining: rateLimit,
    resetTime: new Date(Date.now() + 60000)
  };
};

/**
 * Record quota usage
 */
export async function recordUsage(
  organizationId: string,
  resource: keyof QuotaUsage,
  quantity: number = 1
) {
  // Update usage tracking
  // This could be stored in Redis for real-time tracking
  // For now, we rely on database queries for getCurrentUsage()
}

/**
 * Get quota alerts for organization
 */
export async function getQuotaAlerts(organizationId: string) {
  const quotaCheck = await checkQuotaExceeded(organizationId);

  const alerts = quotaCheck.warnings.map(warning => ({
    type: 'warning',
    message: warning,
    severity: warning.includes('exceeded') ? 'error' : 'warning',
    timestamp: new Date(),
    organizationId
  }));

  // Add critical alerts if exceeded
  if (quotaCheck.exceeded) {
    alerts.push({
      type: 'critical',
      message: 'Organization quotas exceeded - some features may be disabled',
      severity: 'error',
      timestamp: new Date(),
      organizationId
    });
  }

  return alerts;
}