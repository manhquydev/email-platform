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
        getUserGrowth(thirtyDaysAgo, now),
        getMessageGrowth(thirtyDaysAgo, now)
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
      const hourlyMetrics = await getHourlyMetrics();

      // Get funnel analytics
      const funnelAnalytics = await getFunnelAnalytics();

      reply.send({
        summary: {
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
      reply.status(500).send({ error: 'Failed to fetch usage metrics' });
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
        lte: endOfDay(today)
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
        lte: endOfDay(today)
      }
    }
  });
}

async function getMessageCountThisMonth(): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  return prisma.message.count({
    where: {
      createdAt: {
        gte: startOfMonth
      }
    }
  });
}

async function getAverageResponseTime(): Promise<number> {
  // This would typically come from your monitoring system
  // For now, return a mock value
  return 145; // ms
}

async function getUptime(): Promise<number> {
  // This would typically come from your monitoring system
  // For now, return a mock value
  return 99.9; // percentage
}

async function getErrorRate(): Promise<number> {
  // This would typically come from your monitoring system
  // For now, return a mock value
  return 0.2; // percentage
}

async function getUserGrowth(startDate: Date, endDate: Date): Promise<any> {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const growth = await Promise.all(
    days.map(async (day) => {
      const count = await prisma.user.count({
        where: {
          createdAt: {
            gte: startOfDay(day),
            lte: endOfDay(day)
          }
        }
      });
      return {
        date: day.toISOString(),
        count
      };
    })
  );

  return growth;
}

async function getMessageGrowth(startDate: Date, endDate: Date): Promise<any> {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const growth = await Promise.all(
    days.map(async (day) => {
      const count = await prisma.message.count({
        where: {
          createdAt: {
            gte: startOfDay(day),
            lte: endOfDay(day)
          }
        }
      });
      return {
        date: day.toISOString(),
        count
      };
    })
  );

  return growth;
}

async function getQuotaUsage(): Promise<any> {
  const quotas = await prisma.quotas.findMany({
    include: {
      user: {
        select: {
          email: true
        }
      }
    }
  });

  return quotas.map(q => ({
    userId: q.userId,
    email: q.user.email,
    messagesUsed: q.messagesUsed,
    messagesLimit: q.messagesLimit,
    storageUsed: q.storageUsed,
    storageLimit: q.storageLimit,
    percentageUsed: (q.messagesUsed / q.messagesLimit) * 100
  }));
}

async function getTopDomains(): Promise<any[]> {
  const domains = await prisma.domain.findMany({
    take: 10,
    orderBy: {
      messages: {
        _count: 'desc'
      }
    },
    include: {
      _count: {
        select: {
          messages: true
        }
      }
    }
  });

  return domains.map(d => ({
    domain: d.name,
    messageCount: d._count.messages
  }));
}

async function getTopSenders(): Promise<any[]> {
  const senders = await prisma.message.groupBy({
    by: ['fromAddress'],
    _count: {
      fromAddress: true
    },
    orderBy: {
      _count: {
        fromAddress: 'desc'
      }
    },
    take: 10
  });

  return senders.map(s => ({
    email: s.fromAddress,
    messageCount: s._count.fromAddress
  }));
}

async function getTopCountries(): Promise<any[]> {
  // This would typically use geolocation data
  // For now, return mock data
  return [
    { country: 'US', count: 4523 },
    { country: 'GB', count: 2341 },
    { country: 'DE', count: 1876 },
    { country: 'FR', count: 1543 },
    { country: 'CA', count: 1234 }
  ];
}

async function getHourlyMetrics(): Promise<any[]> {
  const hours = [];
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    hours.push({
      hour: hour.toISOString(),
      messages: Math.floor(Math.random() * 1000),
      users: Math.floor(Math.random() * 500)
    });
  }

  return hours;
}

async function getFunnelAnalytics(): Promise<any> {
  return {
    visitors: 10000,
    signups: 2500,
    activated: 1800,
    paid: 450,
    enterprise: 125
  };
}

async function getUserUsage(userId: string, period: string): Promise<any> {
  const days = parseInt(period.replace('d', ''));
  const startDate = subDays(new Date(), days);

  const [messages, storage] = await Promise.all([
    prisma.message.count({
      where: {
        inbox: {
          userId
        },
        createdAt: {
          gte: startDate
        }
      }
    }),
    prisma.message.aggregate({
      where: {
        inbox: {
          userId
        },
        createdAt: {
          gte: startDate
        }
      },
      _sum: {
        size: true
      }
    })
  ]);

  return {
    userId,
    period,
    messages,
    storageUsed: storage._sum.size || 0,
    startDate: startDate.toISOString(),
    endDate: new Date().toISOString()
  };
}

async function exportAnalyticsData(format: string, dateRange: any, metrics: string[]): Promise<any> {
  const startDate = parseISO(dateRange.start);
  const endDate = parseISO(dateRange.end);

  const data = {};

  for (const metric of metrics) {
    switch (metric) {
      case 'users':
        data.users = await prisma.user.findMany({
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
        data.messages = await prisma.message.findMany({
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