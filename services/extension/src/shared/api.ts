import { storage } from './storage';
import { Message, User } from './types';

const API_URL = 'https://api.manhquy.click';

export interface DashboardData {
  user: {
    id: string;
    tier: string;
  };
  stats: {
    totalInboxes: number;
    totalUnread: number;
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

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token expired or invalid
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
    const data = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
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

  async createQuickInbox() {
    return this.request<{ success: boolean; inbox: any }>('/extension/quick-inbox', {
      method: 'POST'
    });
  }

  // Legacy/Full API support
  async getMessages(inboxId: string, limit = 10) {
    return this.request<{ data: Message[] }>(`/inboxes/${inboxId}/messages?limit=${limit}`);
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
}

export const api = new ApiClient();
