/**
 * UI components for Plans page
 */
import type { DisplayPackage, PlanFeature } from "./plans-helpers";
import { getDefaultFeatures, formatPrice, getCurrencySymbol, getPeriod } from "./plans-helpers";

// Billing Cycle Toggle
interface BillingCycleToggleProps {
    billingCycle: "monthly" | "yearly";
    setBillingCycle: (cycle: "monthly" | "yearly") => void;
}

export function BillingCycleToggle({ billingCycle, setBillingCycle }: BillingCycleToggleProps) {
    return (
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
    );
}

// Package Card
interface PackageCardProps {
    pkg: DisplayPackage;
    currentTier: string;
    billingCycle: "monthly" | "yearly";
    onUpgrade: (pkg: DisplayPackage) => void;
}

export function PackageCard({ pkg, currentTier, billingCycle, onUpgrade }: PackageCardProps) {
    const isCurrentPlan = currentTier === pkg.targetTier;
    const isRecommended = pkg.recommended;
    const features = (pkg.features as PlanFeature[]) || getDefaultFeatures(pkg);
    const badge = pkg.badge;

    return (
        <div
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
                onClick={() => onUpgrade(pkg)}
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
}

// Plans Grid
interface PlansGridProps {
    packages: DisplayPackage[];
    currentTier: string;
    billingCycle: "monthly" | "yearly";
    onUpgrade: (pkg: DisplayPackage) => void;
}

export function PlansGrid({ packages, currentTier, billingCycle, onUpgrade }: PlansGridProps) {
    return (
        <div className={`grid grid-cols-1 gap-6 ${
            packages.length === 1 ? 'md:grid-cols-1 max-w-md mx-auto' :
            packages.length === 2 ? 'md:grid-cols-2 max-w-2xl mx-auto' :
            packages.length === 3 ? 'md:grid-cols-3 max-w-4xl mx-auto' :
            'md:grid-cols-2 lg:grid-cols-4'
        }`}>
            {packages.map((pkg) => (
                <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    currentTier={currentTier}
                    billingCycle={billingCycle}
                    onUpgrade={onUpgrade}
                />
            ))}
        </div>
    );
}
