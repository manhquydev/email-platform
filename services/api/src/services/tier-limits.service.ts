/**
 * Tier Limits Service
 * Fetches tier limits from database with fallback to defaults
 * Single Source of Truth for all resource enforcement
 */

import { prisma } from '../lib/prisma';
import {
  SubscriptionTier,
  TierLimits,
  DEFAULT_TIER_LIMITS,
  DEFAULT_TIER_INFO,
} from '../config/unified-tier-limits';

// Cache for tier limits (5 min TTL)
const limitsCache = new Map<string, { limits: TierLimits; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get limits for a tier - checks DB first, falls back to defaults
 */
export async function getTierLimits(tier: SubscriptionTier): Promise<TierLimits> {
  const cacheKey = `tier:${tier}`;
  const cached = limitsCache.get(cacheKey);

  if (cached && cached.expiry > Date.now()) {
    return cached.limits;
  }

  // Try to find package with this targetTier that has limits configured
  const pkg = await prisma.servicePackage.findFirst({
    where: {
      targetTier: tier,
      isActive: true,
    },
    orderBy: { displayOrder: 'asc' },
  });

  let limits: TierLimits;

  if (pkg?.limits && typeof pkg.limits === 'object') {
    // Merge DB limits with defaults (DB overrides defaults)
    limits = {
      ...DEFAULT_TIER_LIMITS[tier],
      ...(pkg.limits as Partial<TierLimits>),
    };
  } else {
    limits = DEFAULT_TIER_LIMITS[tier];
  }

  // Cache the result
  limitsCache.set(cacheKey, { limits, expiry: Date.now() + CACHE_TTL });

  return limits;
}

/**
 * Get all tiers with their limits and info (for pricing pages)
 */
export async function getAllTiersWithLimits(): Promise<Array<{
  id: SubscriptionTier;
  name: string;
  price: number;
  currency: string;
  period: string;
  description: string;
  badge: string | null;
  features: string[];
  limits: TierLimits;
}>> {
  const tiers: SubscriptionTier[] = ['FREE', 'STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE'];

  // Fetch all active packages with limits
  const packages = await prisma.servicePackage.findMany({
    where: {
      isActive: true,
      targetTier: { in: tiers },
    },
    orderBy: { displayOrder: 'asc' },
  });

  // Build tier map from packages
  const pkgMap = new Map(packages.map(p => [p.targetTier, p]));

  return tiers.map(tier => {
    const pkg = pkgMap.get(tier);
    const defaultInfo = DEFAULT_TIER_INFO[tier];
    const defaultLimits = DEFAULT_TIER_LIMITS[tier];

    // Merge package data with defaults
    const limits: TierLimits = pkg?.limits && typeof pkg.limits === 'object'
      ? { ...defaultLimits, ...(pkg.limits as Partial<TierLimits>) }
      : defaultLimits;

    // Generate features from limits if not provided
    const features = pkg?.features && Array.isArray(pkg.features)
      ? (pkg.features as Array<{ text: string; included: boolean }>)
          .filter(f => f.included)
          .map(f => f.text)
      : generateFeaturesFromLimits(limits, tier);

    return {
      id: tier,
      name: pkg?.name || defaultInfo.name,
      price: pkg ? Number(pkg.price) : defaultInfo.price,
      currency: pkg?.currency || defaultInfo.currency,
      period: defaultInfo.period,
      description: pkg?.description || defaultInfo.description,
      badge: pkg?.badge || defaultInfo.badge,
      features,
      limits,
    };
  });
}

/**
 * Generate feature list from limits (auto-generate if not manually set)
 */
function generateFeaturesFromLimits(limits: TierLimits, tier: SubscriptionTier): string[] {
  const features: string[] = [];

  // Domains
  if (limits.domains === -1) {
    features.push('Không giới hạn tên miền');
  } else if (limits.domains > 0) {
    features.push(`${limits.domains} tên miền`);
  }

  // Inboxes
  if (limits.inboxes === -1) {
    features.push('Không giới hạn hộp thư');
  } else if (limits.inboxes > 0) {
    features.push(`${limits.inboxes} hộp thư`);
  }

  // Storage
  if (limits.storageGB > 0) {
    features.push(`${limits.storageGB}GB lưu trữ`);
  }

  // Retention
  if (limits.retentionDays > 0) {
    features.push(`Lưu email ${limits.retentionDays} ngày`);
  }

  // API
  if (limits.apiAccess) {
    features.push('Truy cập API');
    if (limits.requestsPerMinute === -1) {
      features.push('API không giới hạn');
    } else if (limits.requestsPerMinute > 0) {
      features.push(`${limits.requestsPerMinute} requests/phút`);
    }
  }

  // Webhooks
  if (limits.webhooks === -1) {
    features.push('Không giới hạn webhooks');
  } else if (limits.webhooks > 0) {
    features.push(`${limits.webhooks} webhooks`);
  }

  // Support
  if (limits.prioritySupport) {
    features.push(tier === 'ENTERPRISE' ? 'Hỗ trợ ưu tiên 24/7' : 'Hỗ trợ ưu tiên');
  }

  return features;
}

/**
 * Clear cache (call after admin updates packages)
 */
export function clearTierLimitsCache(tier?: SubscriptionTier): void {
  if (tier) {
    limitsCache.delete(`tier:${tier}`);
  } else {
    limitsCache.clear();
  }
}

/**
 * Check if user exceeds a specific limit
 */
export async function checkLimit(
  tier: SubscriptionTier,
  limitKey: keyof TierLimits,
  currentUsage: number
): Promise<{ allowed: boolean; limit: number; usage: number }> {
  const limits = await getTierLimits(tier);
  const limit = limits[limitKey];

  if (typeof limit === 'boolean') {
    return { allowed: limit, limit: limit ? 1 : 0, usage: currentUsage };
  }

  const allowed = limit === -1 || currentUsage < limit;
  return { allowed, limit, usage: currentUsage };
}
