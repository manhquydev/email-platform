/**
 * FAQ and CTA Sections
 */
import { Link } from "react-router-dom";
import { faqs } from "./landing-page-data";

export function FAQSection() {
    return (
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
    );
}

export function CTASection() {
    return (
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
    );
}
