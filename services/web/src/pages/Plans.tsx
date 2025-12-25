import { useState, useEffect } from "react";

import { SecondaryLayout } from "../layouts/SecondaryLayout";
import { api } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

interface PlanFeature {
    text: string;
    included: boolean;
}

interface Plan {
    id: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
    name: string;
    description: string;
    price: string | number;
    currency: string;
    period: string;
    features: PlanFeature[];
    recommended?: boolean;
    buttonText: string;
    buttonAction: () => void;
}

export function Plans() {
    const { token } = useAuth();
    const [currentTier, setCurrentTier] = useState<string>("FREE");

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("payment") === "cancelled") {
            toast.error("Thanh toán đã bị hủy.");
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

    const [packages, setPackages] = useState<any[]>([]);

    useEffect(() => {
        loadUserProfile();
        loadPackages();
    }, [token]);

    const loadUserProfile = async () => {
        if (!token) return;
        try {
            const res = await api<{ user: { tier: string } }>("/auth/me", { token });
            setCurrentTier(res.user.tier);
        } catch (error) {
            console.error("Failed to load user profile", error);
        }
    };

    const loadPackages = async () => {
        try {
            const res = await api<{ packages: any[] }>("/billing/packages");
            setPackages(res.packages);
        } catch (error) {
            console.error("Failed to load packages", error);
        }
    };

    const handleUpgrade = async (pkg: any) => {
        if (!token) {
            toast.error("Vui lòng đăng nhập để nâng cấp");
            return;
        }

        if (pkg.id === "ENTERPRISE" || pkg.price === 0) {
            // Special cases
            if (pkg.id === 'ENTERPRISE') {
                window.location.href = "mailto:support@manhquy.click?subject=Enterprise%20Plan%20Inquiry";
                return;
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
        } catch (error: any) {
            toast.dismiss();
            toast.error(error.message || "Không thể khởi tạo thanh toán");
        }
    };

    // Filter packages based on billing cycle
    const filteredPackages = packages.filter(pkg => {
        if (pkg.type !== 'TIME_BASED') return true; // Always show credit packages? Or maybe filter them out if strictly time-based page.
        // Assuming credit packages are agnostic, but let's stick to subscription logic.

        // Duration check: Monthly (~30 days), Yearly (~365 days)
        const days = pkg.durationDays || 30;
        if (billingCycle === 'monthly') {
            return days <= 45; // Capture 30, 31 days
        } else {
            return days > 45; // Capture 90, 180, 365 days
        }
    });

    // Map backend packages to UI plans
    const dynamicPlans: Plan[] = filteredPackages.map(pkg => ({
        id: pkg.targetTier || "FREE",
        name: pkg.name.replace(" (Test)", "").replace(" (Yearly)", ""), // Clean up names for UI
        description: pkg.description || "",
        price: pkg.price,
        currency: pkg.currency === 'VND' ? 'đ' : pkg.currency,
        period: pkg.type === 'TIME_BASED' ? (pkg.durationDays > 45 ? '/năm' : '/tháng') : ' lượt',
        features: [
            { text: pkg.type === 'TIME_BASED' ? `${pkg.durationDays} ngày sử dụng` : `+${pkg.creditAmount} Credits`, included: true },
            // Add more default features based on tier
            { text: "Hỗ trợ 24/7", included: true },
            { text: "Tên miền riêng", included: true },
            { text: "API Access", included: pkg.targetTier === 'PROFESSIONAL' || pkg.targetTier === 'ENTERPRISE' },
        ],
        recommended: pkg.targetTier === 'PROFESSIONAL',
        buttonText: currentTier === pkg.targetTier ? "Đang sử dụng" : "Mua ngay",
        buttonAction: () => handleUpgrade(pkg)
    }));

    // If no packages from backend, fallback to hardcoded for UI safety
    const plans = dynamicPlans.length > 0 ? dynamicPlans : [
        {
            id: "FREE",
            name: "Miễn phí",
            description: "Dành cho cá nhân trải nghiệm",
            price: 0,
            currency: "đ",
            period: "/tháng",
            features: [
                { text: "1 Tên miền riêng", included: true },
                { text: "3 Hộp thư email", included: true },
                { text: "100MB Lưu trữ", included: true },
                { text: "50 Email gửi/ngày", included: true },
                { text: "Hỗ trợ cộng đồng", included: true },
                { text: "API Access", included: false },
            ],
            buttonText: currentTier === "FREE" ? "Đang sử dụng" : "Bắt đầu",
            buttonAction: () => { },
            recommended: false
        }
    ];

    return (
        <SecondaryLayout>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className={`relative flex flex-col p-6 rounded-2xl transition-all duration-300 ${plan.recommended
                                    ? "bg-gradient-to-b from-[rgba(139,92,246,0.1)] to-[rgba(139,92,246,0.05)] border-[rgba(139,92,246,0.5)] shadow-[0_0_30px_rgba(139,92,246,0.15)] ring-1 ring-[rgba(139,92,246,0.5)]"
                                    : "glass-card hover:bg-[var(--nebula-surface)]"
                                    }`}
                                style={{
                                    border: plan.recommended ? undefined : '1px solid var(--nebula-border)'
                                }}
                            >
                                {plan.recommended && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[var(--nebula-violet)] text-white text-xs font-bold rounded-full shadow-lg">
                                        KHUYÊN DÙNG
                                    </div>
                                )}

                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold" style={{ color: 'var(--nebula-text)' }}>{plan.name}</h3>
                                    <p className="text-sm mt-1 h-10" style={{ color: 'var(--nebula-text-muted)' }}>{plan.description}</p>
                                </div>

                                <div className="mb-6">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-bold" style={{ color: 'var(--nebula-text)' }}>
                                            {typeof plan.price === 'number'
                                                ? (plan.price === 0 ? "0" : new Intl.NumberFormat('vi-VN').format(plan.price))
                                                : plan.price}
                                        </span>
                                        <span className="text-sm font-medium" style={{ color: 'var(--nebula-text-muted)' }}>
                                            {plan.currency}{plan.period}
                                        </span>
                                    </div>
                                    {billingCycle === "yearly" && typeof plan.price === 'number' && plan.price > 0 && (
                                        <p className="text-xs mt-1" style={{ color: 'var(--nebula-success)' }}>
                                            Tiết kiệm {new Intl.NumberFormat('vi-VN').format(plan.price * 12 * 0.2)}đ / năm
                                        </p>
                                    )}
                                </div>

                                <ul className="space-y-3 mb-8 flex-1">
                                    {plan.features.map((feature, idx) => (
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
                                    onClick={plan.buttonAction}
                                    disabled={plan.id === currentTier}
                                    className={`w-full py-2.5 rounded-xl font-medium transition-all duration-200 ${plan.id === currentTier
                                        ? "bg-[var(--nebula-surface)] text-[var(--nebula-text-muted)] cursor-default border border-[var(--nebula-border)]"
                                        : plan.recommended
                                            ? "btn-nebula-primary shadow-lg shadow-violet-500/20"
                                            : "btn-nebula-secondary hover:bg-[var(--nebula-elevated)]"
                                        }`}
                                >
                                    {plan.buttonText}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 text-center">
                        <p className="text-sm" style={{ color: 'var(--nebula-text-muted)' }}>
                            Cần thêm tài nguyên tùy chỉnh? <a href="mailto:support@manhquy.click" className="text-[var(--nebula-blue)] hover:underline">Liên hệ chúng tôi</a> để được tư vấn.
                        </p>
                    </div>
                </div>
            </div>
        </SecondaryLayout>
    );
}
