/**
 * Message Service - Phase 4 Code Quality
 * Centralized API layer for message-related operations
 */

import { api } from '../utils/api';
import { PAGINATION, API_PATHS } from '../constants/app';
import { logger } from '../utils/logger';
import type { PaginatedResponse } from '../types/api';

const log = logger.scope('MessageService');

/** Get token from localStorage (fallback for service layer) */
function getStoredToken(): string | undefined {
    try {
        // Token is stored directly under 'token' key (see login-hooks.ts, MagicLinkVerify.tsx)
        return localStorage.getItem('token') ?? undefined;
    } catch { /* ignore */ }
    return undefined;
}

/**
 * Query parameters for fetching messages
 */
export interface MessageQueryParams {
    inboxId?: string;
    page?: number;
    limit?: number;
    search?: string;
    isRead?: boolean;
    hasAttachments?: boolean;
    startDate?: string;
    endDate?: string;
}

/**
 * Message entity
 */
export interface Message {
    id: string;
    inboxId: string;
    from: string;
    to: string;
    subject: string;
    textBody?: string;
    htmlBody?: string;
    isRead: boolean;
    receivedAt: string;
    attachments?: Attachment[];
}

/**
 * Attachment entity
 */
export interface Attachment {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    url: string;
}

/**
 * Build query string from params object
 */
function buildQuery(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            searchParams.append(key, String(value));
        }
    });

    return searchParams.toString();
}

/**
 * Message API service
 */
export const messageService = {
    /**
     * Fetch paginated messages for an inbox
     */
    getMessages: async (params: MessageQueryParams = {}): Promise<PaginatedResponse<Message>> => {
        const queryParams = {
            page: params.page ?? 1,
            limit: params.limit ?? PAGINATION.MESSAGES_PER_PAGE,
            ...params,
        };

        const query = buildQuery(queryParams);
        log.debug('Fetching messages', { params: queryParams });

        try {
            const response = await api<PaginatedResponse<Message>>(
                `${API_PATHS.MESSAGES}?${query}`
            );
            log.info('Messages fetched', { count: response.data.length, total: response.total });
            return response;
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to fetch messages'));
            throw error;
        }
    },

    /**
     * Fetch a single message by ID
     */
    getMessage: async (messageId: string): Promise<Message> => {
        log.debug('Fetching message', { messageId });

        try {
            const response = await api<Message>(`${API_PATHS.MESSAGES}/${messageId}`);
            return response;
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to fetch message'), { messageId });
            throw error;
        }
    },

    /**
     * Mark message as read or unread
     */
    markAsRead: async (messageId: string, isRead: boolean): Promise<Message> => {
        log.debug('Marking message', { messageId, isRead });

        try {
            const response = await api<Message>(`${API_PATHS.MESSAGES}/${messageId}/read`, {
                method: 'PATCH',
                token: getStoredToken(),
                body: { isRead },
            });
            log.info('Message marked', { messageId, isRead });
            return response;
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to mark message'), { messageId, isRead });
            throw error;
        }
    },

    /**
     * Delete a message
     */
    delete: async (messageId: string): Promise<void> => {
        log.debug('Deleting message', { messageId });

        try {
            await api(`${API_PATHS.MESSAGES}/${messageId}`, {
                method: 'DELETE',
                token: getStoredToken(),
            });
            log.info('Message deleted', { messageId });
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to delete message'), { messageId });
            throw error;
        }
    },

    /**
     * Delete multiple messages
     */
    deleteMany: async (messageIds: string[]): Promise<void> => {
        log.debug('Deleting messages', { count: messageIds.length });

        try {
            await api(`${API_PATHS.MESSAGES}/bulk-delete`, {
                method: 'POST',
                token: getStoredToken(),
                body: { messageIds },
            });
            log.info('Messages deleted', { count: messageIds.length });
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to delete messages'), { count: messageIds.length });
            throw error;
        }
    },

    /**
     * Mark multiple messages as read
     */
    markManyAsRead: async (messageIds: string[], isRead: boolean): Promise<void> => {
        log.debug('Marking messages', { count: messageIds.length, isRead });

        try {
            await api(`${API_PATHS.MESSAGES}/bulk-read`, {
                method: 'POST',
                token: getStoredToken(),
                body: { messageIds, isRead },
            });
            log.info('Messages marked', { count: messageIds.length, isRead });
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to mark messages'), { count: messageIds.length });
            throw error;
        }
    },

    /**
     * Download attachment
     */
    downloadAttachment: async (messageId: string, attachmentId: string): Promise<Blob> => {
        log.debug('Downloading attachment', { messageId, attachmentId });

        try {
            const response = await fetch(
                `${API_PATHS.MESSAGES}/${messageId}/attachments/${attachmentId}`,
                { credentials: 'include' }
            );

            if (!response.ok) {
                throw new Error(`Failed to download: ${response.status}`);
            }

            return await response.blob();
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to download attachment'), { messageId, attachmentId });
            throw error;
        }
    },
};

export default messageService;
