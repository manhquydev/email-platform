export interface User {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  tier?: string;
}

export interface Domain {
  id?: string;
  name: string;
  isPublic?: boolean;
}

export interface Inbox {
  id: string;
  localPart: string;
  domainId?: string;
  domain: string | Domain;
  address?: string;
  ownerId?: string;
  createdAt: string;
  expiresAt: string | null;
  unreadCount?: number;
  _count?: {
    messages: number;
  };
}

export interface Message {
  id: string;
  inboxId: string;
  from: string;
  to: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  isRead: boolean;
  createdAt: string;
  receivedAt: string;
}

export interface AuthState {
  token: string | null;
  refreshToken?: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isAnonymous?: boolean;
}

export interface StorageData {
  auth: AuthState;
  deviceId: string;
  inboxes: Inbox[];
  last_message_id?: string;
  settings: {
    theme: 'light' | 'dark' | 'system';
    autoCopy: boolean;
    notificationsEnabled?: boolean;
  };
}
