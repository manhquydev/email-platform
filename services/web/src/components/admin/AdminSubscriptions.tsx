import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import {
    GlassCard, SectionHeader, PremiumTable, TableHeader, TableHeaderCell,
    TableBody, TableRow, TableCell, StatusBadge, PremiumButton, PremiumInput,
    EmptyState, LoadingSpinner, Pagination
} from "./AdminUIComponents";

interface User {
    id: string;
    email: string;
    tier: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
    subscriptionStatus: "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";
    stripeSubscriptionId?: string;
    createdAt: string;
}

const PAGE_SIZE = 20;

export function AdminSubscriptions({ token }: { token: string }) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
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
            // In a real app we might have a specific /admin/subscriptions endpoint,
            // but for now we reuse /admin/users which we updated to include tier info.
            const res = await api<{ data: User[]; meta: { total: number } }>(`/admin/users?${params}`, { token });
            setUsers(res.data);
            setTotal(res.meta.total);
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token, search, page]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleTierChange = async (userId: string, tier: string) => {
        setUpdating(userId);
        try {
            await api(`/admin/users/${userId}/tier`, {
                method: "PATCH",
                token,
                body: { tier }
            });
            toast.success("Đã cập định gói cước");
            await loadData();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setUpdating(null);
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <SectionHeader
                title="Gói cước & Thanh toán"
                subtitle="Quản lý cấp độ dịch vụ của người dùng"
                action={
                    <PremiumInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Tìm email khách hàng..."
                        className="w-64"
                    />
                }
            />

            {loading ? (
                <LoadingSpinner />
            ) : (
                <GlassCard padding="p-0" hover={false}>
                    <PremiumTable>
                        <TableHeader>
                            <tr>
                                <TableHeaderCell>Người dùng</TableHeaderCell>
                                <TableHeaderCell>Gói hiện tại</TableHeaderCell>
                                <TableHeaderCell>Trạng thái</TableHeaderCell>
                                <TableHeaderCell>Stripe ID</TableHeaderCell>
                                <TableHeaderCell>Ngày bắt đầu</TableHeaderCell>
                                <TableHeaderCell className="text-right">Thay đổi gói</TableHeaderCell>
                            </tr>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="font-medium text-slate-900 dark:text-white">{user.email}</div>
                                        <div className="text-xs text-slate-500">{user.id}</div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge
                                            status={user.tier}
                                            variant={user.tier === "FREE" ? "default" : "success"}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge
                                            status={user.subscriptionStatus}
                                            variant={user.subscriptionStatus === "ACTIVE" ? "success" : "danger"}
                                        />
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {user.stripeSubscriptionId || "—"}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <select
                                            value={user.tier}
                                            onChange={(e) => handleTierChange(user.id, e.target.value)}
                                            disabled={updating === user.id}
                                            className="text-xs py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800"
                                        >
                                            <option value="FREE">FREE</option>
                                            <option value="STARTER">STARTER</option>
                                            <option value="PROFESSIONAL">PROFESSIONAL</option>
                                            <option value="ENTERPRISE">ENTERPRISE</option>
                                        </select>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </PremiumTable>

                    {users.length === 0 && (
                        <EmptyState title="Không tìm thấy dữ liệu" description="Thử lại với email khác" />
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
