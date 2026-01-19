/**
 * Landing page static data - features and FAQs
 */

export interface Feature {
    icon: string;
    title: string;
    description: string;
}

export interface FAQ {
    question: string;
    answer: string;
}

export const features: Feature[] = [
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
    }
];

export const faqs: FAQ[] = [
    {
        question: "Email tồn tại trong bao lâu?",
        answer: "Trên gói miễn phí, email được lưu trong 24 giờ. Các gói trả phí kéo dài thời gian này lên đến 7 ngày hoặc vĩnh viễn nếu lưu thủ công. Sau khi xóa, chúng bị xóa vĩnh viễn khỏi máy chủ của chúng tôi."
    },
    {
        question: "Tôi có thể dùng domain riêng không?",
        answer: "Có, gói Ghost và Spectre cho phép bạn mang theo domain tùy chỉnh. Bạn sẽ cần thêm một vài bản ghi DNS (MX, TXT) để xác minh quyền sở hữu và định tuyến email đến chúng tôi."
    },
    {
        question: "API có giới hạn tốc độ không?",
        answer: "Có, để ngăn chặn lạm dụng. Gói Spectre cung cấp giới hạn tốc độ cao hơn đáng kể, phù hợp cho các môi trường kiểm thử doanh nghiệp quy mô lớn."
    }
];
