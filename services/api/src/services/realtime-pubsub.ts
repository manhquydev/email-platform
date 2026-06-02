import Redis from 'ioredis';
import type { RealtimeEvent } from '../types/realtime';

const CHANNEL = 'realtime:events';

// Get Redis config directly from env
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_AUTH_OPTS = {
  ...(process.env.REDIS_USERNAME ? { username: process.env.REDIS_USERNAME } : {}),
  ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
  ...(process.env.REDIS_TLS === 'true' ? { tls: {} } : {}),
};

class RealtimePubSub {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private handlers: Map<string, (event: RealtimeEvent) => void> = new Map();
  private isConnected = false;

  async connect(): Promise<void> {
    if (this.isConnected) return;

    // Use env variables directly for Redis connection
    this.publisher = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      ...REDIS_AUTH_OPTS,
    });
    this.subscriber = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      ...REDIS_AUTH_OPTS,
    });

    this.publisher.on('error', (err) => {
      console.error('[RealtimePubSub] Publisher error:', err.message);
    });

    this.subscriber.on('error', (err) => {
      console.error('[RealtimePubSub] Subscriber error:', err.message);
    });

    this.subscriber.on('message', (channel, message) => {
      if (channel !== CHANNEL) return;
      try {
        const event: RealtimeEvent = JSON.parse(message);
        this.handlers.forEach((handler) => handler(event));
      } catch (err) {
        console.error('[RealtimePubSub] Failed to parse message:', err);
      }
    });

    await this.subscriber.subscribe(CHANNEL);
    this.isConnected = true;
    console.log('[RealtimePubSub] Connected to Redis');
  }

  async publish(event: RealtimeEvent): Promise<void> {
    if (!this.publisher) {
      console.warn('[RealtimePubSub] Not connected, skipping publish');
      return;
    }
    await this.publisher.publish(CHANNEL, JSON.stringify(event));
  }

  onMessage(id: string, handler: (event: RealtimeEvent) => void): void {
    this.handlers.set(id, handler);
  }

  removeHandler(id: string): void {
    this.handlers.delete(id);
  }

  async disconnect(): Promise<void> {
    try {
      await this.subscriber?.unsubscribe(CHANNEL);
      await this.subscriber?.quit();
      await this.publisher?.quit();
    } catch (err) {
      console.error('[RealtimePubSub] Disconnect error:', err);
    }
    this.handlers.clear();
    this.isConnected = false;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const realtimePubSub = new RealtimePubSub();
