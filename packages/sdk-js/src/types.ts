/**
 * Ephemera SDK Types
 * TypeScript definitions for API responses and SDK configuration
 */

export interface EphemeraConfig {
    /** API key for authentication */
    apiKey: string;
    /** Base URL for API (default: https://api.manhquy.click) */
    baseUrl?: string;
    /** Request timeout in milliseconds (default: 30000) */
    timeout?: number;
}

export interface Domain {
    id: string;
    name: string;
    verified: boolean;
    isPublic: boolean;
    ownerId: string | null;
    createdAt: string;
}

export interface Inbox {
    id: string;
    localPart: string;
    domainId: string;
    domain?: Domain;
    address: string;
    ownerId: string | null;
    expiresAt: string | null;
    createdAt: string;
}

export interface Attachment {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    storageKey: string;
}

export interface Message {
    id: string;
    inboxId: string;
    messageId: string;
    fromAddress: string | null;
    toAddress: string;
    subject: string;
    textBody: string | null;
    htmlBody: string | null;
    receivedAt: string;
    isRead: boolean;
    isPinned: boolean;
    spamScore: number | null;
    size: number;
    attachments: Attachment[];
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        offset: number;
        limit: number;
    };
}

export interface CreateInboxOptions {
    /** Local part of email (before @) */
    localPart?: string;
    /** Domain ID to use (uses default public domain if not specified) */
    domainId?: string;
    /** Expiration time in milliseconds from now */
    expiresIn?: number;
}

export interface ListMessagesOptions {
    /** Search query */
    q?: string;
    /** Filter by sender */
    from?: string;
    /** Only show unread */
    unreadOnly?: boolean;
    /** Maximum messages to return (default: 50) */
    limit?: number;
    /** Offset for pagination */
    offset?: number;
}

export interface WaitForEmailOptions {
    /** Subject to match (partial match) */
    subject?: string;
    /** Sender to match */
    from?: string;
    /** Timeout in milliseconds (default: 60000) */
    timeout?: number;
    /** Poll interval in milliseconds (default: 2000) */
    interval?: number;
}

export interface BulkCreateInboxesOptions {
    /** Array of inbox configurations */
    inboxes: Array<{
        localPart?: string;
        domainId?: string;
    }>;
}

export interface BulkDeleteInboxesOptions {
    /** Array of inbox IDs to delete */
    ids: string[];
}

export interface BulkResult<T> {
    success: T[];
    failed: Array<{ index: number; error: string }>;
}
