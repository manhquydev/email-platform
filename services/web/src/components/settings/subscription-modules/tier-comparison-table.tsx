/**
 * TierComparisonTable - Dynamic tier comparison fetched from API
 * Displays all tier features in a detailed comparison table
 */
import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../utils/api";

interface TierLimits {
    domains: number;
    inboxes: number;
    storageGB: number;
    dailyEmails: number;
    retentionDays: number;
    teams: number;
    teamMembers: number;
    filters: number;
    forwardingRules: number;
    labels: number;
    webhooks: number;
    apiAccess: boolean;
    prioritySupport: boolean;
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

/** Format limit value for display */
function formatLimit(value: number | boolean, suffix?: string): string {
    if (typeof value === "boolean") {
        return value ? "✓" : "—";
    }
    if (value === -1) return "Không giới hạn";
    if (value === 0) return "—";
    return suffix ? `${value} ${suffix}` : value.toString();
}

/** Format price for display (supports VND and USD) */
function formatPrice(price: number, currency: string): string {
    if (price === 0) return "Miễn phí";
    if (currency === "VND") {
        return new Intl.NumberFormat("vi-VN").format(price) + "đ";
    }
    return `$${price}`;
}

/** Feature row labels (Vietnamese) */
const FEATURE_LABELS: Record<keyof TierLimits, { label: string; suffix?: string }> = {
    domains: { label: "Tên miền" },
    inboxes: { label: "Hộp thư" },
    storageGB: { label: "Dung lượng", suffix: "GB" },
    dailyEmails: { label: "Email/ngày" },
    retentionDays: { label: "Lưu trữ", suffix: "ngày" },
    teams: { label: "Đội nhóm" },
    teamMembers: { label: "Thành viên/đội" },
    filters: { label: "Bộ lọc" },
    forwardingRules: { label: "Quy tắc chuyển tiếp" },
    labels: { label: "Nhãn" },
    webhooks: { label: "Webhooks" },
    apiAccess: { label: "Truy cập API" },
    prioritySupport: { label: "Hỗ trợ ưu tiên" },
};

export function TierComparisonTable() {
    const { token, user } = useAuth();
    const [tiers, setTiers] = useState<TierInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTiers = async () => {
            try {
                const res = await api<TiersResponse>("/billing/tiers", { token });
                setTiers(res.tiers);
            } catch (err) {
                console.error("Failed to fetch tiers:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTiers();
    }, [token]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <span className="text-nebula-text-muted">Đang tải...</span>
            </div>
        );
    }

    const currentTier = user?.tier || "FREE";

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-nebula-border">
                        <th className="py-4 px-4 text-nebula-text-muted font-medium sticky left-0 bg-nebula-surface z-10">
                            Tính năng
                        </th>
                        {tiers.map((tier) => (
                            <th
                                key={tier.id}
                                className={`py-4 px-4 text-center font-bold min-w-[120px] ${
                                    tier.id === currentTier
                                        ? "text-nebula-violet bg-nebula-violet/5"
                                        : "text-nebula-text"
                                }`}
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <span>{tier.name}</span>
                                    {tier.badge && (
                                        <span className="text-[10px] bg-nebula-violet text-white px-2 py-0.5 rounded-full">
                                            {tier.badge}
                                        </span>
                                    )}
                                    {tier.id === currentTier && (
                                        <span className="text-[10px] bg-nebula-violet/20 text-nebula-violet px-2 py-0.5 rounded-full">
                                            Hiện tại
                                        </span>
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                    {/* Pricing row */}
                    <tr className="border-b border-nebula-border bg-nebula-elevated/30">
                        <td className="py-4 px-4 text-nebula-text-muted font-medium sticky left-0 bg-nebula-surface z-10">
                            Giá
                        </td>
                        {tiers.map((tier) => (
                            <td
                                key={tier.id}
                                className={`py-4 px-4 text-center ${
                                    tier.id === currentTier ? "bg-nebula-violet/5" : ""
                                }`}
                            >
                                <div className="flex flex-col items-center">
                                    <span className="text-2xl font-bold text-nebula-text">
                                        {formatPrice(tier.price, tier.currency)}
                                    </span>
                                    {tier.price > 0 && (
                                        <span className="text-xs text-nebula-text-muted">/{tier.period}</span>
                                    )}
                                </div>
                            </td>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-nebula-border/50 text-sm">
                    {(Object.keys(FEATURE_LABELS) as (keyof TierLimits)[]).map((key) => {
                        const { label, suffix } = FEATURE_LABELS[key];
                        return (
                            <tr key={key} className="hover:bg-nebula-elevated/20 transition-colors">
                                <td className="py-3 px-4 text-nebula-text-secondary sticky left-0 bg-nebula-surface z-10">
                                    {label}
                                </td>
                                {tiers.map((tier) => {
                                    const value = tier.limits[key];
                                    const isBoolean = typeof value === "boolean";
                                    const isUnlimited = value === -1;
                                    const isZero = value === 0;

                                    return (
                                        <td
                                            key={tier.id}
                                            className={`py-3 px-4 text-center ${
                                                tier.id === currentTier ? "bg-nebula-violet/5" : ""
                                            } ${
                                                isBoolean
                                                    ? value
                                                        ? "text-success"
                                                        : "text-nebula-text-muted"
                                                    : isUnlimited
                                                    ? "text-success font-medium"
                                                    : isZero
                                                    ? "text-nebula-text-muted"
                                                    : "text-nebula-text"
                                            }`}
                                        >
                                            {formatLimit(value, suffix)}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
