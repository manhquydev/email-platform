/**
 * Ephemera SDK - Official Node.js client for Ephemera API
 * "Stripe for Privacy" - Simple, elegant API for temporary email
 */

export interface EphemeraConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface Inbox {
  id: string;
  email: string;
  localPart: string;
  domain: string;
  createdAt: string;
  expiresAt: string | null;
  messageCount?: number;
}

export interface Message {
  id: string;
  inboxId: string;
  from: string | null;
  to: string | null;
  subject: string | null;
  textBody: string | null;
  htmlBody: string | null;
  receivedAt: string;
  isRead: boolean;
  extractedOtp: string | null;
  attachments: Attachment[];
}

export interface MessageSummary {
  id: string;
  fromAddress: string | null;
  subject: string | null;
  receivedAt: string;
  isRead: boolean;
  extractedOtp: string | null;
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string | null;
  size: number | null;
}

export interface OTPResult {
  found: boolean;
  otp: {
    code: string;
    type: 'numeric' | 'alphanumeric' | 'link';
    confidence: 'high' | 'medium' | 'low';
    source: 'regex' | 'ai';
  } | null;
}

export interface AnalysisResult {
  otp: OTPResult;
  category: {
    category: string;
    confidence: number;
    source: 'rules' | 'ai';
  };
  phishing: {
    riskScore: number;
    riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
    indicators: Array<{ type: string; description: string; severity: number }>;
    recommendation: string;
  };
}

export interface UsageStats {
  inboxes: number;
  messages: number;
  apiKeys: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; limit: number; offset: number };
}

class EphemeraError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'EphemeraError';
    this.status = status;
  }
}

async function request<T>(
  baseUrl: string,
  apiKey: string,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new EphemeraError(error.error || 'Request failed', response.status);
  }

  if (response.status === 204) return {} as T;
  return response.json();
}

class InboxesResource {
  constructor(private baseUrl: string, private apiKey: string) {}

  async create(options?: { domain?: string; localPart?: string; expiresInMinutes?: number }): Promise<Inbox> {
    return request(this.baseUrl, this.apiKey, 'POST', '/v1/inboxes', options || {});
  }

  async get(id: string): Promise<Inbox> {
    return request(this.baseUrl, this.apiKey, 'GET', `/v1/inboxes/${id}`);
  }

  async delete(id: string): Promise<void> {
    await request(this.baseUrl, this.apiKey, 'DELETE', `/v1/inboxes/${id}`);
  }

  async messages(id: string, options?: { limit?: number; offset?: number }): Promise<PaginatedResponse<MessageSummary>> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());
    const query = params.toString() ? `?${params}` : '';
    return request(this.baseUrl, this.apiKey, 'GET', `/v1/inboxes/${id}/messages${query}`);
  }
}

class MessagesResource {
  constructor(private baseUrl: string, private apiKey: string) {}

  async get(id: string): Promise<Message> {
    return request(this.baseUrl, this.apiKey, 'GET', `/v1/messages/${id}`);
  }

  async extractOtp(id: string): Promise<OTPResult> {
    return request(this.baseUrl, this.apiKey, 'GET', `/v1/messages/${id}/otp`);
  }

  async analyze(id: string): Promise<AnalysisResult> {
    return request(this.baseUrl, this.apiKey, 'GET', `/v1/messages/${id}/analysis`);
  }
}

export class Ephemera {
  public inboxes: InboxesResource;
  public messages: MessagesResource;
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, config?: { baseUrl?: string }) {
    this.apiKey = apiKey;
    this.baseUrl = config?.baseUrl || 'https://api.ephemera.email';
    this.inboxes = new InboxesResource(this.baseUrl, this.apiKey);
    this.messages = new MessagesResource(this.baseUrl, this.apiKey);
  }

  async usage(): Promise<UsageStats> {
    return request(this.baseUrl, this.apiKey, 'GET', '/v1/usage');
  }
}

export default Ephemera;
