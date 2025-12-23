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
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--nebula-violet)]/10 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--nebula-cyan)]/10 rounded-full blur-3xl -z-10 transform -translate-x-1/2 translate-y-1/2 pointer-events-none" />

                <div className="mb-10 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 neo-text-gradient-aurora">Chính sách Bảo mật</h1>
                    <p className="text-[var(--nebula-text-muted)] text-lg">Cập nhật lần cuối: Tháng 12, 2025</p>
                </div>

                <div className="prose prose-invert prose-lg max-w-none prose-headings:text-[var(--nebula-text)] prose-p:text-[var(--nebula-text-secondary)] prose-li:text-[var(--nebula-text-secondary)] prose-strong:text-[var(--nebula-text)]">
                    <section className="mb-8">
                        <h2>1. Thông tin chúng tôi thu thập</h2>
                        <h3 className="text-xl font-semibold mt-6 mb-3 text-[var(--nebula-text)]">Thông tin tài khoản</h3>
                        <p>Khi bạn tạo tài khoản, chúng tôi thu thập:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Địa chỉ email</li>
                            <li>Mật khẩu (được lưu trữ an toàn bằng mã hóa bcrypt)</li>
                            <li>Tùy chọn và cài đặt tài khoản</li>
                        </ul>

                        <h3 className="text-xl font-semibold mt-6 mb-3 text-[var(--nebula-text)]">Dữ liệu Email</h3>
                        <p>Khi bạn sử dụng dịch vụ email của chúng tôi, chúng tôi xử lý:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Nội dung email (tiêu đề, nội dung, tệp đính kèm)</li>
                            <li>Siêu dữ liệu email (người gửi, người nhận, dấu thời gian)</li>
                            <li>Thông tin tên miền và hộp thư đến</li>
                        </ul>

                        <h3 className="text-xl font-semibold mt-6 mb-3 text-[var(--nebula-text)]">Dữ liệu sử dụng</h3>
                        <p>Chúng tôi tự động thu thập:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Địa chỉ IP</li>
                            <li>Loại trình duyệt và phiên bản</li>
                            <li>Các trang đã truy cập và hành động được thực hiện</li>
                            <li>Dấu thời gian đăng nhập</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>2. Cách chúng tôi sử dụng thông tin của bạn</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Để cung cấp và duy trì dịch vụ lưu trữ email</li>
                            <li>Để xử lý và gửi tin nhắn email</li>
                            <li>Để gửi thông báo liên quan đến dịch vụ</li>
                            <li>Để phát hiện và ngăn chặn lạm dụng, thư rác và gian lận</li>
                            <li>Để cải thiện dịch vụ của chúng tôi</li>
                            <li>Để tuân thủ các nghĩa vụ pháp lý</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>3. Lưu trữ dữ liệu</h2>
                        <p className="mb-4">
                            Tin nhắn email được lưu trữ theo cài đặt gói của bạn và có thể bị xóa tự động
                            sau thời gian lưu trữ đã cấu hình (mặc định: 7 ngày đối với hộp thư tạm thời).
                        </p>
                        <p>
                            Dữ liệu tài khoản được lưu trữ trong suốt thời gian tồn tại của tài khoản cộng với bất kỳ khoảng thời gian nào
                            do luật áp dụng yêu cầu sau khi xóa tài khoản.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>4. Chia sẻ dữ liệu</h2>
                        <p>Chúng tôi không bán dữ liệu cá nhân của bạn. Chúng tôi có thể chia sẻ dữ liệu với:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Các nhà cung cấp dịch vụ hỗ trợ vận hành dịch vụ của chúng tôi</li>
                            <li>Cơ quan thực thi pháp luật khi có yêu cầu pháp lý hợp lệ</li>
                            <li>Bên thứ ba khi có sự đồng ý rõ ràng của bạn</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>5. Bảo mật</h2>
                        <p>Chúng tôi thực hiện các biện pháp bảo mật bao gồm:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Mã hóa TLS cho dữ liệu đang truyền</li>
                            <li>Hàm băm mật khẩu sử dụng bcrypt</li>
                            <li>Hỗ trợ xác thực hai yếu tố (2FA)</li>
                            <li>Kiểm tra bảo mật định kỳ</li>
                            <li>Giới hạn tốc độ và ngăn chặn lạm dụng</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2>6. Quyền của bạn (GDPR/CCPA)</h2>
                        <p>Tùy thuộc vào vị trí của bạn, bạn có thể có các quyền sau:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li><strong>Truy cập:</strong> Yêu cầu bản sao dữ liệu cá nhân của bạn</li>
                            <li><strong>Chỉnh sửa:</strong> Sửa dữ liệu không chính xác</li>
                            <li><strong>Xóa:</strong> Yêu cầu xóa dữ liệu của bạn</li>
                            <li><strong>Chuyển nộp:</strong> Nhận dữ liệu của bạn ở định dạng di động</li>
                            <li><strong>Từ chối:</strong> Từ chối một số hoạt động xử lý dữ liệu nhất định</li>
                        </ul>
                        <p className="mt-4">
                            Để thực hiện các quyền này, hãy liên hệ với chúng tôi tại <a href="mailto:privacy@manhquy.click" className="text-[var(--nebula-primary)] hover:underline">privacy@manhquy.click</a>.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>7. Cookies</h2>
                        <p>
                            Chúng tôi sử dụng cookie thiết yếu cho việc xác thực và quản lý phiên.
                            Chúng tôi không sử dụng cookie theo dõi cho mục đích quảng cáo.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>8. Chuyển dữ liệu quốc tế</h2>
                        <p>
                            Dữ liệu của bạn có thể được xử lý tại các máy chủ đặt bên ngoài quốc gia của bạn.
                            Chúng tôi đảm bảo các biện pháp bảo vệ thích hợp được áp dụng cho các hoạt động chuyển dữ liệu đó.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>9. Quyền riêng tư của trẻ em</h2>
                        <p>
                            Dịch vụ của chúng tôi không dành cho trẻ em dưới 13 tuổi. Chúng tôi không cố ý
                            thu thập thông tin cá nhân từ trẻ em.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2>10. Liên hệ với chúng tôi</h2>
                        <p>
                            Đối với các thắc mắc liên quan đến quyền riêng tư, hãy liên hệ với đội ngũ Bảo vệ Dữ liệu của chúng tôi tại
                            <a href="mailto:privacy@manhquy.click" className="ml-1 text-[var(--nebula-primary)] hover:underline">privacy@manhquy.click</a>.
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-[var(--nebula-border)] flex flex-wrap justify-center gap-6">
                    <Link to="/terms" className="text-[var(--nebula-text-muted)] hover:text-[var(--nebula-primary)] transition-colors">Điều khoản dịch vụ</Link>
                    <Link to="/acceptable-use" className="text-[var(--nebula-text-muted)] hover:text-[var(--nebula-primary)] transition-colors">Chính sách sử dụng</Link>
                </div>
            </div>
        </div>
    );
}
