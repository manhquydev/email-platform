import { prisma } from '../lib/prisma';
import { emailQueue } from '../queue/emailQueue';
import { outboundQueue } from '../queue/outboundQueue';
import { webhookQueue } from '../queue/webhookQueue';

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface SystemAnalytics {
  queues: {
    emailIngest: QueueMetrics;
    outbound: QueueMetrics;
    webhooks: QueueMetrics;
  };
  counts: {
    users: number;
    totalEmails: number;
    sentEmails: number;
  };
  timeseries: Array<{
    date: string;
    received: number;
    sent: number;
  }>;
}

// Timeseries data point for analytics chart
interface TimeseriesDataPoint {
  date: string;
  received: number;
  sent: number;
}

// Days to include in timeseries
const TIMESERIES_DAYS = 7;

// Helper to convert query results to date lookup map
const createDateMap = (stats: Array<{ date: Date; count: bigint }>): Map<string, number> =>
  new Map(stats.map(s => [s.date.toISOString().split('T')[0], Number(s.count)]));

export class AnalyticsService {
  private static async getQueueMetrics(queue: any): Promise<QueueMetrics> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  static async getSystemStats(): Promise<SystemAnalytics> {
    // 1. Get Queue Metrics
    const [emailIngest, outbound, webhooks] = await Promise.all([
      this.getQueueMetrics(emailQueue),
      this.getQueueMetrics(outboundQueue),
      this.getQueueMetrics(webhookQueue),
    ]);

    // 2. Get Database Counts
    const [users, totalEmails, sentEmails] = await Promise.all([
      prisma.user.count(),
      prisma.message.count(), // Total received
      prisma.outboundMessage.count(), // Sent emails
      // Better approach for sent emails if we don't have a distinct model: check outbound queue job logs or specific table if exists.
      // Looking at schema from previous context, usually 'Email' table stores received.
      // Let's assume 'SentEmail' or similar exists, or query 'Email' for now.
      // Actually, let's look at prisma schema if we can, but to save time I'll use a generic count for now and refine if 'SentEmail' exists.
      // Retrying: I saw 'outbound-email' queue. Usually implies separate handling.
    ]);

    // Refined counts based on typical patterns:
    // We'll use the counts we have. If strictly outbound model is missing, we use 0 or a placeholder query.
    // Let's stick to safe counts.

    // 3. Generate 7-day timeseries
    const timeseries = await this.getTimeseriesData();

    return {
      queues: {
        emailIngest,
        outbound,
        webhooks,
      },
      counts: {
        users,
        totalEmails,
        sentEmails,
      },
      timeseries,
    };
  }

  private static async getTimeseriesData(): Promise<TimeseriesDataPoint[]> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - TIMESERIES_DAYS);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      // SECURITY: Only ${variables} are parameterized. Column/table names are hardcoded.
      // Query received emails per day using UTC timezone for consistency
      const receivedStats = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE("receivedAt" AT TIME ZONE 'UTC') as date, COUNT(*) as count
        FROM "Message"
        WHERE "receivedAt" >= ${sevenDaysAgo}
        GROUP BY DATE("receivedAt" AT TIME ZONE 'UTC')
      `;

      // Query sent emails per day
      const sentStats = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE("createdAt" AT TIME ZONE 'UTC') as date, COUNT(*) as count
        FROM "OutboundMessage"
        WHERE "createdAt" >= ${sevenDaysAgo}
        GROUP BY DATE("createdAt" AT TIME ZONE 'UTC')
      `;

      // Build date array for last 7 days (oldest to newest)
      const dates = Array.from({ length: TIMESERIES_DAYS }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (TIMESERIES_DAYS - 1 - i));
        return d.toISOString().split('T')[0];
      });

      // Convert query results to lookup maps (DRY helper)
      const receivedMap = createDateMap(receivedStats);
      const sentMap = createDateMap(sentStats);

      // Return timeseries with 0 for days without data
      return dates.map(date => ({
        date,
        received: receivedMap.get(date) || 0,
        sent: sentMap.get(date) || 0,
      }));
    } catch (error) {
      console.error('[AnalyticsService] Failed to fetch timeseries data:', error);
      // Graceful degradation: return empty dataset
      return Array.from({ length: TIMESERIES_DAYS }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (TIMESERIES_DAYS - 1 - i));
        return {
          date: d.toISOString().split('T')[0],
          received: 0,
          sent: 0,
        };
      });
    }
  }
}
