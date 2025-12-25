import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import {
    GlassCard, SectionHeader, PremiumTable, TableHeader, TableHeaderCell,
    TableBody, TableRow, TableCell, StatusBadge, PremiumInput,
    EmptyState, LoadingSpinner, Pagination, PremiumButton
} from "./AdminUIComponents";

interface Payment {
    id: string;
    userId: string;
    amount: string; // Decimal comes as string often, or number
    currency: string;
    status: string;
    stripePaymentId: string;
    packageId?: string;
    createdAt: string;
    user: {
        email: string;
    }
}

const PAGE_SIZE = 20;

export function AdminOrders({ token }: { token: string }) {
    const [orders, setOrders] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            params.set("limit", String(PAGE_SIZE));
            params.set("offset", String(page * PAGE_SIZE));

            // Note: Ensure /admin/orders is implemented in backend
            const res = await api<{ data: Payment[]; meta: { total: number } }>(`/admin/orders?${params}`, { token });
            setOrders(res.data);
            setTotal(res.meta.total);
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token, search, page]);

    useEffect(() => { loadData(); }, [loadData]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const formatCurrency = (amount: string | number, currency: string) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: currency.toUpperCase() }).format(Number(amount));
    };

    const handleRefund = async (paymentId: string) => {
        if (!window.confirm("Bạn có chắc chắn muốn hoàn tiền giao dịch này không? Hành động này không thể hoàn tác.")) return;

        const toastId = toast.loading("Đang xử lý hoàn tiền...");
        try {
            await api(`/admin/payments/${paymentId}/refund`, {
                method: "POST",
                token
            });
            toast.success("Hoàn tiền thành công", { id: toastId });
            loadData();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message), { id: toastId });
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <SectionHeader
                title="Lịch sử giao dịch"
                subtitle="Theo dõi các đơn hàng và thanh toán từ người dùng"
            />

            <div className="flex justify-between items-center mb-4">
                <PremiumInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Tìm email người mua..."
                    className="w-64"
                />
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <GlassCard padding="p-0" hover={false}>
                    <PremiumTable>
                        <TableHeader>
                            <tr>
                                <TableHeaderCell>Mã giao dịch</TableHeaderCell>
                                <TableHeaderCell>Người dùng</TableHeaderCell>
                                <TableHeaderCell>Số tiền</TableHeaderCell>
                                <TableHeaderCell>Trạng thái</TableHeaderCell>
                                <TableHeaderCell>Thời gian</TableHeaderCell>
                                <TableHeaderCell>Thao tác</TableHeaderCell>
                            </tr>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell>
                                        <div className="font-mono text-xs text-slate-500 truncate w-32" title={order.stripePaymentId}>
                                            {order.stripePaymentId || "—"}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium text-slate-900 dark:text-white">{order.user?.email || "Unknown"}</div>
                                        <div className="text-xs text-slate-500">{order.userId}</div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(Number(order.amount) / 100 || 0, order.currency)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge
                                            status={order.status}
                                            variant={order.status === "SUCCEEDED" ? "success" : order.status === "PENDING" ? "warning" : "danger"}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {new Date(order.createdAt).toLocaleString("vi-VN")}
                                    </TableCell>
                                    <TableCell>
                                        {order.status === "SUCCEEDED" && (
                                            <PremiumButton
                                                variant="danger"
                                                size="sm"
                                                onClick={() => handleRefund(order.id)}
                                                title="Hoàn tiền giao dịch này"
                                                className="!px-2 !py-1 text-xs"
                                            >
                                                Hoàn tiền
                                            </PremiumButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </PremiumTable>

                    {orders.length === 0 && (
                        <EmptyState title="Chưa có giao dịch nào" description="Danh sách đơn hàng sẽ xuất hiện tại đây" />
                    )}
                </GlassCard>
            )}

            {totalPages > 1 && (
                <Pagination
                    currentPage={page + 1}
                    totalPages={totalPages}
                    onPageChange={(p) => setPage(p - 1)}
                />
            )}
        </div>
    );
}
