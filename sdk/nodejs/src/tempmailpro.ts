import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import {
  Config,
  User,
  Domain,
  Inbox,
  Message,
  Attachment,
  ApiKey,
  Webhook,
  CreateInboxOptions,
  FilterRule,
  CreateFilterRuleOptions,
  ListOptions,
  ApiResponse,
  ErrorResponse,
  UsageStats,
  QuotaLimits,
} from './types';

class TempMailPro {
  private apiKey: string;
  private baseURL: string;
  private timeout: number;
  private retries: number;
  private axios: AxiosInstance;

  constructor(config: Config = {}) {
    this.apiKey = config.apiKey || process.env.TEMPMAILPRO_API_KEY || '';
    this.baseURL = config.baseURL || 'https://api.tempmail.pro/v1';
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 3;

    if (!this.apiKey) {
      throw new Error('API key is required. Set it in config or TEMPMAILPRO_API_KEY environment variable');
    }

    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': `tempmailpro-nodejs-sdk/1.0.0`,
      },
    });

    // Add request interceptor for retries
    this.axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config as AxiosRequestConfig & { __retryCount?: number };

        if (!config.__retryCount) {
          config.__retryCount = 0;
        }

        if (
          config.__retryCount < this.retries &&
          (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT')
        ) {
          config.__retryCount += 1;
          return this.axios(config);
        }

        return Promise.reject(error);
      }
    );
  }

  private async makeRequest<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axios.request<ApiResponse<T>>(config);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.error || axiosError.response.data.message || 'API request failed');
      }
      throw new Error(axiosError.message || 'Network error');
    }
  }

  // User operations
  async getCurrentUser(): Promise<User> {
    const response = await this.makeRequest<User>({
      method: 'GET',
      url: '/auth/me',
    });
    return response.data;
  }

  // Domain operations
  async listDomains(options: ListOptions = {}): Promise<{ domains: Domain[]; meta: any }> {
    const response = await this.makeRequest<Domain[]>({
      method: 'GET',
      url: '/domains',
      params: options,
    });
    return {
      domains: response.data,
      meta: response.meta,
    };
  }

  async getDomain(domainId: string): Promise<Domain> {
    const response = await this.makeRequest<Domain>({
      method: 'GET',
      url: `/domains/${domainId}`,
    });
    return response.data;
  }

  async createDomain(name: string, organizationId?: string): Promise<Domain> {
    const response = await this.makeRequest<Domain>({
      method: 'POST',
      url: '/domains',
      data: { name, organizationId },
    });
    return response.data;
  }

  async verifyDomain(domainId: string, token: string): Promise<Domain> {
    const response = await this.makeRequest<Domain>({
      method: 'POST',
      url: `/domains/${domainId}/verify`,
      data: { token },
    });
    return response.data;
  }

  async deleteDomain(domainId: string): Promise<void> {
    await this.makeRequest<void>({
      method: 'DELETE',
      url: `/domains/${domainId}`,
    });
  }

  // Inbox operations
  async listInboxes(options: ListOptions = {}): Promise<{ inboxes: Inbox[]; meta: any }> {
    const response = await this.makeRequest<Inbox[]>({
      method: 'GET',
      url: '/inboxes',
      params: options,
    });
    return {
      inboxes: response.data,
      meta: response.meta,
    };
  }

  async getInbox(inboxId: string): Promise<Inbox> {
    const response = await this.makeRequest<Inbox>({
      method: 'GET',
      url: `/inboxes/${inboxId}`,
    });
    return response.data;
  }

  async createInbox(options: CreateInboxOptions = {}): Promise<Inbox> {
    const response = await this.makeRequest<Inbox>({
      method: 'POST',
      url: '/inboxes',
      data: options,
    });
    return response.data;
  }

  async deleteInbox(inboxId: string): Promise<void> {
    await this.makeRequest<void>({
      method: 'DELETE',
      url: `/inboxes/${inboxId}`,
    });
  }

  // Message operations
  async listMessages(inboxId: string, options: ListOptions = {}): Promise<{ messages: Message[]; meta: any }> {
    const response = await this.makeRequest<Message[]>({
      method: 'GET',
      url: `/inboxes/${inboxId}/messages`,
      params: options,
    });
    return {
      messages: response.data,
      meta: response.meta,
    };
  }

  async getMessage(messageId: string): Promise<Message> {
    const response = await this.makeRequest<Message>({
      method: 'GET',
      url: `/messages/${messageId}`,
    });
    return response.data;
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await this.makeRequest<void>({
      method: 'PATCH',
      url: `/messages/${messageId}`,
      data: { read: true },
    });
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.makeRequest<void>({
      method: 'DELETE',
      url: `/messages/${messageId}`,
    });
  }

  // Attachment operations
  async listAttachments(messageId: string): Promise<Attachment[]> {
    const response = await this.makeRequest<Attachment[]>({
      method: 'GET',
      url: `/messages/${messageId}/attachments`,
    });
    return response.data;
  }

  async getAttachment(attachmentId: string): Promise<{ url: string; filename: string }> {
    const response = await this.makeRequest<{ url: string; filename: string }>({
      method: 'GET',
      url: `/attachments/${attachmentId}`,
    });
    return response.data;
  }

  async downloadAttachment(attachmentId: string): Promise<Buffer> {
    const response = await this.makeRequest<any>({
      method: 'GET',
      url: `/attachments/${attachmentId}/download`,
      responseType: 'arraybuffer',
    });
    return Buffer.from(response.data);
  }

  // Filter rules
  async listFilterRules(inboxId?: string, options: ListOptions = {}): Promise<FilterRule[]> {
    const url = inboxId ? `/inboxes/${inboxId}/rules` : '/rules';
    const response = await this.makeRequest<FilterRule[]>({
      method: 'GET',
      url,
      params: options,
    });
    return response.data;
  }

  async createFilterRule(options: CreateFilterRuleOptions): Promise<FilterRule> {
    const response = await this.makeRequest<FilterRule>({
      method: 'POST',
      url: '/rules',
      data: options,
    });
    return response.data;
  }

  async updateFilterRule(ruleId: string, options: Partial<CreateFilterRuleOptions>): Promise<FilterRule> {
    const response = await this.makeRequest<FilterRule>({
      method: 'PATCH',
      url: `/rules/${ruleId}`,
      data: options,
    });
    return response.data;
  }

  async deleteFilterRule(ruleId: string): Promise<void> {
    await this.makeRequest<void>({
      method: 'DELETE',
      url: `/rules/${ruleId}`,
    });
  }

  // API Key operations
  async listApiKeys(organizationId?: string): Promise<ApiKey[]> {
    const response = await this.makeRequest<ApiKey[]>({
      method: 'GET',
      url: '/api-keys',
      params: { organizationId },
    });
    return response.data;
  }

  async createApiKey(name: string, options: {
    permissions?: string[];
    organizationId?: string;
    rateLimit?: number;
    expiresAt?: Date;
  } = {}): Promise<{ apiKey: string; key: ApiKey }> {
    const response = await this.makeRequest<{ apiKey: string; key: ApiKey }>({
      method: 'POST',
      url: '/api-keys',
      data: { name, ...options },
    });
    return response.data;
  }

  async deleteApiKey(keyId: string): Promise<void> {
    await this.makeRequest<void>({
      method: 'DELETE',
      url: `/api-keys/${keyId}`,
    });
  }

  // Webhook operations
  async listWebhooks(organizationId?: string): Promise<Webhook[]> {
    const response = await this.makeRequest<Webhook[]>({
      method: 'GET',
      url: '/webhooks',
      params: { organizationId },
    });
    return response.data;
  }

  async createWebhook(name: string, url: string, events: string[], options: {
    organizationId?: string;
    secret?: string;
    timeout?: number;
    retryAttempts?: number;
  } = {}): Promise<{ webhook: Webhook; secret: string }> {
    const response = await this.makeRequest<{ webhook: Webhook; secret: string }>({
      method: 'POST',
      url: '/webhooks',
      data: { name, url, events, ...options },
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.makeRequest<void>({
      method: 'DELETE',
      url: `/webhooks/${webhookId}`,
    });
  }

  // Usage and quota
  async getUsage(organizationId?: string): Promise<UsageStats> {
    const response = await this.makeRequest<UsageStats>({
      method: 'GET',
      url: organizationId ? `/organizations/${organizationId}/usage` : '/usage',
    });
    return response.data;
  }

  async getQuotaLimits(organizationId?: string): Promise<QuotaLimits> {
    const response = await this.makeRequest<QuotaLimits>({
      method: 'GET',
      url: organizationId ? `/organizations/${organizationId}/quota` : '/quota',
    });
    return response.data;
  }

  // Utility methods
  async testWebhook(webhookId: string, eventType: string, testPayload?: any): Promise<void> {
    await this.makeRequest<void>({
      method: 'POST',
      url: `/webhooks/${webhookId}/test`,
      data: { eventType, testPayload },
    });
  }

  async generateRandomAddress(domain?: string): Promise<string> {
    const random = Math.random().toString(36).substring(2, 15);
    return `${random}${domain ? `@${domain}` : '@tempmail.pro'}`;
  }
}

export default TempMailPro;