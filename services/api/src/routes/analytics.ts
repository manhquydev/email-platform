import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from 'date-fns';

const prisma = new PrismaClient();

export default async function analyticsRoutes(app: FastifyInstance) {
  // Get real-time dashboard data
  app.get('/api/analytics/dashboard', {
    preHandler: [app.authenticate, async (request, reply) => {
      const user = (request as any).user;
      if (user.tier !== 'ENTERPRISE') {
        return reply.status(403).send({
          error: 'Analytics dashboard requires Enterprise tier'
        });
      }
    }]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const now = new Date();
        const thirtyDaysAgo = subDays(now, 30);

        // Get core metrics
        const [
          totalUsers,
          totalDomains,
          totalInboxes,
          totalMessages,
          activeUsers,
          messagesToday,
          newUsersToday,
          messagesThisMonth,
          avgResponseTime,
          uptime,
          errorRate
        ] = await Promise.all([
          prisma.user.count(),
          prisma.domain.count(),
          prisma.inbox.count(),
          prisma.message.count(),
          getActiveUsersCount(),
          getMessageCountToday(),
          getNewUsersCountToday(),
          getMessageCountThisMonth(),
          getAverageResponseTime(),
          getUptime(),
          getErrorRate()
        ]);

        // Get growth metrics
        const [userGrowth, messageGrowth] = await Promise.all([
          getGrowthRate('users', thirtyDaysAgo, now),
          getGrowthRate('messages', thirtyDaysAgo, now)
        ]);

        // Get quota usage
        const quotaUsage = await getQuotaUsage();

        // Get top metrics
        const [topDomains, topSenders, topCountries] = await Promise.all([
          getTopDomains(),
          getTopSenders(),
          getTopCountries()
        ]);

        // Get hourly metrics for last 24 hours
        const hourlyMetrics = await getHourlyMetrics(24);

        // Get funnel analytics
        const funnelAnalytics = await getFunnelAnalytics();

        reply.send({
          overview: {
            totalUsers,
            totalDomains,
            totalInboxes,
            totalMessages,
            activeUsers,
            messagesToday,
            newUsersToday,
            messagesThisMonth
          },
          growth: {
            users: userGrowth,
            messages: messageGrowth
          },
          performance: {
            avgResponseTime,
            uptime,
            errorRate
          },
          quota: quotaUsage,
          top: {
            domains: topDomains,
            senders: topSenders,
            countries: topCountries
          },
          hourly: hourlyMetrics,
          funnel: funnelAnalytics,
          timestamp: now.toISOString()
        });
      } catch (error) {
        console.error('Analytics dashboard error:', error);
        reply.status(500).send({ error: 'Failed to load dashboard data' });
      }
    });

    // Get usage metrics
    app.get('/api/analytics/usage', {
      preHandler: [app.authenticate]
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const { period = '30d' } = request.query as any;

        const usage = await getUserUsage(user.userId, period as string);

        reply.send(usage);
      } catch (error) {
        reply.status(500).send({ error: 'Failed to get usage metrics' });
      }
    });

    // Get email trends
    app.get('/api/analytics/trends', {
      preHandler: [app.authenticate]
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { period = '30d', type = 'all' } = request.query as any;

        const trends = await getEmailTrends(period as string, type as string);

        reply.send(trends);
      } catch (error) {
        reply.status(500).send({ error: 'Failed to get email trends' });
      }
    });

    // Get conversion analytics
    app.get('/api/analytics/conversion', {
      preHandler: [app.authenticate, async (request, reply) => {
        const user = (request as any).user;
        if (user.tier !== 'ENTERPRISE') {
          return reply.status(403).send({
            error: 'Conversion analytics requires Enterprise tier'
          });
        }
      }]
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { period = '30d' } = request.query as any;

        const conversion = await getConversionAnalytics(period as string);

        reply.send(conversion);
      } catch (error) {
        reply.status(500).send({ error: 'Failed to get conversion analytics' });
      }
    });

    // Get A/B testing results
    app.get('/api/analytics/ab-tests', {
      preHandler: [app.authenticate, async (request, reply) => {
        const user = (request as any).user;
        if (user.tier !== 'ENTERPRISE') {
          return reply.status(403).send({
            error: 'A/B testing analytics requires Enterprise tier'
          });
        }
      }]
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const abTests = await getABTestResults();

        reply.send(abTests);
      } catch (error) {
        reply.status(500).send({ error: 'Failed to get A/B test results' });
      }
    });

    // Get cohort retention
    app.get('/api/analytics/retention', {
      preHandler: [app.authenticate, async (request, reply) => {
        const user = (request as any).user;
        if (user.tier !== 'ENTERPRISE') {
          return reply.status(403).send({
            error: 'Retention analytics requires Enterprise tier'
          });
        }
      }]
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const cohorts = await getCohortRetention();

        reply.send(cohorts);
      } catch (error) {
        reply.status(500).send({ error: 'Failed to get cohort retention' });
      }
    });

    // Get real-time metrics (WebSocket ready)
    app.get('/api/analytics/realtime', {
      preHandler: [app.authenticate]
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const metrics = await getRealTimeMetrics();

        reply.send(metrics);
      } catch (error) {
        reply.status(500). send({ error: 'Failed to get real-time metrics' });
      }
    });

    // Export analytics data
    app.post('/api/analytics/export', {
      preHandler: [app.authenticate, async (request, reply) => {
        const user = (request as any).user;
        if (user.tier !== 'ENTERPRISE') {
          return reply.status(403).send({
            error: 'Data export requires Enterprise tier'
          });
        }
      }]
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { format = 'json', dateRange, metrics } = request.body as any;

        const data = await exportAnalyticsData(
          format as string,
          dateRange,
          metrics
        );

        reply.send(data);
      } catch (error) {
        reply.status(500).send({ error: 'Failed to export analytics data' });
      }
    });
  });
}

// Helper functions
async function getActiveUsersCount(): Promise<number> {
  const thirtyDaysAgo = subDays(new Date(), 30);
  return prisma.user.count({
    where: {
      lastLoginAt: {
        gte: thirtyDaysAgo
      }
    }
  });
}

async function getMessageCountToday(): Promise<number> {
  const today = new Date();
  return prisma.message.count({
    where: {
      createdAt: {
        gte: startOfDay(today),
        lt: endOfDay(today)
      }
    }
  });
}

async function getNewUsersCountToday(): Promise<number> {
  const today = new Date();
  return prisma.user.count({
    where: {
      createdAt: {
        gte: startOfDay(today),
        lt: endOfDay(today)
      }
    }
  });
}

async function getMessageCountThisMonth(): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  return prisma.message.count({
    where: {
      createdAt: {
        gte: startOfMonth
      }
    }
  });
}

async function getAverageResponseTime(): Promise<number> {
  // Calculate average response time for support tickets
  const tickets = await prisma.supportTicket.findMany({
    where: {
      status: 'resolved'
    },
    include: {
      replies: {
        orderBy: {
          createdAt: 'asc'
        }
      }
    }
  });

  if (tickets.length === 0) return 0;

  const responseTimes = tickets.map(ticket => {
    if (ticket.replies.length === 0) return 0;
    const firstReply = ticket.replies[0];
    return (firstReply.createdAt.getTime() - ticket.createdAt.getTime()) / 1000; // seconds
  });

  return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
}

async function getUptime(): Promise<number> {
  // In production, calculate from monitoring data
  return 99.9;
}

async function getErrorRate(): Promise<number> {
  // In production, calculate from error logs
  return 0.1;
}

async function getGrowthRate(entity: string, startDate: Date, endDate: Date): Promise<number> {
  const prevCount = await getCountForPeriod(entity, subDays(startDate, 30), startDate);
  const currentCount = await getCountForPeriod(entity, startDate, endDate);

  if (prevCount === 0) return 100;
  return ((currentCount - prevCount) / prevCount) * 100;
}

async function getCountForPeriod(entity: string, startDate: Date, endDate: Date): Promise<number> {
  switch (entity) {
    case 'users':
      return prisma.user.count({
        where: {
          createdAt: {
            gte: startDate,
            lt: endDate
          }
        }
      });
    case 'messages':
      return prisma.message.count({
        where: {
          createdAt: {
            gte: startDate,
            lt: endDate
          }
        }
      });
    default:
      return 0;
  }
}

async function getQuotaUsage() {
  const users = await prisma.user.findMany({
    where: {
      tier: {
        in: ['FREE', 'PRO', 'BUSINESS']
      }
    },
    include: {
      quota: true,
      _count: {
        select: {
          domains: true,
          inboxes: true
        }
      }
    }
  });

  const tierLimits = {
    FREE: { maxDomains: 1, maxInboxes: 5 },
    PRO: { maxDomains: 5, maxInboxes: 100 },
    BUSINESS: { maxDomains: 50, maxInboxes: 1000 }
  };

  const quotas = users.map(user => ({
    tier: user.tier,
    used: {
      domains: user._count.domains,
      inboxes: user._count.inboxes
    },
    max: tierLimits[user.tier as keyof typeof tierLimits],
    percentage: {
      domains: (user._count.domains / tierLimits[user.tier as keyof typeof tierLimits].maxDomains) * 100,
      inboxes: (user._count.inboxes / tierLimits[user.tier as keyof typeof tierLimits].maxInboxes) * 100
    }
  }));

  return quotas;
}

async function getTopDomains(): Promise<any[]> {
  return prisma.message.groupBy({
    by: ['inbox'],
    _count: {
      id: true
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    },
    include: {
      inbox: {
        include: {
          domain: true
        }
      }
    },
    take: 10
  });
}

async function getTopSenders(): Promise<any[]> {
  return prisma.message.groupBy({
    by: ['fromEmail'],
    _count: true,
    orderBy: {
      _count: 'desc'
    },
    take: 10
  });
}

async function getTopCountries(): Promise<any[]> {
  // In production, use GeoIP to determine countries
  // For now, return sample data
  return [
    { country: 'US', count: 1234 },
    { country: 'UK', count: 987 },
    { country: 'DE', count: 654 },
    { country: 'FR', count: 432 },
    { country: 'CA', count: 321 }
  ];
}

async function getHourlyMetrics(hours: number): Promise<any[]> {
  const metrics = [];
  const now = new Date();

  for (let i = hours - 1; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourStart = new Date(hour);
    const hourEnd = new Date(hour.getTime() + 60 * 60 * 1000);

    const [messagesCount, usersActive, errors] = await Promise.all([
      prisma.message.count({
        where: {
          createdAt: {
            gte: hourStart,
            lt: hourEnd
          }
        }
      }),
      getActiveUsersCount(),
      getErrorRate()
    ]);

    metrics.push({
      hour: hourStart.toISOString(),
      messages: messagesCount,
      activeUsers: usersActive,
      errors
    });
  }

  return metrics;
}

async function getFunnelAnalytics(): Promise<any> {
  const thirtyDaysAgo = subDays(new Date(), 30);

  const [
    visitors,
    signups,
    activations,
    conversions
  ] = await Promise.all([
      getVisitorCount(thirtyDaysAgo),
      prisma.user.count({
        where: {
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      getActivationCount(thirtyDaysAgo),
      getConversionCount(thirtyDaysAgo)
    ]);

  return {
    visitors,
    signups,
    activations,
    conversions,
    visitorToSignupRate: visitors > 0 ? (signups / visitors) * 100 : 0,
    signupToActivationRate: signups > 0 ? (activations / signups) * 100 : 0,
    activationToConversionRate: activations > 0 ? (conversions / activations) * 100 : 0
  };
}

async function getVisitorCount(since: Date): Promise<number> {
  // In production, get from analytics service
  return Math.floor(Math.random() * 10000) + 1000;
}

async function getActivationCount(since: Date): Promise<number> {
  return prisma.user.count({
    where: {
      createdAt: { gte: since },
      lastLoginAt: { not: null }
    }
  });
}

async function getConversionCount(since: Date): Promise<number> {
  // Count users who upgraded to paid tiers
  return prisma.user.count({
    where: {
      createdAt: { gte: since },
      tier: {
        in: ['PRO', 'BUSINESS', 'ENTERPRISE']
      }
    }
  });
}

async function getUserUsage(userId: string, period: string): Promise<any> {
  let startDate: Date;
  const endDate = new Date();

  switch (period) {
    case '7d':
      startDate = subDays(endDate, 7);
      break;
    case '30d':
      startDate = subDays(endDate, 30);
      break;
    case '90d':
      startDate = subDays(endDate, 90);
      break;
    default:
      startDate = subDays(endDate, 30);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      quota: true,
      domains: {
        include: {
          _count: {
            select: {
              messages: true
            }
          }
        }
      },
      inboxes: {
        include: {
          _count: {
            select: {
              messages: true
            }
          }
        }
      }
    }
  });

  if (!user) return null;

  const messages = await prisma.message.count({
    where: {
      createdAt: { gte: startDate },
      inbox: {
        userId
      }
    }
  });

  return {
    period,
    startDate,
    endDate,
    messagesReceived: messages,
    domainsCount: user.domains.length,
    inboxesCount: user.inboxes.length,
    quota: user.quota
  };
}

async function getEmailTrends(period: string, type: string): Promise<any> {
  let startDate: Date;
  const endDate = new Date();

  switch (period) {
    case '7d':
      startDate = subDays(endDate, 7);
      break;
    case '30d':
      startDate = subDays(endDate, 30);
      break;
    case '90d':
      startDate = subDays(endDate, 90);
      break;
    default:
      startDate = subDays(endDate, 30);
  }

  const dailyData = [];
  for (const day of eachDayOfInterval({ start: startDate, end: endDate })) {
    const [received, sent, spam] = await Promise.all([
      prisma.message.count({
        where: {
          createdAt: {
            gte: day,
            lt: new Date(day.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      }),
      0, // Implement sent email count
      0 // Implement spam detection count
    ]);

    dailyData.push({
      date: day.toISOString(),
      received,
      sent,
      spam
    });
  }

  return {
    period,
    dailyData,
    total: {
      received: dailyData.reduce((sum, d) => sum + d.received, 0),
      sent: dailyData.reduce((sum, d) => sum + d.sent, 0),
      spam: dailyData.reduce((sum, d) => sum + d.spam, 0)
    }
  };
}

async function getConversionAnalytics(period: string): Promise<any> {
  // Implement conversion funnel analytics
  return {
    period,
    funnel: {
      'Free to Pro': {
        users: 1000,
        converted: 150,
        rate: 15
      },
      'Pro to Business': {
        users: 500,
        converted: 50,
        rate: 10
      },
      'Business to Enterprise': {
        users: 100,
        converted: 20,
        rate: 20
      }
    }
  };
}

async function getABTestResults(): Promise<any> {
  // Get A/B test results
  return {
    tests: [
      {
        name: 'Homepage Hero Text',
        variants: [
          { id: 'A', description: 'Original', conversions: 245, rate: 2.45 },
          { id: 'B', description: 'New Variant', conversions: 312, rate: 3.12 }
        ],
        significance: 0.05
      }
    ]
  };
}

async function getCohortRetention(): Promise<any> {
  // Get cohort retention data
  return {
    cohorts: [
      {
        cohort: '2024-01',
        size: 1000,
        retention: [
          { day: 0, percentage: 100 },
          { day: 7, percentage: 85 },
          { day: 30, percentage: 70 },
          { day: 90, percentage: 55 }
        ]
      }
    ]
  };
}

async function getRealTimeMetrics(): Promise<any> {
  return {
    timestamp: new Date().toISOString(),
    activeUsers: await getActiveUsersCount(),
    messagesPerMinute: 42,
    apiRequestsPerMinute: 1250,
    averageResponseTime: await getAverageResponseTime(),
    errorRate: await getErrorRate()
  };
}

async function exportAnalyticsData(
  format: string,
  dateRange: any,
  metrics: string[]
): Promise<any> {
  const data = {
    dateRange,
    metrics,
    data: {},
    exportedAt: new Date().toISOString()
  };

  for (const metric of metrics) {
    switch (metric) {
      case 'users':
        data.data[metric] = await prisma.user.findMany({
          select: {
            id: true,
            email: true,
            tier: true,
            createdAt: true,
            lastLoginAt: true
          },
          where: {
            createdAt: {
              gte: new Date(dateRange.start),
              lte: new Date(dateRange.end)
            }
          }
        });
        break;
      case 'messages':
        data.data[metric] = await prisma.message.findMany({
          select: {
            id: true,
            fromEmail: true,
            subject: true,
            size: true,
            createdAt: true,
            inboxId: true
          },
          where: {
            createdAt: {
              gte: new Date(dateRange.start),
              lte: new Date(dateRange.end)
            }
          }
        });
        break;
    }
  }

  return data;
}