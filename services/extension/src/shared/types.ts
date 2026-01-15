export interface User {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  tier?: string;
}

export interface Domain {
  id: string;
  name: string;
  isPublic: boolean;
}

export interface Inbox {
  id: string;
  localPart: string;
  domainId: string;
  domain: Domain;
  ownerId: string;
  createdAt: string;
  expiresAt: string | null;
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
  user: User | null;
  isAuthenticated: boolean;
}

export interface StorageData {
  auth: AuthState;
  inboxes: Inbox[];
  settings: {
    theme: 'light' | 'dark';
    autoCopy: boolean;
    notificationsEnabled?: boolean;
  };
}
