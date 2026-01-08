/**
 * Stripe Mock Utilities for Testing
 * Provides mock implementations for Stripe SDK methods
 */

import { vi } from "vitest";

// Mock Stripe types
export interface MockStripeCustomer {
    id: string;
    email: string;
    metadata: Record<string, string>;
}

export interface MockStripeCheckoutSession {
    id: string;
    customer: string;
    url: string;
    payment_status: string;
    metadata: Record<string, string>;
    mode: "payment" | "subscription";
}

export interface MockStripeSubscription {
    id: string;
    customer: string;
    status: "active" | "canceled" | "past_due" | "trialing";
    current_period_end: number;
    items: { data: Array<{ price: { id: string } }> };
}

// Factory functions for mock data
export const createMockCustomer = (overrides: Partial<MockStripeCustomer> = {}): MockStripeCustomer => ({
    id: "cus_mock123",
    email: "test@example.com",
    metadata: { userId: "user-123" },
    ...overrides,
});

export const createMockCheckoutSession = (overrides: Partial<MockStripeCheckoutSession> = {}): MockStripeCheckoutSession => ({
    id: "cs_mock123",
    customer: "cus_mock123",
    url: "https://checkout.stripe.com/session/mock",
    payment_status: "paid",
    metadata: { userId: "user-123", packageId: "pkg-123" },
    mode: "subscription",
    ...overrides,
});

export const createMockSubscription = (overrides: Partial<MockStripeSubscription> = {}): MockStripeSubscription => ({
    id: "sub_mock123",
    customer: "cus_mock123",
    status: "active",
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    items: { data: [{ price: { id: "price_mock123" } }] },
    ...overrides,
});

// Create mock Stripe instance
export const createStripeMock = () => {
    const mockCustomers = {
        create: vi.fn().mockResolvedValue(createMockCustomer()),
        retrieve: vi.fn().mockResolvedValue(createMockCustomer()),
        update: vi.fn().mockResolvedValue(createMockCustomer()),
    };

    const mockCheckout = {
        sessions: {
            create: vi.fn().mockResolvedValue(createMockCheckoutSession()),
            retrieve: vi.fn().mockResolvedValue(createMockCheckoutSession()),
        },
    };

    const mockSubscriptions = {
        retrieve: vi.fn().mockResolvedValue(createMockSubscription()),
        update: vi.fn().mockResolvedValue(createMockSubscription()),
        cancel: vi.fn().mockResolvedValue({ ...createMockSubscription(), status: "canceled" }),
    };

    const mockWebhooks = {
        constructEvent: vi.fn().mockImplementation((payload, signature, secret) => {
            if (!signature || signature === "invalid") {
                throw new Error("Invalid signature");
            }
            return JSON.parse(payload);
        }),
    };

    const mockBillingPortal = {
        sessions: {
            create: vi.fn().mockResolvedValue({
                id: "bps_mock123",
                url: "https://billing.stripe.com/session/mock",
            }),
        },
    };

    return {
        customers: mockCustomers,
        checkout: mockCheckout,
        subscriptions: mockSubscriptions,
        webhooks: mockWebhooks,
        billingPortal: mockBillingPortal,
    };
};

// Helper to mock Stripe SDK module
export const createStripeModuleMock = () => {
    const stripeMock = createStripeMock();
    return {
        default: vi.fn().mockImplementation(() => stripeMock),
        __mockInstance: stripeMock,
    };
};
