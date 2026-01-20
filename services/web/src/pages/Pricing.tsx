/**
 * Pricing Page - Detailed pricing comparison (VND)
 * Synced with backend TIER_INFO
 */
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-start max-w-7xl mx-auto">
                    {/* Free Tier */}
                    <div className="rounded-2xl bg-[var(--nebula-surface)] border border-[var(--nebula-border)] p-6 flex flex-col gap-5 hover:border-white/10 transition-colors">
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
                            <li className="flex items-center gap-2 text-slate-300">
                                <span className="material-symbols-outlined text-green-400 !text-[18px]">check</span> Lưu email 7 ngày
                            </li>
                            <li className="flex items-center gap-2 text-slate-500">
                                <span className="material-symbols-outlined !text-[18px]">close</span> Không API
                            </li>
                        </ul>
                        <Link to="/register" className="w-full py-2.5 block text-center rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium text-sm border border-white/10 transition-colors">
                            Bắt đầu miễn phí
                        </Link>
                    </div>

                    {/* Starter Tier */}
                    <div className="rounded-2xl bg-[var(--nebula-surface)] border border-[var(--nebula-border)] p-6 flex flex-col gap-5 hover:border-white/10 transition-colors">
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
                                <span className="material-symbols-outlined text-green-400 !text-[18px]">check</span> Lưu email 30 ngày
                            </li>
                            <li className="flex items-center gap-2 text-slate-300">
                                <span className="material-symbols-outlined text-green-400 !text-[18px]">check</span> API access
                            </li>
                        </ul>
                        <Link to="/register?plan=starter" className="w-full py-2.5 block text-center rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium text-sm border border-white/10 transition-colors">
                            Chọn Khởi đầu
                        </Link>
                    </div>

                    {/* Professional Tier (Popular) */}
                    <div className="relative rounded-2xl bg-[#12122a]/90 backdrop-blur-xl border border-[var(--nebula-violet)] p-6 flex flex-col gap-5 shadow-[0_0_50px_rgba(139,92,246,0.15)] lg:-mt-4 lg:mb-4 z-10 border-t-4 border-t-[var(--nebula-violet)]">
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
                                <span className="material-symbols-outlined text-[var(--nebula-violet)] !text-[18px]">check</span> Lưu email 90 ngày
                            </li>
                            <li className="flex items-center gap-2 text-white font-medium">
                                <span className="material-symbols-outlined text-[var(--nebula-violet)] !text-[18px]">check</span> Hỗ trợ ưu tiên
                            </li>
                        </ul>
                        <Link to="/register?plan=professional" className="w-full block text-center py-2.5 rounded-lg bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white font-medium text-sm shadow-lg transition-all hover:shadow-[var(--nebula-violet)]/25">
                            Chọn Chuyên nghiệp
                        </Link>
                    </div>

                    {/* Business Tier */}
                    <div className="relative rounded-2xl bg-[var(--nebula-surface)] border border-green-500/30 p-6 flex flex-col gap-5 hover:border-green-500/50 transition-colors">
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
                                <span className="material-symbols-outlined text-green-400 !text-[18px]">check</span> Lưu email 180 ngày
                            </li>
                            <li className="flex items-center gap-2 text-slate-300">
                                <span className="material-symbols-outlined text-green-400 !text-[18px]">check</span> 30 webhooks
                            </li>
                        </ul>
                        <Link to="/register?plan=business" className="w-full py-2.5 block text-center rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 font-medium text-sm border border-green-500/30 transition-colors">
                            Chọn Doanh nghiệp
                        </Link>
                    </div>

                    {/* Enterprise Tier */}
                    <div className="relative rounded-2xl bg-[var(--nebula-surface)] border border-amber-500/30 p-6 flex flex-col gap-5 hover:border-amber-500/50 transition-colors">
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
                                <span className="material-symbols-outlined text-amber-400 !text-[18px]">check</span> Không giới hạn tên miền
                            </li>
                            <li className="flex items-center gap-2 text-slate-300">
                                <span className="material-symbols-outlined text-amber-400 !text-[18px]">check</span> Không giới hạn hộp thư
                            </li>
                            <li className="flex items-center gap-2 text-slate-300">
                                <span className="material-symbols-outlined text-amber-400 !text-[18px]">check</span> 50GB lưu trữ
                            </li>
                            <li className="flex items-center gap-2 text-slate-300">
                                <span className="material-symbols-outlined text-amber-400 !text-[18px]">check</span> Lưu email 365 ngày
                            </li>
                            <li className="flex items-center gap-2 text-slate-300">
                                <span className="material-symbols-outlined text-amber-400 !text-[18px]">check</span> Hỗ trợ 24/7
                            </li>
                        </ul>
                        <Link to="/register?plan=enterprise" className="w-full py-2.5 block text-center rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-medium text-sm border border-amber-500/30 transition-colors">
                            Chọn Enterprise
                        </Link>
                    </div>
                </div>

                {/* Feature Comparison Table */}
                <div className="mt-24 max-w-6xl mx-auto">
                    <h3 className="text-2xl font-bold text-white text-center mb-8">So sánh tính năng chi tiết</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="py-4 px-4 text-slate-400 font-medium">Tính năng</th>
                                    <th className="py-4 px-4 text-white font-bold text-center">Miễn phí</th>
                                    <th className="py-4 px-4 text-white font-bold text-center">Khởi đầu</th>
                                    <th className="py-4 px-4 text-[var(--nebula-violet)] font-bold text-center">Chuyên nghiệp</th>
                                    <th className="py-4 px-4 text-green-400 font-bold text-center">Doanh nghiệp</th>
                                    <th className="py-4 px-4 text-amber-400 font-bold text-center">Enterprise</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300 text-sm">
                                <tr>
                                    <td className="py-4 px-4">Tên miền</td>
                                    <td className="py-4 px-4 text-center">1</td>
                                    <td className="py-4 px-4 text-center">3</td>
                                    <td className="py-4 px-4 text-center">10</td>
                                    <td className="py-4 px-4 text-center">25</td>
                                    <td className="py-4 px-4 text-center">Vô hạn</td>
                                </tr>
                                <tr>
                                    <td className="py-4 px-4">Hộp thư</td>
                                    <td className="py-4 px-4 text-center">3</td>
                                    <td className="py-4 px-4 text-center">20</td>
                                    <td className="py-4 px-4 text-center">100</td>
                                    <td className="py-4 px-4 text-center">500</td>
                                    <td className="py-4 px-4 text-center">Vô hạn</td>
                                </tr>
                                <tr>
                                    <td className="py-4 px-4">Dung lượng</td>
                                    <td className="py-4 px-4 text-center">100MB</td>
                                    <td className="py-4 px-4 text-center">1GB</td>
                                    <td className="py-4 px-4 text-center">5GB</td>
                                    <td className="py-4 px-4 text-center">20GB</td>
                                    <td className="py-4 px-4 text-center">50GB</td>
                                </tr>
                                <tr>
                                    <td className="py-4 px-4">Thời gian lưu trữ</td>
                                    <td className="py-4 px-4 text-center">7 ngày</td>
                                    <td className="py-4 px-4 text-center">30 ngày</td>
                                    <td className="py-4 px-4 text-center">90 ngày</td>
                                    <td className="py-4 px-4 text-center">180 ngày</td>
                                    <td className="py-4 px-4 text-center">365 ngày</td>
                                </tr>
                                <tr>
                                    <td className="py-4 px-4">API Access</td>
                                    <td className="py-4 px-4 text-center text-red-400">×</td>
                                    <td className="py-4 px-4 text-center text-green-400">✓</td>
                                    <td className="py-4 px-4 text-center text-green-400">✓</td>
                                    <td className="py-4 px-4 text-center text-green-400">✓</td>
                                    <td className="py-4 px-4 text-center text-green-400">✓</td>
                                </tr>
                                <tr>
                                    <td className="py-4 px-4">Hỗ trợ ưu tiên</td>
                                    <td className="py-4 px-4 text-center text-red-400">×</td>
                                    <td className="py-4 px-4 text-center text-red-400">×</td>
                                    <td className="py-4 px-4 text-center text-green-400">✓</td>
                                    <td className="py-4 px-4 text-center text-green-400">✓</td>
                                    <td className="py-4 px-4 text-center text-green-400">✓ 24/7</td>
                                </tr>
                                <tr>
                                    <td className="py-4 px-4">Webhooks</td>
                                    <td className="py-4 px-4 text-center">0</td>
                                    <td className="py-4 px-4 text-center">2</td>
                                    <td className="py-4 px-4 text-center">10</td>
                                    <td className="py-4 px-4 text-center">30</td>
                                    <td className="py-4 px-4 text-center">Vô hạn</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
