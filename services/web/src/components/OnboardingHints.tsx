import { useState, useEffect } from "react";

interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    targetSelector?: string;
    position?: "top" | "bottom" | "left" | "right";
}

interface OnboardingHintsProps {
    steps: OnboardingStep[];
    storageKey?: string;
    onComplete?: () => void;
}

const defaultSteps: OnboardingStep[] = [
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

export function OnboardingHints({
    steps = defaultSteps,
    storageKey = "email-onboarding-complete",
    onComplete,
}: OnboardingHintsProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        const completed = localStorage.getItem(storageKey);
        if (!completed) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsVisible(true);
        }
    }, [storageKey]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = () => {
        localStorage.setItem(storageKey, "true");
        setIsVisible(false);
        onComplete?.();
    };

    const handleDismiss = () => {
        setIsDismissed(true);
        setIsVisible(false);
    };

    const handleRestart = () => {
        setCurrentStep(0);
        setIsDismissed(false);
        setIsVisible(true);
    };

    if (!isVisible) {
        if (isDismissed) {
            return (
                <button
                    onClick={handleRestart}
                    className="fixed bottom-4 right-4 z-50 p-3 bg-primary text-white rounded-full shadow-lg hover:bg-primary-hover transition-all hover-lift animate-fade-in"
                    title="Xem hướng dẫn"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            );
        }
        return null;
    }

    const step = steps[currentStep];

    return (
        <div className="fixed inset-0 z-50 pointer-events-none">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 pointer-events-auto animate-fade-in" onClick={handleDismiss} />

            {/* Modal */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-surface rounded-xl shadow-2xl p-6 max-w-md mx-4 pointer-events-auto animate-scale-in">
                    {/* Progress */}
                    <div className="flex gap-1 mb-4">
                        {steps.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1 flex-1 rounded-full transition-colors ${idx <= currentStep ? 'bg-primary' : 'bg-border'}`}
                            />
                        ))}
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-bold text-text-main mb-2">{step.title}</h3>
                    <p className="text-sm text-muted mb-6">{step.description}</p>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleDismiss}
                            className="text-sm text-muted hover:text-text-main transition-colors"
                        >
                            Bỏ qua
                        </button>

                        <div className="flex gap-2">
                            {currentStep > 0 && (
                                <button
                                    onClick={handlePrev}
                                    className="btn btn-secondary text-sm"
                                >
                                    Trước
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                className="btn btn-primary text-sm"
                            >
                                {currentStep === steps.length - 1 ? "Hoàn thành" : "Tiếp"}
                            </button>
                        </div>
                    </div>

                    {/* Step indicator */}
                    <div className="text-center mt-4 text-xs text-muted">
                        {currentStep + 1} / {steps.length}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Tooltip hint for individual elements
interface TooltipHintProps {
    children: React.ReactNode;
    text: string;
    show?: boolean;
    position?: "top" | "bottom" | "left" | "right";
}

export function TooltipHint({ children, text, show = true, position = "top" }: TooltipHintProps) {
    const [dismissed, setDismissed] = useState(false);

    const positionClasses = {
        top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
        bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
        left: "right-full top-1/2 -translate-y-1/2 mr-2",
        right: "left-full top-1/2 -translate-y-1/2 ml-2",
    };

    if (!show || dismissed) return <>{children}</>;

    return (
        <div className="relative group">
            {children}
            <div className={`absolute ${positionClasses[position]} z-40 animate-fade-in-up`}>
                <div className="bg-text-main text-surface text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap flex items-center gap-2">
                    <span>{text}</span>
                    <button
                        onClick={() => setDismissed(true)}
                        className="text-surface/70 hover:text-surface"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
