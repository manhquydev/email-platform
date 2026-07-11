/**
 * Payment Method Card component
 * Displays VietQR/bank transfer payment info (SePay integration)
 */
import { GlassCard } from "../../ui/GlassCard";
import type { PaymentMethod } from "./hooks";

interface PaymentMethodCardProps {
    paymentMethod: PaymentMethod | null;
    loading?: boolean;
}

function formatExpiry(paymentMethod: PaymentMethod) {
    if (!paymentMethod.expMonth || !paymentMethod.expYear) {
        return "Chưa cập nhật";
    }

    const month = String(paymentMethod.expMonth).padStart(2, "0");
    const year = String(paymentMethod.expYear).slice(-2);
    return `${month}/${year}`;
}

function getBrandLabel(brand?: string) {
    if (!brand) return "Thẻ";
    return brand.charAt(0).toUpperCase() + brand.slice(1);
}

export function PaymentMethodCard({ paymentMethod, loading = false }: PaymentMethodCardProps) {
    const hasPaymentMethod = !!paymentMethod;
    const brandLabel = hasPaymentMethod ? getBrandLabel(paymentMethod.brand) : "VietQR";

    return (
        <GlassCard className="p-6 flex flex-col gap-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
            <div className="flex items-center justify-between relative z-10">
                <h3 className="text-lg font-bold text-semantic-text-main">Phương thức thanh toán</h3>
            </div>
            {loading ? (
                <div className="flex flex-col gap-4 relative z-10 flex-1 justify-center">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-semantic-bg-secondary border border-semantic-border animate-pulse">
                        <div className="w-12 h-12 bg-semantic-bg-hover rounded-lg" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-32 rounded bg-semantic-bg-hover" />
                            <div className="h-3 w-44 rounded bg-semantic-bg-hover" />
                        </div>
                    </div>
                    <p className="text-xs text-semantic-text-muted">Đang tải phương thức thanh toán...</p>
                </div>
            ) : hasPaymentMethod ? (
                <div className="flex flex-col gap-4 relative z-10 flex-1 justify-center">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-semantic-bg-secondary border border-semantic-border">
                        <div className="w-12 h-12 bg-semantic-accent-subtle rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-semantic-accent text-2xl">credit_card</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-semantic-text-main truncate">
                                {brandLabel} •••• {paymentMethod.last4}
                            </span>
                            <span className="text-xs text-semantic-text-muted">
                                Hết hạn {formatExpiry(paymentMethod)}
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-semantic-text-muted">
                        <div className="p-3 rounded-lg bg-semantic-bg-secondary border border-semantic-border">
                            <div className="uppercase tracking-wide text-[11px] mb-1">Thẻ</div>
                            <div className="font-medium text-semantic-text-main">{brandLabel}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-semantic-bg-secondary border border-semantic-border">
                            <div className="uppercase tracking-wide text-[11px] mb-1">Email thanh toán</div>
                            <div className="font-medium text-semantic-text-main truncate">
                                {paymentMethod.billingEmail || "Chưa có"}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4 relative z-10 flex-1 justify-center">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-semantic-bg-secondary border border-semantic-border">
                        <div className="w-12 h-12 bg-semantic-accent-subtle rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-semantic-accent text-2xl">qr_code_2</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-semantic-text-main">Thanh toán qua VietQR</span>
                            <span className="text-xs text-semantic-text-muted">Chưa có phương thức thanh toán đã lưu</span>
                        </div>
                    </div>
                    <p className="text-xs text-semantic-text-muted">
                        <span className="material-symbols-outlined text-[14px] align-middle mr-1">info</span>
                        Quét mã QR khi mua gói để thanh toán nhanh hơn
                    </p>
                </div>
            )}
        </GlassCard>
    );
}
