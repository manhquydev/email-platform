/**
 * Privacy Score Service - Gamification & Scoring
 * Phase 4: Identity Suite Bundles
 */

import { prisma } from "../lib/prisma";
import { aliasService } from "./alias.service";
import { breachMonitorService } from "./breach-monitor.service";

export interface PrivacyScoreBreakdown {
  aliasUsage: number;      // 0-20 points
  noBreaches: number;      // 0-30 points
  trackingBlocked: number; // 0-25 points
  twoFactorEnabled: number; // 0-25 points
}

export interface PrivacyBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date | null;
}

export interface PrivacyScoreResult {
  score: number;           // 0-100
  level: 'beginner' | 'protected' | 'secure' | 'fortress';
  breakdown: PrivacyScoreBreakdown;
  badges: PrivacyBadge[];
  recommendations: string[];
}

const BADGES: Omit<PrivacyBadge, 'earnedAt'>[] = [
  { id: 'first_alias', name: 'Alias Starter', description: 'Created your first email alias', icon: '🎭' },
  { id: 'alias_master', name: 'Alias Master', description: 'Created 10+ email aliases', icon: '🎪' },
  { id: 'breach_free', name: 'Breach Free', description: 'No breaches detected in monitored emails', icon: '🛡️' },
  { id: 'breach_monitor', name: 'Vigilant', description: 'Enabled breach monitoring', icon: '👁️' },
  { id: '2fa_enabled', name: 'Double Lock', description: 'Enabled two-factor authentication', icon: '🔐' },
  { id: 'passkey_user', name: 'Keymaster', description: 'Using passkey authentication', icon: '🔑' },
  { id: 'privacy_pro', name: 'Privacy Pro', description: 'Achieved 80+ privacy score', icon: '🏆' },
  { id: 'fortress', name: 'Digital Fortress', description: 'Achieved 100 privacy score', icon: '🏰' },
];

export const privacyScoreService = {
  /**
   * Calculate privacy score for user
   */
  async calculateScore(userId: string): Promise<PrivacyScoreResult> {
    const [user, aliasStats, breachStatus, passkeyCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          twoFactorEnabled: true,
          tier: true,
        },
      }),
      aliasService.getStats(userId),
      breachMonitorService.getUserBreachStatus(userId),
      prisma.passkeyCredential.count({ where: { userId } }),
    ]);

    if (!user) {
      throw new Error('User not found');
    }

    // Calculate breakdown
    const breakdown: PrivacyScoreBreakdown = {
      // Alias usage: 0-20 points (1 point per alias, max 20)
      aliasUsage: Math.min(20, aliasStats.total * 2),

      // No breaches: 0-30 points
      noBreaches: breachStatus.totalBreaches === 0 ? 30 : Math.max(0, 30 - breachStatus.totalBreaches * 5),

      // Tracking blocked: 0-25 points (assume tracking blocked if using aliases)
      trackingBlocked: aliasStats.active > 0 ? 25 : 0,

      // 2FA enabled: 0-25 points
      twoFactorEnabled: user.twoFactorEnabled ? 25 : (passkeyCount > 0 ? 20 : 0),
    };

    const score = breakdown.aliasUsage + breakdown.noBreaches + breakdown.trackingBlocked + breakdown.twoFactorEnabled;

    // Determine level
    let level: PrivacyScoreResult['level'];
    if (score >= 90) level = 'fortress';
    else if (score >= 70) level = 'secure';
    else if (score >= 40) level = 'protected';
    else level = 'beginner';

    // Calculate badges
    const badges = await this.calculateBadges(userId, aliasStats, breachStatus, user.twoFactorEnabled, passkeyCount, score);

    // Generate recommendations
    const recommendations = this.generateRecommendations(breakdown, aliasStats, breachStatus, user.twoFactorEnabled);

    return { score, level, breakdown, badges, recommendations };
  },

  /**
   * Calculate earned badges
   */
  async calculateBadges(
    userId: string,
    aliasStats: { total: number; active: number },
    breachStatus: { totalBreaches: number; monitoredEmails: string[] },
    twoFactorEnabled: boolean,
    passkeyCount: number,
    score: number
  ): Promise<PrivacyBadge[]> {
    const now = new Date();
    const badges: PrivacyBadge[] = [];

    for (const badge of BADGES) {
      let earned = false;

      switch (badge.id) {
        case 'first_alias':
          earned = aliasStats.total >= 1;
          break;
        case 'alias_master':
          earned = aliasStats.total >= 10;
          break;
        case 'breach_free':
          earned = breachStatus.monitoredEmails.length > 0 && breachStatus.totalBreaches === 0;
          break;
        case 'breach_monitor':
          earned = breachStatus.monitoredEmails.length > 0;
          break;
        case '2fa_enabled':
          earned = twoFactorEnabled;
          break;
        case 'passkey_user':
          earned = passkeyCount > 0;
          break;
        case 'privacy_pro':
          earned = score >= 80;
          break;
        case 'fortress':
          earned = score >= 100;
          break;
      }

      badges.push({
        ...badge,
        earnedAt: earned ? now : null,
      });
    }

    return badges;
  },

  /**
   * Generate improvement recommendations
   */
  generateRecommendations(
    breakdown: PrivacyScoreBreakdown,
    aliasStats: { total: number; active: number },
    breachStatus: { totalBreaches: number; monitoredEmails: string[] },
    twoFactorEnabled: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (breakdown.aliasUsage < 20) {
      recommendations.push(`Create ${10 - aliasStats.total} more aliases to maximize your alias score (+${20 - breakdown.aliasUsage} points)`);
    }

    if (breachStatus.monitoredEmails.length === 0) {
      recommendations.push('Enable breach monitoring for your email to get breach protection points (+30 points)');
    }

    if (breachStatus.totalBreaches > 0) {
      recommendations.push(`${breachStatus.totalBreaches} breaches detected. Consider changing passwords on affected accounts.`);
    }

    if (!twoFactorEnabled) {
      recommendations.push('Enable two-factor authentication for maximum security (+25 points)');
    }

    if (aliasStats.active === 0) {
      recommendations.push('Use email aliases instead of your real email to block tracking (+25 points)');
    }

    if (recommendations.length === 0) {
      recommendations.push('Excellent! Your privacy score is maxed out. Keep using aliases for new signups.');
    }

    return recommendations;
  },

  /**
   * Get privacy dashboard data
   */
  async getDashboard(userId: string): Promise<{
    score: PrivacyScoreResult;
    stats: {
      aliasCount: number;
      activeAliases: number;
      totalForwards: number;
      breachesDetected: number;
      monitoredEmails: number;
    };
    recentActivity: Array<{ type: string; description: string; date: Date }>;
  }> {
    const [score, aliasStats, breachStatus, recentAuditLogs] = await Promise.all([
      this.calculateScore(userId),
      aliasService.getStats(userId),
      breachMonitorService.getUserBreachStatus(userId),
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      score,
      stats: {
        aliasCount: aliasStats.total,
        activeAliases: aliasStats.active,
        totalForwards: aliasStats.totalForwards,
        breachesDetected: breachStatus.totalBreaches,
        monitoredEmails: breachStatus.monitoredEmails.length,
      },
      recentActivity: recentAuditLogs.map(log => ({
        type: log.action,
        description: this.formatAuditAction(log.action),
        date: log.createdAt,
      })),
    };
  },

  /**
   * Format audit action for display
   */
  formatAuditAction(action: string): string {
    const actionMap: Record<string, string> = {
      'LOGIN': 'Logged in',
      'LOGOUT': 'Logged out',
      'CREATE_INBOX': 'Created inbox',
      'DELETE_INBOX': 'Deleted inbox',
      'BREACH_CHECK': 'Breach check performed',
      'ENABLE_2FA': 'Enabled 2FA',
      'CREATE_ALIAS': 'Created alias',
    };
    return actionMap[action] || action;
  },
};
