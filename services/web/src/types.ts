export type User = {
    id: string;
    email: string;
    role: string;
};

export type Domain = {
    id: string;
    name: string;
    status: "PENDING" | "VERIFIED";
    verificationToken: string;
    createdAt: string;
};

export type Inbox = {
    id: string;
    domainId: string;
    localPart: string;
    createdAt: string;
    expiresAt?: string | null;
    domain?: Domain;
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
    attachments: Attachment[];
};

export type PaginatedResponse<T> = {
    data: T[];
    meta?: { total?: number };
};
