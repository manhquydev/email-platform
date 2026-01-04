export type User = {
    id: string;
    email: string;
    name?: string;
    role: string;
    tier?: string;
    credits?: number;
};

export type Domain = {
    id: string;
    name: string;
    status: "PENDING" | "VERIFIED";
    verificationToken: string;
    createdAt: string;
    ownerId?: string | null;
    isPublic: boolean;
};

export type Inbox = {
    id: string;
    domainId: string;
    localPart: string;
    createdAt: string;
    expiresAt?: string | null;
    domain?: Domain;
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
    id: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
    stripePaymentId?: string;
}
