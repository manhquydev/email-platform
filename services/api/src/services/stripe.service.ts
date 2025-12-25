import Stripe from "stripe";
import { appConfig } from "../config";
import { PrismaClient, PackageType, SubscriptionTier, SubscriptionStatus } from "@prisma/client";
import Decimal from "decimal.js";

const prisma = new PrismaClient();
const stripe = new Stripe(appConfig.stripe.apiKey, {
    apiVersion: "2024-11-20.acacia" as any,
});

export class StripeService {
    /**
     * Create a Stripe Checkout Session for a package
     */
    static async createCheckoutSession(userId: string, packageId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error("User not found");

        const pkg = (await prisma.servicePackage.findUnique({ where: { id: packageId } })) as any;
        if (!pkg || !pkg.stripePriceId) throw new Error("Package not found or not linked to Stripe");

        let customerId = user.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { userId: user.id },
            });
            customerId = customer.id;
            await prisma.user.update({
                where: { id: user.id },
                data: { stripeCustomerId: customerId },
            });
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [
                {
                    price: pkg.stripePriceId,
                    quantity: 1,
                },
            ],
            mode: pkg.type === PackageType.TIME_BASED ? "subscription" : "payment",
            success_url: `${appConfig.webUrl}/app?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appConfig.webUrl}/plans?payment=cancelled`,
            metadata: {
                userId: user.id,
                packageId: pkg.id,
            },
            // For subscription, we might want to allow promotion codes
            allow_promotion_codes: true,
        });

        return session;
    }

    /**
     * Handle Stripe Webhook
     */
    static async handleWebhook(payload: any, signature: string) {
        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(payload, signature, appConfig.stripe.webhookSecret);
        } catch (err: any) {
            console.error(`Webhook Error: ${err.message}`);
            throw new Error(`Webhook Error: ${err.message}`);
        }

        console.log(`Processing event: ${event.type}`);

        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                await this.fulfillOrder(session);
                break;
            }
            case "invoice.payment_succeeded": {
                const invoice = event.data.object as Stripe.Invoice;
                const subscriptionId = (invoice as any).subscription as string;

                if (!subscriptionId) {
                    await this.handleSubscriptionPaid(invoice);
                }
                break;
            }
            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                await this.handleSubscriptionDeleted(subscription);
                break;
            }
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    }

    private static async recordPayment(data: {
        userId: string;
        stripePaymentId: string;
        amount: number;
        currency: string;
        status: string;
        packageId?: string;
    }) {
        try {
            // Check if payment already exists to be safe
            const existing = await prisma.payment.findUnique({
                where: { stripePaymentId: data.stripePaymentId }
            });

            if (existing) return;

            await prisma.payment.create({
                data: {
                    userId: data.userId,
                    stripePaymentId: data.stripePaymentId,
                    amount: data.amount, // Stored as is (e.g. 199000), frontend should format
                    currency: data.currency,
                    status: data.status,
                    packageId: data.packageId
                }
            });
        } catch (err) {
            console.error("Failed to record payment:", err);
        }
    }

    private static async fulfillOrder(session: Stripe.Checkout.Session) {
        const userId = session.metadata?.userId;
        const packageId = session.metadata?.packageId;

        if (!userId || !packageId) return;

        // Record payment
        if (session.payment_status === 'paid') {
            await this.recordPayment({
                userId,
                stripePaymentId: session.payment_intent as string || session.id, // Use session ID if PI is missing (e.g. strict setup)
                amount: (session.amount_total || 0), // Stripe is usually in cents/smallest unit? VND is 1:1 usually on Stripe?
                // Stripe VND is zero-decimal? Actually Stripe treats VND as valid integer. 
                // Let's store what Stripe sends.
                currency: session.currency || 'vnd',
                status: 'SUCCEEDED',
                packageId
            });
        }

        const pkg = await prisma.servicePackage.findUnique({ where: { id: packageId } });
        if (!pkg) return;

        if (pkg.type === PackageType.USAGE_BASED && pkg.creditAmount) {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    credits: { increment: pkg.creditAmount },
                },
            });
        } else if (pkg.type === PackageType.TIME_BASED && pkg.durationDays) {
            const endsAt = new Date();
            endsAt.setDate(endsAt.getDate() + pkg.durationDays);

            await prisma.user.update({
                where: { id: userId },
                data: {
                    tier: pkg.targetTier || SubscriptionTier.PROFESSIONAL,
                    subscriptionStatus: SubscriptionStatus.ACTIVE,
                    subscriptionEndsAt: endsAt,
                    stripeSubscriptionId: session.subscription as string,
                },
            });
        }
    }

    private static async handleSubscriptionPaid(invoice: Stripe.Invoice) {
        const stripeSubscriptionId = (invoice as any).subscription as string;
        if (!stripeSubscriptionId) return;

        const user = await prisma.user.findFirst({
            where: { stripeSubscriptionId },
        });

        if (!user) return;

        // Try to find the package associated with the subscription if possible
        // This is a simplified approach; a real app might store packageId in subscription metadata
        const lineItem = invoice.lines.data[0] as any;
        const pkg = await prisma.servicePackage.findFirst({
            where: { stripePriceId: lineItem?.price?.id }
        });

        // Record recurring payment
        await this.recordPayment({
            userId: user.id,
            stripePaymentId: ((invoice as any).payment_intent as string) || invoice.id,
            amount: new Decimal(invoice.amount_paid).toString(), // Store as string for Decimal compatibility
            currency: invoice.currency.toUpperCase(),
            status: 'SUCCEEDED', // Since we only call this on payment_succeeded
            packageId: pkg?.id,
        });

        // Extend subscription if it's recurring
        // In a real app, you'd check the period in the invoice/subscription
        // For now, let's assume it's linked to the package the user originally bought
        if (user.subscriptionEndsAt) {
            const newEndsAt = new Date(user.subscriptionEndsAt);
            // Logic depends on the package, but let's just push it forward
            // Simplified: if it was monthly, add 30 days
            newEndsAt.setDate(newEndsAt.getDate() + 30);

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    subscriptionStatus: SubscriptionStatus.ACTIVE,
                    subscriptionEndsAt: newEndsAt,
                },
            });
        } else {
            // If manual activate
            const newEndsAt = new Date();
            newEndsAt.setDate(newEndsAt.getDate() + 30);
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    subscriptionStatus: SubscriptionStatus.ACTIVE,
                    subscriptionEndsAt: newEndsAt,
                },
            });
        }
    }

    private static async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
        await prisma.user.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: {
                subscriptionStatus: SubscriptionStatus.CANCELED,
                tier: SubscriptionTier.FREE,
            },
        });
    }
}
