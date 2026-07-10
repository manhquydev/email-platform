import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export function PrivacyPolicy() {
    useEffect(() => {
        document.title = 'Chính sách bảo mật - Ephemera';
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 animate-nebula-fade-in">
            <div className="glass-card p-8 md:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--nebula-violet)]/10 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--nebula-cyan)]/10 rounded-full blur-3xl -z-10 transform -translate-x-1/2 translate-y-1/2 pointer-events-none" />

                <div className="mb-10 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 neo-text-gradient-aurora">Chính sách Bảo mật</h1>
                    <p className="text-[var(--nebula-text-muted)] text-lg">Cập nhật lần cuối: 08/04/2026</p>
                </div>

                <div className="prose prose-slate dark:prose-invert prose-lg max-w-none prose-headings:text-slate-900 dark:prose-headings:text-[var(--nebula-text)] prose-p:text-slate-600 dark:prose-p:text-[var(--nebula-text-secondary)] prose-li:text-slate-600 dark:prose-li:text-[var(--nebula-text-secondary)] prose-strong:text-slate-900 dark:prose-strong:text-[var(--nebula-text)] prose-a:text-nebula-violet dark:prose-a:text-nebula-violet-light prose-a:no-underline hover:prose-a:underline">
                    <section className="mb-8 p-6 rounded-xl bg-blue-500/5 border border-blue-500/20">
                        <h2 className="!text-blue-400">1. Khung pháp lý áp dụng</h2>
                        <p className="!text-blue-300/80">
                            Chính sách này được cập nhật theo khung pháp lý Việt Nam đang có hiệu lực gồm: Luật Bảo vệ dữ liệu cá nhân số
                            91/2025/QH15 (hiệu lực 01/01/2026), Nghị định số 356/2025/NĐ-CP (hiệu lực 01/01/2026), Luật Dữ liệu số
                            60/2024/QH15 (hiệu lực 01/07/2025), Nghị định số 13/2023/NĐ-CP và các quy định có liên quan về bảo vệ người
                            tiêu dùng, an ninh mạng và chống thư rác.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>2. Dữ liệu chúng tôi xử lý</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li><strong>Dữ liệu tài khoản:</strong> email đăng ký, mật khẩu băm, trạng thái xác thực, cài đặt người dùng.</li>
                            <li><strong>Dữ liệu dịch vụ email:</strong> địa chỉ hộp thư, metadata thư, nội dung thư và tệp đính kèm.</li>
                            <li><strong>Dữ liệu kỹ thuật:</strong> log truy cập, địa chỉ IP và thiết bị phục vụ an toàn hệ thống, chống lạm dụng.</li>
                        </ul>
                        <p className="mt-4">
                            Chúng tôi giảm thiểu dữ liệu trong phạm vi cần thiết cho mục đích vận hành và tuân thủ pháp luật.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>3. Mục đích xử lý</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Cung cấp, duy trì và bảo mật dịch vụ email.</li>
                            <li>Xác thực người dùng, phòng chống gian lận, chống spam và lạm dụng.</li>
                            <li>Hỗ trợ kỹ thuật, xử lý yêu cầu người dùng và khiếu nại.</li>
                            <li>Thực hiện nghĩa vụ pháp lý theo yêu cầu của cơ quan có thẩm quyền.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>4. Căn cứ xử lý dữ liệu</h2>
                        <p>
                            Tùy từng trường hợp, việc xử lý dữ liệu dựa trên: (i) sự đồng ý của chủ thể dữ liệu; (ii) nhu cầu thực hiện hợp đồng dịch vụ;
                            (iii) nghĩa vụ pháp lý; hoặc (iv) lợi ích hợp pháp để bảo đảm an toàn hệ thống, trong giới hạn pháp luật cho phép.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>5. Quyền của chủ thể dữ liệu</h2>
                        <p>Bạn có thể yêu cầu thực hiện các quyền theo pháp luật áp dụng, gồm:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Được biết và đồng ý/không đồng ý về hoạt động xử lý.</li>
                            <li>Truy cập, chỉnh sửa hoặc yêu cầu xóa dữ liệu theo điều kiện pháp luật.</li>
                            <li>Rút lại đồng ý, hạn chế hoặc phản đối xử lý trong trường hợp phù hợp.</li>
                            <li>Khiếu nại, tố cáo, khởi kiện theo trình tự pháp luật.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>6. Chia sẻ dữ liệu</h2>
                        <p>Chúng tôi không kinh doanh mua bán dữ liệu cá nhân. Dữ liệu chỉ được chia sẻ khi:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Cần thiết cho nhà cung cấp hạ tầng/phần mềm xử lý thay mặt chúng tôi theo hợp đồng bảo mật.</li>
                            <li>Có yêu cầu hợp lệ từ cơ quan nhà nước có thẩm quyền.</li>
                            <li>Có sự đồng ý rõ ràng của bạn hoặc căn cứ pháp lý khác theo quy định.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>7. Chuyển dữ liệu ra nước ngoài</h2>
                        <p>
                            Khi có hoạt động chuyển dữ liệu cá nhân ra ngoài lãnh thổ Việt Nam, chúng tôi thực hiện biện pháp bảo vệ tương ứng,
                            lập hồ sơ và thực hiện thủ tục theo yêu cầu của pháp luật hiện hành.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>8. Thời gian lưu trữ</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Thông tin tài khoản: lưu trong thời gian tài khoản còn hiệu lực và thời gian lưu trữ bắt buộc theo luật.</li>
                            <li>Email/tệp đính kèm: lưu theo gói dịch vụ hoặc cấu hình retention, sau đó xóa theo quy trình hệ thống.</li>
                            <li>Nhật ký bảo mật: lưu theo chu kỳ vận hành và yêu cầu điều tra sự cố.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>9. Cookie và công nghệ tương tự</h2>
                        <p>
                            Ephemera sử dụng cookie thiết yếu cho đăng nhập, phiên làm việc và bảo mật. Chúng tôi không vận hành mô hình quảng cáo
                            hành vi dựa trên dữ liệu người dùng trong sản phẩm cốt lõi.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>10. Biện pháp bảo vệ</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Mã hóa dữ liệu truyền tải (TLS).</li>
                            <li>Băm mật khẩu và kiểm soát truy cập theo vai trò.</li>
                            <li>Giám sát bảo mật, rate limit, nhật ký sự kiện và kiểm soát lạm dụng.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>11. Liên hệ và khiếu nại</h2>
                        <p>
                            Email tiếp nhận yêu cầu dữ liệu cá nhân:
                            <a href="mailto:privacy@manhquy.id.vn" className="ml-1 text-nebula-violet dark:text-nebula-violet-light hover:underline">
                                privacy@manhquy.id.vn
                            </a>
                        </p>
                        <p className="mt-3">
                            Nếu bạn cho rằng quyền dữ liệu của mình bị xâm phạm, bạn có quyền khiếu nại tới cơ quan nhà nước có thẩm quyền theo pháp luật Việt Nam.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>12. Cập nhật chính sách</h2>
                        <p>
                            Chúng tôi có thể cập nhật chính sách này để phản ánh thay đổi pháp lý hoặc kỹ thuật. Phiên bản mới sẽ được công bố tại trang này
                            cùng ngày cập nhật.
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-200 dark:border-[var(--nebula-border)] flex flex-wrap justify-center gap-6">
                    <Link to="/terms" className="text-slate-500 dark:text-[var(--nebula-text-muted)] hover:text-nebula-violet dark:hover:text-nebula-violet-light transition-colors">Điều khoản dịch vụ</Link>
                    <Link to="/acceptable-use" className="text-slate-500 dark:text-[var(--nebula-text-muted)] hover:text-nebula-violet dark:hover:text-nebula-violet-light transition-colors">Chính sách sử dụng</Link>
                    <Link to="/gdpr" className="text-slate-500 dark:text-[var(--nebula-text-muted)] hover:text-nebula-violet dark:hover:text-nebula-violet-light transition-colors">Bảo vệ dữ liệu (VN/EU)</Link>
                </div>
            </div>
        </div>
    );
}
