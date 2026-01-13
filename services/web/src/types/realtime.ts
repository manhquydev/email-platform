export type RealtimeEventType =
  | 'email.new'
  | 'email.read'
  | 'email.deleted'
  | 'inbox.created'
  | 'notification.new';

export interface RealtimeEvent {
  type: RealtimeEventType;
  timestamp: number;
  userId: string;
  payload: Record<string, unknown>;
}

export interface EmailNewPayload {
  inboxId: string;
  messageId: string;
  from: string | null;
  subject: string | null;
  receivedAt: string;
}

export interface EmailReadPayload {
  messageId: string;
  isRead: boolean;
}

export interface EmailDeletedPayload {
  messageId: string;
  inboxId: string;
}

export interface InboxCreatedPayload {
  inboxId: string;
  email: string;
  domainId: string;
}

export interface NotificationNewPayload {
  id: string;
  title: string;
  message: string;
  type: string;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
