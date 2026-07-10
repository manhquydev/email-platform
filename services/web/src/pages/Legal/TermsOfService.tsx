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
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--nebula-violet)]/10 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--nebula-cyan)]/10 rounded-full blur-3xl -z-10 transform -translate-x-1/2 translate-y-1/2 pointer-events-none" />

                <div className="mb-10 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 neo-text-gradient-aurora">Điều khoản Dịch vụ</h1>
                    <p className="text-[var(--nebula-text-muted)] text-lg">Cập nhật lần cuối: 08/04/2026</p>
                </div>

                <div className="prose prose-slate dark:prose-invert prose-lg max-w-none prose-headings:text-slate-900 dark:prose-headings:text-[var(--nebula-text)] prose-p:text-slate-600 dark:prose-p:text-[var(--nebula-text-secondary)] prose-li:text-slate-600 dark:prose-li:text-[var(--nebula-text-secondary)] prose-strong:text-slate-900 dark:prose-strong:text-[var(--nebula-text)] prose-a:text-nebula-violet dark:prose-a:text-nebula-violet-light prose-a:no-underline hover:prose-a:underline">
                    <section className="mb-8">
                        <h2>1. Chấp nhận điều khoản</h2>
                        <p>
                            Khi truy cập hoặc sử dụng Ephemera (&quot;Dịch vụ&quot;), bạn xác nhận đã đọc và đồng ý với Điều khoản này.
                            Nếu bạn không đồng ý, vui lòng ngừng sử dụng Dịch vụ.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>2. Mô tả dịch vụ</h2>
                        <p>Ephemera cung cấp nền tảng email tạm thời và email domain riêng, bao gồm:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Tạo và quản lý hộp thư đến.</li>
                            <li>Nhận, đọc và quản lý email qua giao diện web.</li>
                            <li>Truy cập API phục vụ tự động hóa theo gói dịch vụ.</li>
                            <li>Quản lý domain và cấu hình kỹ thuật liên quan đến email.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>3. Tài khoản và bảo mật</h2>
                        <p>Người dùng có trách nhiệm:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Cung cấp thông tin đăng ký chính xác, cập nhật.</li>
                            <li>Giữ an toàn thông tin xác thực và thiết bị truy cập.</li>
                            <li>Thông báo kịp thời khi phát hiện truy cập trái phép.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>4. Tuân thủ pháp luật</h2>
                        <p>
                            Bạn cam kết không sử dụng Dịch vụ cho mục đích vi phạm pháp luật Việt Nam hoặc pháp luật áp dụng tại nơi bạn hoạt động.
                            Mọi hành vi lạm dụng phải tuân thủ <Link to="/acceptable-use">Chính sách Sử dụng Chấp nhận được</Link>.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>5. Dữ liệu cá nhân và quyền riêng tư</h2>
                        <p>
                            Việc xử lý dữ liệu cá nhân được mô tả tại <Link to="/privacy">Chính sách Bảo mật</Link>. Chính sách này được xây dựng
                            theo khung pháp lý hiện hành của Việt Nam, bao gồm Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 (hiệu lực 01/01/2026)
                            và văn bản hướng dẫn liên quan.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>6. Nội dung email và hành vi bị cấm</h2>
                        <p>Không được sử dụng Dịch vụ để:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Phát tán thư rác, lừa đảo, mã độc hoặc tấn công hệ thống.</li>
                            <li>Xâm phạm quyền riêng tư, bí mật kinh doanh, quyền sở hữu trí tuệ của bên thứ ba.</li>
                            <li>Gửi/nhận nội dung vi phạm quy định về an ninh mạng và trật tự an toàn xã hội.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>7. Khả dụng dịch vụ</h2>
                        <p>
                            Chúng tôi nỗ lực duy trì dịch vụ liên tục nhưng không bảo đảm không có gián đoạn kỹ thuật.
                            Các hoạt động bảo trì, nâng cấp hoặc sự cố hạ tầng có thể ảnh hưởng tạm thời đến khả năng truy cập.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>8. Giới hạn trách nhiệm</h2>
                        <p>
                            Trong phạm vi pháp luật cho phép, Ephemera không chịu trách nhiệm cho thiệt hại phát sinh từ việc người dùng sử dụng sai mục đích,
                            vi phạm pháp luật hoặc không tuân thủ hướng dẫn bảo mật tài khoản.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>9. Tạm ngưng hoặc chấm dứt</h2>
                        <p>
                            Chúng tôi có thể tạm ngưng hoặc chấm dứt tài khoản khi phát hiện dấu hiệu vi phạm Điều khoản này, vi phạm pháp luật,
                            hoặc có yêu cầu hợp lệ từ cơ quan nhà nước có thẩm quyền.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>10. Cập nhật điều khoản</h2>
                        <p>
                            Điều khoản có thể được cập nhật khi có thay đổi pháp lý hoặc thay đổi sản phẩm. Bản cập nhật được công bố trên trang này
                            kèm ngày hiệu lực. Việc tiếp tục sử dụng dịch vụ sau khi cập nhật đồng nghĩa bạn chấp nhận phiên bản mới.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>11. Luật áp dụng và giải quyết tranh chấp</h2>
                        <p>
                            Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Tranh chấp phát sinh sẽ được ưu tiên giải quyết bằng thương lượng;
                            nếu không đạt kết quả, tranh chấp thuộc thẩm quyền của cơ quan nhà nước có thẩm quyền theo quy định pháp luật.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>12. Liên hệ pháp lý</h2>
                        <p>
                            Email: <a href="mailto:legal@manhquy.id.vn" className="text-[var(--nebula-primary)] hover:underline">legal@manhquy.id.vn</a>
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-[var(--nebula-border)] flex flex-wrap justify-center gap-6">
                    <Link to="/privacy" className="text-[var(--nebula-text-muted)] hover:text-[var(--nebula-primary)] transition-colors">Chính sách Bảo mật</Link>
                    <Link to="/acceptable-use" className="text-[var(--nebula-text-muted)] hover:text-[var(--nebula-primary)] transition-colors">Chính sách sử dụng</Link>
                    <Link to="/gdpr" className="text-[var(--nebula-text-muted)] hover:text-[var(--nebula-primary)] transition-colors">Bảo vệ dữ liệu (VN/EU)</Link>
                </div>
            </div>
        </div>
    );
}
