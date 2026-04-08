import { LegalPageLayout } from "../../components/LegalPageLayout";

export function GDPR() {
    const tocItems = [
        { id: "vn-framework", label: "1. Khung pháp lý Việt Nam" },
        { id: "eu-framework", label: "2. Khung GDPR cho người dùng EU" },
        { id: "cross-border", label: "3. Chuyển dữ liệu xuyên biên giới" },
        { id: "contact", label: "4. Đầu mối liên hệ dữ liệu" },
    ];

    return (
        <LegalPageLayout
            title="Bảo vệ dữ liệu (VN/EU)"
            description="Tổng quan nghĩa vụ bảo vệ dữ liệu của Ephemera theo pháp luật Việt Nam hiện hành và cơ chế hỗ trợ yêu cầu dữ liệu của người dùng quốc tế."
            lastUpdated="08/04/2026"
            tocItems={tocItems}
        >
            <section id="vn-framework" className="scroll-mt-32 mb-16 border-b border-white/5 pb-12 last:border-0">
                <h2>1. Khung pháp lý Việt Nam</h2>
                <p>
                    Ephemera vận hành chính sách dữ liệu theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 (hiệu lực từ 01/01/2026),
                    Nghị định số 356/2025/NĐ-CP, Luật Dữ liệu số 60/2024/QH15 và các quy định liên quan. Đối với nghĩa vụ triển khai kỹ thuật,
                    chúng tôi tiếp tục áp dụng các biện pháp bảo vệ dữ liệu theo Nghị định số 13/2023/NĐ-CP trong phạm vi còn phù hợp.
                </p>
                <p>
                    Chúng tôi áp dụng nguyên tắc giảm thiểu dữ liệu, giới hạn mục đích xử lý, kiểm soát truy cập và lưu trữ có thời hạn.
                </p>
            </section>

            <section id="eu-framework" className="scroll-mt-32 mb-16 border-b border-white/5 pb-12 last:border-0">
                <h2>2. Khung GDPR cho người dùng EU</h2>
                <p>
                    Với người dùng thuộc phạm vi GDPR, Ephemera hỗ trợ thực thi các quyền cơ bản như yêu cầu truy cập, chỉnh sửa, xóa,
                    giới hạn xử lý và phản đối xử lý theo điều kiện pháp lý áp dụng.
                </p>
                <p>
                    Các yêu cầu được xử lý thông qua đầu mối dữ liệu của chúng tôi và có thể cần xác minh danh tính để bảo vệ an toàn thông tin.
                </p>
            </section>

            <section id="cross-border" className="scroll-mt-32 mb-16 border-b border-white/5 pb-12 last:border-0">
                <h2>3. Chuyển dữ liệu xuyên biên giới</h2>
                <p>
                    Trong trường hợp sử dụng hạ tầng hoặc dịch vụ xử lý dữ liệu đặt ngoài Việt Nam, Ephemera thực hiện biện pháp bảo vệ phù hợp
                    và thủ tục đánh giá/ghi nhận theo yêu cầu của pháp luật hiện hành.
                </p>
                <ul>
                    <li>Ràng buộc trách nhiệm bảo vệ dữ liệu với bên nhận xử lý.</li>
                    <li>Giới hạn phạm vi dữ liệu chuyển theo mục đích nghiệp vụ.</li>
                    <li>Áp dụng biện pháp kỹ thuật và tổ chức để giảm rủi ro lộ, mất dữ liệu.</li>
                </ul>
            </section>

            <section id="contact" className="scroll-mt-32 mb-16 border-b border-white/5 pb-12 last:border-0">
                <h2>4. Đầu mối liên hệ dữ liệu</h2>
                <p>
                    Mọi yêu cầu liên quan đến dữ liệu cá nhân (VN/EU) vui lòng gửi về:
                </p>
                <p>
                    <strong>Email:</strong> privacy@manhquy.click
                </p>
                <p>
                    Trường hợp cần khiếu nại, người dùng có thể thực hiện theo cơ chế tại chính sách bảo mật và quy định pháp luật áp dụng.
                </p>
            </section>
        </LegalPageLayout>
    );
}
