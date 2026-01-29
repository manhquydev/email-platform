import { prisma } from '../lib/prisma';

/**
 * Get start of day in UTC
 */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Subtract days from date
 */
function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

export class UsageSnapshotJob {
  /**
   * Run the daily usage snapshot job
   * Iterates through all active providers and snapshots their current usage
   */
  static async run() {
    console.log('[UsageSnapshotJob] Starting daily usage snapshot...');

    try {
      // Get all active providers
      const providers = await prisma.hostingProvider.findMany({
        where: {
          status: {
            not: 'TERMINATED'
          }
        },
        select: {
          id: true
        }
      });

      console.log(`[UsageSnapshotJob] Found ${providers.length} providers to process`);

      const today = startOfDay(new Date());

      for (const provider of providers) {
        await this.snapshotProvider(provider.id, today);
      }

      console.log('[UsageSnapshotJob] Completed daily usage snapshot');
    } catch (error) {
      console.error('[UsageSnapshotJob] Failed to run job:', error);
    }
  }

  /**
   * Snapshot usage for a specific provider for a specific period (day)
   */
  static async snapshotProvider(providerId: string, period: Date) {
    try {
      // Calculate current allocated quotas from tenants
      const tenants = await prisma.providerTenant.findMany({
        where: {
          providerId,
          status: { not: 'TERMINATED' }
        },
        select: {
          maxMailboxes: true,
          maxStorageGb: true
        }
      });

      const allocatedMailboxes = tenants.reduce((sum, t) => sum + t.maxMailboxes, 0);
      const allocatedStorageBytes = tenants.reduce(
        (sum, t) => sum + BigInt(t.maxStorageGb) * BigInt(1024 * 1024 * 1024),
        BigInt(0)
      );

      // Upsert usage log (provider-level aggregate)
      await prisma.providerUsageLog.upsert({
        where: {
          providerId_tenantId_period: {
            providerId,
            tenantId: 'AGGREGATE',
            period
          }
        },
        update: {
          mailboxes: allocatedMailboxes,
          storageBytes: allocatedStorageBytes,
        },
        create: {
          providerId,
          tenantId: 'AGGREGATE',
          period,
          mailboxes: allocatedMailboxes,
          storageBytes: allocatedStorageBytes,
          messagesSent: 0,
          messagesReceived: 0
        }
      });

    } catch (error) {
      console.error(`[UsageSnapshotJob] Failed to snapshot provider ${providerId}:`, error);
    }
  }

  /**
   * Get usage history for a provider
   */
  static async getHistory(providerId: string, options: { days?: number } = {}) {
    const days = options.days || 30;
    const since = subDays(startOfDay(new Date()), days);

    return prisma.providerUsageLog.findMany({
      where: {
        providerId,
        tenantId: 'AGGREGATE',
        period: {
          gte: since
        }
      },
      orderBy: {
        period: 'asc'
      }
    });
  }
}
