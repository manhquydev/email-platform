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

    const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

    useEffect(() => {
        loadUserProfile();
    }, [token]);

    const loadUserProfile = async () => {
        if (!token) {
            // setLoading(false);
            return;
        }
        try {
            const res = await api<{ user: { tier: string } }>("/auth/me", { token });
            setCurrentTier(res.user.tier);
        } catch (error) {
            console.error("Failed to load user profile", error);
        } finally {
            // setLoading(false);
        }
    };

    const handleUpgrade = (tier: string) => {
        // Mock upgrade flow for now
        toast.success(`Đang chuyển hướng thanh toán cho gói ${tier}...`);
        // In real impl, redirect to Stripe checkout or open contact form
        if (tier === 'ENTERPRISE') {
            window.location.href = "mailto:support@manhquy.click?subject=Enterprise%20Plan%20Inquiry";
        }
    };

    const plans: Plan[] = [
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
            buttonText: currentTier === "FREE" ? "Đang sử dụng" : "Hạ cấp",
            buttonAction: () => handleUpgrade("FREE")
        },
        {
            id: "STARTER",
            name: "Starter",
            description: "Cho người dùng chuyên nghiệp",
            price: "69.000",
            currency: "đ",
            period: "/tháng",
            features: [
                { text: "3 Tên miền riêng", included: true },
                { text: "20 Hộp thư email", included: true },
                { text: "1GB Lưu trữ", included: true },
                { text: "200 Email gửi/ngày", included: true },
                { text: "Hỗ trợ qua Email", included: true },
                { text: "API Access cơ bản", included: true },
            ],
            recommended: true,
            buttonText: currentTier === "STARTER" ? "Đang sử dụng" : "Nâng cấp",
            buttonAction: () => handleUpgrade("STARTER")
        },
        {
            id: "PROFESSIONAL",
            name: "Pro",
            description: "Cho doanh nghiệp nhỏ",
            price: "199.000",
            currency: "đ",
            period: "/tháng",
            features: [
                { text: "10 Tên miền riêng", included: true },
                { text: "100 Hộp thư email", included: true },
                { text: "5GB Lưu trữ", included: true },
                { text: "1000 Email gửi/ngày", included: true },
                { text: "Hỗ trợ ưu tiên", included: true },
                { text: "Full API Access", included: true },
            ],
            buttonText: currentTier === "PROFESSIONAL" ? "Đang sử dụng" : "Nâng cấp",
            buttonAction: () => handleUpgrade("PROFESSIONAL")
        },
        {
            id: "ENTERPRISE",
            name: "Enterprise",
            description: "Giải pháp tùy chỉnh",
            price: "Liên hệ",
            currency: "",
            period: "",
            features: [
                { text: "Không giới hạn Domains", included: true },
                { text: "Không giới hạn Hộp thư", included: true },
                { text: "50GB+ Lưu trữ", included: true },
                { text: "Gửi email không giới hạn", included: true },
                { text: "Hỗ trợ 24/7", included: true },
                { text: "Custom Integration", included: true },
            ],
            buttonText: "Liên hệ",
            buttonAction: () => handleUpgrade("ENTERPRISE")
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
