/**
 * Hero Section - Instant ephemeral email widget + CTAs
 * Redesigned to show temp email prominently like TempMail/Guerrilla Mail
 */
import { Link } from "react-router-dom";
import { HeroInboxWidget } from "./components/hero-inbox-widget";

export function HeroSection() {
    return (
        <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 min-h-screen flex flex-col justify-center z-10">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
                {/* Version Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm neo-animate-fade-in-up">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    <span className="text-xs font-medium text-slate-300 tracking-wide uppercase">Email Tạm Thời Miễn Phí</span>
                </div>

                {/* Headline */}
                <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-4 leading-[1.1] text-white neo-animate-fade-in-up neo-stagger-1">
                    Email Ẩn Danh. <br />
                    <span className="neo-text-gradient-animated">Không Cần Đăng Ký.</span>
                </h1>

                {/* Subheadline */}
                <p className="text-base sm:text-lg text-[var(--nebula-text-secondary)] max-w-xl mx-auto mb-8 font-light neo-animate-fade-in-up neo-stagger-2">
                    Tạo email tạm thời ngay lập tức. Nhận email realtime. Tự hủy sau 2 giờ.
                </p>

                {/* INSTANT EMAIL WIDGET - Main attraction */}
                <div className="neo-animate-fade-in-up neo-stagger-3 mb-10">
                    <HeroInboxWidget />
                </div>

                {/* Trust Badge */}
                <div className="neo-animate-fade-in-up neo-stagger-4 mb-8">
                    <Link
                        to="/privacy"
                        className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-green-500/10 border border-green-500/30 hover:bg-green-500/15 hover:border-green-500/50 transition-all group"
                    >
                        <span className="material-symbols-outlined text-green-400 !text-[20px]">verified_user</span>
                        <span className="text-green-400 font-medium text-sm">ZERO-LOG PRIVACY</span>
                        <span className="text-green-300/50 text-xs hidden sm:inline">Không IP · Không Tracking · Bảo mật cao</span>
                        <span className="material-symbols-outlined text-green-400/50 !text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </Link>
                </div>

                {/* Secondary CTAs */}
                <div className="flex flex-wrap items-center justify-center gap-3 neo-animate-fade-in-up neo-stagger-5">
                    <Link to="/register" className="h-10 px-6 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-[var(--nebula-violet)]/25 flex items-center gap-2">
                        <span className="material-symbols-outlined !text-[18px]">person_add</span>
                        Đăng ký tài khoản
                    </Link>
                    <Link to="/docs" className="h-10 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-medium text-sm transition-all backdrop-blur-sm flex items-center gap-2">
                        <span className="material-symbols-outlined !text-[18px]">description</span>
                        API Docs
                    </Link>
                    <Link to="/inbox-viewer" className="h-10 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-medium text-sm transition-all backdrop-blur-sm flex items-center gap-2">
                        <span className="material-symbols-outlined !text-[18px]">search</span>
                        Tìm hộp thư
                    </Link>
                </div>

                {/* Terminal Preview - Moved down, smaller */}
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
                        <span className="text-green-400">$</span> curl -X POST https://api.manhquy.id.vn/inboxes \
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
                        <span className="text-purple-400">"address"</span>: <span className="text-green-300">"ghost_99@manhquy.id.vn"</span>,
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
