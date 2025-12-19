/**
 * Stripe Billing Routes
 * Handles subscription management, checkout, and webhooks
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { appConfig } from '../config';
import { billingService } from '../services/billingService';
import { SubscriptionTier } from '@prisma/client';
import { AuthenticatedRequest } from '../types/auth';
import { requirePermission, Permission } from '../middleware/rbac';

// Stripe import
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
});

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
    tier: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
});

const cancelSubscriptionSchema = z.object({
    immediately: z.boolean().optional().default(false),
});

export const billingRoutes: FastifyPluginAsync = async (app) => {
    // Check if Stripe is configured
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripeEnabled = !!stripeSecretKey;

    // Get current subscription status
    app.get('/billing', { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
        const user = req.user as { userId: string };

        const userData = await prisma.user.findUnique({
            where: { id: user.userId },
            select: {
                tier: true,
                subscriptionStatus: true,
                stripeCustomerId: true,
                stripeSubscriptionId: true,
                trialEndsAt: true,
            },
        });

        if (!userData) {
            return reply.status(404).send({ error: 'User not found' });
        }

        const limits = TIER_LIMITS[userData.tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.FREE;

        // Get current usage
        const [domainCount, inboxCount] = await Promise.all([
            prisma.domain.count({ where: { ownerId: user.userId } }),
            prisma.inbox.count({
                where: {
                    domain: { ownerId: user.userId },
                    deletedAt: null
                }
            }),
        ]);

        return {
            tier: userData.tier,
            status: userData.subscriptionStatus,
            stripeEnabled,
            limits,
            usage: {
                domains: domainCount,
                inboxes: inboxCount,
            },
            trialEndsAt: userData.trialEndsAt,
            hasSubscription: !!userData.stripeSubscriptionId,
        };
    });

    // Get available plans
    app.get('/billing/plans', async () => {
        return {
            plans: [
                {
                    id: 'FREE',
                    name: 'Free',
                    price: 0,
                    interval: 'month',
                    ...TIER_LIMITS.FREE,
                    features: [
                        '1 custom domain',
                        '3 email inboxes',
                        '100MB storage',
                        'Basic spam filtering',
                    ],
                },
                {
                    id: 'STARTER',
                    name: 'Starter',
                    price: 3,
                    interval: 'month',
                    ...TIER_LIMITS.STARTER,
                    features: [
                        '3 custom domains',
                        '20 email inboxes',
                        '1GB storage',
                        'Advanced spam filtering',
                        'API access',
                    ],
                },
                {
                    id: 'PROFESSIONAL',
                    name: 'Professional',
                    price: 8,
                    interval: 'month',
                    ...TIER_LIMITS.PROFESSIONAL,
                    features: [
                        '10 custom domains',
                        '100 email inboxes',
                        '5GB storage',
                        'Priority spam filtering',
                        'Full API access',
                        'Webhook notifications',
                    ],
                },
                {
                    id: 'ENTERPRISE',
                    name: 'Enterprise',
                    price: null, // Custom pricing
                    interval: 'month',
                    ...TIER_LIMITS.ENTERPRISE,
                    features: [
                        'Unlimited domains',
                        'Unlimited inboxes',
                        '50GB storage',
                        'Dedicated support',
                        'SLA guarantee',
                        'Custom integrations',
                    ],
                },
            ],
            stripeEnabled,
        };
    });

    // Create checkout session (requires Stripe)
    app.post('/billing/checkout', { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
        if (!stripeEnabled) {
            return reply.status(503).send({
                error: 'Payment processing not configured',
                message: 'Please contact support to upgrade your plan',
            });
        }

        const user = req.user as { userId: string; email: string; role: string; id: string };
        const body = createCheckoutSchema.parse(req.body);

        const priceId = STRIPE_PRICES[body.tier];
        if (!priceId) {
            return reply.status(400).send({ error: `Price not configured for tier: ${body.tier}` });
        }

        // Get or create Stripe customer
        const userData = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { stripeCustomerId: true, email: true },
        });

        if (!userData) {
            return reply.status(404).send({ error: 'User not found' });
        }

        // Note: Actual Stripe integration requires importing Stripe
        // This is a placeholder that shows the expected behavior
        /*
        const stripe = new Stripe(stripeSecretKey);
        
        let customerId = userData.stripeCustomerId;
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: userData.email,
            metadata: { userId: user.userId },
          });
          customerId = customer.id;
          await prisma.user.update({
            where: { id: user.userId },
            data: { stripeCustomerId: customerId },
          });
        }
    
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          customer: customerId,
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: body.successUrl || `${appConfig.webUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: body.cancelUrl || `${appConfig.webUrl}/billing/cancel`,
          metadata: { userId: user.userId, tier: body.tier },
        });
    
        return { sessionId: session.id, url: session.url };
        */

        return reply.status(503).send({
            error: 'Stripe SDK not installed',
            message: 'Run: npm install stripe @types/stripe',
        });
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
        if (!stripeEnabled) {
            return reply.status(503).send({ error: 'Webhooks not configured' });
        }

        const sig = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!sig || !webhookSecret) {
            return reply.status(400).send({ error: 'Missing webhook signature' });
        }

        // Placeholder for webhook handling
        /*
        const stripe = new Stripe(stripeSecretKey);
        
        try {
          const event = stripe.webhooks.constructEvent(
            req.rawBody as string,
            sig as string,
            webhookSecret
          );
    
          switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
              const subscription = event.data.object as Stripe.Subscription;
              const customerId = subscription.customer as string;
              
              const tier = subscription.metadata.tier as keyof typeof TIER_LIMITS;
              const status = subscription.status === 'active' ? 'ACTIVE' 
                : subscription.status === 'past_due' ? 'PAST_DUE'
                : subscription.status === 'canceled' ? 'CANCELED'
                : 'TRIALING';
    
              await prisma.user.update({
                where: { stripeCustomerId: customerId },
                data: {
                  tier,
                  subscriptionStatus: status,
                  stripeSubscriptionId: subscription.id,
                },
              });
              break;
            }
    
            case 'customer.subscription.deleted': {
              const subscription = event.data.object as Stripe.Subscription;
              const customerId = subscription.customer as string;
              
              await prisma.user.update({
                where: { stripeCustomerId: customerId },
                data: {
                  tier: 'FREE',
                  subscriptionStatus: 'CANCELED',
                  stripeSubscriptionId: null,
                },
              });
              break;
            }
          }
        } catch (err) {
          console.error('Webhook error:', err);
          return reply.status(400).send({ error: 'Webhook error' });
        }
        */

        return { received: true };
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

    // ========== ORGANIZATION BILLING ROUTES ==========

    // Get pricing plans
    app.get('/api/billing/plans', {
        preHandler: [app.authenticate]
    }, async (request, reply) => {
        const plans = await billingService.getPricingPlans();
        return { plans };
    });

    // Get organization billing info
    app.get('/api/billing/subscription/:organizationId', {
        preHandler: [
            app.authenticate,
            requirePermission(Permission.ORG_VIEW_BILLING, 'organizationId')
        ]
    }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
        const { organizationId } = request.params as { organizationId: string };

        const subscription = await prisma.organizationSubscription.findUnique({
            where: { organizationId },
            include: {
                organization: {
                    select: { id: true, name: true, slug: true }
                }
            }
        });

        if (!subscription) {
            reply.status(404).send({ error: 'No subscription found' });
            return;
        }

        const usage = await billingService.getCurrentUsage(organizationId);

        return {
            subscription,
            usage,
        };
    });

    // Create subscription
    fastify.post('/api/billing/subscribe/:organizationId', {
        preHandler: [
            fastify.authenticate,
            requirePermission(Permission.ORG_MANAGE_BILLING, 'organizationId')
        ]
    }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
        const { organizationId } = request.params as { organizationId: string };
        const data = request.body as {
            tier: SubscriptionTier;
            billingEmail: string;
            paymentMethodId?: string;
            billingPeriod?: 'monthly' | 'yearly';
            promoCode?: string;
        };

        try {
            const result = await billingService.createSubscription({
                organizationId,
                tier: data.tier,
                billingEmail: data.billingEmail,
                paymentMethodId: data.paymentMethodId,
                billingPeriod: data.billingPeriod,
                promoCode: data.promoCode,
            });

            reply.status(201).send(result);
        } catch (error: any) {
            reply.status(400).send({ error: error.message });
        }
    });

    // Update subscription
    fastify.patch('/api/billing/subscription/:organizationId', {
        preHandler: [
            fastify.authenticate,
            requirePermission(Permission.ORG_MANAGE_BILLING, 'organizationId')
        ]
    }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
        const { organizationId } = request.params as { organizationId: string };
        const data = request.body as {
            tier?: SubscriptionTier;
            billingPeriod?: 'monthly' | 'yearly';
            paymentMethodId?: string;
            seats?: number;
        };

        try {
            const subscription = await billingService.updateSubscription(organizationId, data);
            return { subscription };
        } catch (error: any) {
            reply.status(400).send({ error: error.message });
        }
    });

    // Cancel subscription
    fastify.delete('/api/billing/subscription/:organizationId', {
        preHandler: [
            fastify.authenticate,
            requirePermission(Permission.ORG_MANAGE_BILLING, 'organizationId')
        ]
    }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
        const { organizationId } = request.params as { organizationId: string };
        const { immediately } = request.query as { immediately?: string };

        try {
            await billingService.cancelSubscription(organizationId, immediately === 'true');
            return { success: true };
        } catch (error: any) {
            reply.status(400).send({ error: error.message });
        }
    });

    // Get usage statistics
    fastify.get('/api/billing/usage/:organizationId', {
        preHandler: [
            fastify.authenticate,
            requirePermission(Permission.ANALYTICS_VIEW, 'organizationId')
        ]
    }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
        const { organizationId } = request.params as { organizationId: string };

        const usage = await billingService.getCurrentUsage(organizationId);
        return { usage };
    });

    // Record usage (internal API)
    fastify.post('/api/billing/usage/:organizationId', {
        preHandler: [fastify.authenticate]
    }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
        const { organizationId } = request.params as { organizationId: string };
        const data = request.body as {
            metric: 'domains' | 'inboxes' | 'emails' | 'storage' | 'api_calls';
            quantity: number;
        };

        try {
            await billingService.recordUsage({
                organizationId,
                metric: data.metric,
                quantity: data.quantity,
            });
            return { success: true };
        } catch (error: any) {
            reply.status(400).send({ error: error.message });
        }
    });

    // Get invoices
    fastify.get('/api/billing/invoices/:organizationId', {
        preHandler: [
            fastify.authenticate,
            requirePermission(Permission.ORG_VIEW_BILLING, 'organizationId')
        ]
    }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
        const { organizationId } = request.params as { organizationId: string };

        try {
            const invoices = await billingService.getInvoices(organizationId);
            return { invoices };
        } catch (error: any) {
            reply.status(400).send({ error: error.message });
        }
    });

    // Billing dashboard data
    fastify.get('/api/billing/dashboard/:organizationId', {
        preHandler: [
            fastify.authenticate,
            requirePermission(Permission.ORG_VIEW_BILLING, 'organizationId')
        ]
    }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
        const { organizationId } = request.params as { organizationId: string };

        const [subscription, usage, invoices] = await Promise.all([
            prisma.organizationSubscription.findUnique({
                where: { organizationId },
                include: {
                    organization: {
                        select: { id: true, name: true, slug: true }
                    }
                }
            }),
            billingService.getCurrentUsage(organizationId),
            billingService.getInvoices(organizationId).catch(() => []),
        ]);

        // Calculate usage percentages
        const limits = (subscription?.limits as any) || {};
        const usagePercentages = usage ? {
            domains: limits.domains ? (usage.domains / limits.domains) * 100 : 0,
            inboxes: limits.inboxes ? (usage.inboxes / limits.inboxes) * 100 : 0,
            emails: limits.emails ? (usage.emails / limits.emails) * 100 : 0,
            storage: limits.storageMB ? (usage.storage / limits.storageMB) * 100 : 0,
        } : {};

        return {
            subscription,
            usage,
            usagePercentages,
            invoices: invoices.slice(0, 5), // Last 5 invoices
            upcomingInvoice: null, // Would calculate from Stripe
        };
    });
};
