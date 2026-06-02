import { FastifyInstance } from 'fastify';
import { AdminRole, requireAdminRole } from '../../middleware/rbac';
import { PrismaClient } from '@prisma/client';
import { appConfig } from '../../config';
import os from 'os';

const prisma = new PrismaClient();

export default async function adminMonitoringRoutes(fastify: FastifyInstance) {
  // Real-time SSE stream for dashboard charts
  fastify.get('/stream', {
    preHandler: requireAdminRole([AdminRole.SUPER_ADMIN, AdminRole.HELPDESK])
  }, (req, reply) => {
    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
    };
    // This admin stream exposes user counts and system metrics — never wildcard CORS.
    // Echo the credentialed origin only when it matches the configured web app.
    const origin = req.headers.origin;
    if (origin && origin === appConfig.webUrl) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
      headers['Vary'] = 'Origin';
    }
    reply.raw.writeHead(200, headers);

    const sendUpdate = async () => {
      const [userCount, emailCount, activeInboxes] = await Promise.all([
        prisma.user.count(),
        prisma.message.count({ where: { receivedAt: { gt: new Date(Date.now() - 3600000) } } }), // Last hour
        prisma.inbox.count({ where: { deletedAt: null } })
      ]);

      const systemStats = {
        cpu: os.loadavg(),
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        app: {
          users: userCount,
          emailsInLastHour: emailCount,
          activeInboxes
        },
        timestamp: new Date().toISOString()
      };

      reply.raw.write(`data: ${JSON.stringify(systemStats)}\n\n`);
    };

    const interval = setInterval(() => sendUpdate().catch(console.error), 5000);

    req.raw.on('close', () => {
      clearInterval(interval);
      reply.raw.end();
    });
  });

  // Historical stats
  fastify.get('/stats', {
    preHandler: requireAdminRole([AdminRole.SUPER_ADMIN])
  }, async (req, reply) => {
    // Return aggregated stats for last 24h
    // Mocked for MVP as we'd need time-series DB or complex grouping
    return {
      emailVolume: [/* ... */],
      storageGrowth: [/* ... */]
    };
  });
}
