/**
 * API Section - Developer-focused content with code preview
 */
import { Link } from "react-router-dom";

export function APISection() {
    return (
        <section id="api" className="py-24 bg-gradient-to-b from-[#050510] to-[#0a0a1f] relative overflow-hidden z-10">
            <div className="absolute right-0 top-0 w-1/3 h-full bg-[var(--nebula-violet)]/5 blur-[100px] pointer-events-none"></div>
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="bg-[var(--nebula-surface-elevated)]/50 backdrop-blur-xl rounded-2xl p-8 lg:p-12 flex flex-col lg:flex-row items-center gap-12 border border-[var(--nebula-border)]">
                    <APIContent />
                    <APICodePreview />
                </div>
            </div>
        </section>
    );
}

/** API section text content */
function APIContent() {
    return (
        <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded text-xs font-bold bg-[var(--nebula-violet)]/20 text-[var(--nebula-violet)] uppercase tracking-wider">
                Developer First
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
                Kiến trúc dành cho <span className="neo-text-gradient-aurora">tự động hóa.</span>
            </h2>
            <p className="text-[var(--nebula-text-secondary)] text-lg">
                Ngừng tạo tài khoản thủ công. Tích hợp Ephemera trực tiếp vào test suite của bạn. Tạo inbox, nhận mã xác nhận, và kiểm tra nội dung email hoàn toàn tự động.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <div className="flex items-center gap-3 text-white">
                    <span className="material-symbols-outlined text-green-400">check_circle</span>
                    <span>99.9% Uptime SLA</span>
                </div>
                <div className="flex items-center gap-3 text-white">
                    <span className="material-symbols-outlined text-green-400">check_circle</span>
                    <span>Webhooks</span>
                </div>
                <div className="flex items-center gap-3 text-white">
                    <span className="material-symbols-outlined text-green-400">check_circle</span>
                    <span>SDKs for Node & Python</span>
                </div>
            </div>
            <div className="pt-6">
                <Link to="/docs" className="text-white flex items-center gap-2 hover:gap-3 transition-all font-bold group">
                    Xem tài liệu API <span className="material-symbols-outlined group-hover:text-[var(--nebula-violet)] transition-colors">arrow_forward</span>
                </Link>
            </div>
        </div>
    );
}

/** API code example preview */
function APICodePreview() {
    return (
        <div className="flex-1 w-full max-w-lg">
            <div className="relative rounded-lg overflow-hidden shadow-2xl border border-[var(--nebula-border)] group">
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--nebula-violet)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20"></div>
                <div className="bg-[#0a0a16] h-[300px] w-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
                        <span className="text-xs text-slate-400">api-example.js</span>
                        <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                            <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                        </div>
                    </div>
                    {/* Code */}
                    <div className="p-4 font-mono text-xs text-slate-300 space-y-2 relative overflow-hidden">
                        <div className="flex"><span className="w-8 text-slate-600 select-none">1</span> <span className="text-slate-500">// Tạo inbox mới</span></div>
                        <div className="flex"><span className="w-8 text-slate-600 select-none">2</span> <span className="text-purple-400">const</span> res = <span className="text-purple-400">await</span> <span className="text-blue-400">fetch</span>(<span className="text-green-300">'/inboxes'</span>, {`{`}</div>
                        <div className="flex"><span className="w-8 text-slate-600 select-none">3</span> &nbsp;&nbsp;method: <span className="text-green-300">'POST'</span>,</div>
                        <div className="flex"><span className="w-8 text-slate-600 select-none">4</span> &nbsp;&nbsp;headers: {`{`} Authorization: <span className="text-green-300">{"`Bearer ${API_KEY}`"}</span> {`}`}</div>
                        <div className="flex"><span className="w-8 text-slate-600 select-none">5</span> {`}`});</div>
                        <div className="flex"><span className="w-8 text-slate-600 select-none">6</span></div>
                        <div className="flex"><span className="w-8 text-slate-600 select-none">7</span> <span className="text-purple-400">const</span> inbox = <span className="text-purple-400">await</span> res.<span className="text-blue-400">json</span>();</div>
                        <div className="flex"><span className="w-8 text-slate-600 select-none">8</span> console.<span className="text-blue-400">log</span>(inbox.address);</div>
                        <div className="flex"><span className="w-8 text-slate-600 select-none">9</span> <span className="text-slate-500">// → random@yourdomain.com</span></div>
                        {/* Glow effect */}
                        <div className="absolute top-1/2 left-0 w-full h-12 bg-gradient-to-r from-[var(--nebula-violet)]/10 to-transparent pointer-events-none"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
