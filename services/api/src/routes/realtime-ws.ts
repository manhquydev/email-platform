import { FastifyPluginAsync } from 'fastify';
import { WebSocket } from 'ws';
import { connectionManager } from '../services/connection-manager';

interface JWTPayload {
  userId: string;
  role: string;
  tier: string;
  iat: number;
  exp: number;
}

const realtimeWsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/ws/events', { websocket: true }, (socket: WebSocket, request) => {
    let userId: string | null = null;
    let authenticated = false;

    // Auth timeout - disconnect if not authenticated within 10s
    const authTimeout = setTimeout(() => {
      if (!authenticated) {
        socket.close(4001, 'Authentication timeout');
      }
    }, 10000);

    socket.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle authentication message
        if (message.type === 'auth' && message.token) {
          try {
            const decoded = app.jwt.verify<JWTPayload>(message.token);
            userId = decoded.userId;
            authenticated = true;
            clearTimeout(authTimeout);

            // Add to connection manager
            connectionManager.add(userId, {
              type: 'ws',
              socket,
              userId,
              createdAt: Date.now(),
            });

            // Send auth success
            socket.send(JSON.stringify({
              type: 'auth.success',
              userId,
              timestamp: Date.now(),
            }));

            request.log.info({ userId }, 'WebSocket authenticated');
          } catch (err) {
            socket.send(JSON.stringify({
              type: 'auth.error',
              message: 'Invalid token',
            }));
            socket.close(4002, 'Invalid token');
          }
          return;
        }

        // Handle ping from client
        if (message.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          return;
        }

        // Ignore other messages if not authenticated
        if (!authenticated) {
          socket.send(JSON.stringify({
            type: 'error',
            message: 'Not authenticated',
          }));
        }
      } catch (err) {
        request.log.warn({ err }, 'Failed to parse WebSocket message');
      }
    });

    socket.on('close', (code, reason) => {
      clearTimeout(authTimeout);
      if (userId) {
        connectionManager.remove(userId, {
          type: 'ws',
          socket,
          userId,
          createdAt: 0,
        });
        request.log.info({ userId, code, reason: reason?.toString() }, 'WebSocket closed');
      }
    });

    socket.on('error', (err) => {
      request.log.error({ err, userId }, 'WebSocket error');
      clearTimeout(authTimeout);
      if (userId) {
        connectionManager.remove(userId, {
          type: 'ws',
          socket,
          userId,
          createdAt: 0,
        });
      }
    });

    // Handle pong responses (from our server-side pings)
    socket.on('pong', () => {
      // Connection is alive, nothing to do
    });
  });
};

export default realtimeWsRoutes;
