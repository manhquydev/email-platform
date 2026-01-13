// Event types for realtime system
export type RealtimeEventType =
  | 'email.new'
  | 'email.read'
  | 'email.deleted'
  | 'inbox.created'
  | 'notification.new';

export interface BaseEvent {
  type: RealtimeEventType;
  timestamp: number;
  userId: string;
}

export interface EmailNewEvent extends BaseEvent {
  type: 'email.new';
  payload: {
    inboxId: string;
    messageId: string;
    from: string | null;
    subject: string | null;
    receivedAt: string;
  };
}

export interface EmailReadEvent extends BaseEvent {
  type: 'email.read';
  payload: {
    messageId: string;
    isRead: boolean;
  };
}

export interface EmailDeletedEvent extends BaseEvent {
  type: 'email.deleted';
  payload: {
    messageId: string;
    inboxId: string;
  };
}

export interface InboxCreatedEvent extends BaseEvent {
  type: 'inbox.created';
  payload: {
    inboxId: string;
    email: string;
    domainId: string;
  };
}

export interface NotificationNewEvent extends BaseEvent {
  type: 'notification.new';
  payload: {
    id: string;
    title: string;
    message: string;
    type: string;
  };
}

export type RealtimeEvent =
  | EmailNewEvent
  | EmailReadEvent
  | EmailDeletedEvent
  | InboxCreatedEvent
  | NotificationNewEvent;
