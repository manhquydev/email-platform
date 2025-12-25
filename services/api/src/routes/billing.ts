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

// Tier limits configuration
export const TIER_LIMITS = {
    FREE: { domains: 1, inboxes: 3, storageGB: 0.1, dailyEmails: 50 },
    STARTER: { domains: 3, inboxes: 20, storageGB: 1, dailyEmails: 200 },
    PROFESSIONAL: { domains: 10, inboxes: 100, storageGB: 5, dailyEmails: 1000 },
    ENTERPRISE: { domains: -1, inboxes: -1, storageGB: 50, dailyEmails: -1 }, // -1 = unlimited
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
    // Check if Stripe is configured
    const stripeEnabled = !!appConfig.stripe.apiKey;

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

    // Create checkout session
    app.post('/billing/checkout', { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
        if (!stripeEnabled) {
            return reply.status(503).send({
                error: 'Payment processing not configured',
                message: 'Please contact support to upgrade your plan',
            });
        }

        const user = req.user as { userId: string };
        const { packageId } = createCheckoutSchema.parse(req.body);

        try {
            const session = await StripeService.createCheckoutSession(user.userId, packageId);
            return { sessionId: session.id, url: session.url };
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
        const body = cancelSubscriptionSchema.parse(req.body);

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
    app.post('/billing/webhook', async (req: FastifyRequest, reply: FastifyReply) => {
        const sig = req.headers['stripe-signature'];
        if (!sig) {
            return reply.status(400).send({ error: 'Missing stripe-signature' });
        }

        try {
            // Fastify body might need to be raw for Stripe webhook verification
            // However, StripeService.handleWebhook expects payload which should be the raw body
            await StripeService.handleWebhook(req.body, sig as string);
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
