import { PrismaClient, OrganizationRole, SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();

// Initialize Stripe with secret key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export interface CreateSubscriptionData {
  organizationId: string;
  tier: SubscriptionTier;
  billingEmail: string;
  paymentMethodId?: string;
  billingPeriod?: 'monthly' | 'yearly';
  promoCode?: string;
}

export interface UpdateSubscriptionData {
  tier?: SubscriptionTier;
  billingPeriod?: 'monthly' | 'yearly';
  paymentMethodId?: string;
  seats?: number; // For per-seat pricing
}

export interface UsageRecord {
  organizationId: string;
  metric: 'domains' | 'inboxes' | 'emails' | 'storage' | 'api_calls';
  quantity: number;
  timestamp?: Date;
}

/**
 * Organization billing service
 */
export class BillingService {
  /**
   * Create or update Stripe customer for organization
   */
  async createOrUpdateStripeCustomer(
    organizationId: string,
    email: string,
    name?: string
  ): Promise<string> {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subscriptions: true,
      },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const subscription = organization.subscriptions[0];

    if (subscription?.stripeCustomerId) {
      // Update existing customer
      const customer = await stripe.customers.update(subscription.stripeCustomerId, {
        email,
        name: name || organization.name,
        metadata: {
          organizationId,
          organizationSlug: organization.slug,
        },
      });
      return customer.id;
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email,
        name: name || organization.name,
        metadata: {
          organizationId,
          organizationSlug: organization.slug,
        },
      });

      // Update subscription with customer ID
      if (subscription) {
        await prisma.organizationSubscription.update({
          where: { id: subscription.id },
          data: { stripeCustomerId: customer.id },
        });
      }

      return customer.id;
    }
  }

  /**
   * Get pricing plans
   */
  async getPricingPlans() {
    // Prices would typically be stored in Stripe and retrieved from there
    // For now, return hardcoded plans
    return {
      monthly: {
        [SubscriptionTier.FREE]: {
          price: 0,
          features: [
            '1 domain',
            '5 inboxes',
            '100 emails/month',
            'Basic support',
          ],
        },
        [SubscriptionTier.STARTER]: {
          price: 29,
          features: [
            '3 domains',
            '25 inboxes',
            '1,000 emails/month',
            'API access',
            'Email support',
          ],
        },
        [SubscriptionTier.PROFESSIONAL]: {
          price: 99,
          features: [
            '10 domains',
            '100 inboxes',
            '10,000 emails/month',
            'Advanced API',
            'Priority support',
            'Webhooks',
          ],
        },
        [SubscriptionTier.ENTERPRISE]: {
          price: 299,
          features: [
            'Unlimited domains',
            'Unlimited inboxes',
            '100,000 emails/month',
            'Custom integrations',
            'Dedicated support',
            'SLA guarantee',
          ],
        },
      },
      yearly: {
        [SubscriptionTier.FREE]: {
          price: 0,
          features: [
            '1 domain',
            '5 inboxes',
            '100 emails/month',
            'Basic support',
          ],
          discount: 0,
        },
        [SubscriptionTier.STARTER]: {
          price: 290, // 2 months free
          features: [
            '3 domains',
            '25 inboxes',
            '1,000 emails/month',
            'API access',
            'Email support',
          ],
          discount: 17,
        },
        [SubscriptionTier.PROFESSIONAL]: {
          price: 990, // 2 months free
          features: [
            '10 domains',
            '100 inboxes',
            '10,000 emails/month',
            'Advanced API',
            'Priority support',
            'Webhooks',
          ],
          discount: 17,
        },
        [SubscriptionTier.ENTERPRISE]: {
          price: 2990, // 2 months free
          features: [
            'Unlimited domains',
            'Unlimited inboxes',
            '100,000 emails/month',
            'Custom integrations',
            'Dedicated support',
            'SLA guarantee',
          ],
          discount: 17,
        },
      },
    };
  }

  /**
   * Create subscription for organization
   */
  async createSubscription(data: CreateSubscriptionData) {
    const organization = await prisma.organization.findUnique({
      where: { id: data.organizationId },
      include: {
        subscriptions: true,
      },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Get or create Stripe customer
    const customerId = await this.createOrUpdateStripeCustomer(
      data.organizationId,
      data.billingEmail
    );

    // Get price ID for the tier and billing period
    const priceId = await this.getPriceId(data.tier, data.billingPeriod || 'monthly');

    // Create Stripe subscription
    const stripeSubscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card'],
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        organizationId: data.organizationId,
        tier: data.tier,
      },
    });

    // Update or create organization subscription
    const subscription = await prisma.organizationSubscription.upsert({
      where: { organizationId: data.organizationId },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: priceId,
        tier: data.tier,
        status: SubscriptionStatus.TRIALING,
        billingEmail: data.billingEmail,
        billingPeriod: data.billingPeriod || 'monthly',
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        trialEndsAt: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000)
          : null,
        usage: {},
        limits: this.getLimitsForTier(data.tier),
      },
      create: {
        organizationId: data.organizationId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: priceId,
        tier: data.tier,
        status: SubscriptionStatus.TRIALING,
        billingEmail: data.billingEmail,
        billingPeriod: data.billingPeriod || 'monthly',
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        trialEndsAt: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000)
          : null,
        usage: {},
        limits: this.getLimitsForTier(data.tier),
      },
    });

    return {
      subscription,
      clientSecret: (stripeSubscription.latest_invoice as any)?.payment_intent?.client_secret,
    };
  }

  /**
   * Update subscription
   */
  async updateSubscription(organizationId: string, data: UpdateSubscriptionData) {
    const subscription = await prisma.organizationSubscription.findUnique({
      where: { organizationId },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    );

    // Update subscription items if tier changed
    if (data.tier && data.tier !== subscription.tier) {
      const priceId = await this.getPriceId(data.tier, subscription.billingPeriod);

      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: [{
          id: stripeSubscription.items.data[0].id,
          price: priceId,
        }],
        proration_behavior: 'create_prorations',
        metadata: {
          organizationId,
          tier: data.tier,
        },
      });

      // Update local subscription
      await prisma.organizationSubscription.update({
        where: { organizationId },
        data: {
          tier: data.tier,
          stripePriceId: priceId,
          limits: this.getLimitsForTier(data.tier),
        },
      });
    }

    // Update billing period if changed
    if (data.billingPeriod && data.billingPeriod !== subscription.billingPeriod) {
      const priceId = await this.getPriceId(
        subscription.tier,
        data.billingPeriod
      );

      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: [{
          id: stripeSubscription.items.data[0].id,
          price: priceId,
        }],
        proration_behavior: 'create_prorations',
      });

      await prisma.organizationSubscription.update({
        where: { organizationId },
        data: {
          billingPeriod: data.billingPeriod,
          stripePriceId: priceId,
        },
      });
    }

    return prisma.organizationSubscription.findUnique({
      where: { organizationId },
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(organizationId: string, immediately = false) {
    const subscription = await prisma.organizationSubscription.findUnique({
      where: { organizationId },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    if (immediately) {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    } else {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    // Update local subscription
    await prisma.organizationSubscription.update({
      where: { organizationId },
      data: {
        status: immediately ? SubscriptionStatus.CANCELED : SubscriptionStatus.ACTIVE,
      },
    });

    return { success: true };
  }

  /**
   * Record usage for metered billing
   */
  async recordUsage(record: UsageRecord) {
    const subscription = await prisma.organizationSubscription.findUnique({
      where: { organizationId: record.organizationId },
    });

    if (!subscription) {
      throw new Error('No subscription found for organization');
    }

    // Update usage in database
    const currentUsage = (subscription.usage as any) || {};
    const metricKey = `${record.metric}_${new Date().toISOString().slice(0, 7)}`; // YYYY-MM

    currentUsage[metricKey] = (currentUsage[metricKey] || 0) + record.quantity;

    await prisma.organizationSubscription.update({
      where: { organizationId: record.organizationId },
      data: {
        usage: currentUsage as any,
      },
    });

    // If using Stripe metered billing, also record there
    if (subscription.stripeSubscriptionId) {
      // This would require setting up metered pricing in Stripe
      // For now, we'll just track locally
    }
  }

  /**
   * Get current usage for organization
   */
  async getCurrentUsage(organizationId: string) {
    const subscription = await prisma.organizationSubscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) {
      return null;
    }

    // Calculate current month usage
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usage = (subscription.usage as any) || {};

    return {
      domains: await prisma.domain.count({
        where: { organizationId },
      }),
      inboxes: await prisma.inbox.count({
        where: {
          domain: { organizationId },
          deletedAt: null,
        },
      }),
      emails: await prisma.message.count({
        where: {
          inbox: { domain: { organizationId } },
          receivedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      apiCalls: usage[`api_calls_${currentMonth}`] || 0,
      storage: 0, // Would need to calculate from actual storage usage
    };
  }

  /**
   * Get invoices for organization
   */
  async getInvoices(organizationId: string) {
    const subscription = await prisma.organizationSubscription.findUnique({
      where: { organizationId },
    });

    if (!subscription?.stripeCustomerId) {
      return [];
    }

    const invoices = await stripe.invoices.list({
      customer: subscription.stripeCustomerId,
      limit: 100,
    });

    return invoices.data.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      status: invoice.status,
      created: new Date(invoice.created * 1000),
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
    }));
  }

  /**
   * Get payment methods for organization
   */
  async getPaymentMethods(organizationId: string) {
    const subscription = await prisma.organizationSubscription.findUnique({
      where: { organizationId },
    });

    if (!subscription?.stripeCustomerId) {
      return [];
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: subscription.stripeCustomerId,
      type: 'card',
    });

    return paymentMethods.data.map(pm => ({
      id: pm.id,
      type: pm.type,
      card: {
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
      },
      isDefault: pm.id === subscription.paymentMethodId,
    }));
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(organizationId: string, paymentMethodId: string) {
    const subscription = await prisma.organizationSubscription.findUnique({
      where: { organizationId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new Error('No Stripe customer found');
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: subscription.stripeCustomerId,
    });

    // Set as default
    await stripe.customers.update(subscription.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Update subscription
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        default_payment_method: paymentMethodId,
      });
    }

    await prisma.organizationSubscription.update({
      where: { organizationId },
      data: { paymentMethodId },
    });
  }

  /**
   * Get price ID for tier and billing period
   */
  private async getPriceId(tier: SubscriptionTier, billingPeriod: 'monthly' | 'yearly'): Promise<string> {
    // In a real implementation, these would be retrieved from Stripe
    // For now, return mock IDs
    const priceMap: Record<string, string> = {
      'FREE_monthly': 'price_free_monthly',
      'STARTER_monthly': 'price_starter_monthly',
      'PROFESSIONAL_monthly': 'price_professional_monthly',
      'ENTERPRISE_monthly': 'price_enterprise_monthly',
      'STARTER_yearly': 'price_starter_yearly',
      'PROFESSIONAL_yearly': 'price_professional_yearly',
      'ENTERPRISE_yearly': 'price_enterprise_yearly',
    };

    const key = tier === SubscriptionTier.FREE ? 'FREE_monthly' : `${tier}_${billingPeriod}`;
    return priceMap[key] || 'price_default';
  }

  /**
   * Get limits for subscription tier
   */
  private getLimitsForTier(tier: SubscriptionTier) {
    switch (tier) {
      case SubscriptionTier.FREE:
        return {
          domains: 1,
          inboxes: 5,
          members: 2,
          apiKeys: 1,
          webhooks: 0,
          emails: 100,
          storageMB: 100,
        };
      case SubscriptionTier.STARTER:
        return {
          domains: 3,
          inboxes: 25,
          members: 5,
          apiKeys: 5,
          webhooks: 3,
          emails: 1000,
          storageMB: 1000,
        };
      case SubscriptionTier.PROFESSIONAL:
        return {
          domains: 10,
          inboxes: 100,
          members: 20,
          apiKeys: 20,
          webhooks: 10,
          emails: 10000,
          storageMB: 10000,
        };
      case SubscriptionTier.ENTERPRISE:
        return {
          domains: null, // unlimited
          inboxes: null,
          members: null,
          apiKeys: null,
          webhooks: null,
          emails: null,
          storageMB: null,
        };
      default:
        return this.getLimitsForTier(SubscriptionTier.FREE);
    }
  }

  /**
   * Process webhook from Stripe
   */
  async processWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    const organizationId = invoice.metadata?.organizationId;
    if (!organizationId) return;

    await prisma.organizationSubscription.update({
      where: { organizationId },
      data: {
        status: SubscriptionStatus.ACTIVE,
      },
    });

    // TODO: Send payment confirmation email
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const organizationId = invoice.metadata?.organizationId;
    if (!organizationId) return;

    await prisma.organizationSubscription.update({
      where: { organizationId },
      data: {
        status: SubscriptionStatus.PAST_DUE,
      },
    });

    // TODO: Send payment failure notification
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const organizationId = subscription.metadata?.organizationId;
    if (!organizationId) return;

    await prisma.organizationSubscription.update({
      where: { organizationId },
      data: {
        status: subscription.status === 'active' ? SubscriptionStatus.ACTIVE : SubscriptionStatus.PAST_DUE,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const organizationId = subscription.metadata?.organizationId;
    if (!organizationId) return;

    await prisma.organizationSubscription.update({
      where: { organizationId },
      data: {
        status: SubscriptionStatus.CANCELED,
        stripeSubscriptionId: null,
      },
    });
  }
}

export const billingService = new BillingService();