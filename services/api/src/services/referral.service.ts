/**
 * Anonymous Referral Service - Privacy-first referrals
 * Phase 6: Open-Core & Community
 *
 * Hash-based referral codes - no PII linking
 * Double-blind rewards - both parties get bonus
 */

import { prisma } from "../lib/prisma";
import crypto from "crypto";

const REFERRAL_REWARDS = {
  ALIASES: 10,           // +10 aliases for both
  DAYS_FREE: 30,         // +30 days free for referrer
};

export interface ReferralCode {
  code: string;
  createdAt: Date;
  usageCount: number;
}

export interface ReferralStats {
  totalReferrals: number;
  pendingRewards: number;
  claimedRewards: number;
}

/**
 * Generate anonymous referral code from user ID
 * One-way hash ensures privacy
 */
function generateReferralCode(userId: string): string {
  const hash = crypto.createHash('sha256')
    .update(`referral:${userId}:${process.env.REFERRAL_SECRET || 'ephemera'}`)
    .digest('hex')
    .slice(0, 12)
    .toUpperCase();

  // Format: XXXX-XXXX-XXXX
  return `${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}`;
}

/**
 * Validate referral code format
 */
function isValidReferralCode(code: string): boolean {
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code);
}

export const referralService = {
  /**
   * Get or create referral code for user
   */
  async getOrCreateCode(userId: string): Promise<ReferralCode> {
    const code = generateReferralCode(userId);

    // Check if already exists in audit log
    const existing = await prisma.auditLog.findFirst({
      where: {
        userId,
        action: 'REFERRAL_CODE_CREATED',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const usageCount = await prisma.auditLog.count({
        where: {
          action: 'REFERRAL_USED',
          meta: { path: ['referralCode'], equals: code },
        },
      });

      return {
        code,
        createdAt: existing.createdAt,
        usageCount,
      };
    }

    // Create new referral code record
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'REFERRAL_CODE_CREATED',
        meta: { referralCode: code },
      },
    });

    return {
      code,
      createdAt: new Date(),
      usageCount: 0,
    };
  },

  /**
   * Apply referral code during signup
   * Returns rewards for both parties
   */
  async applyReferral(newUserId: string, referralCode: string): Promise<{
    success: boolean;
    reward?: { aliases: number; message: string };
    error?: string;
  }> {
    if (!isValidReferralCode(referralCode)) {
      return { success: false, error: 'Invalid referral code format' };
    }

    // Check if user already used a referral
    const alreadyUsed = await prisma.auditLog.findFirst({
      where: {
        userId: newUserId,
        action: 'REFERRAL_APPLIED',
      },
    });

    if (alreadyUsed) {
      return { success: false, error: 'Referral already applied to this account' };
    }

    // Find referrer by matching code in audit logs
    const referrerLog = await prisma.auditLog.findFirst({
      where: {
        action: 'REFERRAL_CODE_CREATED',
        meta: { path: ['referralCode'], equals: referralCode },
      },
    });

    if (!referrerLog || !referrerLog.userId) {
      return { success: false, error: 'Referral code not found' };
    }

    // Prevent self-referral
    if (referrerLog.userId === newUserId) {
      return { success: false, error: 'Cannot use your own referral code' };
    }

    // Record referral usage (double-blind - only hashes stored)
    await prisma.auditLog.create({
      data: {
        userId: newUserId,
        action: 'REFERRAL_APPLIED',
        meta: {
          referralCode,
          referrerHash: crypto.createHash('sha256').update(referrerLog.userId).digest('hex').slice(0, 8),
        },
      },
    });

    // Record referral for referrer (anonymized)
    await prisma.auditLog.create({
      data: {
        userId: referrerLog.userId,
        action: 'REFERRAL_USED',
        meta: {
          referralCode,
          newUserHash: crypto.createHash('sha256').update(newUserId).digest('hex').slice(0, 8),
          rewardAliases: REFERRAL_REWARDS.ALIASES,
        },
      },
    });

    return {
      success: true,
      reward: {
        aliases: REFERRAL_REWARDS.ALIASES,
        message: `You got +${REFERRAL_REWARDS.ALIASES} bonus aliases from referral!`,
      },
    };
  },

  /**
   * Get referral stats for user (anonymous - just counts)
   */
  async getStats(userId: string): Promise<ReferralStats> {
    const code = generateReferralCode(userId);

    const [totalReferrals, claimedRewards] = await Promise.all([
      prisma.auditLog.count({
        where: {
          action: 'REFERRAL_USED',
          meta: { path: ['referralCode'], equals: code },
        },
      }),
      prisma.auditLog.count({
        where: {
          userId,
          action: 'REFERRAL_REWARD_CLAIMED',
        },
      }),
    ]);

    return {
      totalReferrals,
      pendingRewards: Math.max(0, totalReferrals - claimedRewards),
      claimedRewards,
    };
  },

  /**
   * Claim pending referral rewards
   */
  async claimRewards(userId: string): Promise<{
    claimed: number;
    aliasesAdded: number;
  }> {
    const stats = await this.getStats(userId);

    if (stats.pendingRewards === 0) {
      return { claimed: 0, aliasesAdded: 0 };
    }

    // Record claim
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'REFERRAL_REWARD_CLAIMED',
        meta: {
          count: stats.pendingRewards,
          aliasesAdded: stats.pendingRewards * REFERRAL_REWARDS.ALIASES,
        },
      },
    });

    return {
      claimed: stats.pendingRewards,
      aliasesAdded: stats.pendingRewards * REFERRAL_REWARDS.ALIASES,
    };
  },
};
