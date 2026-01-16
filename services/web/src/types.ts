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
    labels?: Label[];
};

export type PaginatedResponse<T> = {
    data: T[];
    meta?: { total?: number };
};

// ==================
// FILTERS & LABELS
// ==================

export type FilterField = 'FROM' | 'TO' | 'SUBJECT' | 'BODY' | 'HAS_ATTACHMENT';
export type FilterOperator = 'CONTAINS' | 'NOT_CONTAINS' | 'EQUALS' | 'NOT_EQUALS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX';
export type FilterActionType = 'MOVE_TO_FOLDER' | 'ADD_LABEL' | 'REMOVE_LABEL' | 'MARK_READ' | 'MARK_SPAM' | 'DELETE' | 'FORWARD';
export type FilterMatchType = 'ALL' | 'ANY';

export interface FilterCondition {
    field: FilterField;
    operator: FilterOperator;
    value: string;
}

export interface FilterAction {
    type: FilterActionType;
    value?: string;
}

export interface EmailFilter {
    id: string;
    inboxId: string;
    name: string;
    description?: string;
    matchType: FilterMatchType;
    conditions: FilterCondition[];
    actions: FilterAction[];
    priority: number;
    isEnabled: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Label {
    id: string;
    inboxId: string;
    name: string;
    color?: string;
    parentId?: string;
    createdAt: string;
    updatedAt: string;
    _count?: {
        messages: number;
    };
    children?: Label[];
}

export interface Webhook {
    id: string;
    userId: string;
    name: string;
    url: string;
    events: string[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface WebhookLog {
    id: string;
    webhookId: string;
    eventType: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any;
    statusCode?: number;
    responseBody?: string;
    duration?: number;
    createdAt: string;
}

export interface Payment {
    userId?: string;
    id: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
    stripePaymentId?: string;
    packageId?: string;
}

// ==================
// API KEYS
// ==================

export interface ApiKey {
    id: string;
    userId: string;
    prefix: string;
    name: string;
    lastUsedAt?: string;
    createdAt: string;
}

// ==================
// NOTIFICATIONS
// ==================

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

// ==================
// FORWARDING RULES
// ==================

export type ForwardDestinationType = 'EMAIL' | 'TELEGRAM' | 'DISCORD' | 'WEBHOOK';
export type ForwardConditionField = 'FROM' | 'TO' | 'SUBJECT' | 'BODY' | 'HEADER' | 'HAS_ATTACHMENT';
export type ForwardConditionOperator = 'EQUALS' | 'CONTAINS' | 'NOT_CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX' | 'CONTAINS_OTP' | 'EXISTS';

export interface ForwardCondition {
    id?: string;
    field: ForwardConditionField;
    operator: ForwardConditionOperator;
    value: string | null;
    headerName?: string;
    caseSensitive?: boolean;
}

export interface ForwardingRule {
    id: string;
    userId: string;
    inboxId?: string | null;
    name: string;
    // Destination
    destinationType: ForwardDestinationType;
    forwardTo?: string | null;
    telegramChatId?: string | null;
    discordWebhookUrl?: string | null;
    webhookUrl?: string | null;
    webhookSecret?: string | null;
    // Conditions
    conditions: ForwardCondition[];
    matchType: 'ALL' | 'ANY';
    priority: number;
    // Status
    isActive: boolean;
    forwardCount: number;
    lastForwardAt?: string | null;
    createdAt: string;
    updatedAt: string;
    // Relations
    inbox?: {
        id: string;
        localPart: string;
        domain: { name: string };
    };
    _count?: { logs: number };
}

// ==================
// SUBSCRIPTION & PACKAGES
// ==================

export type PackageType = 'TIME_BASED' | 'USAGE_BASED';
export type SubscriptionTier = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING';

export interface ServicePackage {
    id: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    type: PackageType;
    durationDays?: number;
    targetTier?: SubscriptionTier;
    creditAmount?: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface RedemptionCode {
    id: string;
    code: string;
    packageId: string;
    maxUses: number;
    usedCount: number;
    status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';
    expiresAt?: string;
    createdAt: string;
    package?: ServicePackage;
}

// ==================
// TEAMS
// ==================

export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface TeamMember {
    id: string;
    teamId: string;
    userId: string;
    role: TeamRole;
    joinedAt: string;
    user?: { id: string; email: string };
}

export interface TeamInbox {
    id: string;
    teamId: string;
    inboxId: string;
    addedAt: string;
    addedBy: string;
    inbox?: Inbox;
}

export interface Team {
    id: string;
    name: string;
    description?: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
    owner?: { id: string; email: string };
    members?: TeamMember[];
    sharedInboxes?: TeamInbox[];
    _count?: {
        members: number;
        sharedInboxes: number;
    };
}
