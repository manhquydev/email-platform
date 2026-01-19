/**
 * Pricing Cards Section component
 * Displays billing cycle toggle and pricing tier cards
 */
import { useState } from "react";
import { GlassCard } from "../../ui/GlassCard";
import { Button } from "../../ui/Button";
import type { ServicePackage } from "../../../types";

interface PricingCardsSectionProps {
    packages: ServicePackage[];
    loading: boolean;
    currentTier: string;
    onCheckout: (packageId: string) => void;
}

function formatPrice(price: number, currency: string): string {
    if (currency === 'VND') {
        return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

export function PricingCardsSection({ packages, loading, currentTier, onCheckout }: PricingCardsSectionProps) {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const isPlanActive = (planName: string) => currentTier === planName;

    // Filter packages by billing cycle
    const filteredPackages = packages.filter(pkg => {
        if (pkg.type !== 'TIME_BASED') return false;
        const days = pkg.durationDays || 30;
        return billingCycle === 'monthly' ? days <= 45 : days > 45;
    });

    const getPackageByTier = (tier: string) => filteredPackages.find(pkg => pkg.targetTier === tier);

    return (
        <div className="flex flex-col gap-8 mt-4">
            <div className="flex flex-col items-center gap-4">
                <h2 className="text-2xl font-bold text-nebula-text">Nâng cấp gói của bạn</h2>
                <div className="p-1 rounded-xl inline-flex relative bg-nebula-elevated border border-nebula-border">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`relative z-10 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${billingCycle === 'monthly' ? 'bg-nebula-violet text-white shadow-lg' : 'text-nebula-text-muted hover:text-nebula-text'}`}
                    >
                        Hàng tháng
                    </button>
                    <button
                        onClick={() => setBillingCycle('yearly')}
                        className={`relative z-10 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${billingCycle === 'yearly' ? 'bg-nebula-violet text-white shadow-lg' : 'text-nebula-text-muted hover:text-nebula-text'}`}
                    >
                        <span>Hàng năm <span className="text-[10px] ml-1 bg-nebula-elevated px-1.5 py-0.5 rounded text-nebula-text">Tiết kiệm 20%</span></span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <span className="text-nebula-text-muted">Đang tải gói dịch vụ...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {/* Free Tier */}
                    <GlassCard className={`p-6 flex flex-col gap-6 hover:-translate-y-1 transition-transform duration-300 bg-nebula-surface border border-nebula-border shadow-sm ${isPlanActive('FREE') ? 'border-nebula-violet shadow-[0_0_30px_rgba(139,92,246,0.15)] ring-2 ring-nebula-violet/20' : ''}`}>
                        <div>
                            <h3 className="text-lg font-bold text-nebula-text">Miễn phí</h3>
                            <p className="text-nebula-text-muted text-sm mt-1">Cơ bản ẩn danh</p>
                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-nebula-text">0đ</span>
                                <span className="text-nebula-text-muted text-sm">/tháng</span>
                            </div>
                        </div>
                        <Button variant={isPlanActive('FREE') ? "secondary" : "ghost"} disabled={isPlanActive('FREE')} className="w-full">
                            {isPlanActive('FREE') ? "Gói hiện tại" : "Hạ cấp"}
                        </Button>
                        <ul className="flex flex-col gap-3 text-sm text-nebula-text-secondary">
                            <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> 1 Tên miền</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> 3 Hộp thư</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> 100MB Lưu trữ</li>
                        </ul>
                    </GlassCard>

                    {/* Starter Tier */}
                    {(() => {
                        const pkg = getPackageByTier('STARTER');
                        return (
                            <GlassCard className={`p-6 flex flex-col gap-6 hover:-translate-y-1 transition-transform duration-300 relative bg-nebula-surface border border-nebula-border shadow-sm ${isPlanActive('STARTER') ? 'border-nebula-violet shadow-[0_0_30px_rgba(139,92,246,0.15)] ring-2 ring-nebula-violet/20' : ''}`}>
                                {isPlanActive('STARTER') && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-nebula-violet text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-nebula-violet/40">
                                        Gói hiện tại
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-lg font-bold text-nebula-text">Khởi đầu</h3>
                                    <p className="text-nebula-text-muted text-sm mt-1">Cho cá nhân</p>
                                    <div className="mt-4 flex items-baseline gap-1">
                                        <span className="text-4xl font-bold text-nebula-text">
                                            {pkg ? formatPrice(pkg.price, pkg.currency) : '--'}
                                        </span>
                                        <span className="text-nebula-text-muted text-sm">/{billingCycle === 'monthly' ? 'tháng' : 'năm'}</span>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => pkg && onCheckout(pkg.id)}
                                    variant={isPlanActive('STARTER') ? "secondary" : "primary"}
                                    disabled={!pkg || isPlanActive('STARTER')}
                                    className="w-full"
                                >
                                    {isPlanActive('STARTER') ? "Quản lý đăng ký" : pkg ? "Nâng cấp" : "Không khả dụng"}
                                </Button>
                                <ul className="flex flex-col gap-3 text-sm text-nebula-text-secondary">
                                    <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> 3 Tên miền riêng</li>
                                    <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> 20 Hộp thư</li>
                                    <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> 1GB Lưu trữ</li>
                                </ul>
                            </GlassCard>
                        );
                    })()}

                    {/* Professional Tier */}
                    {(() => {
                        const pkg = getPackageByTier('PROFESSIONAL');
                        return (
                            <GlassCard className={`p-6 flex flex-col gap-6 hover:-translate-y-1 transition-transform duration-300 relative bg-nebula-surface shadow-[0_0_40px_-10px_rgba(139,92,246,0.15)] border ${isPlanActive('PROFESSIONAL') ? 'border-nebula-violet ring-2 ring-nebula-violet/20' : 'border-nebula-violet/50'}`}>
                                <div className="absolute top-0 right-0 p-3">
                                    <span className="flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nebula-violet opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-nebula-violet"></span>
                                    </span>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-nebula-text">Chuyên nghiệp</h3>
                                        <span className="text-xs font-bold text-nebula-violet bg-nebula-violet/10 px-2 py-1 rounded">PHỔ BIẾN</span>
                                    </div>
                                    <p className="text-nebula-text-muted text-sm mt-1">Ẩn danh & riêng tư tối đa</p>
                                    <div className="mt-4 flex items-baseline gap-1">
                                        <span className="text-4xl font-bold text-nebula-text">
                                            {pkg ? formatPrice(pkg.price, pkg.currency) : '--'}
                                        </span>
                                        <span className="text-nebula-text-muted text-sm">/{billingCycle === 'monthly' ? 'tháng' : 'năm'}</span>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => pkg && onCheckout(pkg.id)}
                                    variant="primary"
                                    disabled={!pkg || isPlanActive('PROFESSIONAL')}
                                    className="w-full shadow-lg shadow-nebula-violet/25"
                                >
                                    {isPlanActive('PROFESSIONAL') ? "Gói hiện tại" : pkg ? "Nâng cấp" : "Không khả dụng"}
                                </Button>
                                <ul className="flex flex-col gap-3 text-sm text-nebula-text-secondary">
                                    <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> 10 Tên miền riêng</li>
                                    <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> 100 Hộp thư</li>
                                    <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> 5GB Lưu trữ</li>
                                    <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> API Access</li>
                                </ul>
                            </GlassCard>
                        );
                    })()}

                    {/* Enterprise Tier */}
                    <GlassCard className="p-6 flex flex-col gap-6 hover:-translate-y-1 transition-transform duration-300 bg-nebula-surface border border-nebula-border shadow-sm">
                        <div>
                            <h3 className="text-lg font-bold text-nebula-text">Doanh nghiệp</h3>
                            <p className="text-nebula-text-muted text-sm mt-1">Truy cập API & lưu lượng lớn</p>
                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-nebula-text">Liên hệ</span>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => window.location.href = 'mailto:support@manhquy.click?subject=Enterprise%20Plan%20Inquiry'}
                        >
                            Liên hệ bán hàng
                        </Button>
                        <ul className="flex flex-col gap-3 text-sm text-nebula-text-secondary">
                            <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> Không giới hạn tên miền</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> Không giới hạn hộp thư</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> 50GB+ Lưu trữ</li>
                            <li className="flex gap-3"><span className="material-symbols-outlined text-success text-[20px]">check</span> Dedicated Support</li>
                        </ul>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}
