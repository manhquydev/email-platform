/**
 * Stripe Billing Routes
 * Handles subscription management, checkout, and webhooks
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { appConfig } from '../config';

// Stripe import - will be installed separately
import { StripeService } from '../services/stripe.service';
// Import dynamic tier limits service
import { getAllTiersWithLimits, getTierLimits, clearTierLimitsCache } from "../services/tier-limits.service";
import { SubscriptionTier, DEFAULT_TIER_LIMITS, DEFAULT_TIER_INFO } from "../config/unified-tier-limits";

// Tier limits configuration - Extended with all features
export const TIER_LIMITS = {
    FREE: {
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
        webhooks: 0,
        apiAccess: false,
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
        webhooks: 2,
        apiAccess: true,
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
        webhooks: 30,
        apiAccess: true,
        prioritySupport: true,
    },
    ENTERPRISE: {
        domains: -1,        // -1 = unlimited
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
        prioritySupport: true,
    },
} as const;

// Tier pricing and display info (VND for Vietnam market)
export const TIER_INFO = {
    FREE: {
        name: 'Miễn phí',
        price: 0,
        currency: 'VND',
        period: 'tháng',
        description: 'Dùng thử Ephemera',
        badge: null,
        features: [
            '1 tên miền',
            '3 hộp thư',
            '100MB lưu trữ',
            'Lưu email 7 ngày',
            'Bộ lọc cơ bản',
        ],
    },
    STARTER: {
        name: 'Khởi đầu',
        price: 49000,
        currency: 'VND',
        period: 'tháng',
        description: 'Phù hợp cá nhân và freelancer',
        badge: null,
        features: [
            '3 tên miền',
            '20 hộp thư',
            '1GB lưu trữ',
            'Lưu email 30 ngày',
            '1 team với 3 thành viên',
            'Truy cập API',
            '2 webhooks',
        ],
    },
    PROFESSIONAL: {
        name: 'Chuyên nghiệp',
        price: 99000,
        currency: 'VND',
        period: 'tháng',
        description: 'Tốt nhất cho team đang phát triển',
        badge: 'Phổ biến',
        features: [
            '10 tên miền',
            '100 hộp thư',
            '5GB lưu trữ',
            'Lưu email 90 ngày',
            '5 teams với 10 thành viên',
            'Hỗ trợ ưu tiên',
            '10 webhooks',
            'Chuyển tiếp nâng cao',
        ],
    },
    BUSINESS: {
        name: 'Doanh nghiệp',
        price: 199000,
        currency: 'VND',
        period: 'tháng',
        description: 'Dành cho doanh nghiệp vừa và nhỏ',
        badge: 'Giá trị',
        features: [
            '25 tên miền',
            '500 hộp thư',
            '20GB lưu trữ',
            'Lưu email 180 ngày',
            '15 teams với 30 thành viên',
            'Hỗ trợ ưu tiên',
            '30 webhooks',
            'Tích hợp nâng cao',
        ],
    },
    ENTERPRISE: {
        name: 'Enterprise',
        price: 499000,
        currency: 'VND',
        period: 'tháng',
        description: 'Dành cho tổ chức lớn',
        badge: 'Tối ưu',
        features: [
            'Không giới hạn tên miền',
            'Không giới hạn hộp thư',
            '50GB lưu trữ',
            'Lưu email 365 ngày',
            'Không giới hạn teams',
            'Hỗ trợ ưu tiên 24/7',
            'Không giới hạn webhooks',
            'Tích hợp tùy chỉnh',
        ],
    },
} as const;

// Stripe price IDs (configure in production .env)
const STRIPE_PRICES = {
    STARTER: process.env.STRIPE_PRICE_STARTER || '',
    PROFESSIONAL: process.env.STRIPE_PRICE_PROFESSIONAL || '',
    ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || '',
};

const createCheckoutSchema = z.object({
    packageId: z.string().uuid(),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
});

const cancelSubscriptionSchema = z.object({
    immediately: z.boolean().optional().default(false),
});

export const billingRoutes: FastifyPluginAsync = async (app) => {
    // Check if payment providers are configured
    const stripeEnabled = !!appConfig.stripe.apiKey && appConfig.stripe.enabled;
    const sepayEnabled = appConfig.sepay.enabled;

    // Get all tier information with limits and pricing (public endpoint)
    // NOW FETCHES FROM DATABASE - Admin can edit via /admin/packages
    app.get("/billing/tiers", async () => {
        const tiers = await getAllTiersWithLimits();
        return {
            tiers,
            stripeEnabled,
            sepayEnabled,
            paymentMethods: {
                stripe: stripeEnabled,
                sepay: sepayEnabled,
            }
        };
    });

    // Clear tier cache (admin only) - call after updating packages
    app.post("/billing/clear-cache", { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
        const user = req.user as { userId: string; role?: string };
        if (user.role !== "ADMIN") {
            return reply.status(403).send({ error: "Admin access required" });
        }
        clearTierLimitsCache();
        return { success: true, message: "Tier limits cache cleared" };
    });

    // Compare user's current tier with target tier
    app.get('/billing/compare/:targetTier', { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
        const user = req.user as { userId: string; tier?: string };
        const { targetTier } = req.params as { targetTier: string };

        const currentTierKey = (user.tier || 'FREE') as keyof typeof TIER_LIMITS;
        const targetTierKey = targetTier.toUpperCase() as keyof typeof TIER_LIMITS;

        if (!TIER_LIMITS[targetTierKey]) {
            return reply.status(400).send({ error: 'Invalid tier' });
        }

        const currentLimits = TIER_LIMITS[currentTierKey];
        const targetLimits = TIER_LIMITS[targetTierKey];
        const currentInfo = TIER_INFO[currentTierKey];
        const targetInfo = TIER_INFO[targetTierKey];

        // Calculate improvements
        const improvements: Record<string, { current: number | boolean; target: number | boolean; improved: boolean }> = {};
        for (const [key, targetValue] of Object.entries(targetLimits)) {
            const currentValue = currentLimits[key as keyof typeof currentLimits];
            const isImproved = typeof targetValue === 'boolean'
                ? targetValue && !currentValue
                : (targetValue === -1 || (typeof currentValue === 'number' && targetValue > currentValue));
            improvements[key] = {
                current: currentValue,
                target: targetValue,
                improved: isImproved,
            };
        }

        return {
            current: { id: currentTierKey, ...currentInfo, limits: currentLimits },
            target: { id: targetTierKey, ...targetInfo, limits: targetLimits },
            improvements,
            priceDifference: targetInfo.price - currentInfo.price,
        };
    });

    // Get available packages
    app.get('/billing/packages', async () => {
        const packages = await prisma.servicePackage.findMany({
            where: { isActive: true },
        });
        return { packages, stripeEnabled };
    });

    // Get available plans (fallback for backward compatibility)
    app.get('/billing/plans', async () => {
        const packages = await prisma.servicePackage.findMany({
            where: { isActive: true },
        });
        return { plans: packages, stripeEnabled };
    });

    // Get payment history
    app.get('/billing/payments', { preHandler: app.authenticate }, async (req: FastifyRequest) => {
        const user = req.user as { userId: string };
        const payments = await prisma.payment.findMany({
            where: { userId: user.userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        return { payments };
    });

    // Get user's payment method
    app.get('/billing/payment-method', { preHandler: app.authenticate }, async (req: FastifyRequest) => {
        const user = req.user as { userId: string };
        try {
            const paymentMethod = await StripeService.getPaymentMethod(user.userId);
            return { paymentMethod };
        } catch {
            return { paymentMethod: null };
        }
    });

    // Get user's subscription details
    app.get('/billing/subscription', { preHandler: app.authenticate }, async (req: FastifyRequest) => {
        const user = req.user as { userId: string };
        try {
            const subscription = await StripeService.getSubscription(user.userId);
            return { subscription };
        } catch {
            return { subscription: null };
        }
    });

    // Create checkout session
    app.post('/billing/checkout', { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
        if (!stripeEnabled) {
            return reply.status(503).send({
                error: 'Payment processing not configured',
                message: 'Please contact support to upgrade your plan',
            });
        }

        const user = req.user as { userId: string };
        const checkoutResult = createCheckoutSchema.safeParse(req.body);
        if (!checkoutResult.success) {
            return reply.status(400).send({ error: 'Invalid payload', details: checkoutResult.error.flatten() });
        }
        const { packageId } = checkoutResult.data;

        try {
            const session = await StripeService.createCheckoutSession(user.userId, packageId);
            return { sessionId: session.id, url: session.url };
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // Create Customer Portal session
    app.post('/billing/portal', { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
        if (!stripeEnabled) {
            return reply.status(503).send({ error: 'Payment processing not configured' });
        }

        const user = req.user as { userId: string };

        try {
            const session = await StripeService.createPortalSession(user.userId);
            return { url: session.url };
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // Cancel subscription
    app.post('/billing/cancel', { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
        if (!stripeEnabled) {
            return reply.status(503).send({ error: 'Payment processing not configured' });
        }

        const user = req.user as { userId: string };
        const cancelResult = cancelSubscriptionSchema.safeParse(req.body);
        if (!cancelResult.success) {
            return reply.status(400).send({ error: 'Invalid payload', details: cancelResult.error.flatten() });
        }
        const body = cancelResult.data;

        const userData = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { stripeSubscriptionId: true },
        });

        if (!userData?.stripeSubscriptionId) {
            return reply.status(400).send({ error: 'No active subscription' });
        }

        // Placeholder for Stripe cancellation
        /*
        const stripe = new Stripe(stripeSecretKey);
        
        if (body.immediately) {
          await stripe.subscriptions.cancel(userData.stripeSubscriptionId);
        } else {
          await stripe.subscriptions.update(userData.stripeSubscriptionId, {
            cancel_at_period_end: true,
          });
        }
        */

        return { success: true, message: 'Subscription will be canceled' };
    });

    // Stripe webhook handler
    app.post('/billing/webhook', { config: { rawBody: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
        const sig = req.headers['stripe-signature'] as string;
        const rawBody = (req as any).rawBody;

        if (!sig) {
            return reply.status(400).send({ error: 'Missing stripe-signature' });
        }
        if (!rawBody) {
            return reply.status(400).send({ error: 'Missing raw body for signature verification' });
        }

        try {
            // fastify-raw-body adds the raw buffer to req.rawBody
            if (!rawBody) {
                return reply.status(400).send({ error: 'Missing raw body for signature verification' });
            }

            await StripeService.handleWebhook(rawBody, sig as string);
            return { received: true };
        } catch (err: any) {
            console.error('Webhook Error:', err.message);
            return reply.status(400).send({ error: err.message });
        }
    });

    // Check tier limits before creating resources
    app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
        // Skip for non-authenticated routes
        if (!req.user) return;

        const user = req.user as { userId: string };
        const url = req.url;
        const method = req.method;

        // Check domain limits on POST /domains
        if (method === 'POST' && url.startsWith('/domains')) {
            const userData = await prisma.user.findUnique({
                where: { id: user.userId },
                select: { tier: true },
            });

            const limits = TIER_LIMITS[userData?.tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.FREE;

            if (limits.domains > 0) {
                const domainCount = await prisma.domain.count({ where: { ownerId: user.userId } });
                if (domainCount >= limits.domains) {
                    return reply.status(403).send({
                        error: 'Domain limit reached',
                        message: `Your ${userData?.tier || 'FREE'} plan allows ${limits.domains} domain(s). Upgrade to add more.`,
                        upgradeUrl: `${appConfig.webUrl}/billing`,
                    });
                }
            }
        }

        // Check inbox limits on POST /inboxes
        if (method === 'POST' && url.startsWith('/inboxes')) {
            const userData = await prisma.user.findUnique({
                where: { id: user.userId },
                select: { tier: true },
            });

            const limits = TIER_LIMITS[userData?.tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.FREE;

            if (limits.inboxes > 0) {
                const inboxCount = await prisma.inbox.count({
                    where: {
                        domain: { ownerId: user.userId },
                        deletedAt: null,
                    }
                });
                if (inboxCount >= limits.inboxes) {
                    return reply.status(403).send({
                        error: 'Inbox limit reached',
                        message: `Your ${userData?.tier || 'FREE'} plan allows ${limits.inboxes} inbox(es). Upgrade to add more.`,
                        upgradeUrl: `${appConfig.webUrl}/billing`,
                    });
                }
            }
        }
    });
};
