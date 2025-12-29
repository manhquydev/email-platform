import { Link } from "react-router-dom";

export function API() {
    return (
        <div className="pt-24 min-h-screen bg-[#050510] relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-[var(--nebula-violet)]/5 blur-[100px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-6 py-12 z-10 relative">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded text-xs font-bold bg-[var(--nebula-violet)]/20 text-[var(--nebula-violet)] uppercase tracking-wider mb-6">
                        Developer First
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                        API Cho Tự Động Hóa
                    </h1>
                    <p className="text-xl text-[var(--nebula-text-secondary)] max-w-3xl mx-auto font-light">
                        Tích hợp Ephemera vào CI/CD pipeline, test suite, hoặc ứng dụng của bạn chỉ với vài dòng code.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
                    {/* Visual / Code Example */}
                    <div className="order-2 lg:order-1">
                        <div className="relative rounded-lg overflow-hidden shadow-2xl border border-[var(--nebula-border)] group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--nebula-violet)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20"></div>
                            <div className="bg-[#0a0a16] h-auto w-full flex flex-col">
                                <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
                                    <span className="text-xs text-slate-400">e2e-test.ts</span>
                                    <div className="flex gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                                        <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                                    </div>
                                </div>
                                <div className="p-6 font-mono text-xs sm:text-sm text-slate-300 space-y-2 relative overflow-hidden">
                                    <div className="flex"><span className="w-8 text-slate-600 select-none">1</span> <span className="text-purple-400">import</span> {`{ EphemeraBox }`} <span className="text-purple-400">from</span> <span className="text-green-300">'ephemera-sdk'</span>;</div>
                                    <div className="flex"><span className="w-8 text-slate-600 select-none">2</span></div>
                                    <div className="flex"><span className="w-8 text-slate-600 select-none">3</span> <span className="text-purple-400">test</span>(<span className="text-green-300">'Sign up flow'</span>, <span className="text-purple-400">async</span> () ={`>`} {`{`}</div>
                                    <div className="flex"><span className="w-8 text-slate-600 select-none">4</span> &nbsp;&nbsp;<span className="text-purple-400">const</span> inbox = <span className="text-purple-400">await</span> EphemeraBox.<span className="text-blue-400">create</span>();</div>
                                    <div className="flex"><span className="w-8 text-slate-600 select-none">5</span> &nbsp;&nbsp;<span className="text-purple-400">await</span> page.<span className="text-blue-400">fill</span>(<span className="text-green-300">'#email'</span>, inbox.address);</div>
                                    <div className="flex"><span className="w-8 text-slate-600 select-none">6</span> &nbsp;&nbsp;<span className="text-purple-400">await</span> page.<span className="text-blue-400">click</span>(<span className="text-green-300">'#signup'</span>);</div>
                                    <div className="flex"><span className="w-8 text-slate-600 select-none">7</span></div>
                                    <div className="flex"><span className="w-8 text-slate-600 select-none">8</span> &nbsp;&nbsp;<span className="text-slate-500">// Wait for verification email</span></div>
                                    <div className="flex"><span className="w-8 text-slate-600 select-none">9</span> &nbsp;&nbsp;<span className="text-purple-400">const</span> email = <span className="text-purple-400">await</span> inbox.<span className="text-blue-400">waitForEmail</span>((m) ={`>`}</div>
                                    <div className="flex"><span className="w-8 text-slate-600 select-none">10</span> &nbsp;&nbsp;&nbsp;&nbsp;m.subject.<span className="text-blue-400">includes</span>(<span className="text-green-300">'Verify'</span>)</div>
                                    <div className="flex"><span className="w-8 text-slate-600 select-none">11</span> &nbsp;&nbsp;);</div>
                                    <div className="flex"><span className="w-8 text-slate-600 select-none">12</span></div>
                                    <div className="flex"><span className="w-8 text-slate-600 select-none">13</span> &nbsp;&nbsp;<span className="text-purple-400">const</span> code = email.<span className="text-blue-400">extractOne</span>(<span className="text-orange-300">/\d{`{`}6{`}`}/</span>);</div>
                                    <div className="flex"><span className="w-8 text-slate-600 select-none">14</span> &nbsp;&nbsp;<span className="text-purple-400">await</span> page.<span className="text-blue-400">fill</span>(<span className="text-green-300">'#otp'</span>, code);</div>
                                    <div className="flex"><span className="w-8 text-slate-600 select-none">15</span> {`}`});</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="order-1 lg:order-2 space-y-8">
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">REST API Mạnh Mẽ</h3>
                            <p className="text-[var(--nebula-text-secondary)]">
                                Toàn bộ chức năng của nền tảng đều có thể truy cập qua API chuẩn RESTful. Tài liệu đầy đủ, có ví dụ cho curl, Node.js, Python và Go.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Libraries & SDKs</h3>
                            <p className="text-[var(--nebula-text-secondary)]">
                                Chúng tôi cung cấp SDK chính chủ cho JavaScript/TypeScript và Python. Cộng đồng cũng đóng góp thư viện cho Ruby, PHP và C#.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Giới Hạn & Quotas</h3>
                            <p className="text-[var(--nebula-text-secondary)]">
                                Rate limit linh hoạt tùy theo gói đăng ký. Gói Spectre hỗ trợ lên đến 1000 requests/phút.
                            </p>
                        </div>

                        <div className="pt-6">
                            <Link to="/docs" className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-slate-200 transition-colors">
                                <span className="material-symbols-outlined">description</span>
                                Xem Tài Liệu API
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Endpoints Quick Look */}
                <div className="mb-20">
                    <h2 className="text-3xl font-bold text-white mb-8 text-center">Các Endpoint Chính</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-[var(--nebula-surface)] border border-[var(--nebula-border)] p-6 rounded-xl hover:border-[var(--nebula-violet)]/50 transition-colors">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-mono font-bold">POST</span>
                                <code className="text-sm text-slate-300">/v1/inboxes</code>
                            </div>
                            <p className="text-[var(--nebula-text-secondary)] text-sm">Tạo inbox mới ngẫu nhiên hoặc với custom domain.</p>
                        </div>
                        <div className="bg-[var(--nebula-surface)] border border-[var(--nebula-border)] p-6 rounded-xl hover:border-[var(--nebula-violet)]/50 transition-colors">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-mono font-bold">GET</span>
                                <code className="text-sm text-slate-300">/v1/inboxes/:id</code>
                            </div>
                            <p className="text-[var(--nebula-text-secondary)] text-sm">Lấy thông tin inbox và danh sách tin nhắn.</p>
                        </div>
                        <div className="bg-[var(--nebula-surface)] border border-[var(--nebula-border)] p-6 rounded-xl hover:border-[var(--nebula-violet)]/50 transition-colors">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-mono font-bold">GET</span>
                                <code className="text-sm text-slate-300">/v1/messages/:id</code>
                            </div>
                            <p className="text-[var(--nebula-text-secondary)] text-sm">Đọc nội dung chi tiết của một email, bao gồm HTML/Text body.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
