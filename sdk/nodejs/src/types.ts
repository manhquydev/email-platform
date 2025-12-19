export interface Config {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  retries?: number;
}

export interface User {
  id: string;
  email: string;
  role: string;
  emailVerified: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Domain {
  id: string;
  name: string;
  status: 'PENDING' | 'VERIFIED' | 'FAILED';
  verificationToken?: string;
  isPublic: boolean;
  ownerId?: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Inbox {
  id: string;
  address: string;
  domainId: string;
  isActive: boolean;
  autoDelete?: boolean;
  autoDeleteHours?: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  inboxId: string;
  fromAddress: string;
  toAddress: string;
  subject?: string;
  textContent?: string;
  htmlContent?: string;
  attachments: number;
  read: boolean;
  receivedAt: Date;
}

export interface Attachment {
  id: string;
  messageId: string;
  filename: string;
  contentType: string;
  size: number;
  url?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  keyLastFour: string;
  permissions: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'REVOKED';
  rateLimit?: number;
  usageCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'FAILED';
  timeout?: number;
  retryAttempts?: number;
  createdAt: Date;
}

export interface CreateInboxOptions {
  domain?: string;
  description?: string;
  autoDelete?: boolean;
  autoDeleteHours?: number;
  expiresAt?: Date;
}

export interface FilterRule {
  id: string;
  name: string;
  type: 'ALLOW' | 'BLOCK' | 'FORWARD';
  field: 'FROM' | 'SUBJECT' | 'CONTENT' | 'ATTACHMENTS';
  pattern: string;
  isActive: boolean;
  priority: number;
}

export interface CreateFilterRuleOptions {
  name: string;
  type: 'ALLOW' | 'BLOCK' | 'FORWARD';
  field: 'FROM' | 'SUBJECT' | 'CONTENT' | 'ATTACHMENTS';
  pattern: string;
  priority?: number;
  isActive?: boolean;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ErrorResponse {
  error: string;
  message?: string;
  details?: any;
}

export interface UsageStats {
  domains: number;
  inboxes: number;
  members: number;
  apiKeys: number;
  webhooks: number;
  emailsThisMonth: number;
  storageMB: number;
}

export interface QuotaLimits {
  domains?: number;
  inboxes?: number;
  members?: number;
  apiKeys?: number;
  webhooks?: number;
  emailsPerMonth?: number;
  storageMB?: number;
  apiCallsPerMinute?: number;
  attachmentsPerEmail?: number;
  emailSizeKB?: number;
}