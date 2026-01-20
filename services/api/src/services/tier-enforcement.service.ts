/**
 * TierEnforcementService - Centralized tier limits enforcement
 * Ensures users can only access features within their subscription tier
 *
 * Security: Prevents feature abuse and ensures fair billing
 * Professional: Single source of truth for all tier checks
 */

import { prisma } from '../lib/prisma';
import { TIER_LIMITS } from '../routes/billing';
import { SubscriptionTier } from '@prisma/client';

export type TierKey = keyof typeof TIER_LIMITS;
export type TierLimits = typeof TIER_LIMITS[TierKey];
export type LimitKey = keyof TierLimits;

interface EnforcementResult {
    allowed: boolean;
    currentCount: number;
    limit: number;
    message?: string;
    upgradeRequired?: TierKey;
}

interface UsageStats {
    domains: number;
    inboxes: number;
    webhooks: number;
    filters: number;
    labels: number;
    forwardingRules: number;
    teams: number;
    teamMembers: number;
    storageBytes: number;
    dailyEmailsSent: number;
}

/**
 * TierEnforcementService - Handles all tier-based access control
 */
export class TierEnforcementService {
    /**
     * Get tier limits for a user
     */
    static getLimits(tier: string): TierLimits {
        const tierKey = (tier || 'FREE') as TierKey;
        return TIER_LIMITS[tierKey] || TIER_LIMITS.FREE;
    }

    /**
     * Check if a limit value means unlimited (-1)
     */
    static isUnlimited(limit: number): boolean {
        return limit === -1;
    }

    /**
     * Get the next tier that provides more of a specific feature
     */
    static getUpgradeTier(currentTier: string, feature: LimitKey): TierKey | null {
        const tierOrder: TierKey[] = ['FREE', 'STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE'];
        const currentIndex = tierOrder.indexOf(currentTier as TierKey);
        const currentLimit = this.getLimits(currentTier)[feature];

        for (let i = currentIndex + 1; i < tierOrder.length; i++) {
            const nextTier = tierOrder[i];
            const nextLimit = TIER_LIMITS[nextTier][feature];

            if (typeof nextLimit === 'number' && typeof currentLimit === 'number') {
                if (this.isUnlimited(nextLimit) || nextLimit > currentLimit) {
                    return nextTier;
                }
            } else if (typeof nextLimit === 'boolean' && nextLimit === true) {
                return nextTier;
            }
        }
        return null;
    }

    /**
     * Check if user can create more of a resource
     */
    static async canCreate(
        userId: string,
        resource: 'domains' | 'inboxes' | 'webhooks' | 'filters' | 'labels' | 'forwardingRules' | 'teams'
    ): Promise<EnforcementResult> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { tier: true }
        });

        const tier = user?.tier || 'FREE';
        const limits = this.getLimits(tier);
        const limit = limits[resource] as number;

        // Get current count based on resource type
        let currentCount = 0;
        switch (resource) {
            case 'domains':
                currentCount = await prisma.domain.count({ where: { ownerId: userId } });
                break;
            case 'inboxes':
                currentCount = await prisma.inbox.count({ where: { ownerId: userId, deletedAt: null } });
                break;
            case 'webhooks':
                currentCount = await prisma.webhook.count({ where: { userId } });
                break;
            case 'filters':
                currentCount = await prisma.emailFilter.count({
                    where: { inbox: { ownerId: userId } }
                });
                break;
            case 'labels':
                currentCount = await prisma.label.count({
                    where: { inbox: { ownerId: userId } }
                });
                break;
            case 'forwardingRules':
                currentCount = await prisma.forwardingRule.count({ where: { userId } });
                break;
            case 'teams':
                currentCount = await prisma.team.count({ where: { ownerId: userId } });
                break;
        }

        // Check if unlimited or within limit
        if (this.isUnlimited(limit) || currentCount < limit) {
            return { allowed: true, currentCount, limit };
        }

        const upgradeRequired = this.getUpgradeTier(tier, resource);
        return {
            allowed: false,
            currentCount,
            limit,
            message: this.getLimitMessage(resource, limit, upgradeRequired),
            upgradeRequired: upgradeRequired || undefined
        };
    }

    /**
     * Check if user can add more team members
     */
    static async canAddTeamMember(userId: string, teamId: string): Promise<EnforcementResult> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { tier: true }
        });

        const tier = user?.tier || 'FREE';
        const limits = this.getLimits(tier);
        const limit = limits.teamMembers;

        // Count total members across all user's teams
        const totalMembers = await prisma.teamMember.count({
            where: { teamRef: { ownerId: userId } }
        });

        if (this.isUnlimited(limit) || totalMembers < limit) {
            return { allowed: true, currentCount: totalMembers, limit };
        }

        const upgradeRequired = this.getUpgradeTier(tier, 'teamMembers');
        return {
            allowed: false,
            currentCount: totalMembers,
            limit,
            message: `Bạn đã đạt giới hạn ${limit} thành viên team. Nâng cấp lên ${upgradeRequired} để thêm thành viên.`,
            upgradeRequired: upgradeRequired || undefined
        };
    }

    /**
     * Check if user has API access
     */
    static async hasApiAccess(userId: string): Promise<EnforcementResult> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { tier: true }
        });

        const tier = user?.tier || 'FREE';
        const limits = this.getLimits(tier);

        if (limits.apiAccess) {
            return { allowed: true, currentCount: 0, limit: 1 };
        }

        return {
            allowed: false,
            currentCount: 0,
            limit: 0,
            message: 'Truy cập API yêu cầu gói Khởi đầu trở lên. Vui lòng nâng cấp.',
            upgradeRequired: 'STARTER'
        };
    }

    /**
     * Check daily email sending limit
     */
    static async canSendEmail(userId: string): Promise<EnforcementResult> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { tier: true }
        });

        const tier = user?.tier || 'FREE';
        const limits = this.getLimits(tier);
        const limit = limits.dailyEmails;

        // Count emails sent today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sentToday = await prisma.outboundMessage.count({
            where: {
                userId,
                createdAt: { gte: today }
            }
        });

        if (this.isUnlimited(limit) || sentToday < limit) {
            return { allowed: true, currentCount: sentToday, limit };
        }

        const upgradeRequired = this.getUpgradeTier(tier, 'dailyEmails');
        return {
            allowed: false,
            currentCount: sentToday,
            limit,
            message: `Bạn đã gửi ${limit} email hôm nay. Giới hạn sẽ reset vào 00:00.`,
            upgradeRequired: upgradeRequired || undefined
        };
    }

    /**
     * Check storage limit
     */
    static async canUpload(userId: string, fileSizeBytes: number): Promise<EnforcementResult> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { tier: true }
        });

        const tier = user?.tier || 'FREE';
        const limits = this.getLimits(tier);
        const limitGB = limits.storageGB;
        const limitBytes = limitGB * 1024 * 1024 * 1024;

        // Calculate current storage usage
        const storageStats = await prisma.attachment.aggregate({
            where: {
                message: { inbox: { ownerId: userId } },
                deletedAt: null
            },
            _sum: { size: true }
        });

        const currentUsage = storageStats._sum.size || 0;
        const projectedUsage = currentUsage + fileSizeBytes;

        if (projectedUsage <= limitBytes) {
            return { allowed: true, currentCount: currentUsage, limit: limitBytes };
        }

        const upgradeRequired = this.getUpgradeTier(tier, 'storageGB');
        return {
            allowed: false,
            currentCount: currentUsage,
            limit: limitBytes,
            message: `Dung lượng lưu trữ đã đạt giới hạn ${limitGB}GB. Nâng cấp để có thêm dung lượng.`,
            upgradeRequired: upgradeRequired || undefined
        };
    }

    /**
     * Get user's complete usage statistics
     */
    static async getUsageStats(userId: string): Promise<UsageStats & { tier: string; limits: TierLimits }> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { tier: true }
        });

        const tier = user?.tier || 'FREE';
        const limits = this.getLimits(tier);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            domains,
            inboxes,
            webhooks,
            filters,
            labels,
            forwardingRules,
            teams,
            teamMembers,
            storageStats,
            dailyEmailsSent
        ] = await Promise.all([
            prisma.domain.count({ where: { ownerId: userId } }),
            prisma.inbox.count({ where: { ownerId: userId, deletedAt: null } }),
            prisma.webhook.count({ where: { userId } }),
            prisma.emailFilter.count({ where: { inbox: { ownerId: userId } } }),
            prisma.label.count({ where: { inbox: { ownerId: userId } } }),
            prisma.forwardingRule.count({ where: { userId } }),
            prisma.team.count({ where: { ownerId: userId } }),
            prisma.teamMember.count({ where: { teamRef: { ownerId: userId } } }),
            prisma.attachment.aggregate({
                where: { message: { inbox: { ownerId: userId } }, deletedAt: null },
                _sum: { size: true }
            }),
            prisma.outboundMessage.count({
                where: { userId, createdAt: { gte: today } }
            })
        ]);

        return {
            tier,
            limits,
            domains,
            inboxes,
            webhooks,
            filters,
            labels,
            forwardingRules,
            teams,
            teamMembers,
            storageBytes: storageStats._sum.size || 0,
            dailyEmailsSent
        };
    }

    /**
     * Get user-friendly limit message
     */
    private static getLimitMessage(resource: string, limit: number, upgradeTier: TierKey | null): string {
        const resourceNames: Record<string, string> = {
            domains: 'tên miền',
            inboxes: 'hộp thư',
            webhooks: 'webhook',
            filters: 'bộ lọc',
            labels: 'nhãn',
            forwardingRules: 'quy tắc chuyển tiếp',
            teams: 'team'
        };

        const tierNames: Record<TierKey, string> = {
            FREE: 'Miễn phí',
            STARTER: 'Khởi đầu',
            PROFESSIONAL: 'Chuyên nghiệp',
            BUSINESS: 'Doanh nghiệp',
            ENTERPRISE: 'Enterprise'
        };

        const name = resourceNames[resource] || resource;
        const upgradeText = upgradeTier ? ` Nâng cấp lên ${tierNames[upgradeTier]} để có thêm.` : '';

        return `Bạn đã đạt giới hạn ${limit} ${name}.${upgradeText}`;
    }
}

/**
 * Fastify preHandler factory for tier enforcement
 * Usage: { preHandler: [app.authenticate, tierEnforce('webhooks')] }
 */
export function createTierEnforceHandler(resource: Parameters<typeof TierEnforcementService.canCreate>[1]) {
    return async (request: any, reply: any) => {
        const userId = request.user?.userId;
        if (!userId) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }

        const result = await TierEnforcementService.canCreate(userId, resource);
        if (!result.allowed) {
            return reply.status(403).send({
                error: 'TIER_LIMIT_EXCEEDED',
                message: result.message,
                currentCount: result.currentCount,
                limit: result.limit,
                upgradeRequired: result.upgradeRequired
            });
        }
    };
}

/**
 * API Access enforcement preHandler
 */
export async function enforceApiAccess(request: any, reply: any) {
    const userId = request.user?.userId;
    if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
    }

    const result = await TierEnforcementService.hasApiAccess(userId);
    if (!result.allowed) {
        return reply.status(403).send({
            error: 'API_ACCESS_DENIED',
            message: result.message,
            upgradeRequired: result.upgradeRequired
        });
    }
}

/**
 * Daily email limit enforcement preHandler
 */
export async function enforceDailyEmailLimit(request: any, reply: any) {
    const userId = request.user?.userId;
    if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
    }

    const result = await TierEnforcementService.canSendEmail(userId);
    if (!result.allowed) {
        return reply.status(429).send({
            error: 'DAILY_EMAIL_LIMIT_EXCEEDED',
            message: result.message,
            currentCount: result.currentCount,
            limit: result.limit,
            upgradeRequired: result.upgradeRequired
        });
    }
}
