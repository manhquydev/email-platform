import { Link } from "react-router-dom";

const features = [
    {
        icon: "globe",
        title: "Domain Tùy Chỉnh",
        description: "Sử dụng domain riêng của bạn để ẩn danh chuyên nghiệp. Cấu hình DNS linh hoạt."
    },
    {
        icon: "terminal",
        title: "Truy cập API REST",
        description: "Truy cập lập trình cho kiểm thử tự động, CI/CD pipelines, và tích hợp ứng dụng."
    },
    {
        icon: "shield",
        title: "Chính Sách Không Log",
        description: "Chúng tôi không lưu trữ gì vĩnh viễn. Tin nhắn chỉ tồn tại trên RAM và bị xóa khi hết hạn."
    },
    {
        icon: "lock",
        title: "Mã Hóa TLS",
        description: "Mã hóa đầu cuối cho mọi giao tiếp. Dữ liệu của bạn là của riêng bạn."
    },
    {
        icon: "speed",
        title: "Hiệu Năng Cao",
        description: "Kiến trúc serverless giúp xử lý hàng triệu email mỗi ngày với độ trễ thấp nhất."
    },
    {
        icon: "integration_instructions",
        title: "Webhooks",
        description: "Nhận thông báo thời gian thực về email đến qua Webhooks."
    },
    {
        icon: "group",
        title: "Quản Lý Team",
        description: "Mời thành viên, phân quyền và quản lý tài nguyên tập trung."
    },
    {
        icon: "history",
        title: "Lịch Sử Minh Bạch",
        description: "Xem logs đầy đủ về mọi hoạt động của inbox (nếu bạn chọn bật)."
    }
];

export function Features() {
    return (
        <div className="pt-24 min-h-screen bg-[var(--nebula-void)] flex flex-col items-center relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[var(--nebula-violet)]/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 py-12 z-10 w-full">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 mb-6">
                        Tính Năng Mạnh Mẽ
                    </h1>
                    <p className="text-xl text-[var(--nebula-text-secondary)] max-w-2xl mx-auto font-light">
                        Mọi công cụ bạn cần để kiểm soát danh tính số và quy trình kiểm thử email.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, i) => (
                        <div key={i} className="group bg-[var(--nebula-surface)]/50 backdrop-blur-md border border-[var(--nebula-border)] p-8 rounded-2xl hover:bg-[var(--nebula-surface-elevated)] transition-all duration-300 hover:shadow-lg hover:shadow-[var(--nebula-violet)]/10">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${i % 4 === 0 ? 'bg-blue-500/20 text-blue-400' :
                                    i % 4 === 1 ? 'bg-purple-500/20 text-purple-400' :
                                        i % 4 === 2 ? 'bg-green-500/20 text-green-400' :
                                            'bg-pink-500/20 text-pink-400'
                                }`}>
                                <span className="material-symbols-outlined text-3xl">{feature.icon}</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                            <p className="text-[var(--nebula-text-secondary)] leading-relaxed text-sm">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-20 text-center">
                    <div className="inline-flex flex-col items-center bg-[var(--nebula-surface)] border border-[var(--nebula-border)] p-8 rounded-2xl max-w-2xl mx-auto">
                        <h3 className="text-2xl font-bold text-white mb-4">Sẵn sàng trải nghiệm?</h3>
                        <p className="text-[var(--nebula-text-secondary)] mb-6">
                            Bắt đầu với gói miễn phí và nâng cấp khi bạn cần thêm sức mạnh.
                        </p>
                        <Link to="/register" className="px-8 py-3 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-[var(--nebula-violet)]/30">
                            Tạo tài khoản miễn phí
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
