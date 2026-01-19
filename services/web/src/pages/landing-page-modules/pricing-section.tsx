/**
 * Pricing Section - Three-tier pricing cards
 */
import { Link } from "react-router-dom";

export function PricingSection() {
    return (
        <section id="pricing" className="py-24 bg-[#050510] relative z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,var(--tw-gradient-stops))] from-[var(--nebula-violet)]/10 via-[#050510] to-[#050510] pointer-events-none"></div>
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Giá Cả Minh Bạch</h2>
                    <p className="text-[var(--nebula-text-secondary)]">Chọn mức độ ẩn danh mà bạn cần.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start max-w-6xl mx-auto">
                    <StarterTier />
                    <GhostTier />
                    <SpectreTier />
                </div>
            </div>
        </section>
    );
}

/** Free tier card */
function StarterTier() {
    return (
        <div className="rounded-2xl bg-[#12122a] border border-white/5 p-8 flex flex-col gap-6 hover:border-white/10 transition-colors">
            <div>
                <h3 className="text-xl font-bold text-white">Starter</h3>
                <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">Miễn phí</span>
                </div>
                <p className="text-[var(--nebula-text-secondary)] text-sm mt-2">Hoàn hảo để trải nghiệm nền tảng.</p>
            </div>
            <ul className="space-y-4 flex-1">
                <li className="flex items-center gap-3 text-sm text-slate-300">
                    <span className="material-symbols-outlined text-green-400 !text-[20px]">check</span> 5 Inbox hoạt động
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300">
                    <span className="material-symbols-outlined text-green-400 !text-[20px]">check</span> Lưu trữ 24h
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300">
                    <span className="material-symbols-outlined text-green-400 !text-[20px]">check</span> Chỉ Web Interface
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="material-symbols-outlined !text-[20px]">close</span> Không có quyền truy cập API
                </li>
            </ul>
            <Link to="/register" className="w-full py-3 block text-center rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold border border-white/10 transition-colors">
                Bắt đầu miễn phí
            </Link>
        </div>
    );
}

/** Popular tier card */
function GhostTier() {
    return (
        <div className="relative rounded-2xl bg-[#12122a]/80 backdrop-blur-xl border border-[var(--nebula-violet)]/50 p-8 flex flex-col gap-6 shadow-[0_0_50px_rgba(139,92,246,0.15)] md:-mt-8 md:mb-8 z-10">
            <div className="absolute top-0 right-0 -mt-3 -mr-3">
                <span className="bg-[var(--nebula-violet)] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">PHỔ BIẾN</span>
            </div>
            <div>
                <h3 className="text-xl font-bold text-white">Ghost</h3>
                <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">199K</span>
                    <span className="text-[var(--nebula-text-secondary)] font-medium">/tháng</span>
                </div>
                <p className="text-[var(--nebula-text-secondary)] text-sm mt-2">Cho người dùng chuyên nghiệp và quyền riêng tư.</p>
            </div>
            <ul className="space-y-4 flex-1">
                <li className="flex items-center gap-3 text-sm text-white font-medium">
                    <span className="material-symbols-outlined text-[var(--nebula-violet)] !text-[20px]">check</span> 50 Inbox hoạt động
                </li>
                <li className="flex items-center gap-3 text-sm text-white font-medium">
                    <span className="material-symbols-outlined text-[var(--nebula-violet)] !text-[20px]">check</span> Domain Tùy Chỉnh
                </li>
                <li className="flex items-center gap-3 text-sm text-white font-medium">
                    <span className="material-symbols-outlined text-[var(--nebula-violet)] !text-[20px]">check</span> Lưu trữ 7 ngày
                </li>
                <li className="flex items-center gap-3 text-sm text-white font-medium">
                    <span className="material-symbols-outlined text-[var(--nebula-violet)] !text-[20px]">check</span> Hỗ trợ ưu tiên
                </li>
            </ul>
            <Link to="/register?plan=ghost" className="w-full block text-center py-3 rounded-lg bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white font-bold shadow-lg transition-all hover:shadow-[var(--nebula-violet)]/25">
                Chọn Ghost
            </Link>
        </div>
    );
}

/** Enterprise tier card */
function SpectreTier() {
    return (
        <div className="rounded-2xl bg-[#12122a] border border-white/5 p-8 flex flex-col gap-6 hover:border-white/10 transition-colors">
            <div>
                <h3 className="text-xl font-bold text-white">Spectre</h3>
                <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">599K</span>
                    <span className="text-[var(--nebula-text-secondary)] font-medium">/tháng</span>
                </div>
                <p className="text-[var(--nebula-text-secondary)] text-sm mt-2">Truy cập API đầy đủ cho đội ngũ.</p>
            </div>
            <ul className="space-y-4 flex-1">
                <li className="flex items-center gap-3 text-sm text-slate-300">
                    <span className="material-symbols-outlined text-green-400 !text-[20px]">check</span> Inbox không giới hạn
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300">
                    <span className="material-symbols-outlined text-green-400 !text-[20px]">check</span> Truy cập API Full
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300">
                    <span className="material-symbols-outlined text-green-400 !text-[20px]">check</span> IP Riêng biệt
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300">
                    <span className="material-symbols-outlined text-green-400 !text-[20px]">check</span> Quản lý Team
                </li>
            </ul>
            <Link to="/contact" className="w-full block text-center py-3 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold border border-white/10 transition-colors">
                Chọn Spectre
            </Link>
        </div>
    );
}
