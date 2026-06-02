import { storage } from './storage';
import { Message, User } from './types';
import { CONFIG } from './config';

const API_URL = CONFIG.API_URL;

// Token refresh state to prevent concurrent refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

export interface DashboardData {
  user: {
    id: string;
    tier: string;
    limits?: {
      inboxes?: number;
    };
  };
  stats: {
    totalInboxes: number;
    totalUnread: number;
    inboxLimit?: number;
  };
  inboxes: Array<{
    id: string;
    address: string;
    localPart: string;
    domain: string;
    unreadCount: number;
    createdAt: string;
    expiresAt: string | null;
  }>;
}

class ApiClient {
  private async getHeaders() {
    const auth = await storage.getAuth();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }

    return headers;
  }

  /**
   * Attempt to refresh the access token using the refresh token.
   * Returns true if refresh was successful, false otherwise.
   */
  private async refreshToken(): Promise<boolean> {
    // Prevent concurrent refresh attempts
    if (isRefreshing && refreshPromise) {
      return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = (async () => {
      try {
        const auth = await storage.getAuth();
        if (!auth.refreshToken) {
          return false;
        }

        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: auth.refreshToken }),
        });

        if (!response.ok) {
          await storage.clearAuth();
          return false;
        }

        const data = await response.json();
        if (data.token) {
          // Update tokens in storage
          await storage.set('auth', {
            ...auth,
            token: data.token,
            refreshToken: data.refreshToken || auth.refreshToken,
          });
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, retryOnUnauth = true): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (response.status === 401 && retryOnUnauth) {
      // Attempt token refresh
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry the request with new token
        return this.request<T>(endpoint, options, false);
      }
      // Refresh failed, clear auth
      await storage.clearAuth();
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'API Request Failed');
    }

    return response.json();
  }

  async login(email: string, password: string) {
    const data = await this.request<{
      token?: string;
      user?: User;
      requires2FA?: boolean;
      tempToken?: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.token && data.user) {
      await storage.setAuth(data.token, data.user);
    }
    return data;
  }

  async verify2FA(tempToken: string, code: string) {
    const data = await this.request<{ token: string; user: User }>('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code }),
    });
    await storage.setAuth(data.token, data.user);
    return data;
  }

  async getMe() {
    return this.request<{ user: User }>('/auth/me');
  }

  // Extension specific endpoints
  async checkAuth() {
    return this.request<{ ok: boolean; user: any }>('/extension/check-auth');
  }

  async getDashboard() {
    return this.request<DashboardData>('/extension/dashboard');
  }

  async createQuickInbox(payload?: { localPart?: string; domainId?: string }) {
    return this.request<{ success: boolean; inbox: any }>('/extension/quick-inbox', {
      method: 'POST',
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
  }

  async createAnonymousInbox() {
    const deviceId = await storage.getDeviceId();
    const data = await this.request<{ success: boolean; token: string; inbox: any }>('/extension/anonymous-inbox', {
      method: 'POST',
      body: JSON.stringify({ deviceId })
    });

    if (data.token) {
      // For anonymous, we don't have a full user object, but we set isAuthenticated=true
      await storage.setAuth(data.token, { id: 'anonymous', email: 'anonymous@ephemera', role: 'USER' } as any, true);
    }
    return data;
  }

  async updateInbox(inboxId: string, data: { expiresAt?: string | null }) {
    return this.request(`/inboxes/${inboxId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteInbox(inboxId: string) {
    return this.request(`/inboxes/${inboxId}`, {
      method: 'DELETE',
    });
  }

  // Domain listing for inbox creation
  async getDomains() {
    return this.request<{ domains: Array<{ id: string; name: string; isPublic: boolean }> }>('/extension/domains');
  }

  // Custom inbox creation with prefix and domain
  async createCustomInbox(localPart: string, domainId?: string) {
    return this.createQuickInbox({ localPart, domainId });
  }

  private normalizeMessage(raw: any, fallbackInboxId = ''): Message {
    const fromCandidate = typeof raw?.from === 'string'
      ? raw.from
      : (typeof raw?.fromAddress === 'string' ? raw.fromAddress : '');
    const to = typeof raw?.to === 'string'
      ? raw.to
      : (typeof raw?.toAddress === 'string' ? raw.toAddress : '');
    const createdAt = raw?.createdAt || raw?.receivedAt || new Date().toISOString();
    const receivedAt = raw?.receivedAt || raw?.createdAt || createdAt;

    return {
      id: raw?.id || '',
      inboxId: raw?.inboxId || raw?.inbox?.id || fallbackInboxId,
      from: fromCandidate.trim() || 'Unknown sender',
      to,
      subject: raw?.subject || '',
      htmlBody: raw?.htmlBody || undefined,
      textBody: raw?.textBody || undefined,
      isRead: Boolean(raw?.isRead),
      createdAt,
      receivedAt,
    };
  }

  // Legacy/Full API support
  async getMessages(inboxId: string, limit = 10) {
    const response = await this.request<{ data: any[] }>(`/inboxes/${inboxId}/messages?limit=${limit}`);
    return {
      ...response,
      data: Array.isArray(response.data) ? response.data.map((message) => this.normalizeMessage(message, inboxId)) : [],
    };
  }

  // Cache-first message fetching for offline support
  async getMessagesWithCache(inboxId: string, limit = 10) {
    const cached = await storage.getMessageCache(inboxId);

    // If offline and have cache, return cached data
    if (!navigator.onLine && cached) {
      return {
        data: Array.isArray(cached.messages)
          ? cached.messages.map((message: any) => this.normalizeMessage(message, inboxId))
          : [],
        fromCache: true
      };
    }

    try {
      const response = await this.getMessages(inboxId, limit);
      // Update cache async (don't block)
      storage.setMessageCache(inboxId, response.data);
      return { data: response.data, fromCache: false };
    } catch (err) {
      // On network error, fallback to cache
      if (cached) {
        return {
          data: Array.isArray(cached.messages)
            ? cached.messages.map((message: any) => this.normalizeMessage(message, inboxId))
            : [],
          fromCache: true
        };
      }
      throw err;
    }
  }

  // Push Notifications
  async getVapidKey() {
    return this.request<{ vapidPublicKey: string }>('/push/vapid-key');
  }

  async subscribePush(subscription: PushSubscription) {
    // Serialize subscription
    const json = subscription.toJSON();
    return this.request('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys
      })
    });
  }

  // Feature: Global Search
  async searchMessages(query: string, limit = 20) {
    const response = await this.request<{ data: any[]; total: number }>(
      `/messages/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return {
      ...response,
      data: Array.isArray(response.data) ? response.data.map((message) => this.normalizeMessage(message)) : [],
    };
  }

  // Feature: Reply/Forward
  async sendReply(messageId: string, body: { content: string }) {
    return this.request('/outbound/reply', {
      method: 'POST',
      body: JSON.stringify({ originalMessageId: messageId, ...body })
    });
  }

  async forwardMessage(messageId: string, body: { to: string; content?: string }) {
    return this.request('/outbound/forward', {
      method: 'POST',
      body: JSON.stringify({ originalMessageId: messageId, ...body })
    });
  }

  // Feature: Compose new message
  async sendNewMessage(body: { to: string; subject: string; content: string; fromInboxId?: string }) {
    return this.request('/outbound/send', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }
}

export const api = new ApiClient();
