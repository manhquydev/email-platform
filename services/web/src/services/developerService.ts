/**
 * Developer Service - API client for Developer Portal features
 * Handles API keys, usage stats, webhooks, and rate limits
 */
import { api } from '../utils/api';

// ============ Types ============

export interface APIKey {
    id: string;
    name: string;
    keyPreview: string; // Masked: sk_live_****abcd
    createdAt: string;
    lastUsedAt: string | null;
    expiresAt: string | null;
    permissions: string[];
    isActive: boolean;
}

export interface APIKeyCreateResponse {
    id: string;
    name: string;
    key: string; // Full key shown ONLY on creation
    keyPreview: string;
    createdAt: string;
}

export interface UsageStats {
    period: { start: string; end: string };
    totalCalls: number;
    successCalls: number;
    errorCalls: number;
    bandwidth: { sent: number; received: number };
    byEndpoint: Array<{ endpoint: string; calls: number; avgLatency: number }>;
    dailyData: Array<{ date: string; calls: number; errors: number }>;
}

export interface RateLimitStatus {
    tier: string;
    limits: {
        requestsPerMinute: number;
        requestsPerDay: number;
        bandwidthPerMonth: number; // bytes
    };
    current: {
        requestsThisMinute: number;
        requestsToday: number;
        bandwidthThisMonth: number;
    };
    resetAt: string;
}

export interface Webhook {
    id: string;
    url: string;
    events: string[];
    secret: string; // Masked after creation
    isActive: boolean;
    createdAt: string;
    lastTriggeredAt: string | null;
    lastStatus: 'success' | 'failed' | null;
}

export interface WebhookCreateRequest {
    url: string;
    events: string[];
}

export interface WebhookDelivery {
    id: string;
    webhookId: string;
    event: string;
    status: 'success' | 'failed';
    statusCode: number;
    timestamp: string;
    responseTime: number;
}

// ============ Available Webhook Events ============

export const WEBHOOK_EVENTS = [
    { id: 'email.received', label: 'Email Received', description: 'Khi có email mới' },
    { id: 'email.sent', label: 'Email Sent', description: 'Khi gửi email thành công' },
    { id: 'alias.created', label: 'Alias Created', description: 'Khi tạo bí danh mới' },
    { id: 'alias.deleted', label: 'Alias Deleted', description: 'Khi xóa bí danh' },
    { id: 'breach.detected', label: 'Breach Detected', description: 'Khi phát hiện rò rỉ dữ liệu' },
] as const;

// ============ API Client ============

export const developerService = {
    // ---- API Keys ----
    async listKeys(): Promise<{ data: APIKey[] }> {
        return api('/api/developer/keys');
    },

    async createKey(name: string, permissions: string[] = ['read', 'write']): Promise<APIKeyCreateResponse> {
        return api('/api/developer/keys', {
            method: 'POST',
            body: JSON.stringify({ name, permissions }),
        });
    },

    async revokeKey(keyId: string): Promise<void> {
        return api(`/api/developer/keys/${encodeURIComponent(keyId)}`, {
            method: 'DELETE',
        });
    },

    async rotateKey(keyId: string): Promise<APIKeyCreateResponse> {
        return api(`/api/developer/keys/${encodeURIComponent(keyId)}/rotate`, {
            method: 'POST',
        });
    },

    // ---- Usage Stats ----
    async getUsage(startDate: string, endDate: string): Promise<UsageStats> {
        return api(`/api/developer/usage?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`);
    },

    async getRateLimits(): Promise<RateLimitStatus> {
        return api('/api/developer/rate-limits');
    },

    // ---- Webhooks ----
    async listWebhooks(): Promise<{ data: Webhook[] }> {
        return api('/api/developer/webhooks');
    },

    async createWebhook(data: WebhookCreateRequest): Promise<Webhook> {
        return api('/api/developer/webhooks', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async updateWebhook(webhookId: string, data: Partial<WebhookCreateRequest>): Promise<Webhook> {
        return api(`/api/developer/webhooks/${encodeURIComponent(webhookId)}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    async deleteWebhook(webhookId: string): Promise<void> {
        return api(`/api/developer/webhooks/${encodeURIComponent(webhookId)}`, {
            method: 'DELETE',
        });
    },

    async testWebhook(webhookId: string): Promise<{ success: boolean; statusCode: number; responseTime: number }> {
        return api(`/api/developer/webhooks/${encodeURIComponent(webhookId)}/test`, {
            method: 'POST',
        });
    },

    async getWebhookDeliveries(webhookId: string): Promise<{ data: WebhookDelivery[] }> {
        return api(`/api/developer/webhooks/${encodeURIComponent(webhookId)}/deliveries`);
    },

    // ---- Quick Start ----
    async getQuickStartConfig(): Promise<{ apiKey: string | null; baseUrl: string; sdkVersions: { npm: string; pip: string } }> {
        return api('/api/developer/quickstart');
    },
};

export default developerService;
