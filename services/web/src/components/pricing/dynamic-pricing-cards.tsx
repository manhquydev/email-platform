/**
 * Dynamic Pricing Cards - Fetches tier data from API
 * Single Source of Truth: /billing/tiers (from database)
 * Used by: Homepage pricing section, /pricing page
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../utils/api";

interface TierLimits {
    domains: number;
    inboxes: number;
    storageGB: number;
    retentionDays: number;
    webhooks: number;
    apiAccess: boolean;
    prioritySupport: boolean;
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

// Tier styling configuration
const TIER_STYLES: Record<string, {
    border: string;
    badge: string;
    button: string;
    checkColor: string;
    highlight?: boolean;
}> = {
    FREE: {
        border: "border-white/5 hover:border-white/10",
        badge: "",
        button: "bg-white/5 hover:bg-white/10 text-white border border-white/10",
        checkColor: "text-green-400",
    },
    STARTER: {
        border: "border-white/5 hover:border-white/10",
        badge: "",
        button: "bg-white/5 hover:bg-white/10 text-white border border-white/10",
        checkColor: "text-green-400",
    },
    PROFESSIONAL: {
        border: "border-[var(--nebula-violet)]/50",
        badge: "bg-[var(--nebula-violet)]",
        button: "bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white shadow-lg",
        checkColor: "text-[var(--nebula-violet)]",
        highlight: true,
    },
    BUSINESS: {
        border: "border-green-500/30 hover:border-green-500/50",
        badge: "bg-green-500",
        button: "bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30",
        checkColor: "text-green-400",
    },
    ENTERPRISE: {
        border: "border-amber-500/30 hover:border-amber-500/50",
        badge: "bg-amber-500",
        button: "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30",
        checkColor: "text-amber-400",
    },
};

function formatPrice(price: number, currency: string): string {
    if (price === 0) return "0đ";
    if (currency === "VND") {
        return new Intl.NumberFormat("vi-VN").format(price) + "đ";
    }
    return `$${price}`;
}

function formatLimit(value: number): string {
    if (value === -1) return "Không giới hạn";
    return value.toString();
}

interface DynamicPricingCardsProps {
    variant?: "homepage" | "pricing-page";
}

export function DynamicPricingCards({ variant: _variant = "homepage" }: DynamicPricingCardsProps) {
    const [tiers, setTiers] = useState<TierInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTiers = async () => {
            try {
                const res = await api<TiersResponse>("/billing/tiers");
                setTiers(res.tiers);
            } catch (err) {
                console.error("Failed to fetch tiers:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTiers();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-start max-w-7xl mx-auto">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="rounded-2xl bg-[#12122a] border border-white/5 p-6 h-80 animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-start max-w-7xl mx-auto">
            {tiers.map((tier) => {
                const style = TIER_STYLES[tier.id] || TIER_STYLES.FREE;
                const isHighlight = style.highlight;

                return (
                    <div
                        key={tier.id}
                        className={`relative rounded-2xl bg-[#12122a] ${isHighlight ? "bg-[#12122a]/80 backdrop-blur-xl shadow-[0_0_50px_rgba(139,92,246,0.15)] lg:-mt-4 lg:mb-4 z-10" : ""} border ${style.border} p-6 flex flex-col gap-5 transition-colors`}
                    >
                        {/* Badge */}
                        {tier.badge && (
                            <div className="absolute top-0 right-0 -mt-2 -mr-2">
                                <span className={`${style.badge} text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg uppercase`}>
                                    {tier.badge}
                                </span>
                            </div>
                        )}

                        {/* Header */}
                        <div>
                            <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                            <div className="mt-3 flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-white">
                                    {formatPrice(tier.price, tier.currency)}
                                </span>
                                {tier.price > 0 && (
                                    <span className="text-[var(--nebula-text-secondary)] text-sm">/{tier.period}</span>
                                )}
                            </div>
                            <p className="text-[var(--nebula-text-secondary)] text-xs mt-2">{tier.description}</p>
                        </div>

                        {/* Features from limits */}
                        <ul className="space-y-3 flex-1 text-sm">
                            <li className={`flex items-center gap-2 ${isHighlight ? "text-white font-medium" : "text-slate-300"}`}>
                                <span className={`material-symbols-outlined ${style.checkColor} !text-[18px]`}>check</span>
                                {formatLimit(tier.limits.domains)} tên miền
                            </li>
                            <li className={`flex items-center gap-2 ${isHighlight ? "text-white font-medium" : "text-slate-300"}`}>
                                <span className={`material-symbols-outlined ${style.checkColor} !text-[18px]`}>check</span>
                                {formatLimit(tier.limits.inboxes)} hộp thư
                            </li>
                            <li className={`flex items-center gap-2 ${isHighlight ? "text-white font-medium" : "text-slate-300"}`}>
                                <span className={`material-symbols-outlined ${style.checkColor} !text-[18px]`}>check</span>
                                {tier.limits.storageGB}GB lưu trữ
                            </li>
                            {tier.limits.apiAccess ? (
                                <li className={`flex items-center gap-2 ${isHighlight ? "text-white font-medium" : "text-slate-300"}`}>
                                    <span className={`material-symbols-outlined ${style.checkColor} !text-[18px]`}>check</span>
                                    API access
                                </li>
                            ) : (
                                <li className="flex items-center gap-2 text-slate-500">
                                    <span className="material-symbols-outlined !text-[18px]">close</span>
                                    Không API
                                </li>
                            )}
                        </ul>

                        {/* CTA Button */}
                        <Link
                            to={tier.id === "FREE" ? "/register" : `/register?plan=${tier.id.toLowerCase()}`}
                            className={`w-full py-2.5 block text-center rounded-lg font-medium text-sm transition-colors ${style.button}`}
                        >
                            {tier.id === "FREE" ? "Bắt đầu miễn phí" : `Chọn ${tier.name}`}
                        </Link>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Dynamic Comparison Table - For /pricing page
 */
export function DynamicComparisonTable() {
    const [tiers, setTiers] = useState<TierInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTiers = async () => {
            try {
                const res = await api<TiersResponse>("/billing/tiers");
                setTiers(res.tiers);
            } catch (err) {
                console.error("Failed to fetch tiers:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTiers();
    }, []);

    if (loading) {
        return <div className="text-center py-8 text-slate-400">Đang tải...</div>;
    }

    const COMPARISON_ROWS = [
        { key: "domains", label: "Tên miền" },
        { key: "inboxes", label: "Hộp thư" },
        { key: "storageGB", label: "Dung lượng", suffix: "GB" },
        { key: "retentionDays", label: "Thời gian lưu trữ", suffix: " ngày" },
        { key: "apiAccess", label: "API Access", boolean: true },
        { key: "prioritySupport", label: "Hỗ trợ ưu tiên", boolean: true },
        { key: "webhooks", label: "Webhooks" },
    ];

    const tierColors: Record<string, string> = {
        FREE: "text-white",
        STARTER: "text-white",
        PROFESSIONAL: "text-[var(--nebula-violet)]",
        BUSINESS: "text-green-400",
        ENTERPRISE: "text-amber-400",
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-white/10">
                        <th className="py-4 px-4 text-slate-400 font-medium">Tính năng</th>
                        {tiers.map(tier => (
                            <th key={tier.id} className={`py-4 px-4 font-bold text-center ${tierColors[tier.id] || "text-white"}`}>
                                {tier.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300 text-sm">
                    {COMPARISON_ROWS.map(row => (
                        <tr key={row.key}>
                            <td className="py-4 px-4">{row.label}</td>
                            {tiers.map(tier => {
                                const value = tier.limits[row.key];
                                let display: string;

                                if (row.boolean) {
                                    display = value ? "✓" : "×";
                                } else if (value === -1) {
                                    display = "Vô hạn";
                                } else {
                                    display = `${value}${row.suffix || ""}`;
                                }

                                return (
                                    <td
                                        key={tier.id}
                                        className={`py-4 px-4 text-center ${row.boolean ? (value ? "text-green-400" : "text-red-400") : ""}`}
                                    >
                                        {display}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
