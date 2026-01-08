import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Link } from "react-router-dom";

export function Support() {
    return (
        <div className="min-h-screen pt-24 pb-20 neo-mesh-bg text-white flex flex-col items-center px-4">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-16 animate-fade-in-up">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
                        Trung tâm Trợ giúp
                    </h1>
                    <p className="text-nebula-text-muted text-lg max-w-2xl mx-auto">
                        Chúng tôi ở đây để giúp đỡ. Tìm câu trả lời hoặc liên hệ trực tiếp với đội ngũ hỗ trợ.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Contact Form */}
                    <GlassCard className="p-8 animate-fade-in-up">
                        <h2 className="text-2xl font-bold mb-6">Gửi yêu cầu</h2>
                        <form className="space-y-4">
                            <Input label="Email của bạn" placeholder="name@example.com" type="email" className="bg-surface-elevated border-border" icon={<span className="material-symbols-outlined text-[20px]">alternate_email</span>} />
                            <div className="space-y-2">
                                <label className="text-text-secondary text-sm font-medium ml-1">Vấn đề cần hỗ trợ</label>
                                <select className="w-full h-10 px-3 py-2 bg-surface-elevated border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-text-main placeholder-gray-500">
                                    <option>Vấn đề kỹ thuật</option>
                                    <option>Thanh toán & Gói cước</option>
                                    <option>Báo cáo lạm dụng</option>
                                    <option>Khác</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-text-secondary text-sm font-medium ml-1">Nội dung chi tiết</label>
                                <textarea className="w-full h-32 px-3 py-2 bg-surface-elevated border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-text-main placeholder-gray-500 resize-none" placeholder="Mô tả vấn đề của bạn..."></textarea>
                            </div>
                            <Button className="w-full h-12">Gửi yêu cầu</Button>
                        </form>
                    </GlassCard>

                    {/* Quick Info */}
                    <div className="space-y-6 animate-fade-in-up delay-100">
                        <GlassCard className="p-6">
                            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">menu_book</span>
                                Tài liệu
                            </h3>
                            <p className="text-text-secondary text-sm mb-4">
                                Xem hướng dẫn sử dụng và tài liệu API chi tiết của chúng tôi.
                            </p>
                            <Link to="/docs" className="text-primary hover:text-white text-sm font-medium flex items-center gap-1 transition-colors">
                                Xem Docs <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </Link>
                        </GlassCard>

                        <GlassCard className="p-6">
                            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-400">email</span>
                                Email trực tiếp
                            </h3>
                            <p className="text-text-secondary text-sm mb-4">
                                Bạn cũng có thể gửi email trực tiếp cho chúng tôi.
                            </p>
                            <a href="mailto:support@ephemera.io" className="text-white hover:text-primary transition-colors font-mono bg-white/5 px-3 py-1 rounded border border-white/10 block w-fit">
                                support@ephemera.io
                            </a>
                        </GlassCard>

                        <GlassCard className="p-6">
                            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-yellow-400">schedule</span>
                                Giờ làm việc
                            </h3>
                            <p className="text-text-secondary text-sm">
                                Thứ 2 - Thứ 6: 9:00 - 18:00 (GMT+7)<br />
                                Chúng tôi cố gắng phản hồi trong vòng 24 giờ.
                            </p>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Re-export specific Sales component if needed, or redirect /sales to a specialized version
export function Sales() {
    return (
        <div className="min-h-screen pt-24 pb-20 neo-mesh-bg text-white flex flex-col items-center px-4">
            <div className="max-w-4xl w-full text-center">
                <div className="mb-16 animate-fade-in-up">
                    <span className="inline-block px-3 py-1 rounded bg-purple-500/20 text-purple-300 text-sm font-bold mb-4 border border-purple-500/30">DOANH NGHIỆP</span>
                    <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-200 via-white to-purple-200 bg-clip-text text-transparent">
                        Liên hệ Kinh doanh
                    </h1>
                    <p className="text-nebula-text-muted text-lg max-w-2xl mx-auto">
                        Cần giải pháp tùy chỉnh, SLA cao hơn, hoặc gói doanh nghiệp? Đội ngũ của chúng tôi sẵn sàng thảo luận.
                    </p>
                </div>

                <GlassCard className="max-w-xl mx-auto p-8 md:p-12 animate-fade-in-up">
                    <form className="space-y-4 text-left">
                        <Input label="Họ và tên" placeholder="Tên của bạn" className="bg-surface-elevated border-border" />
                        <Input label="Email Công việc" placeholder="name@company.com" type="email" className="bg-surface-elevated border-border" />
                        <Input label="Tên công ty" placeholder="Acme Corp" className="bg-surface-elevated border-border" />

                        <div className="space-y-2">
                            <label className="text-text-secondary text-sm font-medium ml-1">Quy mô công ty</label>
                            <select className="w-full h-10 px-3 py-2 bg-input-bg border border-[#313168] rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-white placeholder-gray-500">
                                <option>1-10 nhân viên</option>
                                <option>11-50 nhân viên</option>
                                <option>51-200 nhân viên</option>
                                <option>201+ nhân viên</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-text-secondary text-sm font-medium ml-1">Nhu cầu cụ thể</label>
                            <textarea className="w-full h-32 px-3 py-2 bg-surface-elevated border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-text-main placeholder-gray-500 resize-none" placeholder="VD: API Rate limits, Dedicated IP, ..."></textarea>
                        </div>

                        <Button className="w-full h-12 text-base font-bold bg-purple-600 hover:bg-purple-700 shadow-purple-500/20 shadow-lg">Liên hệ Sales Team</Button>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
}

// Also export Contact alias
export const Contact = Support;
