/**
 * Tier-based rate limits and quotas configuration
 * Defines resource limits for each subscription tier
 */

export type SubscriptionTier = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'BUSINESS' | 'ENTERPRISE';

export interface TierLimits {
  /** Requests per minute */
  requestsPerMinute: number;
  /** Maximum inboxes created per day */
  inboxesPerDay: number;
  /** Maximum active webhooks */
  maxWebhooks: number;
  /** Maximum messages per inbox */
  messagesPerInbox: number;
  /** Maximum custom domains */
  maxDomains: number;
  /** Message retention in days */
  retentionDays: number;
  /** API key limit */
  maxApiKeys: number;
  /** Attachment size limit in bytes */
  maxAttachmentBytes: number;
}

/**
 * Tier limits configuration
 * FREE tier ensures basic access while premium tiers unlock more resources
 */
export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  FREE: {
    requestsPerMinute: 60,
    inboxesPerDay: 100,
    maxWebhooks: 1,
    messagesPerInbox: 100,
    maxDomains: 0,
    retentionDays: 1,
    maxApiKeys: 1,
    maxAttachmentBytes: 1 * 1024 * 1024, // 1MB
  },
  STARTER: {
    requestsPerMinute: 300,
    inboxesPerDay: 1000,
    maxWebhooks: 3,
    messagesPerInbox: 500,
    maxDomains: 1,
    retentionDays: 7,
    maxApiKeys: 3,
    maxAttachmentBytes: 5 * 1024 * 1024, // 5MB
  },
  PROFESSIONAL: {
    requestsPerMinute: 600,
    inboxesPerDay: 10000,
    maxWebhooks: 10,
    messagesPerInbox: 1000,
    maxDomains: 5,
    retentionDays: 30,
    maxApiKeys: 10,
    maxAttachmentBytes: 10 * 1024 * 1024, // 10MB
  },
  BUSINESS: {
    requestsPerMinute: 1200,
    inboxesPerDay: 50000,
    maxWebhooks: 25,
    messagesPerInbox: 5000,
    maxDomains: 20,
    retentionDays: 90,
    maxApiKeys: 25,
    maxAttachmentBytes: 25 * 1024 * 1024, // 25MB
  },
  ENTERPRISE: {
    requestsPerMinute: -1, // Unlimited
    inboxesPerDay: -1,
    maxWebhooks: -1,
    messagesPerInbox: -1,
    maxDomains: -1,
    retentionDays: 365,
    maxApiKeys: -1,
    maxAttachmentBytes: 50 * 1024 * 1024, // 50MB
  },
};

/**
 * Get tier limits for a subscription tier
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_LIMITS[tier] || TIER_LIMITS.FREE;
}

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
