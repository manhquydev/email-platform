/**
 * Types and constants for OnboardingHints
 */

export interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    targetSelector?: string;
    position?: "top" | "bottom" | "left" | "right";
}

export interface OnboardingHintsProps {
    steps?: OnboardingStep[];
    storageKey?: string;
    onComplete?: () => void;
}

export interface TooltipHintProps {
    children: React.ReactNode;
    text: string;
    show?: boolean;
    position?: "top" | "bottom" | "left" | "right";
}

/** Default onboarding steps for new users */
export const DEFAULT_STEPS: OnboardingStep[] = [
    {
        id: "welcome",
        title: "Chào mừng đến Ephemera! 🛡️",
        description: "Nền tảng email tạm thời với chính sách Zero-Log. Không lưu IP gốc, không tracking pixels, không quảng cáo - chỉ có bảo mật.",
    },
    {
        id: "privacy",
        title: "Zero-Log: Cam kết bảo mật",
        description: "• IP của bạn được ẩn danh hóa ngay khi nhận\n• Tracking pixels bị loại bỏ tự động\n• Headers nhạy cảm được lọc\n• Mã nguồn mở để kiểm chứng",
    },
    {
        id: "domains",
        title: "Chọn Tên miền",
        description: "Sử dụng domain công khai hoặc thêm domain riêng của bạn để nhận email ẩn danh chuyên nghiệp.",
        targetSelector: "[data-onboarding='domains']",
        position: "bottom",
    },
    {
        id: "inbox",
        title: "Tạo Email Tạm thời",
        description: "Tạo địa chỉ email ngẫu nhiên hoặc tùy chọn. Email tự động hết hạn theo cấu hình - bạn kiểm soát hoàn toàn.",
        targetSelector: "[data-onboarding='inbox']",
        position: "right",
    },
    {
        id: "api",
        title: "Developer-Friendly API",
        description: "REST API với webhooks realtime. Tích hợp CI/CD, tự động hóa kiểm thử, xây dựng ứng dụng của riêng bạn.",
    },
    {
        id: "shortcuts",
        title: "Phím tắt & Tìm kiếm",
        description: "Nhấn / để tìm kiếm, ? để xem phím tắt, j/k để di chuyển giữa email. Giao diện được tối ưu cho hiệu suất.",
    },
];

/** Position classes for tooltip positioning */
export const POSITION_CLASSES: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
};
