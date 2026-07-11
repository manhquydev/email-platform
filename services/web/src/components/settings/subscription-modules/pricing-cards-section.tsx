/**
 * Pricing Cards Section component - DYNAMIC VERSION
 * Fetches tier data from /billing/tiers API (same as TierComparisonTable)
 * Displays billing cycle toggle and pricing tier cards dynamically
 */
import { useState, useEffect } from "react";
import { GlassCard } from "../../ui/GlassCard";
import { Button } from "../../ui/Button";
import { api } from "../../../utils/api";
import type { ServicePackage } from "../../../types";

interface TierLimits {
    domains: number;
    inboxes: number;
    storageGB: number;
    apiAccess: boolean;
    prioritySupport: boolean;
    webhooks: number;
    [key: string]: number | boolean;
}

interface TierInfo {
    id: string;
    name: string;
    price: number;
    currency: string;
    period: string;
    description: string;
    badge: string | null;
    features: string[];
    limits: TierLimits;
}

interface TiersResponse {
    tiers: TierInfo[];
    stripeEnabled: boolean;
}

interface PricingCardsSectionProps {
    packages: ServicePackage[];
    loading: boolean;
    currentTier: string;
    onCheckout: (packageId: string) => void;
}

/** Tier styling configuration */
const TIER_STYLES: Record<string, {
    border: string;
    borderActive: string;
    highlight?: boolean;
}> = {
    FREE: { border: "border-semantic-border", borderActive: "border-semantic-accent ring-2 ring-semantic-accent/20" },
    STARTER: { border: "border-semantic-border", borderActive: "border-semantic-accent ring-2 ring-semantic-accent/20" },
    PROFESSIONAL: { border: "border-semantic-accent/50", borderActive: "border-semantic-accent ring-2 ring-semantic-accent/20", highlight: true },
    BUSINESS: { border: "border-semantic-border", borderActive: "border-semantic-accent ring-2 ring-semantic-accent/20" },
    ENTERPRISE: { border: "border-semantic-border", borderActive: "border-semantic-accent ring-2 ring-semantic-accent/20" },
};

function formatPrice(price: number, currency: string): string {
    if (price === 0) return "0đ";
    if (currency === "VND") {
        return new Intl.NumberFormat("vi-VN").format(price) + "đ";
    }
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price);
}

function formatLimit(value: number): string {
    if (value === -1) return "Không giới hạn";
    return value.toString();
}

export function PricingCardsSection({ packages, loading: packagesLoading, currentTier, onCheckout }: PricingCardsSectionProps) {
    const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
    const [tiers, setTiers] = useState<TierInfo[]>([]);
    const [loadingTiers, setLoadingTiers] = useState(true);

    // Fetch tiers from API (same source as TierComparisonTable)
    useEffect(() => {
        const fetchTiers = async () => {
            try {
                const res = await api<TiersResponse>("/billing/tiers");
                setTiers(res.tiers);
            } catch (err) {
                console.error("[PricingCards] Failed to fetch tiers:", err);
            } finally {
                setLoadingTiers(false);
            }
        };
        fetchTiers();
    }, []);

    const isPlanActive = (tierId: string) => currentTier === tierId;

    // Filter packages by billing cycle
    const filteredPackages = packages.filter(pkg => {
        if (pkg.type !== "TIME_BASED") return false;
        const days = pkg.durationDays || 30;
        return billingCycle === "monthly" ? days <= 45 : days > 45;
    });

    const getPackageByTier = (tierId: string) => filteredPackages.find(pkg => pkg.targetTier === tierId);

    const loading = packagesLoading || loadingTiers;

    // Calculate grid columns based on tier count
    const gridCols = Math.min(tiers.length, 5);

    return (
        <div className="flex flex-col gap-8 mt-4">
            <div className="flex flex-col items-center gap-4">
                <h2 className="text-2xl font-bold text-semantic-text-main">Nâng cấp gói của bạn</h2>
                <div className="p-1 rounded-xl inline-flex relative bg-semantic-bg-secondary border border-semantic-border">
                    <button
                        onClick={() => setBillingCycle("monthly")}
                        className={`relative z-10 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${billingCycle === "monthly" ? "bg-semantic-accent text-white shadow-semantic-md" : "text-semantic-text-muted hover:text-semantic-text-main"}`}
                    >
                        Hàng tháng
                    </button>
                    <button
                        onClick={() => setBillingCycle("yearly")}
                        className={`relative z-10 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${billingCycle === "yearly" ? "bg-semantic-accent text-white shadow-semantic-md" : "text-semantic-text-muted hover:text-semantic-text-main"}`}
                    >
                        <span>Hàng năm <span className="text-[10px] ml-1 bg-semantic-bg-secondary px-1.5 py-0.5 rounded text-semantic-text-main">Tiết kiệm 20%</span></span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <span className="text-semantic-text-muted">Đang tải gói dịch vụ...</span>
                </div>
            ) : (
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-${gridCols} gap-6`}>
                    {tiers.map((tier) => {
                        const pkg = tier.id !== "FREE" ? getPackageByTier(tier.id) : null;
                        const style = TIER_STYLES[tier.id] || TIER_STYLES.FREE;
                        const isActive = isPlanActive(tier.id);
                        const isHighlight = style.highlight;

                        return (
                            <GlassCard
                                key={tier.id}
                                className={`p-6 flex flex-col gap-6 hover:-translate-y-1 transition-transform duration-300 relative ${
                                    isHighlight ? "shadow-[0_0_40px_-10px_rgba(59,130,246,0.15)]" : ""
                                } border ${isActive ? style.borderActive + " shadow-[0_0_30px_rgba(59,130,246,0.15)]" : style.border}`}
                            >
                                {/* Current plan badge */}
                                {isActive && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-semantic-accent text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-semantic-lg">
                                        Gói hiện tại
                                    </div>
                                )}

                                {/* Highlight indicator for popular tier */}
                                {isHighlight && !isActive && (
                                    <div className="absolute top-0 right-0 p-3">
                                        <span className="flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-semantic-accent opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-semantic-accent"></span>
                                        </span>
                                    </div>
                                )}

                                {/* Header */}
                                <div>
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-semantic-text-main">{tier.name}</h3>
                                        {tier.badge && (
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                                                tier.id === "PROFESSIONAL" ? "text-semantic-accent-text bg-semantic-accent-subtle" :
                                                tier.id === "BUSINESS" ? "text-semantic-success bg-semantic-success-subtle" :
                                                tier.id === "ENTERPRISE" ? "text-semantic-warning bg-semantic-warning-subtle" :
                                                "text-semantic-text-main bg-semantic-bg-secondary"
                                            }`}>
                                                {tier.badge.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-semantic-text-muted text-sm mt-1">{tier.description}</p>
                                    <div className="mt-4 flex items-baseline gap-1">
                                        <span className="text-4xl font-bold text-semantic-text-main">
                                            {tier.id === "FREE" ? "0đ" : (pkg ? formatPrice(pkg.price, pkg.currency) : formatPrice(tier.price, tier.currency))}
                                        </span>
                                        <span className="text-semantic-text-muted text-sm">/{billingCycle === "monthly" ? "tháng" : "năm"}</span>
                                    </div>
                                </div>

                                {/* CTA Button */}
                                <Button
                                    onClick={() => pkg && onCheckout(pkg.id)}
                                    variant={isActive ? "secondary" : "primary"}
                                    disabled={tier.id === "FREE" ? isActive : (!pkg || isActive)}
                                    className="w-full"
                                >
                                    {isActive ? "Gói hiện tại" : tier.id === "FREE" ? "Hạ cấp" : (pkg ? "Nâng cấp" : "Không khả dụng")}
                                </Button>

                                {/* Features from limits */}
                                <ul className="flex flex-col gap-3 text-sm text-semantic-text-secondary">
                                    <li className="flex gap-3">
                                        <span className="material-symbols-outlined text-semantic-success text-[20px]">check</span>
                                        {formatLimit(tier.limits.domains)} Tên miền
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="material-symbols-outlined text-semantic-success text-[20px]">check</span>
                                        {formatLimit(tier.limits.inboxes)} Hộp thư
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="material-symbols-outlined text-semantic-success text-[20px]">check</span>
                                        {tier.limits.storageGB}GB Lưu trữ
                                    </li>
                                    {tier.limits.apiAccess && (
                                        <li className="flex gap-3">
                                            <span className="material-symbols-outlined text-semantic-success text-[20px]">check</span>
                                            API Access
                                        </li>
                                    )}
                                    {tier.limits.webhooks > 0 && (
                                        <li className="flex gap-3">
                                            <span className="material-symbols-outlined text-semantic-success text-[20px]">check</span>
                                            {formatLimit(tier.limits.webhooks)} Webhooks
                                        </li>
                                    )}
                                    {tier.limits.prioritySupport && (
                                        <li className="flex gap-3">
                                            <span className="material-symbols-outlined text-semantic-success text-[20px]">check</span>
                                            Hỗ trợ ưu tiên
                                        </li>
                                    )}
                                </ul>
                            </GlassCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
