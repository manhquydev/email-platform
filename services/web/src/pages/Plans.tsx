import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import type { ServicePackage } from "../types";

interface PlanFeature {
    text: string;
    included: boolean;
}

interface DisplayPackage extends ServicePackage {
    features?: PlanFeature[];
    displayOrder?: number;
    recommended?: boolean;
    badge?: string;
}

export function Plans() {
    const { token } = useAuth();
    const [currentTier, setCurrentTier] = useState<string>("FREE");
    const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
    const [packages, setPackages] = useState<DisplayPackage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("payment") === "cancelled") {
            toast.error("Thanh toán đã bị hủy.");
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const loadUserProfile = async () => {
        if (!token) return;
        try {
            const res = await api<{ user: { tier: string } }>("/auth/me", { token });
            setCurrentTier(res.user.tier);
        } catch {
            // Silent fail
        }
    };

    const loadPackages = async () => {
        setLoading(true);
        try {
            const res = await api<{ packages: DisplayPackage[] }>("/billing/packages");
            setPackages(res.packages || []);
        } catch {
            toast.error("Không thể tải danh sách gói dịch vụ");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUserProfile();
        loadPackages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleUpgrade = async (pkg: DisplayPackage) => {
        if (!token) {
            toast.error("Vui lòng đăng nhập để nâng cấp");
            return;
        }

        if (pkg.targetTier === "ENTERPRISE" || pkg.price === 0) {
            if (pkg.targetTier === 'ENTERPRISE') {
                window.location.href = "mailto:support@manhquy.click?subject=Enterprise%20Plan%20Inquiry";
            }
            return;
        }

        try {
            toast.loading("Đang chuẩn bị thanh toán...");
            const res = await api<{ url: string }>("/billing/checkout", {
                method: "POST",
                token,
                body: { packageId: pkg.id }
            });
            toast.dismiss();
            if (res.url) {
                window.location.href = res.url;
            }
        } catch (error) {
            toast.dismiss();
            toast.error((error as Error).message || "Không thể khởi tạo thanh toán");
        }
    };

    // Filter packages based on billing cycle
    const filteredPackages = packages.filter(pkg => {
        if (!pkg.isActive) return false;
        if (pkg.type !== 'TIME_BASED') return true;
        const days = pkg.durationDays || 30;
        if (billingCycle === 'monthly') {
            return days <= 45;
        } else {
            return days > 45;
        }
    });

    // Sort by displayOrder, then by targetTier hierarchy
    const sortedPackages = [...filteredPackages].sort((a, b) => {
        const orderA = a.displayOrder ?? 99;
        const orderB = b.displayOrder ?? 99;
        if (orderA !== orderB) return orderA - orderB;

        // Tier hierarchy as fallback
        const tierOrder = { FREE: 0, STARTER: 1, PROFESSIONAL: 2, ENTERPRISE: 3 };
        return (tierOrder[a.targetTier as keyof typeof tierOrder] || 0) -
               (tierOrder[b.targetTier as keyof typeof tierOrder] || 0);
    });

    // Default features based on tier if not provided
    const getDefaultFeatures = (pkg: DisplayPackage): PlanFeature[] => {
        const tier = pkg.targetTier;
        switch (tier) {
            case 'FREE':
                return [
                    { text: "1 Tên miền riêng", included: true },
                    { text: "3 Hộp thư email", included: true },
                    { text: "100MB Lưu trữ", included: true },
                    { text: "50 Email gửi/ngày", included: true },
                    { text: "API Access", included: false },
                ];
            case 'STARTER':
                return [
                    { text: "3 Tên miền riêng", included: true },
                    { text: "20 Hộp thư email", included: true },
                    { text: "1GB Lưu trữ", included: true },
                    { text: "200 Email gửi/ngày", included: true },
                    { text: "API Access", included: false },
                ];
            case 'PROFESSIONAL':
                return [
                    { text: "10 Tên miền riêng", included: true },
                    { text: "100 Hộp thư email", included: true },
                    { text: "5GB Lưu trữ", included: true },
                    { text: "1000 Email gửi/ngày", included: true },
                    { text: "API Access", included: true },
                ];
            case 'ENTERPRISE':
                return [
                    { text: "Không giới hạn tên miền", included: true },
                    { text: "Không giới hạn hộp thư", included: true },
                    { text: "50GB+ Lưu trữ", included: true },
                    { text: "Email không giới hạn", included: true },
                    { text: "Dedicated Support", included: true },
                ];
            default:
                return [
                    { text: `${pkg.durationDays || 30} ngày sử dụng`, included: true },
                ];
        }
    };

    // Format price display
    const formatPrice = (price: number, currency: string) => {
        if (price === 0) return "0";
        if (currency === 'VND') {
            return new Intl.NumberFormat('vi-VN').format(price);
        }
        return new Intl.NumberFormat('en-US').format(price);
    };

    // Get currency symbol
    const getCurrencySymbol = (currency: string) => {
        return currency === 'VND' ? 'đ' : currency;
    };

    // Get period text
    const getPeriod = (pkg: DisplayPackage) => {
        if (pkg.type === 'USAGE_BASED') return ' lượt';
        return pkg.durationDays && pkg.durationDays > 45 ? '/năm' : '/tháng';
    };

    return (
        <div className="flex-1 h-full flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto" style={{ background: 'var(--nebula-void)' }}>
                {/* Header */}
                <div className="page-header">
                    <div className="page-header-content">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="page-header-icon">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="page-header-title">Gói Dịch Vụ</h1>
                                    <p className="page-header-subtitle">Nâng cấp để mở rộng giới hạn tài nguyên</p>
                                </div>
                            </div>

                            {/* Billing Cycle Toggle */}
                            <div className="hidden sm:flex p-1 rounded-lg bg-[var(--nebula-surface)] border border-[var(--nebula-border)]">
                                <button
                                    onClick={() => setBillingCycle("monthly")}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${billingCycle === "monthly"
                                        ? "bg-[var(--nebula-elevated)] text-[var(--nebula-text)] shadow-sm"
                                        : "text-[var(--nebula-text-muted)] hover:text-[var(--nebula-text)]"
                                        }`}
                                >
                                    Theo tháng
                                </button>
                                <button
                                    onClick={() => setBillingCycle("yearly")}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${billingCycle === "yearly"
                                        ? "bg-[var(--nebula-elevated)] text-[var(--nebula-text)] shadow-sm"
                                        : "text-[var(--nebula-text-muted)] hover:text-[var(--nebula-text)]"
                                        }`}
                                >
                                    Theo năm <span className="text-[10px] text-[var(--nebula-success)] ml-1">-20%</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-7xl mx-auto px-6 py-10 pb-20">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <span className="text-[var(--nebula-text-muted)]">Đang tải gói dịch vụ...</span>
                        </div>
                    ) : sortedPackages.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-[var(--nebula-text-muted)]">Chưa có gói dịch vụ nào được cấu hình.</p>
                        </div>
                    ) : (
                        <div className={`grid grid-cols-1 gap-6 ${
                            sortedPackages.length === 1 ? 'md:grid-cols-1 max-w-md mx-auto' :
                            sortedPackages.length === 2 ? 'md:grid-cols-2 max-w-2xl mx-auto' :
                            sortedPackages.length === 3 ? 'md:grid-cols-3 max-w-4xl mx-auto' :
                            'md:grid-cols-2 lg:grid-cols-4'
                        }`}>
                            {sortedPackages.map((pkg) => {
                                const isCurrentPlan = currentTier === pkg.targetTier;
                                const isRecommended = pkg.recommended;
                                const features = (pkg.features as PlanFeature[]) || getDefaultFeatures(pkg);
                                const badge = pkg.badge;

                                return (
                                    <div
                                        key={pkg.id}
                                        className={`relative flex flex-col p-6 rounded-2xl transition-all duration-300 ${isRecommended
                                            ? "bg-gradient-to-b from-[rgba(139,92,246,0.1)] to-[rgba(139,92,246,0.05)] border-[rgba(139,92,246,0.5)] shadow-[0_0_30px_rgba(139,92,246,0.15)] ring-1 ring-[rgba(139,92,246,0.5)]"
                                            : "glass-card hover:bg-[var(--nebula-surface)]"
                                            }`}
                                        style={{
                                            border: isRecommended ? undefined : '1px solid var(--nebula-border)'
                                        }}
                                    >
                                        {badge && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[var(--nebula-violet)] text-white text-xs font-bold rounded-full shadow-lg uppercase tracking-wide">
                                                {badge}
                                            </div>
                                        )}

                                        <div className="mb-4">
                                            <h3 className="text-lg font-semibold" style={{ color: 'var(--nebula-text)' }}>{pkg.name}</h3>
                                            <p className="text-sm mt-1 h-10" style={{ color: 'var(--nebula-text-muted)' }}>{pkg.description}</p>
                                        </div>

                                        <div className="mb-6">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-bold" style={{ color: 'var(--nebula-text)' }}>
                                                    {formatPrice(pkg.price, pkg.currency)}
                                                </span>
                                                <span className="text-sm font-medium" style={{ color: 'var(--nebula-text-muted)' }}>
                                                    {getCurrencySymbol(pkg.currency)}{getPeriod(pkg)}
                                                </span>
                                            </div>
                                            {billingCycle === "yearly" && pkg.price > 0 && pkg.type === 'TIME_BASED' && (
                                                <p className="text-xs mt-1" style={{ color: 'var(--nebula-success)' }}>
                                                    Tiết kiệm {formatPrice(Math.round(pkg.price * 0.2), pkg.currency)}{getCurrencySymbol(pkg.currency)} / năm
                                                </p>
                                            )}
                                        </div>

                                        <ul className="space-y-3 mb-8 flex-1">
                                            {features.map((feature, idx) => (
                                                <li key={idx} className="flex items-start gap-3 text-sm">
                                                    {feature.included ? (
                                                        <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--nebula-success)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--nebula-text-muted)', opacity: 0.5 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    )}
                                                    <span style={{
                                                        color: feature.included ? 'var(--nebula-text)' : 'var(--nebula-text-muted)',
                                                        opacity: feature.included ? 1 : 0.7
                                                    }}>
                                                        {feature.text}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>

                                        <button
                                            onClick={() => handleUpgrade(pkg)}
                                            disabled={isCurrentPlan}
                                            className={`w-full py-2.5 rounded-xl font-medium transition-all duration-200 ${isCurrentPlan
                                                ? "bg-[var(--nebula-surface)] text-[var(--nebula-text-muted)] cursor-default border border-[var(--nebula-border)]"
                                                : isRecommended
                                                    ? "btn-nebula-primary shadow-lg shadow-violet-500/20"
                                                    : "btn-nebula-secondary hover:bg-[var(--nebula-elevated)]"
                                                }`}
                                        >
                                            {isCurrentPlan ? "Đang sử dụng" : pkg.targetTier === 'ENTERPRISE' ? "Liên hệ" : "Mua ngay"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-12 text-center">
                        <p className="text-sm" style={{ color: 'var(--nebula-text-muted)' }}>
                            Cần thêm tài nguyên tùy chỉnh? <a href="mailto:support@manhquy.click" className="text-[var(--nebula-blue)] hover:underline">Liên hệ chúng tôi</a> để được tư vấn.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
