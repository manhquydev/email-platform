/**
 * Pricing Section - Five-tier pricing cards (VND)
 * Synced with backend TIER_INFO
 */
import { Link } from "react-router-dom";

export function PricingSection() {
    return (
        <section id="pricing" className="py-24 bg-[#050510] relative z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,var(--tw-gradient-stops))] from-[var(--nebula-violet)]/10 via-[#050510] to-[#050510] pointer-events-none"></div>
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Giá Cả Minh Bạch</h2>
                    <p className="text-[var(--nebula-text-secondary)]">Chọn gói phù hợp với nhu cầu của bạn.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-start max-w-7xl mx-auto">
                    <FreeTier />
                    <StarterTier />
                    <ProfessionalTier />
                    <BusinessTier />
                    <EnterpriseTier />
                </div>
            </div>
        </section>
    );
}

/** Free tier card */
function FreeTier() {
    return (
        <div className="rounded-2xl bg-[#12122a] border border-white/5 p-6 flex flex-col gap-5 hover:border-white/10 transition-colors">
            <div>
                <h3 className="text-lg font-bold text-white">Miễn phí</h3>
                <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">0đ</span>
                </div>
                <p className="text-[var(--nebula-text-secondary)] text-xs mt-2">Dùng thử Ephemera</p>
            </div>
            <ul className="space-y-3 flex-1 text-sm">
                <li className="flex items-center gap-2 text-slate-300">
                    <span className="material-symbols-outlined text-green-400 !text-[18px]">check</span> 1 tên miền
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                    <span className="material-symbols-outlined text-green-400 !text-[18px]">check</span> 3 hộp thư
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                    <span className="material-symbols-outlined text-green-400 !text-[18px]">check</span> 100MB lưu trữ
                </li>
                <li className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined !text-[18px]">close</span> Không API
                </li>
            </ul>
            <Link to="/register" className="w-full py-2.5 block text-center rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium text-sm border border-white/10 transition-colors">
                Bắt đầu miễn phí
            </Link>
        </div>
    );
}

/** Starter tier card */
function StarterTier() {
    return (
        <div className="rounded-2xl bg-[#12122a] border border-white/5 p-6 flex flex-col gap-5 hover:border-white/10 transition-colors">
            <div>
                <h3 className="text-lg font-bold text-white">Khởi đầu</h3>
                <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">49.000đ</span>
                    <span className="text-[var(--nebula-text-secondary)] text-sm">/tháng</span>
                </div>
                <p className="text-[var(--nebula-text-secondary)] text-xs mt-2">Cho cá nhân và freelancer</p>
            </div>
            <ul className="space-y-3 flex-1 text-sm">
                <li className="flex items-center gap-2 text-slate-300">
                    <span className="material-symbols-outlined text-green-400 !text-[18px]">check</span> 3 tên miền
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                    <span className="material-symbols-outlined text-green-400 !text-[18px]">check</span> 20 hộp thư
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                    <span className="material-symbols-outlined text-green-400 !text-[18px]">check</span> 1GB lưu trữ
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                    <span className="material-symbols-outlined text-green-400 !text-[18px]">check</span> API access
                </li>
            </ul>
            <Link to="/register?plan=starter" className="w-full py-2.5 block text-center rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium text-sm border border-white/10 transition-colors">
                Chọn Khởi đầu
            </Link>
        </div>
    );
}

/** Professional tier card - Popular */
function ProfessionalTier() {
    return (
        <div className="relative rounded-2xl bg-[#12122a]/80 backdrop-blur-xl border border-[var(--nebula-violet)]/50 p-6 flex flex-col gap-5 shadow-[0_0_50px_rgba(139,92,246,0.15)] lg:-mt-4 lg:mb-4 z-10">
            <div className="absolute top-0 right-0 -mt-2 -mr-2">
                <span className="bg-[var(--nebula-violet)] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">PHỔ BIẾN</span>
            </div>
            <div>
                <h3 className="text-lg font-bold text-white">Chuyên nghiệp</h3>
                <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">99.000đ</span>
                    <span className="text-[var(--nebula-text-secondary)] text-sm">/tháng</span>
                </div>
                <p className="text-[var(--nebula-text-secondary)] text-xs mt-2">Cho team đang phát triển</p>
            </div>
            <ul className="space-y-3 flex-1 text-sm">
                <li className="flex items-center gap-2 text-white font-medium">
                    <span className="material-symbols-outlined text-[var(--nebula-violet)] !text-[18px]">check</span> 10 tên miền
                </li>
                <li className="flex items-center gap-2 text-white font-medium">
                    <span className="material-symbols-outlined text-[var(--nebula-violet)] !text-[18px]">check</span> 100 hộp thư
                </li>
                <li className="flex items-center gap-2 text-white font-medium">
                    <span className="material-symbols-outlined text-[var(--nebula-violet)] !text-[18px]">check</span> 5GB lưu trữ
                </li>
                <li className="flex items-center gap-2 text-white font-medium">
                    <span className="material-symbols-outlined text-[var(--nebula-violet)] !text-[18px]">check</span> Hỗ trợ ưu tiên
                </li>
            </ul>
            <Link to="/register?plan=professional" className="w-full block text-center py-2.5 rounded-lg bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white font-medium text-sm shadow-lg transition-all">
                Chọn Chuyên nghiệp
            </Link>
        </div>
    );
}

/** Business tier card - Best Value */
function BusinessTier() {
    return (
        <div className="relative rounded-2xl bg-[#12122a] border border-green-500/30 p-6 flex flex-col gap-5 hover:border-green-500/50 transition-colors">
            <div className="absolute top-0 right-0 -mt-2 -mr-2">
                <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">GIÁ TRỊ</span>
            </div>
            <div>
                <h3 className="text-lg font-bold text-white">Doanh nghiệp</h3>
                <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">199.000đ</span>
                    <span className="text-[var(--nebula-text-secondary)] text-sm">/tháng</span>
                </div>
                <p className="text-[var(--nebula-text-secondary)] text-xs mt-2">Cho doanh nghiệp vừa và nhỏ</p>
            </div>
            <ul className="space-y-3 flex-1 text-sm">
                <li className="flex items-center gap-2 text-slate-300">
                    <span className="material-symbols-outlined text-green-400 !text-[18px]">check</span> 25 tên miền
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                    <span className="material-symbols-outlined text-green-400 !text-[18px]">check</span> 500 hộp thư
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                    <span className="material-symbols-outlined text-green-400 !text-[18px]">check</span> 20GB lưu trữ
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                    <span className="material-symbols-outlined text-green-400 !text-[18px]">check</span> 30 webhooks
                </li>
            </ul>
            <Link to="/register?plan=business" className="w-full py-2.5 block text-center rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 font-medium text-sm border border-green-500/30 transition-colors">
                Chọn Doanh nghiệp
            </Link>
        </div>
    );
}

/** Enterprise tier card */
function EnterpriseTier() {
    return (
        <div className="relative rounded-2xl bg-[#12122a] border border-amber-500/30 p-6 flex flex-col gap-5 hover:border-amber-500/50 transition-colors">
            <div className="absolute top-0 right-0 -mt-2 -mr-2">
                <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">TỐI ƯU</span>
            </div>
            <div>
                <h3 className="text-lg font-bold text-white">Enterprise</h3>
                <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">499.000đ</span>
                    <span className="text-[var(--nebula-text-secondary)] text-sm">/tháng</span>
                </div>
                <p className="text-[var(--nebula-text-secondary)] text-xs mt-2">Cho tổ chức lớn</p>
            </div>
            <ul className="space-y-3 flex-1 text-sm">
                <li className="flex items-center gap-2 text-slate-300">
                    <span className="material-symbols-outlined text-amber-400 !text-[18px]">check</span> Không giới hạn
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                    <span className="material-symbols-outlined text-amber-400 !text-[18px]">check</span> 50GB lưu trữ
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                    <span className="material-symbols-outlined text-amber-400 !text-[18px]">check</span> Hỗ trợ 24/7
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                    <span className="material-symbols-outlined text-amber-400 !text-[18px]">check</span> Tích hợp tùy chỉnh
                </li>
            </ul>
            <Link to="/register?plan=enterprise" className="w-full py-2.5 block text-center rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-medium text-sm border border-amber-500/30 transition-colors">
                Chọn Enterprise
            </Link>
        </div>
    );
}
