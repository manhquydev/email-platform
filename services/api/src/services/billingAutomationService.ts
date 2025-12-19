import { PrismaClient, SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';
import { recordAudit } from '../utils/audit';
import { quotaService } from './quotaService';

const prisma = new PrismaClient();

export interface BillingMetrics {
  totalRevenue: number;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  activeSubscriptions: number;
  churnRate: number;
  ltv: number; // Lifetime Value
  cac: number; // Customer Acquisition Cost
}

export interface UsageReport {
  organizationId: string;
  period: string;
  usage: {
    domains: number;
    inboxes: number;
    members: number;
    apiCalls: number;
    emails: number;
    storageGB: number;
  };
  costs: {
    baseCost: number;
    overageCosts: {
      domains: number;
      inboxes: number;
      members: number;
      apiCalls: number;
      emails: number;
      storage: number;
    };
  };
  totalCost: number;
}

export class BillingAutomationService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    });
  }

  /**
   * Calculate monthly usage costs for an organization
   */
  async calculateUsageCosts(
    organizationId: string,
    period: { from: Date; to: Date }
  ): Promise<UsageReport> {
    // Get subscription
    const subscription = await prisma.organizationSubscription.findUnique({
      where: { organizationId },
      include: {
        organization: true
      }
    });

    if (!subscription) {
      throw new Error('No subscription found for organization');
    }

    // Get current usage
    const usage = await this.getUsageMetrics(organizationId, period);

    // Get quota limits
    const limits = await quotaService.getQuotaLimits(organizationId);

    // Calculate overages
    const overageCosts = {
      domains: this.calculateOverageCost(
        usage.domains,
        limits.domains || 0,
        10 // $10 per additional domain
      ),
      inboxes: this.calculateOverageCost(
        usage.inboxes,
        limits.inboxes || 0,
        0.5 // $0.50 per additional inbox
      ),
      members: this.calculateOverageCost(
        usage.members,
        limits.members || 0,
        5 // $5 per additional member
      ),
      apiCalls: this.calculateOverageCost(
        usage.apiCalls,
        limits.apiCallsPerMinute || 0 * 43200, // Convert per-minute to monthly
        0.0001 // $0.10 per 1000 additional API calls
      ),
      emails: this.calculateOverageCost(
        usage.emails,
        limits.emailsPerMonth || 0,
        0.001 // $0.001 per additional email
      ),
      storage: this.calculateOverageCost(
        usage.storageGB,
        (limits.storageMB || 0) / 1024, // Convert MB to GB
        0.1 // $0.10 per additional GB
      )
    };

    const totalOverage = Object.values(overageCosts).reduce((sum, cost) => sum + cost, 0);

    // Get base subscription cost
    let baseCost = 0;
    try {
      const stripeSubscription = await this.stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
      baseCost = stripeSubscription.items.data[0]?.price.unit_amount || 0;
      baseCost = baseCost / 100; // Convert from cents
    } catch (error) {
      console.error('Failed to fetch Stripe subscription:', error);
    }

    const report: UsageReport = {
      organizationId,
      period: period.from.toISOString().split('T')[0],
      usage,
      costs: {
        baseCost,
        overageCosts
      },
      totalCost: baseCost + totalOverage
    };

    return report;
  }

  /**
   * Process monthly billing
   */
  async processMonthlyBilling(): Promise<{
    processed: number;
    errors: string[];
    totalAmount: number;
  }> {
    const errors: string[] = [];
    let processed = 0;
    let totalAmount = 0;

    // Get all active subscriptions
    const subscriptions = await prisma.organizationSubscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE
      },
      include: {
        organization: true
      }
    });

    for (const subscription of subscriptions) {
      try {
        // Calculate usage for the month
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const report = await this.calculateUsageCosts(subscription.organizationId, {
          from: monthStart,
          to: monthEnd
        });

        // Process overages if any
        if (Object.values(report.costs.overageCosts).some(cost => cost > 0)) {
          await this.processOverageInvoice(subscription, report);
        }

        // Record usage in subscription
        await prisma.organizationSubscription.update({
          where: { id: subscription.id },
          data: {
            usage: report.usage,
            updatedAt: new Date()
          }
        });

        // Send usage report
        await this.sendUsageReport(subscription.organizationId, report);

        processed++;
        totalAmount += report.totalCost;

      } catch (error: any) {
        errors.push(`Failed to process billing for ${subscription.organizationId}: ${error.message}`);
      }
    }

    return { processed, errors, totalAmount };
  }

  /**
   * Process overage invoice
   */
  private async processOverageInvoice(
    subscription: any,
    report: UsageReport
  ): Promise<void> {
    const overageItems = [];

    // Create Stripe invoice items for overages
    if (report.costs.overageCosts.domains > 0) {
      overageItems.push({
        customer: subscription.stripeCustomerId,
        amount: Math.round(report.costs.overageCosts.domains * 100), // Convert to cents
        currency: 'usd',
        description: `Overage: ${report.usage.domains - (await quotaService.getQuotaLimits(subscription.organizationId)).domains} extra domains`
      });
    }

    if (report.costs.overageCosts.inboxes > 0) {
      overageItems.push({
        customer: subscription.stripeCustomerId,
        amount: Math.round(report.costs.overageCosts.inboxes * 100),
        currency: 'usd',
        description: `Overage: ${report.usage.inboxes - (await quotaService.getQuotaLimits(subscription.organizationId)).inboxes} extra inboxes`
      });
    }

    if (report.costs.overageCosts.members > 0) {
      overageItems.push({
        customer: subscription.stripeCustomerId,
        amount: Math.round(report.costs.overageCosts.members * 100),
        currency: 'usd',
        description: `Overage: ${report.usage.members - (await quotaService.getQuotaLimits(subscription.organizationId)).members} extra members`
      });
    }

    if (report.costs.overageCosts.apiCalls > 0) {
      overageItems.push({
        customer: subscription.stripeCustomerId,
        amount: Math.round(report.costs.overageCosts.apiCalls * 100),
        currency: 'usd',
        description: `Overage: ${report.usage.apiCalls} extra API calls`
      });
    }

    if (report.costs.overageCosts.emails > 0) {
      overageItems.push({
        customer: subscription.stripeCustomerId,
        amount: Math.round(report.costs.overageCosts.emails * 100),
        currency: 'usd',
        description: `Overage: ${report.usage.emails - (await quotaService.getQuotaLimits(subscription.organizationId)).emailsPerMonth} extra emails`
      });
    }

    if (report.costs.overageCosts.storage > 0) {
      overageItems.push({
        customer: subscription.stripeCustomerId,
        amount: Math.round(report.costs.overageCosts.storage * 100),
        currency: 'usd',
        description: `Overage: ${report.usage.storageGB} GB extra storage`
      });
    }

    // Create invoice
    if (overageItems.length > 0) {
      const invoice = await this.stripe.invoices.create({
        customer: subscription.stripeCustomerId,
        auto_advance: false,
        description: `Usage overage for ${report.period}`,
        metadata: {
          organizationId: subscription.organizationId,
          period: report.period
        }
      });

      // Add invoice items
      for (const item of overageItems) {
        await this.stripe.invoiceItems.create({
          ...item,
          invoice: invoice.id
        });
      }

      // Finalize and send invoice
      await this.stripe.invoices.finalizeInvoice(invoice.id);
      await this.stripe.invoices.sendInvoice(invoice.id);

      // Record audit
      await recordAudit('system', 'OVERAGE_INVOICE_CREATED', {
        organizationId: subscription.organizationId,
        invoiceId: invoice.id,
        amount: report.costs.overageCosts,
        period: report.period
      });
    }
  }

  /**
   * Send usage report to organization
   */
  private async sendUsageReport(organizationId: string, report: UsageReport): Promise<void> {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) return;

    // Get owner email
    const owner = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        role: 'OWNER'
      },
      include: {
        user: true
      }
    });

    if (!owner) return;

    // TODO: Send email with usage report
    console.log(`Usage report sent to ${owner.user.email} for ${organization.name}`);
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.finalized':
        await this.handleInvoiceFinalized(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const organizationId = invoice.metadata?.organizationId;
    if (!organizationId) return;

    // Update subscription status if needed
    await prisma.organizationSubscription.updateMany({
      where: { organizationId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        updatedAt: new Date()
      }
    });

    // Record audit
    await recordAudit('system', 'PAYMENT_SUCCEEDED', {
      organizationId,
      invoiceId: invoice.id,
      amount: invoice.amount_paid / 100
    });
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const organizationId = invoice.metadata?.organizationId;
    if (!organizationId) return;

    // Update subscription status
    await prisma.organizationSubscription.updateMany({
      where: { organizationId },
      data: {
        status: SubscriptionStatus.PAST_DUE,
        updatedAt: new Date()
      }
    });

    // Record audit
    await recordAudit('system', 'PAYMENT_FAILED', {
      organizationId,
      invoiceId: invoice.id,
      amount: invoice.amount_due / 100,
      attemptCount: invoice.attempt_count
    });
  }

  /**
   * Handle subscription update
   */
  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
    // Find corresponding local subscription
    const subscription = await prisma.organizationSubscription.findFirst({
      where: { stripeSubscriptionId: stripeSubscription.id }
    });

    if (!subscription) return;

    // Update local subscription
    await prisma.organizationSubscription.update({
      where: { id: subscription.id },
      data: {
        status: this.mapStripeStatus(stripeSubscription.status),
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Handle subscription deletion
   */
  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
    // Find corresponding local subscription
    const subscription = await prisma.organizationSubscription.findFirst({
      where: { stripeSubscriptionId: stripeSubscription.id }
    });

    if (!subscription) return;

    // Update local subscription
    await prisma.organizationSubscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        updatedAt: new Date()
      }
    });

    // Remove organization settings
    await prisma.organizationSettings.update({
      where: { organizationId: subscription.organizationId },
      data: {
        ssoEnabled: false,
        apiAccessEnabled: false,
        webhooksEnabled: false
      }
    });
  }

  /**
   * Handle invoice finalized
   */
  private async handleInvoiceFinalized(invoice: Stripe.Invoice): Promise<void> {
    const organizationId = invoice.metadata?.organizationId;
    if (!organizationId) return;

    // Record audit
    await recordAudit('system', 'INVOICE_FINALIZED', {
      organizationId,
      invoiceId: invoice.id,
      amount: invoice.total / 100
    });
  }

  /**
   * Get usage metrics for organization
   */
  private async getUsageMetrics(
    organizationId: string,
    period: { from: Date; to: Date }
  ) {
    const [domains, inboxes, members, apiCalls, emails, storage] = await Promise.all([
      // Count domains (current count)
      prisma.domain.count({
        where: { organizationId }
      }),

      // Average inbox count during period
      prisma.inbox.count({
        where: {
          organizationId,
          createdAt: {
            lte: period.to
          }
        }
      }),

      // Average member count during period
      prisma.organizationMember.count({
        where: {
          organizationId,
          joinedAt: {
            lte: period.to
          }
        }
      }),

      // API calls (would need to track this)
      1000, // Placeholder

      // Emails sent/received
      prisma.message.count({
        where: {
          inbox: {
            organizationId
          },
          receivedAt: {
            gte: period.from,
            lte: period.to
          }
        }
      }),

      // Storage usage (placeholder)
      10 // 10 GB placeholder
    ]);

    return {
      domains,
      inboxes,
      members,
      apiCalls,
      emails,
      storageGB: storage
    };
  }

  /**
   * Calculate overage cost
   */
  private calculateOverageCost(
    usage: number,
    limit: number,
    costPerUnit: number
  ): number {
    if (usage <= limit) return 0;
    const overage = usage - limit;
    return overage * costPerUnit;
  }

  /**
   * Map Stripe status to local status
   */
  private mapStripeStatus(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      case 'unpaid':
        return SubscriptionStatus.UNPAID;
      default:
        return SubscriptionStatus.INACTIVE;
    }
  }

  /**
   * Get billing metrics
   */
  async getBillingMetrics(): Promise<BillingMetrics> {
    const subscriptions = await prisma.organizationSubscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE
      }
    });

    // Calculate metrics
    const totalRevenue = 0; // Would sum from Stripe
    const mrr = 0; // Would calculate from active subscriptions
    const arr = mrr * 12;
    const activeSubscriptions = subscriptions.length;
    const churnRate = 0; // Would calculate from churned subscriptions
    const ltv = 0; // Would calculate from customer data
    const cac = 0; // Would calculate from marketing spend

    return {
      totalRevenue,
      mrr,
      arr,
      activeSubscriptions,
      churnRate,
      ltv,
      cac
    };
  }
}

export const billingAutomationService = new BillingAutomationService();