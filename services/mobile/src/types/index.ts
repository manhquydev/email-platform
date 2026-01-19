// Types copied from web app - services/web/src/types.ts

export type User = {
  id: string;
  email: string;
  name?: string;
  role: string;
  tier?: string;
  credits?: number;
};

export type ContributionStatus = 'NONE' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export type Domain = {
  id: string;
  name: string;
  status: "PENDING" | "VERIFIED";
  verificationToken: string;
  createdAt: string;
  ownerId?: string | null;
  isPublic: boolean;
  contributionStatus?: ContributionStatus;
  sharedAt?: string | null;
  shareNote?: string | null;
  owner?: { email: string };
};

export type ShareMode = 'PUBLIC' | 'PRIVATE';

export type Inbox = {
  id: string;
  domainId: string;
  localPart: string;
  createdAt: string;
  expiresAt?: string | null;
  claimedAt?: string;
  ownerId?: string | null;
  shareMode?: ShareMode;
  domain?: Domain;
  owner?: { email: string };
  _count?: { messages: number };
};

export type Attachment = {
  id: string;
  filename: string;
  mimeType?: string | null;
  size?: number | null;
  storageKey: string;
  createdAt: string;
};

export type Message = {
  id: string;
  inboxId: string;
  subject?: string | null;
  fromAddress?: string | null;
  toAddress?: string | null;
  receivedAt: string;
  textBody?: string | null;
  htmlBody?: string | null;
  isRead: boolean;
  isPinned: boolean;
  snoozedUntil?: string | null;
  attachments: Attachment[];
  labels?: { label: Label }[];
  aiSummary?: string | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta?: { total?: number };
};

// Labels
export interface Label {
  id: string;
  inboxId: string;
  name: string;
  color?: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
  children?: Label[];
}

// Teams
export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
  email?: string;
  user?: { id: string; email: string };
}

export interface TeamInbox {
  id: string;
  teamId: string;
  inboxId: string;
  addedAt: string;
  addedBy: string;
  email?: string;
  sharedByEmail?: string;
  inbox?: Inbox;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  owner?: { id: string; email: string };
  members?: TeamMember[];
  sharedInboxes?: TeamInbox[];
  _count?: {
    members: number;
    sharedInboxes: number;
  };
}

// Subscription tiers
export type SubscriptionTier = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

// Notifications
export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'PROMOTION';

export interface Notification {
  id: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  imageUrl?: string;
  isRead: boolean;
  createdAt: string;
}
