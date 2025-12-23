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
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--nebula-violet)]/10 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--nebula-cyan)]/10 rounded-full blur-3xl -z-10 transform -translate-x-1/2 translate-y-1/2 pointer-events-none" />

                <div className="mb-10 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 neo-text-gradient-aurora">Chính sách Sử dụng</h1>
                    <p className="text-[var(--nebula-text-muted)] text-lg">Cập nhật lần cuối: Tháng 12, 2025</p>
                </div>

                <div className="prose prose-invert prose-lg max-w-none prose-headings:text-[var(--nebula-text)] prose-p:text-[var(--nebula-text-secondary)] prose-li:text-[var(--nebula-text-secondary)] prose-strong:text-[var(--nebula-text)]">
                    <section className="mb-8">
                        <h2>1. Tổng quan</h2>
                        <p>
                            Chính sách Sử dụng Chấp nhận được ("AUP") này phác thảo các quy tắc sử dụng Ephemera.
                            Vi phạm chính sách này có thể dẫn đến việc tạm ngưng hoặc chấm dứt tài khoản của bạn.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>2. Các hoạt động bị nghiêm cấm</h2>
                        <p className="mb-4">Bạn KHÔNG ĐƯỢC sử dụng Dịch vụ để:</p>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-[var(--nebula-surface)] p-6 rounded-xl border border-[var(--nebula-border)] hover:border-[var(--nebula-error)] transition-colors group">
                                <h3 className="text-xl font-semibold mb-3 text-[var(--nebula-error)] flex items-center gap-2">
                                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    2.1 Gửi thư rác và Lạm dụng
                                </h3>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    <li>Gửi email hàng loạt không mong muốn (spam)</li>
                                    <li>Gửi email đến danh sách email đã mua hoặc thu thập</li>
                                    <li>Giả mạo tiêu đề email hoặc thông tin người gửi</li>
                                    <li>Tham gia vào việc "ném bom" email hoặc tấn công từ chối dịch vụ</li>
                                </ul>
                            </div>

                            <div className="bg-[var(--nebula-surface)] p-6 rounded-xl border border-[var(--nebula-border)] hover:border-[var(--nebula-error)] transition-colors group">
                                <h3 className="text-xl font-semibold mb-3 text-[var(--nebula-error)] flex items-center gap-2">
                                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    2.2 Hoạt động bất hợp pháp
                                </h3>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    <li>Thực hiện hành vi gian lận, lừa đảo (phishing) hoặc trộm cắp danh tính</li>
                                    <li>Phân phối phần mềm độc hại, virus hoặc mã độc</li>
                                    <li>Cổ vũ hoặc tạo điều kiện cho các hoạt động bất hợp pháp</li>
                                    <li>Vi phạm quyền sở hữu trí tuệ</li>
                                    <li>Phân tán tài liệu lạm dụng tình dục trẻ em (CSAM)</li>
                                </ul>
                            </div>

                            <div className="bg-[var(--nebula-surface)] p-6 rounded-xl border border-[var(--nebula-border)] hover:border-[var(--nebula-error)] transition-colors group">
                                <h3 className="text-xl font-semibold mb-3 text-[var(--nebula-error)] flex items-center gap-2">
                                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                    2.3 Nội dung gây hại
                                </h3>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    <li>Quấy rối, đe dọa hoặc lạm dụng người khác</li>
                                    <li>Phân phối nội dung thù địch hoặc phân biệt đối xử</li>
                                    <li>Chia sẻ thông tin cá nhân mà không có sự đồng ý (doxxing)</li>
                                    <li>Phân phối nội dung cổ vũ bạo lực hoặc khủng bố</li>
                                </ul>
                            </div>

                            <div className="bg-[var(--nebula-surface)] p-6 rounded-xl border border-[var(--nebula-border)] hover:border-[var(--nebula-error)] transition-colors group">
                                <h3 className="text-xl font-semibold mb-3 text-[var(--nebula-error)] flex items-center gap-2">
                                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    2.4 Sử dụng sai Dịch vụ
                                </h3>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    <li>Vượt qua các yêu cầu xác minh</li>
                                    <li>Tạo tài khoản cho mục đích gian lận</li>
                                    <li>Bán lại hoặc phân phối lại dịch vụ mà không có sự ủy quyền</li>
                                    <li>Cố gắng truy cập tài khoản hoặc dữ liệu của người dùng khác</li>
                                    <li>Can thiệp vào hoạt động hoặc bảo mật của dịch vụ</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2>3. Thực tiễn Email tốt nhất</h2>
                        <p>Khi sử dụng Ephemera để gửi email, bạn phải:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Chỉ gửi email đến những người nhận đã đăng ký (opt-in)</li>
                            <li>Bao gồm cơ chế hủy đăng ký rõ ràng trong các email tiếp thị</li>
                            <li>Tôn trọng các yêu cầu hủy đăng ký ngay lập tức</li>
                            <li>Duy trì thông tin người gửi chính xác</li>
                            <li>Tuân thủ CAN-SPAM, CASL, GDPR và các luật hiện hành khác</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>4. Yêu cầu xác thực</h2>
                        <p>Đối với các tên miền được sử dụng để gửi email, bạn phải cấu hình đúng:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Bản ghi SPF để ủy quyền cho các máy chủ gửi</li>
                            <li>Chữ ký DKIM để xác thực email</li>
                            <li>Chính sách DMARC để bảo vệ tên miền</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>5. Giới hạn tốc độ</h2>
                        <p className="mb-4">
                            Dịch vụ áp dụng các giới hạn tốc độ để đảm bảo sử dụng công bằng.
                            Mọi nỗ lực nhằm vượt qua các giới hạn này đều bị cấm.
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse rounded-lg overflow-hidden glass-effect-inner">
                                <thead className="bg-[var(--nebula-elevated)]">
                                    <tr>
                                        <th className="p-4 font-semibold text-[var(--nebula-text)]">Tài nguyên</th>
                                        <th className="p-4 font-semibold text-[var(--nebula-text)]">Giới hạn</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--nebula-border)]">
                                    <tr>
                                        <td className="p-4">Email trên mỗi IP (5 phút)</td>
                                        <td className="p-4 font-mono text-[var(--nebula-primary)]">300</td>
                                    </tr>
                                    <tr>
                                        <td className="p-4">Email trên mỗi tên miền (5 phút)</td>
                                        <td className="p-4 font-mono text-[var(--nebula-primary)]">500</td>
                                    </tr>
                                    <tr>
                                        <td className="p-4">Email trên mỗi hộp thư (5 phút)</td>
                                        <td className="p-4 font-mono text-[var(--nebula-primary)]">200</td>
                                    </tr>
                                    <tr>
                                        <td className="p-4">Dung lượng đính kèm tối đa</td>
                                        <td className="p-4 font-mono text-[var(--nebula-primary)]">5MB</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2>6. Báo cáo vi phạm</h2>
                        <p>
                            Để báo cáo lạm dụng hoặc vi phạm chính sách này, vui lòng gửi email đến
                            <a href="mailto:abuse@manhquy.click" className="ml-1 text-[var(--nebula-primary)] hover:underline">abuse@manhquy.click</a> với các chi tiết bao gồm:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Mô tả hành vi vi phạm</li>
                            <li>Các địa chỉ email hoặc tên miền liên quan</li>
                            <li>Bằng chứng hỗ trợ (tiêu đề email, ảnh chụp màn hình)</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>7. Thực thi</h2>
                        <p>Vi phạm có thể dẫn đến:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Thông báo cảnh báo</li>
                            <li>Tạm ngưng dịch vụ</li>
                            <li>Chấm dứt tài khoản vĩnh viễn</li>
                            <li>Báo cáo cho cơ quan thực thi pháp luật nếu được yêu cầu</li>
                            <li>Hợp tác với các thủ tục pháp lý</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>8. Liên hệ</h2>
                        <p>
                            Nếu có thắc mắc về chính sách này, hãy liên hệ <a href="mailto:abuse@manhquy.click" className="text-[var(--nebula-primary)] hover:underline">abuse@manhquy.click</a>.
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-[var(--nebula-border)] flex flex-wrap justify-center gap-6">
                    <Link to="/terms" className="text-[var(--nebula-text-muted)] hover:text-[var(--nebula-primary)] transition-colors">Điều khoản dịch vụ</Link>
                    <Link to="/privacy" className="text-[var(--nebula-text-muted)] hover:text-[var(--nebula-primary)] transition-colors">Chính sách Bảo mật</Link>
                </div>
            </div>
        </div>
    );
}
