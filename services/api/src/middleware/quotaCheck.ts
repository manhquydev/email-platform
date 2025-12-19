import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define quota limits per tier
const TIER_LIMITS = {
  free: {
    maxDomains: 1,
    maxInboxes: 10,
    maxEmailsPerMonth: 100,
    emailRetentionHours: 24
  },
  premium: {
    maxDomains: 10,
    maxInboxes: 100,
    maxEmailsPerMonth: 10000,
    emailRetentionHours: 168 // 1 week
  },
  business: {
    maxDomains: 100,
    maxInboxes: 1000,
    maxEmailsPerMonth: 100000,
    emailRetentionHours: 720 // 30 days
  },
  enterprise: {
    maxDomains: -1, // unlimited
    maxInboxes: -1, // unlimited
    maxEmailsPerMonth: -1, // unlimited
    emailRetentionHours: -1 // unlimited
  }
};

export interface QuotaCheckOptions {
  resource: 'domain' | 'inbox' | 'email';
  bypassForAdmin?: boolean;
}

export const quotaCheck = (options: QuotaCheckOptions) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip if no authenticated user
    if (!request.user) {
      return;
    }

    const userId = (request.user as any).userId;
    const userRole = (request.user as any).role;

    // Bypass for admins if enabled
    if (options.bypassForAdmin && userRole === 'ADMIN') {
      return;
    }

    // Get user with quota
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userQuota: true,
        _count: {
          select: {
            domains: {
              where: { isActive: true }
            },
            inboxes: {
              where: { isActive: true, deletedAt: null }
            }
          }
        }
      }
    });

    if (!user) {
      return reply.status(404).send({
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    const tier = user.tier as keyof typeof TIER_LIMITS;
    const limits = TIER_LIMITS[tier];

    if (!limits) {
      return reply.status(500).send({
        error: 'INVALID_TIER',
        message: 'Invalid user tier'
      });
    }

    switch (options.resource) {
      case 'domain':
        if (limits.maxDomains !== -1 && user._count.domains >= limits.maxDomains) {
          return reply.status(429).send({
            error: 'DOMAIN_QUOTA_EXCEEDED',
            message: `Domain limit (${limits.maxDomains}) reached for your tier`,
            upgradeUrl: '/pricing',
            currentUsage: user._count.domains,
            limit: limits.maxDomains
          });
        }
        break;

      case 'inbox':
        if (limits.maxInboxes !== -1 && user._count.inboxes >= limits.maxInboxes) {
          return reply.status(429).send({
            error: 'INBOX_QUOTA_EXCEEDED',
            message: `Inbox limit (${limits.maxInboxes}) reached for your tier`,
            upgradeUrl: '/pricing',
            currentUsage: user._count.inboxes,
            limit: limits.maxInboxes
          });
        }
        break;

      case 'email':
        // Check monthly email quota
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);

        const monthlyUsage = await prisma.usageTracker.findFirst({
          where: {
            userId,
            metric: 'emails_received',
            period: 'monthly',
            periodStart: {
              gte: currentMonth
            }
          }
        });

        const emailCount = monthlyUsage?.value || 0;

        if (limits.maxEmailsPerMonth !== -1 && emailCount >= limits.maxEmailsPerMonth) {
          return reply.status(429).send({
            error: 'EMAIL_QUOTA_EXCEEDED',
            message: `Monthly email limit (${limits.maxEmailsPerMonth}) reached`,
            upgradeUrl: '/pricing',
            currentUsage: emailCount,
            limit: limits.maxEmailsPerMonth,
            resetsOn: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
          });
        }
        break;
    }

    // Add quota info to request for downstream handlers
    request.quotaInfo = {
      tier,
      limits,
      usage: {
        domains: user._count.domains,
        inboxes: user._count.inboxes
      }
    };
  };
};

// Track usage after successful operation
export const trackUsage = async (userId: string, metric: string, value: number = 1, period: string = 'monthly') => {
  const now = new Date();
  let periodStart: Date;

  // Calculate period start based on period type
  switch (period) {
    case 'daily':
      periodStart = new Date(now);
      periodStart.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      periodStart = new Date(now);
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
      break;
    case 'yearly':
      periodStart = new Date(now);
      periodStart.setMonth(0, 1);
      periodStart.setHours(0, 0, 0, 0);
      break;
    default:
      periodStart = now;
  }

  // Upsert usage tracker
  await prisma.usageTracker.upsert({
    where: {
      userId_metric_period_periodStart: {
        userId,
        metric,
        period,
        periodStart
      }
    },
    update: {
      value: {
        increment: value
      }
    },
    create: {
      userId,
      metric,
      value,
      period,
      periodStart
    }
  });
};

// Get current usage for a user
export const getUserUsage = async (userId: string) => {
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userQuota: true,
      _count: {
        select: {
          domains: {
            where: { isActive: true }
          },
          inboxes: {
            where: { isActive: true, deletedAt: null }
          }
        }
      },
      usageTrackers: {
        where: {
          periodStart: {
            gte: currentMonth
          }
        }
      }
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const tier = user.tier as keyof typeof TIER_LIMITS;
  const limits = TIER_LIMITS[tier];

  // Get usage from trackers
  const usage = {
    domains: user._count.domains,
    inboxes: user._count.inboxes,
    emailsReceived: 0,
    storageUsed: 0
  };

  user.usageTrackers.forEach(tracker => {
    if (tracker.metric === 'emails_received') {
      usage.emailsReceived = tracker.value;
    } else if (tracker.metric === 'storage_used') {
      usage.storageUsed = tracker.value;
    }
  });

  return {
    tier,
    limits,
    usage,
    quota: user.userQuota
  };
};

// Delete old emails based on retention policy
export const cleanupOldEmails = async () => {
  const users = await prisma.user.findMany({
    include: { userQuota: true }
  });

  for (const user of users) {
    if (!user.userQuota || user.userQuota.emailRetentionHours === -1) {
      continue; // No retention limit
    }

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - user.userQuota.emailRetentionHours);

    // Soft delete old messages
    await prisma.message.updateMany({
      where: {
        userId,
        createdAt: {
          lt: cutoffDate
        },
        deletedAt: null
      },
      data: {
        deletedAt: new Date()
      }
    });

    // Hard delete messages older than retention * 2
    const hardDeleteCutoff = new Date();
    hardDeleteCutoff.setHours(hardDeleteCutoff.getHours() - (user.userQuota.emailRetentionHours * 2));

    await prisma.message.deleteMany({
      where: {
        userId,
        createdAt: {
          lt: hardDeleteCutoff
        }
      }
    });
  }
};

// Check if feature is available for tier
export const checkFeatureAccess = async (userId: string, feature: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organization: {
        include: {
          settingsObj: true
        }
      }
    }
  });

  if (!user) {
    return false;
  }

  const tier = user.tier;

  // Define feature access per tier
  const featureAccess: Record<string, string[]> = {
    free: ['basic_inbox', 'email_forwarding'],
    premium: ['basic_inbox', 'email_forwarding', 'custom_branding', 'advanced_filters'],
    business: ['basic_inbox', 'email_forwarding', 'custom_branding', 'advanced_filters', 'sso', 'api_access'],
    enterprise: ['all']
  };

  return featureAccess[tier]?.includes(feature) || featureAccess[tier]?.includes('all');
};

// Extend FastifyRequest type
declare module 'fastify' {
  interface FastifyRequest {
    quotaInfo?: {
      tier: string;
      limits: any;
      usage: any;
    };
  }
}