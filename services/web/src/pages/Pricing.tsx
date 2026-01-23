/**
 * Pricing Page - Dynamic pricing from API
 * Single Source of Truth: /billing/tiers (from database)
 */
import { DynamicPricingCards, DynamicComparisonTable } from "../components/pricing/dynamic-pricing-cards";

export function Pricing() {
    return (
        <div className="pt-24 min-h-screen bg-[var(--nebula-void)] relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-[var(--nebula-violet)]/10 to-[var(--nebula-void)] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                        Bảng Giá Linh Hoạt
                    </h1>
                    <p className="text-xl text-[var(--nebula-text-secondary)] max-w-2xl mx-auto font-light">
                        Chọn gói phù hợp với nhu cầu của bạn. Nâng cấp hoặc hủy bất cứ lúc nào.
                    </p>
                </div>

                {/* Dynamic Pricing Cards */}
                <DynamicPricingCards variant="pricing-page" />

                {/* Feature Comparison Table */}
                <div className="mt-24 max-w-6xl mx-auto">
                    <h3 className="text-2xl font-bold text-white text-center mb-8">So sánh tính năng chi tiết</h3>
                    <DynamicComparisonTable />
                </div>
            </div>
        </div>
    );
}
