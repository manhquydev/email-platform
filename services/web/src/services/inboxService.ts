/**
 * Inbox Service - Phase 4 Code Quality
 * Centralized API layer for inbox-related operations
 */

import { api } from '../utils/api';
import { PAGINATION, API_PATHS } from '../constants/app';
import { logger } from '../utils/logger';
import type { PaginatedResponse } from '../types/api';

const log = logger.scope('InboxService');

/**
 * Inbox entity
 */
export interface Inbox {
    id: string;
    email: string;
    domainId: string;
    domain: string;
    localPart: string;
    description?: string;
    isActive: boolean;
    unreadCount: number;
    totalCount: number;
    createdAt: string;
    expiresAt?: string;
}

/**
 * Create inbox request
 */
export interface CreateInboxRequest {
    domainId: string;
    localPart?: string;
    description?: string;
    expiresIn?: number; // minutes
}

/**
 * Inbox API service
 */
export const inboxService = {
    /**
     * Fetch user's inboxes
     */
    getInboxes: async (page = 1, limit = PAGINATION.INBOXES_PER_PAGE): Promise<PaginatedResponse<Inbox>> => {
        log.debug('Fetching inboxes', { page, limit });

        try {
            const response = await api<PaginatedResponse<Inbox>>(
                `${API_PATHS.INBOXES}?page=${page}&limit=${limit}`
            );
            log.info('Inboxes fetched', { count: response.data.length });
            return response;
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to fetch inboxes'));
            throw error;
        }
    },

    /**
     * Get single inbox by ID
     */
    getInbox: async (inboxId: string): Promise<Inbox> => {
        log.debug('Fetching inbox', { inboxId });

        try {
            return await api<Inbox>(`${API_PATHS.INBOXES}/${inboxId}`);
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to fetch inbox'), { inboxId });
            throw error;
        }
    },

    /**
     * Create a new inbox
     */
    create: async (request: CreateInboxRequest): Promise<Inbox> => {
        log.debug('Creating inbox', { domainId: request.domainId });

        try {
            const response = await api<Inbox>(API_PATHS.INBOXES, {
                method: 'POST',
                body: JSON.stringify(request),
            });
            log.info('Inbox created', { email: response.email });
            return response;
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to create inbox'));
            throw error;
        }
    },

    /**
     * Generate a random inbox
     */
    generateRandom: async (domainId: string): Promise<Inbox> => {
        log.debug('Generating random inbox', { domainId });

        try {
            const response = await api<Inbox>(`${API_PATHS.INBOXES}/generate`, {
                method: 'POST',
                body: JSON.stringify({ domainId }),
            });
            log.info('Random inbox generated', { email: response.email });
            return response;
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to generate inbox'));
            throw error;
        }
    },

    /**
     * Delete an inbox
     */
    delete: async (inboxId: string): Promise<void> => {
        log.debug('Deleting inbox', { inboxId });

        try {
            await api(`${API_PATHS.INBOXES}/${inboxId}`, {
                method: 'DELETE',
            });
            log.info('Inbox deleted', { inboxId });
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to delete inbox'), { inboxId });
            throw error;
        }
    },

    /**
     * Update inbox settings
     */
    update: async (inboxId: string, updates: Partial<Pick<Inbox, 'description' | 'isActive'>>): Promise<Inbox> => {
        log.debug('Updating inbox', { inboxId, updates });

        try {
            const response = await api<Inbox>(`${API_PATHS.INBOXES}/${inboxId}`, {
                method: 'PATCH',
                body: JSON.stringify(updates),
            });
            log.info('Inbox updated', { inboxId });
            return response;
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to update inbox'), { inboxId });
            throw error;
        }
    },

    /**
     * Extend inbox expiration
     */
    extend: async (inboxId: string, minutes: number): Promise<Inbox> => {
        log.debug('Extending inbox', { inboxId, minutes });

        try {
            const response = await api<Inbox>(`${API_PATHS.INBOXES}/${inboxId}/extend`, {
                method: 'POST',
                body: JSON.stringify({ minutes }),
            });
            log.info('Inbox extended', { inboxId, newExpiry: response.expiresAt });
            return response;
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to extend inbox'), { inboxId });
            throw error;
        }
    },
};

export default inboxService;
