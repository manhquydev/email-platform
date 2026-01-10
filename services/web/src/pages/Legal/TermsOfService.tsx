import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export function TermsOfService() {
    useEffect(() => {
        document.title = 'Điều khoản dịch vụ - Ephemera';
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 animate-nebula-fade-in">
            <div className="glass-card p-8 md:p-12 relative overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--nebula-violet)]/10 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--nebula-cyan)]/10 rounded-full blur-3xl -z-10 transform -translate-x-1/2 translate-y-1/2 pointer-events-none" />

                <div className="mb-10 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 neo-text-gradient-aurora">Điều khoản Dịch vụ</h1>
                    <p className="text-[var(--nebula-text-muted)] text-lg">Cập nhật lần cuối: Tháng 12, 2025</p>
                </div>

                <div className="prose prose-slate dark:prose-invert prose-lg max-w-none prose-headings:text-slate-900 dark:prose-headings:text-[var(--nebula-text)] prose-p:text-slate-600 dark:prose-p:text-[var(--nebula-text-secondary)] prose-li:text-slate-600 dark:prose-li:text-[var(--nebula-text-secondary)] prose-strong:text-slate-900 dark:prose-strong:text-[var(--nebula-text)] prose-a:text-nebula-violet dark:prose-a:text-nebula-violet-light prose-a:no-underline hover:prose-a:underline">
                    <section className="mb-8">
                        <h2>1. Chấp nhận Điều khoản</h2>
                        <p>
                            Bằng cách truy cập và sử dụng Ephemera ("Dịch vụ"), bạn đồng ý tuân thủ các Điều khoản Dịch vụ này.
                            Nếu bạn không đồng ý với các điều khoản này, vui lòng không sử dụng Dịch vụ.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>2. Mô tả Dịch vụ</h2>
                        <p>
                            Ephemera cung cấp dịch vụ lưu trữ email bao gồm email tên miền tùy chỉnh,
                            hộp thư đến dùng một lần/tạm thời và các chức năng liên quan. Dịch vụ cho phép người dùng:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Thêm và xác minh tên miền tùy chỉnh để lưu trữ email</li>
                            <li>Tạo và quản lý hộp thư đến email</li>
                            <li>Nhận và xem tin nhắn email qua webmail</li>
                            <li>Truy cập email qua API cho mục đích tự động hóa</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>3. Tài khoản Người dùng</h2>
                        <p>
                            Bạn phải đăng ký tài khoản để sử dụng một số tính năng nhất định. Bạn chịu trách nhiệm về:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Duy trì tính bảo mật của thông tin đăng nhập tài khoản của bạn</li>
                            <li>Mọi hoạt động xảy ra dưới tài khoản của bạn</li>
                            <li>Thông báo cho chúng tôi ngay lập tức về bất kỳ hành vi sử dụng trái phép nào</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>4. Sử dụng Chấp nhận được</h2>
                        <p>
                            Bạn đồng ý không sử dụng Dịch vụ cho bất kỳ mục đích bất hợp pháp nào hoặc vi phạm bất kỳ luật hiện hành nào.
                            Xem <Link to="/acceptable-use" className="text-[var(--nebula-primary)] hover:underline">Chính sách sử dụng chấp nhận được</Link> của chúng tôi để biết hướng dẫn chi tiết.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>5. Sửa đổi Dịch vụ</h2>
                        <p>
                            Chúng tôi có quyền sửa đổi, tạm ngưng hoặc ngừng Dịch vụ bất kỳ lúc nào,
                            có hoặc không có thông báo. Chúng tôi sẽ không chịu trách nhiệm về bất kỳ sửa đổi, tạm ngưng
                            hoặc ngừng hoạt động nào của Dịch vụ.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>6. Dữ liệu và Quyền riêng tư</h2>
                        <p>
                            Việc bạn sử dụng Dịch vụ cũng được điều chỉnh bởi <Link to="/privacy" className="text-[var(--nebula-primary)] hover:underline">Chính sách Bảo mật</Link> của chúng tôi.
                            Bằng cách sử dụng Dịch vụ, bạn đồng ý với việc thu thập và sử dụng dữ liệu của bạn như được mô tả trong đó.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>7. Giới hạn Trách nhiệm</h2>
                        <p className="uppercase tracking-wide text-sm font-semibold border-l-4 border-[var(--nebula-error)] pl-4 py-2 bg-[var(--nebula-error)]/10 text-[var(--nebula-error)]">
                            DỊCH VỤ ĐƯỢC CUNG CẤP "NGUYÊN TRẠNG" MÀ KHÔNG CÓ BẤT KỲ ĐẢM BẢO NÀO. TRONG PHẠM VI TỐI ĐA
                            MÀ LUẬT PHÁP CHO PHÉP, CHÚNG TÔI SẼ KHÔNG CHỊU TRÁCH NHIỆM VỀ BẤT KỲ THIỆT HẠI NÀO MANG TÍNH GIÁN TIẾP,
                            NGẪU NHIÊN, ĐẶC BIỆT, HẬU QUẢ HOẶC TRỪNG PHẠT.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>8. Chấm dứt</h2>
                        <p>
                            Chúng tôi có thể chấm dứt hoặc tạm ngưng tài khoản của bạn bất kỳ lúc nào nếu vi phạm các Điều khoản này.
                            Sau khi chấm dứt, quyền sử dụng Dịch vụ của bạn sẽ chấm dứt ngay lập tức.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>9. Thay đổi Điều khoản</h2>
                        <p>
                            Chúng tôi có thể cập nhật các Điều khoản này theo thời gian. Việc tiếp tục sử dụng Dịch vụ sau khi
                            có thay đổi đồng nghĩa với việc chấp nhận các Điều khoản mới.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>10. Liên hệ</h2>
                        <p>
                            Nếu có thắc mắc về các Điều khoản này, vui lòng liên hệ với chúng tôi tại <a href="mailto:legal@manhquy.click" className="text-[var(--nebula-primary)] hover:underline">legal@manhquy.click</a>.
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-[var(--nebula-border)] flex flex-wrap justify-center gap-6">
                    <Link to="/privacy" className="text-[var(--nebula-text-muted)] hover:text-[var(--nebula-primary)] transition-colors">Chính sách Bảo mật</Link>
                    <Link to="/acceptable-use" className="text-[var(--nebula-text-muted)] hover:text-[var(--nebula-primary)] transition-colors">Chính sách sử dụng</Link>
                </div>
            </div>
        </div>
    );
}
