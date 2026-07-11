/**
 * TierComparisonTable - Dynamic tier comparison fetched from API
 * Displays all tier features in a detailed comparison table
 */
import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../utils/api";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "../../ui/Table";
import { cn } from "../../../utils/cn";

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
                <span className="text-semantic-text-muted">Đang tải...</span>
            </div>
        );
    }

    const currentTier = user?.tier || "FREE";

    return (
        <Table>
            <TableCaption>So sánh chi tiết các gói dịch vụ theo tính năng và giới hạn</TableCaption>
            <TableHeader className="bg-transparent">
                <tr className="border-b border-semantic-border">
                    <TableHead className="sticky left-0 bg-semantic-bg-elevated z-10 normal-case text-sm">
                        Tính năng
                    </TableHead>
                    {tiers.map((tier) => (
                        <TableHead
                            key={tier.id}
                            scope="col"
                            className={cn(
                                "text-center normal-case text-base font-bold min-w-[120px]",
                                tier.id === currentTier
                                    ? "text-semantic-accent-text bg-semantic-accent-subtle"
                                    : "text-semantic-text-main"
                            )}
                        >
                            <div className="flex flex-col items-center gap-1">
                                <span>{tier.name}</span>
                                {tier.badge && (
                                    <span className="text-[10px] bg-semantic-accent text-white px-2 py-0.5 rounded-full normal-case font-medium">
                                        {tier.badge}
                                    </span>
                                )}
                                {tier.id === currentTier && (
                                    <span className="text-[10px] bg-semantic-accent-subtle text-semantic-accent-text px-2 py-0.5 rounded-full normal-case font-medium">
                                        Hiện tại
                                    </span>
                                )}
                            </div>
                        </TableHead>
                    ))}
                </tr>
                {/* Pricing row */}
                <tr className="border-b border-semantic-border bg-semantic-bg-secondary/30">
                    <TableCell className="sticky left-0 bg-semantic-bg-elevated z-10 text-semantic-text-muted font-medium">
                        Giá
                    </TableCell>
                    {tiers.map((tier) => (
                        <TableCell
                            key={tier.id}
                            className={cn("text-center", tier.id === currentTier ? "bg-semantic-accent-subtle" : "")}
                        >
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-bold text-semantic-text-main">
                                    {formatPrice(tier.price, tier.currency)}
                                </span>
                                {tier.price > 0 && (
                                    <span className="text-xs text-semantic-text-muted">/{tier.period}</span>
                                )}
                            </div>
                        </TableCell>
                    ))}
                </tr>
            </TableHeader>
            <TableBody>
                {(Object.keys(FEATURE_LABELS) as (keyof TierLimits)[]).map((key) => {
                    const { label, suffix } = FEATURE_LABELS[key];
                    return (
                        <TableRow key={key}>
                            <TableCell className="sticky left-0 bg-semantic-bg-elevated z-10 text-semantic-text-secondary">
                                {label}
                            </TableCell>
                            {tiers.map((tier) => {
                                const value = tier.limits[key];
                                const isBoolean = typeof value === "boolean";
                                const isUnlimited = value === -1;
                                const isZero = value === 0;

                                return (
                                    <TableCell
                                        key={tier.id}
                                        className={cn(
                                            "text-center",
                                            tier.id === currentTier ? "bg-semantic-accent-subtle" : "",
                                            isBoolean
                                                ? value
                                                    ? "text-semantic-success"
                                                    : "text-semantic-text-muted"
                                                : isUnlimited
                                                    ? "text-semantic-success font-medium"
                                                    : isZero
                                                        ? "text-semantic-text-muted"
                                                        : "text-semantic-text-main"
                                        )}
                                    >
                                        {formatLimit(value, suffix)}
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
