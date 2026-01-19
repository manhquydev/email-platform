/**
 * Payment Method Card component
 * Displays saved payment method with card brand logos
 */
import { GlassCard } from "../../ui/GlassCard";
import type { PaymentMethod } from "./hooks";

interface PaymentMethodCardProps {
    paymentMethod: PaymentMethod | null;
    loading: boolean;
    onManage: () => void;
}

function CardBrandLogo({ brand }: { brand: string }) {
    const brandLower = brand.toLowerCase();
    if (brandLower === 'visa') {
        return (
            <div className="w-12 h-8 bg-nebula-surface rounded flex items-center justify-center border border-nebula-border">
                <span className="text-blue-600 font-bold text-sm">VISA</span>
            </div>
        );
    }
    if (brandLower === 'mastercard') {
        return (
            <div aria-label="Mastercard logo" className="w-12 h-8 bg-nebula-surface rounded flex items-center justify-center border border-nebula-border">
                <div className="flex -space-x-2">
                    <div className="w-4 h-4 rounded-full bg-danger/80"></div>
                    <div className="w-4 h-4 rounded-full bg-warning/80"></div>
                </div>
            </div>
        );
    }
    if (brandLower === 'amex') {
        return (
            <div className="w-12 h-8 bg-blue-500 rounded flex items-center justify-center border border-nebula-border">
                <span className="text-white font-bold text-[10px]">AMEX</span>
            </div>
        );
    }
    return (
        <div className="w-12 h-8 bg-nebula-surface rounded flex items-center justify-center border border-nebula-border">
            <span className="material-symbols-outlined text-nebula-text-muted text-lg">credit_card</span>
        </div>
    );
}

export function PaymentMethodCard({ paymentMethod, loading, onManage }: PaymentMethodCardProps) {
    return (
        <GlassCard className="p-6 rounded-xl flex flex-col gap-6 relative overflow-hidden bg-nebula-surface border border-nebula-border shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
            <div className="flex items-center justify-between relative z-10">
                <h3 className="text-lg font-bold text-nebula-text">Phương thức thanh toán</h3>
                <button onClick={onManage} className="text-nebula-violet hover:text-nebula-violet-dark text-sm font-medium transition-colors">Quản lý</button>
            </div>
            <div className="flex flex-col gap-4 relative z-10 flex-1 justify-center">
                {loading ? (
                    <div className="flex items-center justify-center py-4">
                        <span className="text-nebula-text-muted text-sm">Đang tải...</span>
                    </div>
                ) : paymentMethod ? (
                    <>
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-nebula-elevated border border-nebula-border">
                            <CardBrandLogo brand={paymentMethod.brand} />
                            <div className="flex flex-col">
                                <span className="text-sm font-bold tracking-widest text-nebula-text">•••• {paymentMethod.last4}</span>
                                <span className="text-xs text-nebula-text-muted">
                                    Hết hạn {paymentMethod.expMonth?.toString().padStart(2, '0')}/{paymentMethod.expYear?.toString().slice(-2)}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 text-sm text-nebula-text-muted mt-2">
                            <div className="flex justify-between">
                                <span>Email thanh toán</span>
                                <span className="text-nebula-text">{paymentMethod.billingEmail || '--'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Trạng thái</span>
                                <span className="text-success">Đang hoạt động</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <span className="material-symbols-outlined text-4xl text-nebula-text-muted mb-2">credit_card_off</span>
                        <p className="text-sm text-nebula-text-muted">Chưa có phương thức thanh toán</p>
                        <button
                            onClick={onManage}
                            className="mt-3 text-sm text-nebula-violet hover:text-nebula-violet-dark font-medium"
                        >
                            Thêm thẻ mới
                        </button>
                    </div>
                )}
            </div>
        </GlassCard>
    );
}
