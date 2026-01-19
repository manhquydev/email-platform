/**
 * Hero Section - Main headline, CTAs, and terminal preview
 */
import { Link } from "react-router-dom";

export function HeroSection() {
    return (
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 min-h-screen flex flex-col justify-center z-10">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
                {/* Version Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm neo-animate-fade-in-up">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    <span className="text-xs font-medium text-slate-300 tracking-wide uppercase">v2.0 Hiện Đã Có Mặt</span>
                </div>

                {/* Headline */}
                <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 leading-[1.1] text-white neo-animate-fade-in-up neo-stagger-1">
                    Inbox Vô Hình. <br />
                    <span className="neo-text-gradient-animated">Khả Năng Vô Hạn.</span>
                </h1>

                {/* Subheadline */}
                <p className="text-lg sm:text-xl text-[var(--nebula-text-secondary)] max-w-2xl mx-auto mb-10 font-light neo-animate-fade-in-up neo-stagger-2">
                    Nền tảng email tạm thời và riêng tư cao cấp với hỗ trợ domain riêng và API cho nhà phát triển.
                    Xây dựng cho bảo mật, ẩn danh và giao tiếp không để lại dấu vết.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 neo-animate-fade-in-up neo-stagger-3">
                    <Link to="/register" className="w-full sm:w-auto h-12 px-8 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white rounded-lg font-bold text-sm tracking-wide transition-all shadow-lg shadow-[var(--nebula-violet)]/25 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined !text-[20px]">rocket_launch</span>
                        Bắt đầu dùng thử
                    </Link>
                    <Link to="/docs" className="w-full sm:w-auto h-12 px-8 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-bold text-sm tracking-wide transition-all backdrop-blur-sm flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined !text-[20px]">description</span>
                        Tài liệu
                    </Link>
                    <Link to="/inbox-viewer" className="w-full sm:w-auto h-12 px-8 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-bold text-sm tracking-wide transition-all backdrop-blur-sm flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined !text-[20px]">mail</span>
                        Xem hộp thư
                    </Link>
                </div>

                {/* Trust Badge */}
                <div className="mt-8 neo-animate-fade-in-up neo-stagger-3">
                    <Link
                        to="/privacy"
                        className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-green-500/10 border border-green-500/30 hover:bg-green-500/15 hover:border-green-500/50 transition-all group"
                    >
                        <span className="material-symbols-outlined text-green-400 !text-[20px]">verified_user</span>
                        <span className="text-green-400 font-medium text-sm">ZERO-LOG PRIVACY</span>
                        <span className="text-green-300/50 text-xs hidden sm:inline">Không IP · Không Tracking · Mã nguồn mở</span>
                        <span className="material-symbols-outlined text-green-400/50 !text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </Link>
                </div>

                {/* Terminal Preview */}
                <TerminalPreview />
            </div>
        </section>
    );
}

/** Terminal/code preview showing API usage */
function TerminalPreview() {
    return (
        <div id="how-it-works" className="mt-20 mx-auto max-w-4xl perspective-1000 neo-animate-fade-in-up neo-stagger-4 scroll-mt-32">
            <div className="bg-[var(--nebula-surface)]/80 backdrop-blur-xl rounded-xl overflow-hidden border border-[var(--nebula-border)] shadow-2xl transform rotate-x-12 hover:rotate-0 transition-transform duration-700 ease-out">
                {/* Terminal Header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-black/40 border-b border-white/5">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                    </div>
                    <div className="ml-4 text-xs text-slate-500 font-mono">bash — 80x24</div>
                </div>
                {/* Terminal Content */}
                <div className="p-6 text-left font-mono text-sm overflow-x-auto bg-[#0a0a16]/80">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <span className="text-green-400">$</span> curl -X POST https://api.ephemera.io/v1/inbox/create \
                    </div>
                    <div className="pl-4 text-slate-400 mb-4">
                        -H <span className="text-yellow-300">"Authorization: Bearer ep_8a2b9c..."</span>
                    </div>
                    <div className="text-slate-300 mb-2">
                        <span className="text-blue-400">{`{`}</span>
                    </div>
                    <div className="pl-4 text-slate-300">
                        <span className="text-purple-400">"id"</span>: <span className="text-green-300">"inbox_9928371"</span>,
                    </div>
                    <div className="pl-4 text-slate-300">
                        <span className="text-purple-400">"address"</span>: <span className="text-green-300">"ghost_99@ephemera.io"</span>,
                    </div>
                    <div className="pl-4 text-slate-300">
                        <span className="text-purple-400">"expires_at"</span>: <span className="text-green-300">"2023-10-24T18:00:00Z"</span>
                    </div>
                    <div className="text-slate-300">
                        <span className="text-blue-400">{`}`}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
