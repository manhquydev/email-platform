/**
 * Identity Service - API layer for Identity Suite features
 * Handles Aliases, Breach Monitoring, and Privacy Score
 */

import { api } from '../utils/api';
import { logger } from '../utils/logger';

const log = logger.scope('IdentityService');

// ============ TYPES ============

export interface Alias {
    id: string;
    address: string;
    localPart: string;
    domain: string;
    forwardTo: string | null;
    isActive: boolean;
    createdAt: string;
    stats: {
        received: number;
        forwarded: number;
        blocked: number;
    };
}

export interface BreachStatus {
    email: string;
    isMonitored: boolean;
    lastChecked: string | null;
    breachCount: number;
    severity: 'safe' | 'low' | 'medium' | 'high';
}

export interface Breach {
    id: string;
    name: string;
    domain: string;
    breachDate: string;
    addedDate: string;
    dataClasses: string[];
    description: string;
    severity: 'low' | 'medium' | 'high';
}

export interface PrivacyScore {
    overall: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    factors: PrivacyFactor[];
    recommendations: string[];
    lastUpdated: string;
}

export interface PrivacyFactor {
    name: string;
    score: number;
    maxScore: number;
    status: 'good' | 'warning' | 'critical';
    description: string;
    locked?: boolean;
}

export interface CreateAliasRequest {
    localPart?: string;
    domainId: string;
    forwardTo?: string;
    random?: boolean;
}

// ============ SERVICE ============

export const identityService = {
    // ---- Aliases ----

    listAliases: async (): Promise<{ data: Alias[]; total: number }> => {
        log.debug('Fetching aliases');
        try {
            return await api('/api/aliases');
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to fetch aliases'));
            throw error;
        }
    },

    createAlias: async (data: CreateAliasRequest): Promise<Alias> => {
        log.debug('Creating alias', { domain: data.domainId });
        try {
            return await api('/api/aliases', {
                method: 'POST',
                body: data,
            });
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to create alias'));
            throw error;
        }
    },

    toggleAlias: async (id: string): Promise<Alias> => {
        log.debug('Toggling alias', { id });
        try {
            return await api(`/api/aliases/${id}/toggle`, {
                method: 'POST',
            });
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to toggle alias'));
            throw error;
        }
    },

    updateAlias: async (id: string, data: Partial<Pick<Alias, 'forwardTo'>>): Promise<Alias> => {
        log.debug('Updating alias', { id });
        try {
            return await api(`/api/aliases/${id}`, {
                method: 'PATCH',
                body: data,
            });
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to update alias'));
            throw error;
        }
    },

    deleteAlias: async (id: string): Promise<void> => {
        log.debug('Deleting alias', { id });
        try {
            await api(`/api/aliases/${id}`, {
                method: 'DELETE',
            });
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to delete alias'));
            throw error;
        }
    },

    // ---- Breach Monitor ----

    getBreachStatus: async (): Promise<{ data: BreachStatus[]; tier: string }> => {
        log.debug('Fetching breach status');
        try {
            return await api('/api/breach-monitor/status');
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to fetch breach status'));
            throw error;
        }
    },

    enableMonitoring: async (email: string): Promise<BreachStatus> => {
        log.debug('Enabling monitoring', { email });
        try {
            return await api('/api/breach-monitor', {
                method: 'POST',
                body: { email },
            });
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to enable monitoring'));
            throw error;
        }
    },

    disableMonitoring: async (email: string): Promise<void> => {
        log.debug('Disabling monitoring', { email });
        try {
            await api(`/api/breach-monitor/${encodeURIComponent(email)}`, {
                method: 'DELETE',
            });
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to disable monitoring'));
            throw error;
        }
    },

    checkBreaches: async (email: string): Promise<{ breaches: Breach[]; severity: string }> => {
        log.debug('Checking breaches', { email });
        try {
            return await api('/api/breach-monitor/check', {
                method: 'POST',
                body: { email },
            });
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to check breaches'));
            throw error;
        }
    },

    getBreachHistory: async (): Promise<{ data: Breach[] }> => {
        log.debug('Fetching breach history');
        try {
            return await api('/api/breach-monitor/history');
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to fetch breach history'));
            throw error;
        }
    },

    // ---- Privacy Score ----

    getPrivacyScore: async (): Promise<PrivacyScore> => {
        log.debug('Fetching privacy score');
        try {
            return await api('/api/privacy-score');
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to fetch privacy score'));
            throw error;
        }
    },

    getPrivacyDashboard: async (): Promise<{
        score: PrivacyScore;
        history: Array<{ date: string; score: number }>;
    }> => {
        log.debug('Fetching privacy dashboard');
        try {
            return await api('/api/privacy-score/dashboard');
        } catch (error) {
            log.error(error instanceof Error ? error : new Error('Failed to fetch privacy dashboard'));
            throw error;
        }
    },
};

export default identityService;
