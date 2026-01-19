/**
 * Payment History Table component
 * Displays billing history with invoice download
 */
import { GlassCard } from "../../ui/GlassCard";
import type { Payment } from "../../../types";

interface PaymentHistoryTableProps {
    payments: Payment[];
    loading: boolean;
    onDownloadInvoice: (payment: Payment) => void;
}

export function PaymentHistoryTable({ payments, loading, onDownloadInvoice }: PaymentHistoryTableProps) {
    return (
        <div className="flex flex-col gap-4 mt-6">
            <h2 className="text-2xl font-bold text-nebula-text">Lịch sử thanh toán</h2>
            <GlassCard className="rounded-xl overflow-hidden overflow-x-auto p-0 bg-nebula-surface border border-nebula-border shadow-sm">
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-nebula-elevated text-nebula-text-muted uppercase text-xs font-semibold tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Mã hóa đơn</th>
                            <th className="px-6 py-4">Ngày</th>
                            <th className="px-6 py-4">Số tiền</th>
                            <th className="px-6 py-4">Trạng thái</th>
                            <th className="px-6 py-4 text-right">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-nebula-border text-nebula-text-secondary">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-nebula-text-muted italic">Đang tải lịch sử...</td>
                            </tr>
                        ) : payments.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-nebula-text-muted">Chưa có giao dịch thanh toán nào.</td>
                            </tr>
                        ) : (
                            payments.map(payment => (
                                <tr key={payment.id} className="hover:bg-nebula-elevated transition-colors group">
                                    <td className="px-6 py-4 font-medium text-nebula-text">#{payment.id.slice(0, 8).toUpperCase()}</td>
                                    <td className="px-6 py-4">{new Date(payment.createdAt).toLocaleDateString("vi-VN")}</td>
                                    <td className="px-6 py-4">{payment.amount.toLocaleString('vi-VN')} {payment.currency}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${payment.status === 'SUCCEEDED' || payment.status === 'COMPLETED' || payment.status === 'PAID'
                                            ? 'bg-success/10 text-success border-success/20'
                                            : 'bg-nebula-elevated text-nebula-text-muted border-nebula-border'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${payment.status === 'SUCCEEDED' || payment.status === 'COMPLETED' || payment.status === 'PAID' ? 'bg-success' : 'bg-nebula-text-muted'
                                                }`}></span>
                                            {payment.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            aria-label="Download invoice"
                                            onClick={() => onDownloadInvoice(payment)}
                                            className="text-nebula-text-muted hover:text-nebula-text transition-colors group-hover:scale-110"
                                        >
                                            <span className="material-symbols-outlined">download</span>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </GlassCard>
        </div>
    );
}
