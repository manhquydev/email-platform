import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { connectionManager } from '../services/connection-manager';

interface JWTPayload {
  userId: string;
  role: string;
  tier: string;
  iat: number;
  exp: number;
}

const realtimeSseRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/events', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          token: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { token?: string } }>, reply: FastifyReply) => {
    // Extract token from query or Authorization header
    let token = request.query.token;
    if (!token) {
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return reply.status(401).send({ error: 'Token required' });
    }

    // Verify JWT
    let userId: string;
    try {
      const decoded = app.jwt.verify<JWTPayload>(token);
      userId = decoded.userId;
    } catch (err) {
      request.log.warn({ err }, 'SSE auth failed');
      return reply.status(401).send({ error: 'Invalid token' });
    }

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Send initial connection event
    reply.raw.write(`data: ${JSON.stringify({
      type: 'connected',
      userId,
      timestamp: Date.now(),
    })}\n\n`);

    // Create SSE connection object
    const connection = {
      type: 'sse' as const,
      reply,
      userId,
      createdAt: Date.now(),
    };

    // Add to connection manager
    connectionManager.add(userId, connection);
    request.log.info({ userId }, 'SSE connected');

    // Keepalive: send comment every 15s to prevent timeout
    const keepaliveInterval = setInterval(() => {
      try {
        reply.raw.write(': keepalive\n\n');
      } catch {
        clearInterval(keepaliveInterval);
      }
    }, 15000);

    // Handle client disconnect
    request.raw.on('close', () => {
      clearInterval(keepaliveInterval);
      connectionManager.remove(userId, connection);
      request.log.info({ userId }, 'SSE disconnected');
    });

    request.raw.on('error', (err) => {
      clearInterval(keepaliveInterval);
      connectionManager.remove(userId, connection);
      request.log.error({ err, userId }, 'SSE error');
    });

    // Keep connection open - don't call reply.send()
    // Return undefined to prevent Fastify from closing the response
  });
};

export default realtimeSseRoutes;
