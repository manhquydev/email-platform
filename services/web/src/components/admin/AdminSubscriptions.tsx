import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import {
    GlassCard, SectionHeader, PremiumTable, TableHeader, TableHeaderCell,
    TableBody, TableRow, TableCell, StatusBadge, PremiumInput,
    EmptyState, LoadingSpinner, Pagination, PremiumButton
} from "./AdminUIComponents";
import { PackagesManager } from "./subscription/PackagesManager";
import { CodesManager } from "./subscription/CodesManager";

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
    const [activeTab, setActiveTab] = useState<"users" | "packages" | "codes">("users");

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <SectionHeader
                title="Gói cước & Thanh toán"
                subtitle="Quản lý cấp độ dịch vụ, gói cước và mã quy đổi"
            />

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-1">
                <TabButton active={activeTab === "users"} onClick={() => setActiveTab("users")} label="Người dùng" />
                <TabButton active={activeTab === "packages"} onClick={() => setActiveTab("packages")} label="Gói dịch vụ" />
                <TabButton active={activeTab === "codes"} onClick={() => setActiveTab("codes")} label="Mã quy đổi" />
            </div>

            {activeTab === "users" && <UsersManager token={token} />}
            {activeTab === "packages" && <PackagesManager token={token} />}
            {activeTab === "codes" && <CodesManager token={token} />}
        </div>
    );
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${active
                ? "bg-white dark:bg-slate-800 text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
        >
            {label}
        </button>
    );
}

function UsersManager({ token }: { token: string }) {
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

    const handleCancel = async (userId: string) => {
        if (!window.confirm("Bạn có chắc chắn muốn hủy gói cước của người dùng này?")) return;
        setUpdating(userId);
        try {
            await api(`/admin/users/${userId}/subscription/cancel`, {
                method: "POST",
                token
            });
            toast.success("Đã hủy gói cước");
            await loadData();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setUpdating(null);
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Danh sách người dùng</h3>
                <PremiumInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Tìm email khách hàng..."
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
                                <TableHeaderCell>Người dùng</TableHeaderCell>
                                <TableHeaderCell>Gói hiện tại</TableHeaderCell>
                                <TableHeaderCell>Trạng thái</TableHeaderCell>
                                <TableHeaderCell>Stripe ID</TableHeaderCell>
                                <TableHeaderCell>Ngày bắt đầu</TableHeaderCell>
                                <TableHeaderCell className="text-right">Thay đổi gói</TableHeaderCell>
                                <TableHeaderCell className="text-right">Thao tác</TableHeaderCell>
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
                                            className="text-xs py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer hover:border-blue-500 transition-colors"
                                        >
                                            <option value="FREE">FREE</option>
                                            <option value="STARTER">STARTER</option>
                                            <option value="PROFESSIONAL">PROFESSIONAL</option>
                                            <option value="ENTERPRISE">ENTERPRISE</option>
                                        </select>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {user.stripeSubscriptionId && user.subscriptionStatus === "ACTIVE" && (
                                            <PremiumButton
                                                variant="danger"
                                                size="sm"
                                                onClick={() => handleCancel(user.id)}
                                                disabled={updating === user.id}
                                                className="!px-2 !py-1 text-xs"
                                                title="Hủy đăng ký ngay lập tức"
                                            >
                                                Hủy
                                            </PremiumButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </PremiumTable>

                    {users.length === 0 && (
                        <EmptyState title="Không tìm thấy dữ liệu" description="Thử lại với từ khóa khác" />
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
