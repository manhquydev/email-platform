/**
 * Payment History Table component
 * Displays billing history with invoice download
 */
import { GlassCard } from "../../ui/GlassCard";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "../../ui/Table";
import type { Payment } from "../../../types";

interface PaymentHistoryTableProps {
    payments: Payment[];
    loading: boolean;
    onDownloadInvoice: (payment: Payment) => void;
}

export function PaymentHistoryTable({ payments, loading, onDownloadInvoice }: PaymentHistoryTableProps) {
    const isPaid = (status: Payment["status"]) =>
        status === "SUCCEEDED" || status === "COMPLETED" || status === "PAID";

    return (
        <div className="flex flex-col gap-4 mt-6">
            <h2 className="text-2xl font-bold text-semantic-text-main">Lịch sử thanh toán</h2>
            <GlassCard className="p-0 overflow-hidden">
                <Table className="border-none rounded-none">
                    <TableCaption>Lịch sử thanh toán và hóa đơn</TableCaption>
                    <TableHeader>
                        <tr>
                            <TableHead>Mã hóa đơn</TableHead>
                            <TableHead>Ngày</TableHead>
                            <TableHead>Số tiền</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead className="text-right">Hành động</TableHead>
                        </tr>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <tr>
                                <TableCell colSpan={5} className="text-center text-semantic-text-muted italic py-8">
                                    Đang tải lịch sử...
                                </TableCell>
                            </tr>
                        ) : payments.length === 0 ? (
                            <tr>
                                <TableCell colSpan={5} className="text-center text-semantic-text-muted py-8">
                                    Chưa có giao dịch thanh toán nào.
                                </TableCell>
                            </tr>
                        ) : (
                            payments.map(payment => (
                                <TableRow key={payment.id} className="group">
                                    <TableCell className="font-medium">#{payment.id.slice(0, 8).toUpperCase()}</TableCell>
                                    <TableCell>{new Date(payment.createdAt).toLocaleDateString("vi-VN")}</TableCell>
                                    <TableCell>{payment.amount.toLocaleString('vi-VN')} {payment.currency}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${isPaid(payment.status)
                                            ? 'bg-semantic-success-subtle text-semantic-success border-semantic-success/20'
                                            : 'bg-semantic-bg-secondary text-semantic-text-muted border-semantic-border'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${isPaid(payment.status) ? 'bg-semantic-success' : 'bg-semantic-text-muted'
                                                }`}></span>
                                            {payment.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <button
                                            aria-label="Download invoice"
                                            onClick={() => onDownloadInvoice(payment)}
                                            className="text-semantic-text-muted hover:text-semantic-text-main transition-colors group-hover:scale-110"
                                        >
                                            <span className="material-symbols-outlined">download</span>
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </GlassCard>
        </div>
    );
}
