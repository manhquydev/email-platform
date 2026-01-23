/**
 * Pricing Section - Dynamic pricing cards fetched from API
 * Single Source of Truth: /billing/tiers (from database)
 */
import { DynamicPricingCards } from "../../components/pricing/dynamic-pricing-cards";

export function PricingSection() {
    return (
        <section id="pricing" className="py-24 bg-[#050510] relative z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,var(--tw-gradient-stops))] from-[var(--nebula-violet)]/10 via-[#050510] to-[#050510] pointer-events-none"></div>
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Giá Cả Minh Bạch</h2>
                    <p className="text-[var(--nebula-text-secondary)]">Chọn gói phù hợp với nhu cầu của bạn.</p>
                </div>
                <DynamicPricingCards variant="homepage" />
            </div>
        </section>
    );
}
