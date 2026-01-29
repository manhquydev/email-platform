/**
 * Payment Method Card component
 * Displays VietQR/bank transfer payment info (SePay integration)
 */
import { GlassCard } from "../../ui/GlassCard";

export function PaymentMethodCard() {
    return (
        <GlassCard className="p-6 rounded-xl flex flex-col gap-6 relative overflow-hidden bg-nebula-surface border border-nebula-border shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
            <div className="flex items-center justify-between relative z-10">
                <h3 className="text-lg font-bold text-nebula-text">Phương thức thanh toán</h3>
            </div>
            <div className="flex flex-col gap-4 relative z-10 flex-1 justify-center">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-nebula-elevated border border-nebula-border">
                    <div className="w-12 h-12 bg-nebula-violet/10 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-nebula-violet text-2xl">qr_code_2</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-nebula-text">Thanh toán qua VietQR</span>
                        <span className="text-xs text-nebula-text-muted">Chuyển khoản ngân hàng tự động</span>
                    </div>
                </div>
                <p className="text-xs text-nebula-text-muted">
                    <span className="material-symbols-outlined text-[14px] align-middle mr-1">info</span>
                    Quét mã QR khi mua gói để thanh toán
                </p>
            </div>
        </GlassCard>
    );
}
