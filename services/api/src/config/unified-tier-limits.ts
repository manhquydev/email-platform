/**
 * Unified Tier Limits Configuration
 * Single Source of Truth for all tier resource limits
 * These are DEFAULT values - actual limits come from database ServicePackage.limits
 */

export type SubscriptionTier = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'BUSINESS' | 'ENTERPRISE';

/**
 * Complete resource limits structure
 * Used by both App enforcement and SDK rate limiting
 */
export interface TierLimits {
  // === App Limits (UI/Dashboard) ===
  domains: number;           // Max custom domains
  inboxes: number;           // Max total inboxes
  storageGB: number;         // Storage in GB
  dailyEmails: number;       // Emails received per day
  retentionDays: number;     // Message retention
  teams: number;             // Max teams
  teamMembers: number;       // Members per team
  filters: number;           // Email filters
  forwardingRules: number;   // Forwarding rules
  labels: number;            // Labels/tags

  // === SDK/API Limits ===
  webhooks: number;          // Max webhook endpoints
  apiAccess: boolean;        // API enabled
  requestsPerMinute: number; // API rate limit
  inboxesPerDay: number;     // API inbox creation limit
  messagesPerInbox: number;  // Messages per inbox via API
  maxApiKeys: number;        // API keys allowed
  maxAttachmentBytes: number; // Attachment size limit

  // === Support ===
  prioritySupport: boolean;
}

/**
 * Default tier limits (fallback when DB has no limits configured)
 * Admin can override these via /admin/packages
 */
export const DEFAULT_TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  FREE: {
    // App
    domains: 1,
    inboxes: 3,
    storageGB: 0.1,
    dailyEmails: 50,
    retentionDays: 7,
    teams: 0,
    teamMembers: 0,
    filters: 3,
    forwardingRules: 2,
    labels: 5,
    // SDK/API
    webhooks: 1,
    apiAccess: false,
    requestsPerMinute: 60,
    inboxesPerDay: 100,
    messagesPerInbox: 100,
    maxApiKeys: 1,
    maxAttachmentBytes: 1 * 1024 * 1024, // 1MB
    // Support
    prioritySupport: false,
  },
  STARTER: {
    domains: 3,
    inboxes: 20,
    storageGB: 1,
    dailyEmails: 200,
    retentionDays: 30,
    teams: 1,
    teamMembers: 3,
    filters: 10,
    forwardingRules: 5,
    labels: 20,
    webhooks: 3,
    apiAccess: true,
    requestsPerMinute: 300,
    inboxesPerDay: 1000,
    messagesPerInbox: 500,
    maxApiKeys: 3,
    maxAttachmentBytes: 5 * 1024 * 1024,
    prioritySupport: false,
  },
  PROFESSIONAL: {
    domains: 10,
    inboxes: 100,
    storageGB: 5,
    dailyEmails: 1000,
    retentionDays: 90,
    teams: 5,
    teamMembers: 10,
    filters: 50,
    forwardingRules: 20,
    labels: 100,
    webhooks: 10,
    apiAccess: true,
    requestsPerMinute: 600,
    inboxesPerDay: 10000,
    messagesPerInbox: 1000,
    maxApiKeys: 10,
    maxAttachmentBytes: 10 * 1024 * 1024,
    prioritySupport: true,
  },
  BUSINESS: {
    domains: 25,
    inboxes: 500,
    storageGB: 20,
    dailyEmails: 5000,
    retentionDays: 180,
    teams: 15,
    teamMembers: 30,
    filters: 200,
    forwardingRules: 50,
    labels: 500,
    webhooks: 25,
    apiAccess: true,
    requestsPerMinute: 1200,
    inboxesPerDay: 50000,
    messagesPerInbox: 5000,
    maxApiKeys: 25,
    maxAttachmentBytes: 25 * 1024 * 1024,
    prioritySupport: true,
  },
  ENTERPRISE: {
    domains: -1,  // -1 = unlimited
    inboxes: -1,
    storageGB: 50,
    dailyEmails: -1,
    retentionDays: 365,
    teams: -1,
    teamMembers: -1,
    filters: -1,
    forwardingRules: -1,
    labels: -1,
    webhooks: -1,
    apiAccess: true,
    requestsPerMinute: -1,
    inboxesPerDay: -1,
    messagesPerInbox: -1,
    maxApiKeys: -1,
    maxAttachmentBytes: 50 * 1024 * 1024,
    prioritySupport: true,
  },
};

/**
 * Tier display info (used when no package in DB)
 */
export const DEFAULT_TIER_INFO: Record<SubscriptionTier, {
  name: string;
  price: number;
  currency: string;
  period: string;
  description: string;
  badge: string | null;
}> = {
  FREE: {
    name: 'Miễn phí',
    price: 0,
    currency: 'VND',
    period: 'tháng',
    description: 'Dùng thử Ephemera',
    badge: null,
  },
  STARTER: {
    name: 'Khởi đầu',
    price: 49000,
    currency: 'VND',
    period: 'tháng',
    description: 'Cho cá nhân và freelancer',
    badge: null,
  },
  PROFESSIONAL: {
    name: 'Chuyên nghiệp',
    price: 99000,
    currency: 'VND',
    period: 'tháng',
    description: 'Cho team đang phát triển',
    badge: 'PHỔ BIẾN',
  },
  BUSINESS: {
    name: 'Doanh nghiệp',
    price: 199000,
    currency: 'VND',
    period: 'tháng',
    description: 'Cho doanh nghiệp vừa và nhỏ',
    badge: 'GIÁ TRỊ',
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 499000,
    currency: 'VND',
    period: 'tháng',
    description: 'Cho tổ chức lớn',
    badge: 'TỐI ƯU',
  },
};

/**
 * Labels for limit fields (Vietnamese)
 * Used in Admin UI and comparison tables
 */
export const LIMIT_LABELS: Record<keyof TierLimits, { label: string; suffix?: string; category: 'app' | 'api' | 'support' }> = {
  domains: { label: 'Tên miền', category: 'app' },
  inboxes: { label: 'Hộp thư', category: 'app' },
  storageGB: { label: 'Dung lượng', suffix: 'GB', category: 'app' },
  dailyEmails: { label: 'Email/ngày', category: 'app' },
  retentionDays: { label: 'Lưu trữ', suffix: 'ngày', category: 'app' },
  teams: { label: 'Đội nhóm', category: 'app' },
  teamMembers: { label: 'Thành viên/đội', category: 'app' },
  filters: { label: 'Bộ lọc', category: 'app' },
  forwardingRules: { label: 'Quy tắc chuyển tiếp', category: 'app' },
  labels: { label: 'Nhãn', category: 'app' },
  webhooks: { label: 'Webhooks', category: 'api' },
  apiAccess: { label: 'Truy cập API', category: 'api' },
  requestsPerMinute: { label: 'API requests/phút', category: 'api' },
  inboxesPerDay: { label: 'Tạo inbox/ngày (API)', category: 'api' },
  messagesPerInbox: { label: 'Tin nhắn/inbox', category: 'api' },
  maxApiKeys: { label: 'API Keys', category: 'api' },
  maxAttachmentBytes: { label: 'Kích thước đính kèm', suffix: 'MB', category: 'api' },
  prioritySupport: { label: 'Hỗ trợ ưu tiên', category: 'support' },
};

/**
 * Check if a limit is unlimited (-1 means unlimited)
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Check if usage exceeds limit (respects unlimited)
 */
export function exceedsLimit(usage: number, limit: number): boolean {
  if (isUnlimited(limit)) return false;
  return usage >= limit;
}

/**
 * Format limit value for display
 */
export function formatLimitValue(value: number | boolean, key?: keyof TierLimits): string {
  if (typeof value === 'boolean') {
    return value ? '✓' : '—';
  }
  if (value === -1) return 'Không giới hạn';
  if (value === 0) return '—';

  // Special formatting for bytes
  if (key === 'maxAttachmentBytes') {
    return `${Math.round(value / (1024 * 1024))}MB`;
  }

  return value.toLocaleString('vi-VN');
}
