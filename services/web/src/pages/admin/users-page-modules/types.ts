/**
 * Types for UsersPage
 */

export interface User {
    id: string;
    email: string;
    role: "ADMIN" | "USER";
    emailVerified: string | null;
    isDisabled?: boolean;
    createdAt: string;
    tier: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
    subscriptionStatus: "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";
    subscriptionEndsAt?: string | null;
    stripeSubscriptionId?: string;
    _count: { domains: number };
}

export const PAGE_SIZE = 20;

export type BulkAction = "enable" | "disable" | "delete";
