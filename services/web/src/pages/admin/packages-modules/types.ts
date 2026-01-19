/**
 * Types and constants for PackagesPage
 */

export interface PlanFeature {
    text: string;
    included: boolean;
}

export interface ServicePackage {
    id: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    type: "TIME_BASED" | "USAGE_BASED";
    durationDays?: number;
    targetTier?: string;
    creditAmount?: number;
    isActive: boolean;
    stripePriceId?: string;
    stripeProductId?: string;
    // Display configuration
    features?: PlanFeature[];
    displayOrder?: number;
    recommended?: boolean;
    badge?: string;
    createdAt: string;
    _count: { codes: number };
}

export interface PackageFormData {
    name: string;
    description: string;
    price: number;
    type: "TIME_BASED" | "USAGE_BASED";
    durationDays: number;
    targetTier: string;
    creditAmount: number;
    stripePriceId: string;
    stripeProductId: string;
    isActive: boolean;
    features: PlanFeature[];
    displayOrder: number;
    recommended: boolean;
    badge: string;
}

export const DEFAULT_FORM_DATA: PackageFormData = {
    name: "",
    description: "",
    price: 0,
    type: "TIME_BASED",
    durationDays: 30,
    targetTier: "PROFESSIONAL",
    creditAmount: 0,
    stripePriceId: "",
    stripeProductId: "",
    isActive: true,
    features: [],
    displayOrder: 0,
    recommended: false,
    badge: ""
};
