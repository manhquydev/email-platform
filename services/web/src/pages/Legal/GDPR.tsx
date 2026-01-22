import { LegalPageLayout } from "../../components/LegalPageLayout";

export function GDPR() {
    const tocItems = [
        { id: "overview", label: "1. Tổng quan GDPR" },
        { id: "rights", label: "2. Quyền của bạn" },
        { id: "data-processing", label: "3. Xử lý dữ liệu" },
        { id: "contact", label: "4. Liên hệ DPO" },
    ];

    return (
        <LegalPageLayout
            title="Tuân thủ GDPR"
            description="Cam kết của chúng tôi về bảo vệ dữ liệu và quyền riêng tư theo Quy định Chung về Bảo vệ Dữ liệu (GDPR)."
            lastUpdated="Tháng 12, 2025"
            tocItems={tocItems}
        >
            <section id="overview" className="scroll-mt-32 mb-16 border-b border-white/5 pb-12 last:border-0">
                <h2>1. Tổng quan GDPR</h2>
                <p>
                    Ephemera cam kết tuân thủ đầy đủ Quy định Chung về Bảo vệ Dữ liệu (GDPR) của Liên minh Châu Âu.
                    Chúng tôi thiết kế hệ thống của mình với nguyên tắc "Privacy by Design" (Quyền riêng tư theo thiết kế),
                    đảm bảo rằng dữ liệu cá nhân của bạn được bảo vệ ở mức cao nhất.
                </p>
                <p>
                    Mặc dù dịch vụ của chúng tôi tập trung vào tính ẩn danh và tính tạm thời, chúng tôi vẫn áp dụng các biện pháp
                    nghiêm ngặt để xử lý bất kỳ dữ liệu nào có thể liên quan đến người dùng.
                </p>
            </section>

            <section id="rights" className="scroll-mt-32 mb-16 border-b border-white/5 pb-12 last:border-0">
                <h2>2. Quyền của bạn theo GDPR</h2>
                <p>Bạn có các quyền sau đối với dữ liệu của mình:</p>
                <ul>
                    <li><strong>Quyền truy cập:</strong> Bạn có quyền yêu cầu bản sao dữ liệu cá nhân mà chúng tôi lưu giữ về bạn.</li>
                    <li><strong>Quyền chỉnh sửa:</strong> Bạn có quyền yêu cầu chúng tôi sửa bất kỳ thông tin nào không chính xác.</li>
                    <li><strong>Quyền xóa bỏ ("Quyền được lãng quên"):</strong> Bạn có quyền yêu cầu xóa dữ liệu của mình bất cứ lúc nào (dữ liệu email đã tự động xóa sau thời gian hết hạn).</li>
                    <li><strong>Quyền hạn chế xử lý:</strong> Bạn có quyền yêu cầu chúng tôi hạn chế xử lý dữ liệu của bạn trong một số trường hợp nhất định.</li>
                    <li><strong>Quyền phản đối:</strong> Bạn có quyền phản đối việc xử lý dữ liệu của mình.</li>
                    <li><strong>Quyền khả chuyển dữ liệu:</strong> Bạn có quyền yêu cầu chúng tôi chuyển dữ liệu của bạn cho một tổ chức khác hoặc trực tiếp cho bạn.</li>
                </ul>
            </section>

            <section id="data-processing" className="scroll-mt-32 mb-16 border-b border-white/5 pb-12 last:border-0">
                <h2>3. Cơ sở pháp lý và Mục đích xử lý</h2>
                <p>
                    Chúng tôi chỉ xử lý dữ liệu của bạn khi cần thiết để cung cấp dịch vụ (ví dụ: chuyển tiếp email, xác thực tài khoản).
                    Cơ sở pháp lý cho việc xử lý này là:
                </p>
                <ul>
                    <li>Việc thực hiện hợp đồng giữa bạn và Ephemera (Điều khoản Dịch vụ).</li>
                    <li>Đồng ý của bạn (đối với cookie hoặc tiếp thị).</li>
                    <li>Lợi ích hợp pháp của chúng tôi trong việc bảo vệ dịch vụ khỏi lạm dụng.</li>
                </ul>
            </section>

            <section id="contact" className="scroll-mt-32 mb-16 border-b border-white/5 pb-12 last:border-0">
                <h2>4. Liên hệ Nhân viên Bảo vệ Dữ liệu (DPO)</h2>
                <p>
                    Nếu bạn có bất kỳ câu hỏi nào về việc tuân thủ GDPR của chúng tôi hoặc muốn thực hiện quyền của mình,
                    vui lòng liên hệ với Nhân viên Bảo vệ Dữ liệu của chúng tôi tại:
                </p>
                <p>
                    <strong>Email:</strong> privacy@manhquy.click<br />
                    <strong>Địa chỉ:</strong> [Địa chỉ công ty của bạn]
                </p>
            </section>
        </LegalPageLayout>
    );
}
