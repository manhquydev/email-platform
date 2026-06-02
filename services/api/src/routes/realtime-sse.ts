import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { connectionManager } from '../services/connection-manager';
import { issueSseTicket, consumeSseTicket } from '../utils/sse-ticket';

interface JWTPayload {
  userId: string;
  role: string;
  tier: string;
  iat: number;
  exp: number;
}

const realtimeSseRoutes: FastifyPluginAsync = async (app) => {
  // Mint a short-lived, single-use SSE ticket for the authenticated user. EventSource cannot
  // send an Authorization header, so the client exchanges this ticket instead of putting the
  // access token in the SSE URL.
  app.get('/api/events/ticket', {
    preHandler: [(app as any).authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as { userId: string }).userId;
    const ticket = await issueSseTicket(userId);
    return reply.send({ ticket });
  });

  app.get('/api/events', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          ticket: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { ticket?: string } }>, reply: FastifyReply) => {
    // Prefer a single-use ticket (browser EventSource). A Bearer header is still accepted for
    // non-browser clients. The raw access token is no longer accepted as a query parameter.
    let userId: string | null = null;
    const ticket = request.query.ticket;
    if (ticket) {
      userId = await consumeSseTicket(ticket);
      if (!userId) {
        return reply.status(401).send({ error: 'Invalid or expired ticket' });
      }
    } else {
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const decoded = app.jwt.verify<JWTPayload>(authHeader.slice(7));
          userId = decoded.userId;
        } catch (err) {
          request.log.warn({ err }, 'SSE auth failed');
          return reply.status(401).send({ error: 'Invalid token' });
        }
      }
    }

    if (!userId) {
      return reply.status(401).send({ error: 'Authentication required' });
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
