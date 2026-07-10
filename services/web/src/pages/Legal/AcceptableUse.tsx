import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export function AcceptableUse() {
    useEffect(() => {
        document.title = 'Chính sách sử dụng chấp nhận được - Ephemera';
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 animate-nebula-fade-in">
            <div className="glass-card p-8 md:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--nebula-violet)]/10 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--nebula-cyan)]/10 rounded-full blur-3xl -z-10 transform -translate-x-1/2 translate-y-1/2 pointer-events-none" />

                <div className="mb-10 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 neo-text-gradient-aurora">Chính sách Sử dụng Chấp nhận được</h1>
                    <p className="text-[var(--nebula-text-muted)] text-lg">Cập nhật lần cuối: 08/04/2026</p>
                </div>

                <div className="prose prose-slate dark:prose-invert prose-lg max-w-none prose-headings:text-slate-900 dark:prose-headings:text-[var(--nebula-text)] prose-p:text-slate-600 dark:prose-p:text-[var(--nebula-text-secondary)] prose-li:text-slate-600 dark:prose-li:text-[var(--nebula-text-secondary)] prose-strong:text-slate-900 dark:prose-strong:text-[var(--nebula-text)] prose-a:text-nebula-violet dark:prose-a:text-nebula-violet-light prose-a:no-underline hover:prose-a:underline">
                    <section className="mb-8">
                        <h2>1. Mục đích</h2>
                        <p>
                            Chính sách này quy định giới hạn sử dụng Ephemera để bảo vệ người dùng, hệ thống và tuân thủ pháp luật Việt Nam.
                            Mọi vi phạm có thể dẫn đến giới hạn, tạm ngưng hoặc chấm dứt tài khoản.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>2. Hành vi bị cấm</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Phát tán thư rác, thư lừa đảo, nội dung giả mạo hoặc gây nhầm lẫn danh tính.</li>
                            <li>Gửi mã độc, liên kết độc hại, nội dung tấn công hệ thống hoặc thu thập dữ liệu trái phép.</li>
                            <li>Sử dụng dịch vụ để thực hiện hành vi gian lận, rửa tiền, xâm phạm quyền sở hữu trí tuệ.</li>
                            <li>Can thiệp, phá hoại, vượt giới hạn kỹ thuật hoặc cố ý gây gián đoạn dịch vụ.</li>
                            <li>Phát tán nội dung vi phạm pháp luật, bao gồm nội dung bị cấm theo quy định an ninh mạng.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>3. Nghĩa vụ gửi email hợp lệ</h2>
                        <p>Người dùng gửi email từ hệ thống cần:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Chỉ gửi cho người nhận có cơ sở hợp lệ (đăng ký hoặc quan hệ hợp pháp).</li>
                            <li>Không che giấu danh tính người gửi hoặc giả mạo tên miền.</li>
                            <li>Tuân thủ cấu hình SPF, DKIM, DMARC khi dùng domain riêng.</li>
                            <li>Tôn trọng yêu cầu từ chối nhận thông tin và yêu cầu xóa dữ liệu theo quy định.</li>
                        </ul>
                    </section>

                    <section className="mb-8 p-6 rounded-xl bg-amber-500/5 border border-amber-500/20">
                        <h2 className="!text-amber-300">4. Căn cứ pháp lý tham chiếu</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2 !text-amber-200/80">
                            <li>Nghị định số 91/2020/NĐ-CP về chống tin nhắn rác, thư điện tử rác, cuộc gọi rác.</li>
                            <li>Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và văn bản hướng dẫn thi hành.</li>
                            <li>Quy định pháp luật Việt Nam về an ninh mạng, giao dịch điện tử và bảo vệ người tiêu dùng.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>5. Cơ chế kiểm soát và xử lý vi phạm</h2>
                        <p>Ephemera có thể áp dụng một hoặc nhiều biện pháp sau:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Giới hạn tốc độ gửi/nhận hoặc khóa tạm thời API key/tài khoản.</li>
                            <li>Yêu cầu xác minh bổ sung danh tính hoặc quyền sử dụng tên miền.</li>
                            <li>Tạm ngưng/chấm dứt dịch vụ khi có dấu hiệu vi phạm nghiêm trọng hoặc tái phạm.</li>
                            <li>Phối hợp với cơ quan có thẩm quyền khi có yêu cầu hợp lệ theo pháp luật.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>6. Báo cáo lạm dụng</h2>
                        <p>
                            Vui lòng gửi thông tin lạm dụng về
                            <a href="mailto:abuse@manhquy.id.vn" className="ml-1 text-[var(--nebula-primary)] hover:underline">abuse@manhquy.id.vn</a>
                            , kèm thời gian, địa chỉ liên quan và bằng chứng kỹ thuật nếu có.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>7. Cập nhật chính sách</h2>
                        <p>
                            Chính sách có thể thay đổi theo cập nhật pháp luật hoặc thay đổi hệ thống vận hành. Phiên bản mới được công bố tại trang này.
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-[var(--nebula-border)] flex flex-wrap justify-center gap-6">
                    <Link to="/terms" className="text-[var(--nebula-text-muted)] hover:text-[var(--nebula-primary)] transition-colors">Điều khoản dịch vụ</Link>
                    <Link to="/privacy" className="text-[var(--nebula-text-muted)] hover:text-[var(--nebula-primary)] transition-colors">Chính sách Bảo mật</Link>
                    <Link to="/gdpr" className="text-[var(--nebula-text-muted)] hover:text-[var(--nebula-primary)] transition-colors">Bảo vệ dữ liệu (VN/EU)</Link>
                </div>
            </div>
        </div>
    );
}
