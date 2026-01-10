import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Professional SVG icons (Unused - utilizing Material Symbols)

const features = [
    {
        icon: "globe",
        title: "Domain Tùy Chỉnh",
        description: "Sử dụng domain riêng của bạn để ẩn danh chuyên nghiệp. Cấu hình DNS linh hoạt."
    },
    {
        icon: "terminal",
        title: "Truy cập API REST",
        description: "Truy cập lập trình cho kiểm thử tự động, CI/CD pipelines, và tích hợp ứng dụng."
    },
    {
        icon: "shield",
        title: "Chính Sách Không Log",
        description: "Chúng tôi không lưu trữ gì vĩnh viễn. Tin nhắn chỉ tồn tại trên RAM và bị xóa khi hết hạn."
    },
    {
        icon: "lock",
        title: "Mã Hóa TLS",
        description: "Mã hóa đầu cuối cho mọi giao tiếp. Dữ liệu của bạn là của riêng bạn."
    }
];

const faqs = [
    {
        question: "Email tồn tại trong bao lâu?",
        answer: "Trên gói miễn phí, email được lưu trong 24 giờ. Các gói trả phí kéo dài thời gian này lên đến 7 ngày hoặc vĩnh viễn nếu lưu thủ công. Sau khi xóa, chúng bị xóa vĩnh viễn khỏi máy chủ của chúng tôi."
    },
    {
        question: "Tôi có thể dùng domain riêng không?",
        answer: "Có, gói Ghost và Spectre cho phép bạn mang theo domain tùy chỉnh. Bạn sẽ cần thêm một vài bản ghi DNS (MX, TXT) để xác minh quyền sở hữu và định tuyến email đến chúng tôi."
    },
    {
        question: "API có giới hạn tốc độ không?",
        answer: "Có, để ngăn chặn lạm dụng. Gói Spectre cung cấp giới hạn tốc độ cao hơn đáng kể, phù hợp cho các môi trường kiểm thử doanh nghiệp quy mô lớn."
    }
];

export function LandingPage() {
    const { token } = useAuth();



    // Handle initial hash scroll


    if (token) return <Navigate to="/app" replace />;

    return (
        <div className="landing neo-mesh-bg overflow-x-hidden">
            {/* Background Effects */}
            <div className="landing-bg fixed inset-0 z-0 pointer-events-none">
                <div className="landing-bg-gradient absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(25,25,230,0.15),transparent_60%)]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--nebula-violet)]/20 rounded-full blur-[120px] opacity-50 animate-pulse" />
            </div>

            {/* Navigation is provided by PublicLayout */}

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 min-h-screen flex flex-col justify-center z-10">
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm neo-animate-fade-in-up">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        <span className="text-xs font-medium text-slate-300 tracking-wide uppercase">v2.0 Hiện Đã Có Mặt</span>
                    </div>

                    <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 leading-[1.1] text-white neo-animate-fade-in-up neo-stagger-1">
                        Inbox Vô Hình. <br />
                        <span className="neo-text-gradient-animated">Khả Năng Vô Hạn.</span>
                    </h1>

                    <p className="text-lg sm:text-xl text-[var(--nebula-text-secondary)] max-w-2xl mx-auto mb-10 font-light neo-animate-fade-in-up neo-stagger-2">
                        Nền tảng email tạm thời và riêng tư cao cấp với hỗ trợ domain riêng và API cho nhà phát triển.
                        Xây dựng cho bảo mật, ẩn danh và giao tiếp không để lại dấu vết.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 neo-animate-fade-in-up neo-stagger-3">
                        <Link to="/register" className="w-full sm:w-auto h-12 px-8 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white rounded-lg font-bold text-sm tracking-wide transition-all shadow-lg shadow-[var(--nebula-violet)]/25 flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined !text-[20px]">rocket_launch</span>
                            Bắt đầu dùng thử
                        </Link>
                        <Link to="/docs" className="w-full sm:w-auto h-12 px-8 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-bold text-sm tracking-wide transition-all backdrop-blur-sm flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined !text-[20px]">description</span>
                            Tài liệu
                        </Link>
                    </div>

                    {/* Trust Badge - Hero Section */}
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

                    {/* Terminal/Code Preview */}
                    <div id="how-it-works" className="mt-20 mx-auto max-w-4xl perspective-1000 neo-animate-fade-in-up neo-stagger-4 scroll-mt-32">
                        <div className="bg-[var(--nebula-surface)]/80 backdrop-blur-xl rounded-xl overflow-hidden border border-[var(--nebula-border)] shadow-2xl transform rotate-x-12 hover:rotate-0 transition-transform duration-700 ease-out">
                            <div className="flex items-center gap-2 px-4 py-3 bg-black/40 border-b border-white/5">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                </div>
                                <div className="ml-4 text-xs text-slate-500 font-mono">bash — 80x24</div>
                            </div>
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
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="relative py-24 bg-[#050510] z-10">
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Tính Năng Bảo Mật Cao Cấp</h2>
                        <p className="text-[var(--nebula-text-secondary)] max-w-2xl mx-auto">
                            Xây dựng cho bảo mật và ẩn danh với công nghệ hiện đại. Chúng tôi không chỉ ẩn dữ liệu của bạn; chúng tôi làm nó biến mất.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, i) => (
                            <div key={i} className="group bg-[var(--nebula-surface)] backdrop-blur-md border border-[var(--nebula-border)] p-6 rounded-xl hover:bg-white/5 transition-all duration-300 hover:-translate-y-1">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${i === 0 ? 'bg-blue-500/20 text-blue-400' :
                                    i === 1 ? 'bg-purple-500/20 text-purple-400' :
                                        i === 2 ? 'bg-green-500/20 text-green-400' :
                                            'bg-pink-500/20 text-pink-400'
                                    }`}>
                                    <span className="material-symbols-outlined">{feature.icon}</span>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                                <p className="text-sm text-[var(--nebula-text-secondary)] leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* API Section */}
            <section id="api" className="py-24 bg-gradient-to-b from-[#050510] to-[#0a0a1f] relative overflow-hidden z-10">
                <div className="absolute right-0 top-0 w-1/3 h-full bg-[var(--nebula-violet)]/5 blur-[100px] pointer-events-none"></div>
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="bg-[var(--nebula-surface-elevated)]/50 backdrop-blur-xl rounded-2xl p-8 lg:p-12 flex flex-col lg:flex-row items-center gap-12 border border-[var(--nebula-border)]">
                        {/* Content */}
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
                        {/* Visual */}
                        <div className="flex-1 w-full max-w-lg">
                            <div className="relative rounded-lg overflow-hidden shadow-2xl border border-[var(--nebula-border)] group">
                                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--nebula-violet)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20"></div>
                                <div className="bg-[#0a0a16] h-[300px] w-full flex flex-col">
                                    <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
                                        <span className="text-xs text-slate-400">request.js</span>
                                        <div className="flex gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                                            <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                                        </div>
                                    </div>
                                    <div className="p-4 font-mono text-xs text-slate-300 space-y-2 relative overflow-hidden">
                                        <div className="flex"><span className="w-8 text-slate-600 select-none">1</span> <span className="text-purple-400">const</span> ephemera = <span className="text-blue-400">require</span>(<span className="text-green-300">'ephemera-sdk'</span>);</div>
                                        <div className="flex"><span className="w-8 text-slate-600 select-none">2</span></div>
                                        <div className="flex"><span className="w-8 text-slate-600 select-none">3</span> <span className="text-purple-400">async function</span> <span className="text-yellow-200">getVerificationCode</span>() {`{`}</div>
                                        <div className="flex"><span className="w-8 text-slate-600 select-none">4</span> &nbsp;&nbsp;<span className="text-purple-400">const</span> inbox = <span className="text-purple-400">await</span> ephemera.<span className="text-blue-400">createInbox</span>();</div>
                                        <div className="flex"><span className="w-8 text-slate-600 select-none">5</span> &nbsp;&nbsp;<span className="text-slate-500">// Wait for email to arrive</span></div>
                                        <div className="flex"><span className="w-8 text-slate-600 select-none">6</span> &nbsp;&nbsp;<span className="text-purple-400">const</span> message = <span className="text-purple-400">await</span> inbox.<span className="text-blue-400">waitForEmail</span>({`{`}</div>
                                        <div className="flex"><span className="w-8 text-slate-600 select-none">7</span> &nbsp;&nbsp;&nbsp;&nbsp;subject: <span className="text-green-300">"Your Code"</span>,</div>
                                        <div className="flex"><span className="w-8 text-slate-600 select-none">8</span> &nbsp;&nbsp;&nbsp;&nbsp;timeout: <span className="text-orange-300">30000</span></div>
                                        <div className="flex"><span className="w-8 text-slate-600 select-none">9</span> &nbsp;&nbsp;{`}`});</div>
                                        <div className="flex"><span className="w-8 text-slate-600 select-none">10</span> &nbsp;&nbsp;<span className="text-purple-400">return</span> message.extractCode();</div>
                                        <div className="flex"><span className="w-8 text-slate-600 select-none">11</span> {`}`}</div>
                                        {/* Glow effect */}
                                        <div className="absolute top-1/2 left-0 w-full h-12 bg-gradient-to-r from-[var(--nebula-violet)]/10 to-transparent pointer-events-none"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 bg-[#050510] relative z-10">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,var(--tw-gradient-stops))] from-[var(--nebula-violet)]/10 via-[#050510] to-[#050510] pointer-events-none"></div>
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Giá Cả Minh Bạch</h2>
                        <p className="text-[var(--nebula-text-secondary)]">Chọn mức độ ẩn danh mà bạn cần.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start max-w-6xl mx-auto">
                        {/* Starter Tier */}
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

                        {/* Ghost Tier (Popular) */}
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

                        {/* Spectre Tier */}
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
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-20 bg-[#050510] z-10 relative">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-white text-center mb-12">Câu Hỏi Thường Gặp</h2>
                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <details key={index} className="group bg-[var(--nebula-surface)] border border-[var(--nebula-border)] rounded-lg p-4 cursor-pointer">
                                <summary className="flex justify-between items-center font-medium text-white list-none">
                                    <span>{faq.question}</span>
                                    <span className="transition group-open:rotate-180 material-symbols-outlined">expand_more</span>
                                </summary>
                                <p className="text-[var(--nebula-text-secondary)] mt-3 text-sm leading-relaxed">
                                    {faq.answer}
                                </p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 relative overflow-hidden z-10">
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--nebula-violet)]/80 to-purple-800/80 z-0"></div>
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight">Sẵn sàng ẩn mình?</h2>
                    <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto">
                        Tham gia cùng 10,000+ nhà phát triển và người ủng hộ quyền riêng tư để kiểm soát dấu vết kỹ thuật số của bạn ngay hôm nay.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                        <Link to="/register" className="bg-white text-[var(--nebula-violet)] hover:bg-slate-100 px-8 py-3 rounded-lg font-bold text-lg transition-colors shadow-xl w-full sm:w-auto">
                            Bắt đầu ngay
                        </Link>
                        <Link to="/sales" className="bg-black/20 hover:bg-black/30 border border-white/20 text-white px-8 py-3 rounded-lg font-bold text-lg backdrop-blur-sm transition-colors w-full sm:w-auto">
                            Liên hệ Sales
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
