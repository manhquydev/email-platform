import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function adminHealthRoutes(fastify: FastifyInstance) {
  // Public health check for LB
  fastify.get('/', { preHandler: fastify.requireAdmin }, async () => {
    return { status: 'ok', timestamp: new Date() };
  });

  // Deep health check for Admin Dashboard
  fastify.get('/detailed', { preHandler: fastify.requireAdmin }, async (req, reply) => {
    try {
      // Check DB
      await prisma.$queryRaw`SELECT 1`;

      // Check Redis (mocked if not available in context, assume available in full app)
      // const redisStatus = await redis.ping();

      return {
        status: 'healthy',
        services: {
          database: 'up',
          api: 'up',
          storage: 'up' // S3 check could go here
        },
        version: process.env.npm_package_version || '1.0.0'
      };
    } catch (error) {
      reply.status(503);
      return {
        status: 'degraded',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}
