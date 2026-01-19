/**
 * Plans - Subscription pricing page with billing cycle toggle
 * Modules extracted to plans-modules/
 */
import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
    type DisplayPackage,
    filterPackages,
    sortPackages,
    BillingCycleToggle,
    PlansGrid
} from "./plans-modules";

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

    useEffect(() => {
        const loadData = async () => {
            // Load user profile
            if (token) {
                try {
                    const res = await api<{ user: { tier: string } }>("/auth/me", { token });
                    setCurrentTier(res.user.tier);
                } catch { /* Silent fail */ }
            }

            // Load packages
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
        loadData();
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

    const sortedPackages = sortPackages(filterPackages(packages, billingCycle));

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
                            <BillingCycleToggle billingCycle={billingCycle} setBillingCycle={setBillingCycle} />
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
                        <PlansGrid
                            packages={sortedPackages}
                            currentTier={currentTier}
                            billingCycle={billingCycle}
                            onUpgrade={handleUpgrade}
                        />
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
