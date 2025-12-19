import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "./setup";
import { buildServer } from "../server";
import { FastifyInstance } from "fastify";

describe("Stripe Billing", () => {
  let app: FastifyInstance;
  let org: any;
  let admin: any;
  let user: any;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();

    // Create organization and users
    org = await prisma.organization.create({
      data: {
        name: "Stripe Billing Test Org",
        slug: "stripe-billing-test",
        members: {
          create: [
            {
              user: {
                create: {
                  email: "admin@test.org",
                  passwordHash: "hashed",
                  role: "ADMIN",
                },
              },
              role: "ADMIN",
            },
            {
              user: {
                create: {
                  email: "user@test.org",
                  passwordHash: "hashed",
                  role: "USER",
                },
              },
              role: "MEMBER",
            },
          ],
        },
      },
      include: { members: { include: { user: true } } },
    });

    admin = org.members.find((m: any) => m.user.role === "ADMIN").user;
    user = org.members.find((m: any) => m.user.role === "USER").user;
  });

  describe("Subscription Management", () => {
    it("should create subscription", async () => {
      const subscription = {
        organizationId: org.id,
        stripePriceId: "price_monthly_professional",
        stripeCustomerId: "cus_test123",
        billingEmail: "billing@stripe.test",
        paymentMethodId: "pm_card_visa",
        billingPeriod: "monthly",
        tier: "PROFESSIONAL",
      };

      const response = await app.inject({
        method: "POST",
        url: `/organizations/${org.id}/subscriptions`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: subscription,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.subscription.organizationId).toBe(org.id);
      expect(body.subscription.stripeCustomerId).toBe("cus_test123");
      expect(body.subscription.tier).toBe("PROFESSIONAL");
      expect(body.subscription.status).toBe("ACTIVE");
    });

    it("should update subscription tier", async () => {
      // Create subscription first
      await prisma.organizationSubscription.create({
        data: {
          organizationId: org.id,
          stripeCustomerId: "cus_test123",
          stripePriceId: "price_monthly_professional",
          stripeSubscriptionId: "sub_test123",
          tier: "PROFESSIONAL",
          status: "ACTIVE",
          billingEmail: "billing@stripe.test",
          paymentMethodId: "pm_card_visa",
          billingPeriod: "monthly",
          currentPeriodStart: new Date("2024-01-01"),
          currentPeriodEnd: new Date("2024-02-01"),
        },
      });

      const update = {
        stripePriceId: "price_monthly_enterprise",
        tier: "ENTERPRISE",
      };

      const response = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/subscriptions`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: update,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.subscription.tier).toBe("ENTERPRISE");
      expect(body.subscription.stripePriceId).toBe("price_monthly_enterprise");
    });

    it("should cancel subscription", async () => {
      // Create subscription first
      const sub = await prisma.organizationSubscription.create({
        data: {
          organizationId: org.id,
          stripeCustomerId: "cus_test123",
          stripePriceId: "price_monthly_professional",
          stripeSubscriptionId: "sub_cancel_test",
          tier: "PROFESSIONAL",
          status: "ACTIVE",
          billingEmail: "billing@stripe.test",
          paymentMethodId: "pm_card_visa",
          billingPeriod: "monthly",
          currentPeriodStart: new Date("2024-01-01"),
          currentPeriodEnd: new Date("2024-02-01"),
        },
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/organizations/${org.id}/subscriptions/${sub.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify subscription is cancelled
      const cancelledSub = await prisma.organizationSubscription.findUnique({
        where: { id: sub.id },
      });

      expect(cancelledSub?.status).toBe("CANCELED");
    });

    it("should pause and resume subscription", async () => {
      // Create subscription first
      const sub = await prisma.organizationSubscription.create({
        data: {
          organizationId: org.id,
          stripeCustomerId: "cus_test123",
          stripePriceId: "price_monthly_professional",
          stripeSubscriptionId: "sub_pause_test",
          tier: "PROFESSIONAL",
          status: "ACTIVE",
          billingEmail: "billing@stripe.test",
          paymentMethodId: "pm_card_visa",
          billingPeriod: "monthly",
          currentPeriodStart: new Date("2024-01-01"),
          currentPeriodEnd: new Date("2024-02-01"),
        },
      });

      // Pause subscription
      const pauseResponse = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/subscriptions/${sub.id}/pause`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(pauseResponse.statusCode).toBe(200);
      const pausedBody = pauseResponse.json();
      expect(pausedBody.subscription.status).toBe("PAUSED");

      // Resume subscription
      const resumeResponse = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/subscriptions/${sub.id}/resume`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(resumeResponse.statusCode).toBe(200);
      const resumedBody = resumeResponse.json();
      expect(resumedBody.subscription.status).toBe("ACTIVE");
    });

    it("should handle subscription trial", async () => {
      const trialSubscription = {
        organizationId: org.id,
        stripePriceId: "price_monthly_professional",
        stripeCustomerId: "cus_trial123",
        billingEmail: "trial@stripe.test",
        paymentMethodId: "pm_card_visa",
        billingPeriod: "monthly",
        tier: "PROFESSIONAL",
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };

      const response = await app.inject({
        method: "POST",
        url: `/organizations/${org.id}/subscriptions`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: trialSubscription,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.subscription.status).toBe("TRIALING");
      expect(body.subscription.trialEndsAt).toBeDefined();
      expect(new Date(body.subscription.trialEndsAt)).toBeGreaterThan(new Date());
    });

    it("should upgrade/downgrade subscription", async () => {
      // Create subscription
      const sub = await prisma.organizationSubscription.create({
        data: {
          organizationId: org.id,
          stripeCustomerId: "cus_upgrade123",
          stripePriceId: "price_monthly_starter",
          stripeSubscriptionId: "sub_upgrade_test",
          tier: "STARTER",
          status: "ACTIVE",
          billingEmail: "billing@stripe.test",
          paymentMethodId: "pm_card_visa",
          billingPeriod: "monthly",
          currentPeriodStart: new Date("2024-01-01"),
          currentPeriodEnd: new Date("2024-02-01"),
        },
      });

      // Upgrade to professional
      const upgradeResponse = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/subscriptions/${sub.id}/upgrade`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          newTier: "PROFESSIONAL",
          newPriceId: "price_monthly_professional",
        },
      });

      expect(upgradeResponse.statusCode).toBe(200);
      const upgradedBody = upgradeResponse.json();
      expect(upgradedBody.subscription.tier).toBe("PROFESSIONAL");

      // Downgrade back to starter
      const downgradeResponse = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/subscriptions/${sub.id}/downgrade`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          newTier: "STARTER",
          newPriceId: "price_monthly_starter",
        },
      });

      expect(downgradeResponse.statusCode).toBe(200);
      const downgradedBody = downgradeResponse.json();
      expect(downgradedBody.subscription.tier).toBe("STARTER");
    });
  });

  describe("Webhook Handling", () => {
    it("should handle invoice payment succeeded webhook", async () => {
      const webhookPayload = {
        id: "in_123456789",
        object: "invoice",
        status: "paid",
        amount_paid: 2000,
        currency: "usd",
        subscription: "sub_123456789",
        customer: "cus_test123",
        period_start: "2024-01-01T00:00:00Z",
        period_end: "2024-02-01T00:00:00Z",
      };

      const response = await app.inject({
        method: "POST",
        url: "/webhooks/stripe/invoice-paid",
        headers: {
          "Stripe-Signature": "stripe-signature-test",
          "Content-Type": "application/json",
        },
        payload: webhookPayload,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.handled).toBe(true);
      expect(body.subscriptionId).toBe("sub_123456789");

      // Verify subscription was updated
      const updatedSub = await prisma.organizationSubscription.findFirst({
        where: { stripeCustomerId: "cus_test123" },
      });

      expect(updatedSub?.status).toBe("ACTIVE");
    });

    it("should handle invoice payment failed webhook", async () => {
      const webhookPayload = {
        id: "in_987654321",
        object: "invoice",
        status: "open",
        amount_due: 2000,
        currency: "usd",
        subscription: "sub_987654321",
        customer: "cus_failed123",
        period_start: "2024-01-01T00:00:00Z",
        period_end: "2024-02-01T00:00:00Z",
        attempt_count: 3,
        next_payment_attempt: "2024-01-15T00:00:00Z",
      };

      const response = await app.inject({
        method: "POST",
        url: "/webhooks/stripe/invoice-payment-failed",
        headers: {
          "Stripe-Signature": "stripe-signature-test",
          "Content-Type": "application/json",
        },
        payload: webhookPayload,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.handled).toBe(true);

      // Verify subscription was marked as past due
      const updatedSub = await prisma.organizationSubscription.findFirst({
        where: { stripeCustomerId: "cus_failed123" },
      });

      expect(updatedSub?.status).toBe("PAST_DUE");
    });

    it("should handle subscription deleted webhook", async () => {
      const webhookPayload = {
        id: "sub_deleted123",
        object: "subscription",
        status: "canceled",
        customer: "cus_deleted123",
      };

      const response = await app.inject({
        method: "POST",
        url: "/webhooks/stripe/subscription-deleted",
        headers: {
          "Stripe-Signature": "stripe-signature-test",
          "Content-Type": "application/json",
        },
        payload: webhookPayload,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.handled).toBe(true);

      // Verify subscription was cancelled
      const cancelledSub = await prisma.organizationSubscription.findFirst({
        where: { stripeCustomerId: "cus_deleted123" },
      });

      expect(cancelledSub?.status).toBe("CANCELED");
    });

    it("should handle customer updated webhook", async () => {
      const webhookPayload = {
        id: "cus_updated123",
        object: "customer",
        email: "updated@stripe.test",
        default_source: "pm_updated123",
        subscriptions: {
          data: [
            {
              id: "sub_updated123",
              status: "active",
              items: {
                data: [
                  {
                    price: {
                      id: "price_updated123",
                      product: "prod_updated123",
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      const response = await app.inject({
        method: "POST",
        url: "/webhooks/stripe/customer-updated",
        headers: {
          "Stripe-Signature": "stripe-signature-test",
          "Content-Type": "application/json",
        },
        payload: webhookPayload,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.handled).toBe(true);

      // Verify customer data was updated
      const updatedSub = await prisma.organizationSubscription.findFirst({
        where: { stripeCustomerId: "cus_updated123" },
      });

      expect(updatedSub?.stripePriceId).toBe("price_updated123");
    });

    it("should validate webhook signature", async () => {
      const webhookPayload = {
        id: "in_123456789",
        object: "invoice",
        status: "paid",
      };

      const response = await app.inject({
        method: "POST",
        url: "/webhooks/stripe/invoice-paid",
        headers: {
          // Invalid signature
          "Stripe-Signature": "invalid-signature",
          "Content-Type": "application/json",
        },
        payload: webhookPayload,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should handle malformed webhook payload", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/webhooks/stripe/invoice-paid",
        headers: {
          "Stripe-Signature": "stripe-signature-test",
          "Content-Type": "application/json",
        },
        payload: "invalid-json",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Usage Tracking and Billing", () => {
    it("should track API usage for billing", async () => {
      const usageData = {
        organizationId: org.id,
        usage: {
          domainsUsed: 2,
          domainsLimit: 10,
          inboxesUsed: 25,
          inboxesLimit: 100,
          messagesReceived: 500,
          messagesLimit: 1000,
          storageUsed: 1024 * 1024 * 50, // 50 MB
          storageLimit: 1024 * 1024 * 500, // 500 MB
        },
        period: {
          start: "2024-01-01T00:00:00Z",
          end: "2024-01-31T23:59:59Z",
        },
      };

      const response = await app.inject({
        method: "POST",
        url: `/billing/usage`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: usageData,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.usageTracked).toBe(true);
      expect(body.overage).toBeUndefined(); // No overage within limits
    });

    it("should calculate overage charges", async () => {
      const usageData = {
        organizationId: org.id,
        usage: {
          domainsUsed: 15, // Over limit of 10
          domainsLimit: 10,
          inboxesUsed: 150, // Over limit of 100
          inboxesLimit: 100,
          messagesReceived: 2000, // Over limit of 1000
          messagesLimit: 1000,
          storageUsed: 1024 * 1024 * 600, // Over limit of 500 MB
          storageLimit: 1024 * 1024 * 500,
        },
        period: {
          start: "2024-01-01T00:00:00Z",
          end: "2024-01-31T23:59:59Z",
        },
      };

      const response = await app.inject({
        method: "POST",
        url: `/billing/usage`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: usageData,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.usageTracked).toBe(true);
      expect(body.overage).toBeDefined();
      expect(body.overage.domains).toBeGreaterThan(0);
      expect(body.overage.inboxes).toBeGreaterThan(0);
      expect(body.overage.messages).toBeGreaterThan(0);
      expect(body.overage.storage).toBeGreaterThan(0);
      expect(body.overage.total).toBeGreaterThan(0);
    });

    it("should generate monthly invoice", async () => {
      // Create subscription first
      await prisma.organizationSubscription.create({
        data: {
          organizationId: org.id,
          stripeCustomerId: "cus_invoice123",
          stripePriceId: "price_monthly_professional",
          stripeSubscriptionId: "sub_invoice123",
          tier: "PROFESSIONAL",
          status: "ACTIVE",
          billingEmail: "invoice@stripe.test",
          paymentMethodId: "pm_card_visa",
          billingPeriod: "monthly",
          currentPeriodStart: new Date("2024-01-01"),
          currentPeriodEnd: new Date("2024-02-01"),
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/billing/invoice/generate`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          organizationId: org.id,
          period: {
            start: "2024-01-01T00:00:00Z",
            end: "2024-01-31T23:59:59Z",
          },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.invoice).toBeDefined();
      expect(body.invoice.invoiceId).toBeDefined();
      expect(body.invoice.total).toBeGreaterThan(0);
      expect(body.invoice.lines).toBeDefined();
    });

    it("should apply credits and discounts", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/billing/calculate`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          organizationId: org.id,
          subtotal: 10000,
          credits: 1000, // $10 credit
          discountPercent: 10, // 10% discount
          taxes: 800, // $8 tax
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.calculated).toBe(true);
      expect(body.subtotal).toBe(10000);
      expect(body.creditsApplied).toBe(1000);
      expect(body.discountAmount).toBe(1000);
      expect(body.tax).toBe(800);
      expect(body.total).toBe(8800); // 10000 - 1000 - 1000 + 800
    });
  });

  describe("Payment Methods and Billing Info", () => {
    it("should add payment method", async () => {
      const paymentMethod = {
        paymentMethodId: "pm_visa123",
        type: "card",
        card: {
          brand: "visa",
          last4: "4242",
          expMonth: 12,
          expYear: 2025,
        },
        billingDetails: {
          name: "John Doe",
          email: "john@example.com",
          address: {
            line1: "123 Main St",
            city: "San Francisco",
            state: "CA",
            postalCode: "94105",
            country: "US",
          },
        },
      };

      const response = await app.inject({
        method: "POST",
        url: `/organizations/${org.id}/payment-methods`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: paymentMethod,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.paymentMethod.id).toBe("pm_visa123");
      expect(body.paymentMethod.last4).toBe("4242");
      expect(body.paymentMethod.brand).toBe("visa");
    });

    it("should list payment methods", async () => {
      // Add another payment method
      await app.inject({
        method: "POST",
        url: `/organizations/${org.id}/payment-methods`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          paymentMethodId: "pm_mastercard123",
          type: "card",
          card: {
            brand: "mastercard",
            last4: "5555",
            expMonth: 6,
            expYear: 2025,
          },
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/organizations/${org.id}/payment-methods`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.paymentMethods).toHaveLength(2);
      expect(body.paymentMethods[0].last4).toBe("4242");
      expect(body.paymentMethods[1].last4).toBe("5555");
    });

    it("should set default payment method", async () => {
      const response = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/payment-methods/default`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          paymentMethodId: "pm_mastercard123",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.defaultPaymentMethod).toBe("pm_mastercard123");

      // Verify it's the default
      const orgResponse = await app.inject({
        method: "GET",
        url: `/organizations/${org.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(orgResponse.json().organization.defaultPaymentMethodId).toBe("pm_mastercard123");
    });

    it("should delete payment method", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/organizations/${org.id}/payment-methods/pm_visa123`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify payment method is deleted
      const listResponse = await app.inject({
        method: "GET",
        url: `/organizations/${org.id}/payment-methods`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(listResponse.json().paymentMethods).toHaveLength(1);
      expect(listResponse.json().paymentMethods[0].last4).toBe("5555");
    });
  });

  describe("Billing History and Invoices", () => {
    it("should list invoices", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/billing/invoices?organizationId=${org.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.invoices).toBeDefined();
      expect(Array.isArray(body.invoices)).toBe(true);
    });

    it("should get specific invoice", async () => {
      // Create an invoice first
      const invoiceResponse = await app.inject({
        method: "POST",
        url: `/billing/invoice/generate`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          organizationId: org.id,
          period: {
            start: "2024-01-01T00:00:00Z",
            end: "2024-01-31T23:59:59Z",
          },
        },
      });

      const invoice = invoiceResponse.json().invoice;

      const response = await app.inject({
        method: "GET",
        url: `/billing/invoices/${invoice.invoiceId}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.invoice.id).toBe(invoice.invoiceId);
      expect(body.invoice.organizationId).toBe(org.id);
    });

    it("should download invoice PDF", async () => {
      // Create an invoice first
      const invoiceResponse = await app.inject({
        method: "POST",
        url: `/billing/invoice/generate`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          organizationId: org.id,
          period: {
            start: "2024-01-01T00:00:00Z",
            end: "2024-01-31T23:59:59Z",
          },
        },
      });

      const invoice = invoiceResponse.json().invoice;

      const response = await app.inject({
        method: "GET",
        url: `/billing/invoices/${invoice.invoiceId}/pdf`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("application/pdf");
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("should handle invoice payment", async () => {
      const paymentData = {
        invoiceId: "in_payment_test",
        paymentMethodId: "pm_visa123",
        amount: 2000,
      };

      const response = await app.inject({
        method: "POST",
        url: `/billing/invoices/pay`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: paymentData,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.paid).toBe(true);
      expect(body.paymentId).toBeDefined();
      expect(body.receiptUrl).toBeDefined();
    });
  });

  describe("Billing Analytics and Reports", () => {
    it("should generate billing report", async () => {
      const reportData = {
        organizationId: org.id,
        period: {
          start: "2024-01-01T00:00:00Z",
          end: "2024-01-31T23:59:59Z",
        },
        include: {
          invoices: true,
          payments: true,
          refunds: true,
          usage: true,
        },
        format: "pdf",
      };

      const response = await app.inject({
        method: "POST",
        url: `/billing/reports`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: reportData,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.report).toBeDefined();
      expect(body.report.downloadUrl).toBeDefined();
      expect(body.report.totalRevenue).toBeDefined();
      expect(body.report.totalExpenses).toBeDefined();
    });

    it("should get billing insights", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/billing/insights?organizationId=${org.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.insights).toBeDefined();
      expect(body.insights.mrr).toBeDefined();
      expect(body.insights.arr).toBeDefined();
      expect(body.insights.churnRate).toBeDefined();
      expect(body.insights.growthRate).toBeDefined();
    });

    it("should track billing metrics", async () => {
      const metrics = {
        organizationId: org.id,
        metrics: {
          totalRevenue: 50000,
          numberOfCustomers: 100,
          averageOrderValue: 500,
          churnRate: 0.05,
        },
        period: {
          start: "2024-01-01T00:00:00Z",
          end: "2024-01-31T23:59:59Z",
        },
      };

      const response = await app.inject({
        method: "POST",
        url: `/billing/metrics`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: metrics,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.metricsTracked).toBe(true);
    });
  });

  describe("Billing Security and Permissions", () => {
    it("should require proper authorization", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/billing/invoice/generate`,
        // No authorization header
        payload: {
          organizationId: org.id,
          period: {
            start: "2024-01-01T00:00:00Z",
            end: "2024-01-31T23:59:59Z",
          },
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should enforce organization access control", async () => {
      // Create different organization
      const otherOrg = await prisma.organization.create({
        data: {
          name: "Other Billing Org",
          slug: "other-billing",
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/billing/invoice/generate`,
        headers: {
          "Authorization": `Bearer ${otherOrg.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          organizationId: org.id,
          period: {
            start: "2024-01-01T00:00:00Z",
            end: "2024-01-31T23:59:59Z",
          },
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should validate webhook signatures", async () => {
      const webhookPayload = {
        id: "in_123456789",
        object: "invoice",
        status: "paid",
      };

      const response = await app.inject({
        method: "POST",
        url: `/webhooks/stripe/invoice-paid`,
        headers: {
          // No Stripe-Signature header
          "Content-Type": "application/json",
        },
        payload: webhookPayload,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should rate limit billing operations", async () => {
      // Perform many billing operations quickly
      const promises = Array.from({ length: 50 }, () =>
        app.inject({
          method: "POST",
          url: `/billing/invoice/generate`,
          headers: {
            "Authorization": `Bearer ${admin.token}`,
            "Content-Type": "application/json",
          },
          payload: {
            organizationId: org.id,
            period: {
              start: "2024-01-01T00:00:00Z",
              end: "2024-01-31T23:59:59Z",
            },
          },
        })
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter((r) => r.statusCode === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle insufficient funds", async () => {
      const paymentData = {
        invoiceId: "in_insufficient_funds",
        paymentMethodId: "pm_declined123",
        amount: 2000,
      };

      const response = await app.inject({
        method: "POST",
        url: `/billing/invoices/pay`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: paymentData,
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();

      expect(body.error).toContain("insufficient funds");
    });

    it("should handle expired payment methods", async () => {
      const expiredPaymentMethod = {
        paymentMethodId: "pm_expired123",
        type: "card",
        card: {
          brand: "visa",
          last4: "4242",
          expMonth: 1,
          expYear: 2023, // Expired
        },
      };

      const response = await app.inject({
        method: "POST",
        url: `/organizations/${org.id}/payment-methods`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: expiredPaymentMethod,
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();

      expect(body.error).toContain("expired");
    });

    it("should handle subscription conflicts", async () => {
      // Try to create two subscriptions for same organization
      await prisma.organizationSubscription.create({
        data: {
          organizationId: org.id,
          stripeCustomerId: "cus_conflict123",
          stripePriceId: "price_monthly_professional",
          stripeSubscriptionId: "sub_conflict1",
          tier: "PROFESSIONAL",
          status: "ACTIVE",
          billingEmail: "billing@stripe.test",
          paymentMethodId: "pm_card_visa",
          billingPeriod: "monthly",
          currentPeriodStart: new Date("2024-01-01"),
          currentPeriodEnd: new Date("2024-02-01"),
        },
      });

      const subscription = {
        organizationId: org.id,
        stripePriceId: "price_monthly_enterprise",
        stripeCustomerId: "cus_conflict123",
        billingEmail: "billing@stripe.test",
        paymentMethodId: "pm_card_visa",
        billingPeriod: "monthly",
        tier: "ENTERPRISE",
      };

      const response = await app.inject({
        method: "POST",
        url: `/organizations/${org.id}/subscriptions`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: subscription,
      });

      expect(response.statusCode).toBe(409);
      const body = response.json();

      expect(body.error).toContain("subscription exists");
    });
  });
});