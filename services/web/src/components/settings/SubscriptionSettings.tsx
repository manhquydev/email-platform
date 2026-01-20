/**
 * Subscription Settings component
 * Manages subscription plans, billing, and payment history
 * Refactored to use modular hooks and components
 * Updated: Added VietQR checkout modal for SePay integration
 */
import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { VietQRCheckoutModal } from "../billing/vietqr-checkout-modal";

// Import modular components
import {
    useSubscriptionData,
    useSubscriptionActions,
    SubscriptionStatsCards,
    PaymentMethodCard,
    PricingCardsSection,
    PaymentHistoryTable,
    TierComparisonTable
} from "./subscription-modules";

interface UserProfile {
    tier: string;
    subscriptionEndsAt?: string | null;
    usage?: { domains: number; inboxes: number; storage: number };
    limits?: { domains: number; inboxes: number; storageGB: number; dailyEmails: number };
}

interface SubscriptionSettingsProps {
    profile: UserProfile | null;
    loadProfile: () => void;
}

export function SubscriptionSettings({ profile, loadProfile }: SubscriptionSettingsProps) {
    const [redeemCode, setRedeemCode] = useState("");
    const [redeemBusy, setRedeemBusy] = useState(false);

    // Use modular hooks
    const {
        payments,
        paymentMethod,
        packages,
        loadingPayments,
        loadingPaymentMethod,
        loadingPackages
    } = useSubscriptionData();

    const {
        handlePortal,
        handleCheckout,
        handleRedeem,
        handleExportReport,
        handleDownloadInvoice,
        sepayCheckout,
        sepayPackageName,
        isSepayModalOpen,
        closeSepayModal
    } = useSubscriptionActions({ loadProfile, payments });

    // Wrapper to pass package name to checkout
    const onCheckout = (packageId: string) => {
        const pkg = packages.find(p => p.id === packageId);
        handleCheckout(packageId, pkg?.name || "Gói dịch vụ");
    };

    const onRedeem = async () => {
        if (!redeemCode.trim()) return;
        setRedeemBusy(true);
        const success = await handleRedeem(redeemCode);
        if (success) setRedeemCode("");
        setRedeemBusy(false);
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header with actions */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-nebula-text mb-2 tracking-tight">Gói & Thanh toán</h2>
                    <p className="text-nebula-text-muted font-body">Quản lý đăng ký, số dư và hóa đơn của bạn.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExportReport}
                        className="glass-panel px-4 py-2 rounded-lg text-sm font-medium hover:bg-nebula-elevated transition-colors flex items-center gap-2 border border-nebula-border text-nebula-text-secondary"
                    >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        Xuất báo cáo
                    </button>
                    <div className="flex gap-2">
                        <Input
                            value={redeemCode}
                            onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                            placeholder="MÃ KÍCH HOẠT"
                            className="font-mono uppercase !py-1.5 !text-sm w-32"
                        />
                        <Button
                            onClick={onRedeem}
                            disabled={redeemBusy || !redeemCode}
                            size="sm"
                        >
                            {redeemBusy ? "..." : "Kích hoạt"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Dashboard Grid: Stats + Payment Method */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <SubscriptionStatsCards profile={profile} />
                <PaymentMethodCard
                    paymentMethod={paymentMethod}
                    loading={loadingPaymentMethod}
                    onManage={handlePortal}
                />
            </div>

            {/* Pricing Section */}
            <PricingCardsSection
                packages={packages}
                loading={loadingPackages}
                currentTier={profile?.tier || 'FREE'}
                onCheckout={onCheckout}
            />

            {/* VietQR Checkout Modal */}
            {sepayCheckout && (
                <VietQRCheckoutModal
                    isOpen={isSepayModalOpen}
                    onClose={closeSepayModal}
                    checkoutData={sepayCheckout}
                    packageName={sepayPackageName}
                    onSuccess={closeSepayModal}
                />
            )}

            {/* Tier Comparison Table */}
            <section className="glass-panel rounded-xl p-6 bg-nebula-surface border border-nebula-border">
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-nebula-text mb-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-nebula-violet">compare</span>
                        So sánh chi tiết các gói
                    </h3>
                    <p className="text-sm text-nebula-text-muted">
                        Xem tất cả tính năng và giới hạn của từng gói dịch vụ.
                    </p>
                </div>
                <TierComparisonTable />
            </section>

            {/* Billing History Table */}
            <PaymentHistoryTable
                payments={payments}
                loading={loadingPayments}
                onDownloadInvoice={handleDownloadInvoice}
            />
        </div>
    );
}
