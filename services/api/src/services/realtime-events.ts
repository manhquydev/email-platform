import { realtimePubSub } from './realtime-pubsub';
import { connectionManager } from './connection-manager';
import type {
  RealtimeEvent,
  EmailNewEvent,
  EmailReadEvent,
  EmailDeletedEvent,
  InboxCreatedEvent,
  NotificationNewEvent,
} from '../types/realtime';

class RealtimeEventsService {
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    await realtimePubSub.connect();

    // Subscribe to events and broadcast to connected clients
    realtimePubSub.onMessage('broadcast', (event: RealtimeEvent) => {
      connectionManager.broadcast(event);
    });

    this.initialized = true;
    console.log('[RealtimeEvents] Service initialized');
  }

  async publishEmailNew(
    userId: string,
    payload: EmailNewEvent['payload']
  ): Promise<void> {
    const event: EmailNewEvent = {
      type: 'email.new',
      timestamp: Date.now(),
      userId,
      payload,
    };
    await realtimePubSub.publish(event);
  }

  async publishEmailRead(
    userId: string,
    payload: EmailReadEvent['payload']
  ): Promise<void> {
    const event: EmailReadEvent = {
      type: 'email.read',
      timestamp: Date.now(),
      userId,
      payload,
    };
    await realtimePubSub.publish(event);
  }

  async publishEmailDeleted(
    userId: string,
    payload: EmailDeletedEvent['payload']
  ): Promise<void> {
    const event: EmailDeletedEvent = {
      type: 'email.deleted',
      timestamp: Date.now(),
      userId,
      payload,
    };
    await realtimePubSub.publish(event);
  }

  async publishInboxCreated(
    userId: string,
    payload: InboxCreatedEvent['payload']
  ): Promise<void> {
    const event: InboxCreatedEvent = {
      type: 'inbox.created',
      timestamp: Date.now(),
      userId,
      payload,
    };
    await realtimePubSub.publish(event);
  }

  async publishNotification(
    userId: string,
    payload: NotificationNewEvent['payload']
  ): Promise<void> {
    const event: NotificationNewEvent = {
      type: 'notification.new',
      timestamp: Date.now(),
      userId,
      payload,
    };
    await realtimePubSub.publish(event);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  shutdown(): void {
    connectionManager.shutdown();
    realtimePubSub.disconnect();
    this.initialized = false;
  }
}

export const realtimeEvents = new RealtimeEventsService();
