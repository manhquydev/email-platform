import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { pushNotification } from '../services/push-notification';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

const pushRoutes: FastifyPluginAsync = async (app) => {
  // Get VAPID public key
  app.get('/push/vapid-key', async (request, reply) => {
    const key = pushNotification.getVapidPublicKey();
    if (!key) {
      return reply.status(503).send({ error: 'Push notifications not configured' });
    }
    return { vapidPublicKey: key };
  });

  // Subscribe to push notifications
  app.post('/push/subscribe', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const result = subscribeSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: result.error.issues });
    }
    const body = result.data;
    const userId = (request as any).user.userId;

    // Upsert subscription (same endpoint = update keys)
    await prisma.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      create: {
        userId,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: request.headers['user-agent'],
      },
      update: {
        userId,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: request.headers['user-agent'],
      },
    });

    return { success: true };
  });

  // Unsubscribe from push notifications
  app.delete('/push/subscribe', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const result = z.object({ endpoint: z.string().url() }).safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid request body' });
    }
    const body = result.data;
    const userId = (request as any).user.userId;

    await prisma.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint: body.endpoint,
      },
    });

    return { success: true };
  });

  // Get current subscriptions (for debugging/settings)
  app.get('/push/subscriptions', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const userId = (request as any).user.userId;

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
      select: {
        id: true,
        endpoint: true,
        userAgent: true,
        createdAt: true,
      },
    });

    return { subscriptions };
  });
};

export default pushRoutes;
