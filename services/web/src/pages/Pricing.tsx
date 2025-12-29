import { Link } from "react-router-dom";

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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start max-w-6xl mx-auto">
                    {/* Starter Tier */}
                    <div className="rounded-2xl bg-[var(--nebula-surface)] border border-[var(--nebula-border)] p-8 flex flex-col gap-6 hover:border-white/10 transition-colors">
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
                    <div className="relative rounded-2xl bg-[#12122a]/90 backdrop-blur-xl border border-[var(--nebula-violet)] p-8 flex flex-col gap-6 shadow-[0_0_50px_rgba(139,92,246,0.15)] md:-mt-8 md:mb-8 z-10 scale-105 border-t-4 border-t-[var(--nebula-violet)]">
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
                            <li className="flex items-center gap-3 text-sm text-white font-medium">
                                <span className="material-symbols-outlined text-[var(--nebula-violet)] !text-[20px]">check</span> Truy cập API cơ bản
                            </li>
                        </ul>
                        <Link to="/register?plan=ghost" className="w-full block text-center py-3 rounded-lg bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white font-bold shadow-lg transition-all hover:shadow-[var(--nebula-violet)]/25">
                            Chọn Ghost
                        </Link>
                    </div>

                    {/* Spectre Tier */}
                    <div className="rounded-2xl bg-[var(--nebula-surface)] border border-[var(--nebula-border)] p-8 flex flex-col gap-6 hover:border-white/10 transition-colors">
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
                            Liên hệ Sales
                        </Link>
                    </div>
                </div>

                <div className="mt-24 max-w-4xl mx-auto">
                    <h3 className="text-2xl font-bold text-white text-center mb-8">So sánh tính năng chi tiết</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="py-4 px-4 text-slate-400 font-medium">Tính năng</th>
                                    <th className="py-4 px-4 text-white font-bold text-center">Starter</th>
                                    <th className="py-4 px-4 text-[var(--nebula-violet)] font-bold text-center">Ghost</th>
                                    <th className="py-4 px-4 text-white font-bold text-center">Spectre</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300 text-sm">
                                <tr>
                                    <td className="py-4 px-4">Số lượng Inbox</td>
                                    <td className="py-4 px-4 text-center">5</td>
                                    <td className="py-4 px-4 text-center">50</td>
                                    <td className="py-4 px-4 text-center">Vô hạn</td>
                                </tr>
                                <tr>
                                    <td className="py-4 px-4">Thời gian lưu trữ</td>
                                    <td className="py-4 px-4 text-center">24 Giờ</td>
                                    <td className="py-4 px-4 text-center">7 Ngày</td>
                                    <td className="py-4 px-4 text-center">Vĩnh viễn</td>
                                </tr>
                                <tr>
                                    <td className="py-4 px-4">API Access</td>
                                    <td className="py-4 px-4 text-center text-red-400">×</td>
                                    <td className="py-4 px-4 text-center text-green-400">✓ (Giới hạn)</td>
                                    <td className="py-4 px-4 text-center text-green-400">✓ (Full)</td>
                                </tr>
                                <tr>
                                    <td className="py-4 px-4">Custom Domain</td>
                                    <td className="py-4 px-4 text-center text-red-400">×</td>
                                    <td className="py-4 px-4 text-center text-green-400">✓</td>
                                    <td className="py-4 px-4 text-center text-green-400">✓</td>
                                </tr>
                                <tr>
                                    <td className="py-4 px-4">Hỗ trợ kỹ thuật</td>
                                    <td className="py-4 px-4 text-center">Cộng đồng</td>
                                    <td className="py-4 px-4 text-center">Email 24/7</td>
                                    <td className="py-4 px-4 text-center">Chuyên viên riêng</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
