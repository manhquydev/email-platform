/**
 * Ephemeral Inbox Service - Public zero-friction inbox API
 * No auth required - token-based access
 */

import { api } from '../utils/api';
import { logger } from '../utils/logger';

const log = logger.scope('EphemeralService');

/** Ephemeral inbox entity */
export interface EphemeralInbox {
    id: string;
    token: string;
    address: string;
    expiresAt: string;
    expiresIn: number; // seconds
    messageCount?: number;
    createdAt?: string;
}

/** Ephemeral message entity */
export interface EphemeralMessage {
    id: string;
    fromAddress: string;
    subject: string;
    htmlBody?: string;
    textBody?: string;
    receivedAt: string;
    attachments?: Array<{
        id: string;
        filename: string;
        mimeType: string | null;
        size: number;
    }>;
}

/** Public domain for ephemeral inbox */
export interface EphemeralDomain {
    id: string;
    name: string;
    isPremium: boolean;
}

/** Options for creating ephemeral inbox */
export interface CreateEphemeralOptions {
    expiryHours?: number;
    localPart?: string;   // Custom alias
    domainId?: string;    // Domain selection
}

/** Alias availability check result */
export interface AliasAvailability {
    available: boolean;
    error?: string;
}

/** Messages response with pagination */
export interface EphemeralMessagesResponse {
    data: EphemeralMessage[];
    meta: {
        total: number;
        limit: number;
        offset: number;
    };
    inbox: {
        address: string;
        expiresIn: number;
    };
}

/** Ephemeral inbox API service */
export const ephemeralService = {
    /**
     * Get available public domains for ephemeral inboxes
     */
    getDomains: async (): Promise<EphemeralDomain[]> => {
        log.debug('Fetching public domains');

        try {
            const response = await api<{ domains: EphemeralDomain[] }>('/ephemeral/domains', {
                skipErrorRedirect: true,
            });
            return response.domains;
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to fetch domains'));
            throw error;
        }
    },

    /**
     * Check alias availability for a domain
     */
    checkAliasAvailability: async (localPart: string, domainId: string): Promise<AliasAvailability> => {
        log.debug('Checking alias availability', { localPart, domainId });

        try {
            return await api<AliasAvailability>('/ephemeral/check-alias', {
                method: 'POST',
                body: { localPart, domainId },
                skipErrorRedirect: true,
            });
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to check alias'));
            return { available: false, error: 'Không thể kiểm tra alias' };
        }
    },

    /**
     * Create new ephemeral inbox (no auth)
     */
    create: async (options: CreateEphemeralOptions = {}): Promise<EphemeralInbox> => {
        log.debug('Creating ephemeral inbox', { ...options });

        try {
            const response = await api<EphemeralInbox>('/ephemeral/inbox', {
                method: 'POST',
                body: options,
                skipErrorRedirect: true,
            });
            log.info('Ephemeral inbox created', { address: response.address });
            return response;
        } catch (error: any) {
            log.error(error instanceof Error ? error : new Error('Failed to create ephemeral inbox'));
            throw error;
        }
    },

    /**
     * Get inbox by token
     */
    get: async (token: string): Promise<EphemeralInbox | null> => {
        log.debug('Fetching ephemeral inbox', { token: token.slice(0, 8) + '...' });

        try {
            return await api<EphemeralInbox>(`/ephemeral/inbox/${token}`, {
                skipErrorRedirect: true,
            });
        } catch (error: any) {
            if (error?.status === 404) {
                log.debug('Ephemeral inbox not found or expired');
                return null;
            }
            log.error(error instanceof Error ? error : new Error('Failed to fetch ephemeral inbox'));
            throw error;
        }
    },

    /**
     * Extend inbox expiry
     */
    extend: async (token: string, expiryHours?: number): Promise<EphemeralInbox | null> => {
        log.debug('Extending ephemeral inbox', { token: token.slice(0, 8) + '...' });

        try {
            return await api<EphemeralInbox>(`/ephemeral/inbox/${token}/extend`, {
                method: 'POST',
                body: expiryHours ? { expiryHours } : {},
                skipErrorRedirect: true,
            });
        } catch (error: any) {
            if (error?.status === 404) {
                log.debug('Ephemeral inbox not found or expired');
                return null;
            }
            log.error(error instanceof Error ? error : new Error('Failed to extend ephemeral inbox'));
            throw error;
        }
    },

    /**
     * Get messages for inbox
     */
    getMessages: async (token: string, limit = 50, offset = 0): Promise<EphemeralMessagesResponse> => {
        log.debug('Fetching ephemeral messages', { token: token.slice(0, 8) + '...', limit, offset });

        try {
            return await api<EphemeralMessagesResponse>(
                `/ephemeral/inbox/${token}/messages?limit=${limit}&offset=${offset}`,
                { skipErrorRedirect: true }
            );
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to fetch ephemeral messages'));
            throw error;
        }
    },
};

export default ephemeralService;
