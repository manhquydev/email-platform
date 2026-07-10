/**
 * Ephemera SDK Client
 * Main client class for interacting with the Ephemera API
 */

import type {
    EphemeraConfig,
    Inbox,
    Message,
    Domain,
    PaginatedResponse,
    CreateInboxOptions,
    ListMessagesOptions,
    WaitForEmailOptions,
    BulkCreateInboxesOptions,
    BulkDeleteInboxesOptions,
    BulkResult,
} from './types';
import {
    EphemeraError,
    NetworkError,
    TimeoutError,
    createErrorFromResponse,
} from './errors';

const DEFAULT_BASE_URL = 'https://api.manhquy.id.vn';
const DEFAULT_TIMEOUT = 30000;

export class EphemeraClient {
    private readonly apiKey: string;
    private readonly baseUrl: string;
    private readonly timeout: number;

    constructor(config: EphemeraConfig | string) {
        if (typeof config === 'string') {
            this.apiKey = config;
            this.baseUrl = DEFAULT_BASE_URL;
            this.timeout = DEFAULT_TIMEOUT;
        } else {
            this.apiKey = config.apiKey;
            this.baseUrl = config.baseUrl?.replace(/\/$/, '') || DEFAULT_BASE_URL;
            this.timeout = config.timeout || DEFAULT_TIMEOUT;
        }

        if (!this.apiKey) {
            throw new EphemeraError('API key is required', 'UNAUTHORIZED', 401);
        }
    }

    /**
     * Make an authenticated request to the API
     */
    private async request<T>(
        method: string,
        path: string,
        body?: unknown
    ): Promise<T> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                method,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'User-Agent': '@ephemera/sdk/1.0.0',
                },
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw createErrorFromResponse(response.status, data);
            }

            return data as T;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof EphemeraError) {
                throw error;
            }

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new TimeoutError(`Request timed out after ${this.timeout}ms`);
                }
                throw new NetworkError(error.message);
            }

            throw new NetworkError('Unknown network error');
        }
    }

    // ==================== Domain Methods ====================

    /**
     * List available domains
     */
    async listDomains(): Promise<Domain[]> {
        const response = await this.request<PaginatedResponse<Domain>>('GET', '/domains?limit=100');
        return response.data;
    }

    /**
     * Get a specific domain by ID
     */
    async getDomain(id: string): Promise<Domain> {
        return this.request<Domain>('GET', `/domains/${id}`);
    }

    // ==================== Inbox Methods ====================

    /**
     * Create a new inbox
     */
    async createInbox(options: CreateInboxOptions = {}): Promise<Inbox> {
        const body: Record<string, unknown> = {};

        if (options.localPart) body.localPart = options.localPart;
        if (options.domainId) body.domainId = options.domainId;
        if (options.expiresIn) {
            body.expiresAt = new Date(Date.now() + options.expiresIn).toISOString();
        }

        return this.request<Inbox>('POST', '/inboxes', body);
    }

    /**
     * Get an inbox by ID
     */
    async getInbox(id: string): Promise<Inbox> {
        return this.request<Inbox>('GET', `/inboxes/${id}`);
    }

    /**
     * List all inboxes for the authenticated user
     */
    async listInboxes(limit = 100): Promise<Inbox[]> {
        const response = await this.request<PaginatedResponse<Inbox>>(
            'GET',
            `/inboxes?limit=${limit}&personal=true`
        );
        return response.data;
    }

    /**
     * Delete an inbox
     */
    async deleteInbox(id: string): Promise<void> {
        await this.request<void>('DELETE', `/inboxes/${id}`);
    }

    /**
     * Extend inbox expiration
     */
    async extendInbox(id: string, additionalMs: number): Promise<Inbox> {
        const inbox = await this.getInbox(id);
        const currentExpiry = inbox.expiresAt ? new Date(inbox.expiresAt).getTime() : Date.now();
        const newExpiry = new Date(currentExpiry + additionalMs).toISOString();

        return this.request<Inbox>('PATCH', `/inboxes/${id}`, { expiresAt: newExpiry });
    }

    // ==================== Message Methods ====================

    /**
     * List messages in an inbox
     */
    async getMessages(inboxId: string, options: ListMessagesOptions = {}): Promise<Message[]> {
        const params = new URLSearchParams({ inboxId });

        if (options.q) params.append('q', options.q);
        if (options.from) params.append('from', options.from);
        if (options.unreadOnly) params.append('isRead', 'false');
        if (options.limit) params.append('limit', String(options.limit));
        if (options.offset) params.append('offset', String(options.offset));

        const response = await this.request<PaginatedResponse<Message>>(
            'GET',
            `/messages?${params.toString()}`
        );
        return response.data;
    }

    /**
     * Get a specific message by ID
     */
    async getMessage(id: string): Promise<Message> {
        return this.request<Message>('GET', `/messages/${id}`);
    }

    /**
     * Delete a message
     */
    async deleteMessage(id: string): Promise<void> {
        await this.request<void>('DELETE', `/messages/${id}`);
    }

    /**
     * Mark a message as read
     */
    async markAsRead(id: string): Promise<void> {
        await this.request<void>('PATCH', `/messages/${id}/read`, { isRead: true });
    }

    /**
     * Mark a message as unread
     */
    async markAsUnread(id: string): Promise<void> {
        await this.request<void>('PATCH', `/messages/${id}/read`, { isRead: false });
    }

    // ==================== Convenience Methods ====================

    /**
     * Wait for an email to arrive in an inbox
     * Polls until a matching email is found or timeout is reached
     */
    async waitForEmail(inboxId: string, options: WaitForEmailOptions = {}): Promise<Message> {
        const timeout = options.timeout || 60000;
        const interval = options.interval || 2000;
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const messages = await this.getMessages(inboxId, { limit: 20 });

            for (const msg of messages) {
                const matchesSubject = !options.subject ||
                    msg.subject.toLowerCase().includes(options.subject.toLowerCase());
                const matchesFrom = !options.from ||
                    (msg.fromAddress?.toLowerCase().includes(options.from.toLowerCase()) ?? false);

                if (matchesSubject && matchesFrom) {
                    return msg;
                }
            }

            await this.sleep(interval);
        }

        throw new TimeoutError(`No matching email found within ${timeout}ms`);
    }

    /**
     * Extract OTP/verification code from email body
     */
    extractCode(message: Message): string | null {
        const text = message.textBody || message.htmlBody || '';

        // Common OTP patterns (4-8 digits)
        const patterns = [
            /\b(\d{6})\b/,           // 6 digits (most common)
            /\b(\d{4})\b/,           // 4 digits
            /\b(\d{8})\b/,           // 8 digits
            /code[:\s]+(\d{4,8})/i,  // "code: 123456"
            /otp[:\s]+(\d{4,8})/i,   // "otp: 123456"
            /verification[:\s]+(\d{4,8})/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return match[1];
        }

        return null;
    }

    /**
     * Create an inbox and wait for an email (common testing pattern)
     */
    async createInboxAndWait(
        inboxOptions: CreateInboxOptions = {},
        waitOptions: WaitForEmailOptions = {}
    ): Promise<{ inbox: Inbox; message: Message }> {
        const inbox = await this.createInbox(inboxOptions);
        const message = await this.waitForEmail(inbox.id, waitOptions);
        return { inbox, message };
    }

    // ==================== Bulk Operations ====================

    /**
     * Create multiple inboxes at once
     */
    async bulkCreateInboxes(options: BulkCreateInboxesOptions): Promise<BulkResult<Inbox>> {
        return this.request<BulkResult<Inbox>>('POST', '/inboxes/bulk', options);
    }

    /**
     * Delete multiple inboxes at once
     */
    async bulkDeleteInboxes(options: BulkDeleteInboxesOptions): Promise<BulkResult<{ id: string }>> {
        return this.request<BulkResult<{ id: string }>>('DELETE', '/inboxes/bulk', options);
    }

    // ==================== Utilities ====================

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
