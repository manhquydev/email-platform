/**
 * Realtime client for Ephemera SDK
 * Server-Sent Events (SSE) client for real-time message notifications
 */

import type { Message } from './types';
import { EphemeraError } from './errors';

/** Realtime event types */
export type RealtimeEventType = 'message' | 'connected' | 'error' | 'reconnecting';

/** Realtime event data */
export interface RealtimeEvent {
  type: RealtimeEventType;
  data?: Message | Error | { attempt: number };
}

/** Realtime connection options */
export interface RealtimeOptions {
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Max reconnect attempts (default: 5) */
  maxReconnectAttempts?: number;
  /** Base reconnect delay in ms (default: 1000) */
  reconnectDelay?: number;
  /** Max reconnect delay in ms (default: 30000) */
  maxReconnectDelay?: number;
}

/** Event handler type */
export type RealtimeHandler = (event: RealtimeEvent) => void;

/**
 * Realtime client for receiving live message updates
 *
 * @example
 * ```typescript
 * const realtime = new RealtimeClient(apiKey, baseUrl);
 *
 * realtime.subscribe(inboxId, (event) => {
 *   if (event.type === 'message') {
 *     console.log('New message:', event.data);
 *   }
 * });
 *
 * // Later...
 * realtime.unsubscribe(inboxId);
 * realtime.close();
 * ```
 */
export class RealtimeClient {
  private apiKey: string;
  private baseUrl: string;
  private options: Required<RealtimeOptions>;
  private connections: Map<string, EventSource> = new Map();
  private handlers: Map<string, Set<RealtimeHandler>> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();

  constructor(
    apiKey: string,
    baseUrl = 'https://api.manhquy.id.vn',
    options: RealtimeOptions = {}
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.options = {
      autoReconnect: options.autoReconnect ?? true,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      reconnectDelay: options.reconnectDelay ?? 1000,
      maxReconnectDelay: options.maxReconnectDelay ?? 30000,
    };
  }

  /**
   * Subscribe to real-time updates for an inbox
   */
  subscribe(inboxId: string, handler: RealtimeHandler): () => void {
    // Add handler
    if (!this.handlers.has(inboxId)) {
      this.handlers.set(inboxId, new Set());
    }
    this.handlers.get(inboxId)!.add(handler);

    // Connect if not already connected
    if (!this.connections.has(inboxId)) {
      this.connect(inboxId);
    }

    // Return unsubscribe function
    return () => this.removeHandler(inboxId, handler);
  }

  /**
   * Unsubscribe from an inbox's updates
   */
  unsubscribe(inboxId: string): void {
    this.disconnect(inboxId);
    this.handlers.delete(inboxId);
    this.reconnectAttempts.delete(inboxId);
  }

  /**
   * Close all connections
   */
  close(): void {
    for (const inboxId of this.connections.keys()) {
      this.disconnect(inboxId);
    }
    this.handlers.clear();
    this.reconnectAttempts.clear();
  }

  /**
   * Check if connected to an inbox
   */
  isConnected(inboxId: string): boolean {
    const connection = this.connections.get(inboxId);
    return connection?.readyState === EventSource.OPEN;
  }

  private connect(inboxId: string): void {
    // Check if EventSource is available (browser/Node 18+)
    if (typeof EventSource === 'undefined') {
      this.emit(inboxId, {
        type: 'error',
        data: new EphemeraError(
          'EventSource not available. Use Node 18+ or a polyfill.',
          'UNSUPPORTED',
          500
        ),
      });
      return;
    }

    const url = `${this.baseUrl}/realtime/inboxes/${inboxId}/messages`;

    // Note: EventSource doesn't support custom headers in browsers
    // For authenticated SSE, the API should support token in query params
    const eventSource = new EventSource(`${url}?token=${this.apiKey}`);

    eventSource.onopen = () => {
      this.reconnectAttempts.set(inboxId, 0);
      this.emit(inboxId, { type: 'connected' });
    };

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as Message;
        this.emit(inboxId, { type: 'message', data: message });
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      this.disconnect(inboxId);

      if (this.options.autoReconnect) {
        this.scheduleReconnect(inboxId);
      } else {
        this.emit(inboxId, {
          type: 'error',
          data: new EphemeraError('Connection lost', 'CONNECTION_ERROR', 500),
        });
      }
    };

    this.connections.set(inboxId, eventSource);
  }

  private disconnect(inboxId: string): void {
    const connection = this.connections.get(inboxId);
    if (connection) {
      connection.close();
      this.connections.delete(inboxId);
    }
  }

  private scheduleReconnect(inboxId: string): void {
    const attempts = this.reconnectAttempts.get(inboxId) || 0;

    if (attempts >= this.options.maxReconnectAttempts) {
      this.emit(inboxId, {
        type: 'error',
        data: new EphemeraError(
          'Max reconnect attempts reached',
          'CONNECTION_ERROR',
          500
        ),
      });
      return;
    }

    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(2, attempts),
      this.options.maxReconnectDelay
    );

    this.reconnectAttempts.set(inboxId, attempts + 1);
    this.emit(inboxId, { type: 'reconnecting', data: { attempt: attempts + 1 } });

    setTimeout(() => {
      if (this.handlers.has(inboxId)) {
        this.connect(inboxId);
      }
    }, delay);
  }

  private emit(inboxId: string, event: RealtimeEvent): void {
    const handlers = this.handlers.get(inboxId);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }
  }

  private removeHandler(inboxId: string, handler: RealtimeHandler): void {
    const handlers = this.handlers.get(inboxId);
    if (!handlers) return;

    handlers.delete(handler);

    // Disconnect if no more handlers
    if (handlers.size === 0) {
      this.unsubscribe(inboxId);
    }
  }
}
