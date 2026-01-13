import type { WebSocket } from 'ws';
import type { FastifyReply } from 'fastify';
import type { RealtimeEvent } from '../types/realtime';

interface WebSocketConnection {
  type: 'ws';
  socket: WebSocket;
  userId: string;
  createdAt: number;
}

interface SSEConnection {
  type: 'sse';
  reply: FastifyReply;
  userId: string;
  createdAt: number;
}

type Connection = WebSocketConnection | SSEConnection;

class ConnectionManager {
  private connections: Map<string, Set<Connection>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  add(userId: string, connection: Connection): void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add(connection);
    console.log(`[ConnectionManager] User ${userId} connected (${connection.type}). Total: ${this.getConnectionCount()}`);
  }

  remove(userId: string, connection: Connection): void {
    const userConns = this.connections.get(userId);
    if (userConns) {
      // Find and remove by socket/reply reference
      for (const conn of userConns) {
        if (conn.type === 'ws' && connection.type === 'ws') {
          if (conn.socket === connection.socket) {
            userConns.delete(conn);
            break;
          }
        } else if (conn.type === 'sse' && connection.type === 'sse') {
          if (conn.reply === connection.reply) {
            userConns.delete(conn);
            break;
          }
        }
      }
      if (userConns.size === 0) {
        this.connections.delete(userId);
      }
    }
    console.log(`[ConnectionManager] User ${userId} disconnected. Total: ${this.getConnectionCount()}`);
  }

  broadcast(event: RealtimeEvent): void {
    const userConns = this.connections.get(event.userId);
    if (!userConns) return;

    const message = JSON.stringify(event);

    userConns.forEach((conn) => {
      try {
        if (conn.type === 'ws' && conn.socket.readyState === 1) {
          conn.socket.send(message);
        } else if (conn.type === 'sse') {
          // SSE format: data: {json}\n\n
          conn.reply.raw.write(`data: ${message}\n\n`);
        }
      } catch (err) {
        console.error('[ConnectionManager] Failed to send:', err);
        this.remove(event.userId, conn);
      }
    });
  }

  getConnectionCount(): number {
    let count = 0;
    this.connections.forEach((set) => (count += set.size));
    return count;
  }

  getUserConnectionCount(userId: string): number {
    return this.connections.get(userId)?.size ?? 0;
  }

  private startHeartbeat(): void {
    // Ping WebSocket connections every 30s
    this.heartbeatInterval = setInterval(() => {
      this.connections.forEach((userConns, userId) => {
        userConns.forEach((conn) => {
          if (conn.type === 'ws') {
            try {
              if (conn.socket.readyState === 1) {
                conn.socket.ping();
              } else {
                this.remove(userId, conn);
              }
            } catch {
              this.remove(userId, conn);
            }
          }
        });
      });
    }, 30000);
  }

  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.connections.forEach((userConns) => {
      userConns.forEach((conn) => {
        if (conn.type === 'ws') {
          conn.socket.close(1001, 'Server shutting down');
        }
      });
    });
    this.connections.clear();
  }
}

export const connectionManager = new ConnectionManager();
