import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import {
    GlassCard, SectionHeader, PremiumTable, TableHeader, TableHeaderCell,
    TableBody, TableRow, TableCell, StatusBadge, PremiumButton, PremiumInput,
    EmptyState, LoadingSpinner, Pagination, BulkActionsBar, ConfirmModal
} from "../../components/admin/AdminUIComponents";

interface User {
    id: string;
    email: string;
    role: "ADMIN" | "USER";
    emailVerified: string | null;
    isDisabled?: boolean;
    createdAt: string;
    tier: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
    subscriptionStatus: "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";
    subscriptionEndsAt?: string | null;
    stripeSubscriptionId?: string;
    _count: { domains: number };
}

const PAGE_SIZE = 20;

export function UsersPage() {
    const { token } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [updating, setUpdating] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
    const [confirmCancelSub, setConfirmCancelSub] = useState<User | null>(null);
    const [confirmBulk, setConfirmBulk] = useState<"enable" | "disable" | "delete" | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            params.set("limit", String(PAGE_SIZE));
            params.set("offset", String(page * PAGE_SIZE));

            const res = await api<{ data: User[]; meta: { total: number } }>(`/admin/users?${params}`, { token });
            setUsers(res.data);
            setTotal(res.meta.total);
            setSelectedIds(new Set());
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token, search, page]);

    useEffect(() => { loadUsers(); }, [loadUsers]);
    useEffect(() => { setPage(0); }, [search]);

    const handleRoleChange = async (userId: string, newRole: "ADMIN" | "USER") => {
        setUpdating(userId);
        try {
            const res = await api<{ user: User }>(`/admin/users/${userId}`, { method: "PATCH", token, body: { role: newRole } });
            toast.success("Đã cập nhật quyền");
            setUsers(users.map(u => u.id === userId ? { ...u, ...res.user } : u));
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setUpdating(null);
        }
    };

    const handleTierChange = async (userId: string, tier: string) => {
        setUpdating(userId);
        try {
            const res = await api<{ user: User }>(`/admin/users/${userId}/tier`, {
                method: "PATCH",
                token,
                body: { tier }
            });
            toast.success("Đã cập nhật gói cước và gia hạn");
            setUsers(users.map(u => u.id === userId ? { ...u, ...res.user } : u));
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setUpdating(null);
        }
    };

    const handleCancelSubscription = async (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (user) setConfirmCancelSub(user);
    };

    const confirmCancelSubscription = async (userId: string) => {
        setUpdating(userId);
        try {
            await api(`/admin/users/${userId}/subscription/cancel`, { method: "POST", token });
            toast.success("Đã hủy gói cước");
            setConfirmCancelSub(null);
            await loadUsers();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setUpdating(null);
        }
    };

    const handleToggleDisable = async (user: User) => {
        setUpdating(user.id);
        try {
            const res = await api<{ user: User }>(`/admin/users/${user.id}`, { method: "PATCH", token, body: { isDisabled: !user.isDisabled } });
            toast.success(user.isDisabled ? "Đã kích hoạt tài khoản" : "Đã vô hiệu hóa tài khoản");
            setUsers(users.map(u => u.id === user.id ? { ...u, ...res.user } : u));
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setUpdating(null);
        }
    };

    const handleDelete = async (user: User) => {
        setUpdating(user.id);
        try {
            await api(`/admin/users/${user.id}`, { method: "DELETE", token });
            toast.success(`Đã xóa ${user.email}`);
            setConfirmDelete(null);
            await loadUsers();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setUpdating(null);
        }
    };

    const handleForceVerify = async (userId: string) => {
        setUpdating(userId);
        try {
            await api(`/admin/users/${userId}/verify`, { method: "POST", token });
            toast.success("Đã xác thực email");
            await loadUsers();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setUpdating(null);
        }
    };

    const handleSelectAll = () => {
        setSelectedIds(selectedIds.size === users.length ? new Set() : new Set(users.map(u => u.id)));
    };

    const handleSelectOne = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleBulkAction = async (action: "enable" | "disable" | "delete") => {
        if (selectedIds.size === 0) return;
        setConfirmBulk(action);
    };

    const confirmBulkAction = async (action: "enable" | "disable" | "delete") => {
        const labels = { enable: "kích hoạt", disable: "vô hiệu hóa", delete: "xóa" };
        setBulkLoading(true);
        try {
            const res = await api<{ affected: number }>("/admin/users/bulk", {
                method: "POST", token, body: { userIds: Array.from(selectedIds), action }
            });
            toast.success(`Đã ${labels[action]} ${res.affected} người dùng`);
            setSelectedIds(new Set());
            setConfirmBulk(null);
            await loadUsers();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setBulkLoading(false);
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const isAllSelected = users.length > 0 && selectedIds.size === users.length;

    return (
        <div className="p-4 md:p-6 max-w-full">
            <SectionHeader
                title="Quản lý Người dùng"
                subtitle={`Tổng số: ${total} người dùng`}
                action={
                    <PremiumInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Tìm kiếm email..."
                        className="w-64"
                        icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                        }
                    />
                }
            />

            <BulkActionsBar selectedCount={selectedIds.size} onClear={() => setSelectedIds(new Set())}>
                <PremiumButton variant="secondary" size="sm" onClick={() => handleBulkAction("enable")} disabled={bulkLoading}>
                    ✓ Kích hoạt
                </PremiumButton>
                <PremiumButton variant="secondary" size="sm" onClick={() => handleBulkAction("disable")} disabled={bulkLoading}>
                    ⊘ Vô hiệu hóa
                </PremiumButton>
                <PremiumButton variant="danger" size="sm" onClick={() => handleBulkAction("delete")} disabled={bulkLoading}>
                    ✕ Xóa
                </PremiumButton>
            </BulkActionsBar>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <GlassCard padding="p-0" hover={false}>
                    <PremiumTable>
                        <TableHeader>
                            <tr>
                                <TableHeaderCell className="w-10">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                                    />
                                </TableHeaderCell>
                                <TableHeaderCell>Email</TableHeaderCell>
                                <TableHeaderCell>Gói cước</TableHeaderCell>
                                <TableHeaderCell>Hết hạn</TableHeaderCell>
                                <TableHeaderCell>Trạng thái</TableHeaderCell>
                                <TableHeaderCell>Domains</TableHeaderCell>
                                <TableHeaderCell>Ngày tạo</TableHeaderCell>
                                <TableHeaderCell className="text-right">Hành động</TableHeaderCell>
                            </tr>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id} className={selectedIds.has(user.id) ? "!bg-primary/5 dark:!bg-primary/10" : ""}>
                                    <TableCell>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(user.id)}
                                            onChange={() => handleSelectOne(user.id)}
                                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className={`font-medium ${user.isDisabled ? "text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-white"}`}>
                                            {user?.email || "Unknown"}
                                        </div>
                                        {user.isDisabled && <StatusBadge status="Đã khóa" variant="danger" />}
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 ${user.role === "ADMIN" ? "bg-purple-50 text-purple-600" : "text-slate-500"}`}>
                                                {user.role}
                                            </span>
                                            {!user.emailVerified && (
                                                <button onClick={() => handleForceVerify(user.id)} className="text-[10px] text-amber-500 hover:underline">
                                                    Chưa xác thực
                                                </button>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <select
                                            value={user.tier}
                                            onChange={(e) => handleTierChange(user.id, e.target.value)}
                                            disabled={updating === user.id}
                                            className="text-xs py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer hover:border-blue-500 transition-colors w-28"
                                        >
                                            <option value="FREE">FREE</option>
                                            <option value="STARTER">STARTER</option>
                                            <option value="PROFESSIONAL">PROFESSIONAL</option>
                                            <option value="ENTERPRISE">ENTERPRISE</option>
                                        </select>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs font-mono text-slate-500 max-w-[100px] truncate" title={user.subscriptionEndsAt ? new Date(user.subscriptionEndsAt).toLocaleString() : ""}>
                                            {user.subscriptionEndsAt ? new Date(user.subscriptionEndsAt).toLocaleDateString("vi-VN") : "—"}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge
                                            status={user.subscriptionStatus}
                                            variant={user.subscriptionStatus === "ACTIVE" ? "success" : "default"}
                                        />
                                        {user.stripeSubscriptionId && user.subscriptionStatus === "ACTIVE" && (
                                            <button
                                                onClick={() => handleCancelSubscription(user.id)}
                                                className="block mt-1 text-[10px] text-red-500 hover:underline"
                                            >
                                                Hủy đăng ký
                                            </button>
                                        )}
                                    </TableCell>
                                    <TableCell>{user._count.domains}</TableCell>
                                    <TableCell>{new Date(user.createdAt).toLocaleDateString("vi-VN")}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value as "ADMIN" | "USER")}
                                                disabled={updating === user.id}
                                                className="text-[10px] py-1 px-1 rounded border border-slate-200 dark:border-slate-600 bg-transparent"
                                                title="Change Role"
                                            >
                                                <option value="USER">User</option>
                                                <option value="ADMIN">Admin</option>
                                            </select>
                                            <PremiumButton
                                                variant={user.isDisabled ? "secondary" : "ghost"}
                                                size="sm"
                                                onClick={() => handleToggleDisable(user)}
                                                disabled={updating === user.id}
                                                className="!px-2 !py-1"
                                                title={user.isDisabled ? "Mở khóa" : "Khóa"}
                                            >
                                                {user.isDisabled ? "Unlock" : "Lock"}
                                            </PremiumButton>
                                            <PremiumButton
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setConfirmDelete(user)}
                                                disabled={updating === user.id}
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 !px-2 !py-1"
                                                title="Xóa người dùng"
                                            >
                                                X
                                            </PremiumButton>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </PremiumTable>

                    {users.length === 0 && (
                        <EmptyState
                            title="Không tìm thấy người dùng"
                            description="Thử thay đổi từ khóa tìm kiếm"
                        />
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

            <ConfirmModal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
                title="Xóa người dùng"
                message={`Bạn có chắc muốn xóa người dùng "${confirmDelete?.email}"? Tất cả domain, inbox và email của họ sẽ bị xóa vĩnh viễn.`}
                variant="danger"
                isLoading={updating === confirmDelete?.id}
            />

            <ConfirmModal
                isOpen={!!confirmCancelSub}
                onClose={() => setConfirmCancelSub(null)}
                onConfirm={() => confirmCancelSub && confirmCancelSubscription(confirmCancelSub.id)}
                title="Hủy gói cước"
                message={`Bạn có chắc muốn hủy gói cước của "${confirmCancelSub?.email}" ngay lập tức?`}
                variant="danger"
                isLoading={updating === confirmCancelSub?.id}
            />

            <ConfirmModal
                isOpen={!!confirmBulk}
                onClose={() => setConfirmBulk(null)}
                onConfirm={() => confirmBulk && confirmBulkAction(confirmBulk)}
                title="Hành động hàng loạt"
                message={`Bạn có chắc muốn ${confirmBulk === "delete" ? "xóa" : confirmBulk === "enable" ? "kích hoạt" : "vô hiệu hóa"} ${selectedIds.size} người dùng đã chọn?`}
                variant={confirmBulk === "delete" ? "danger" : "primary"}
                isLoading={bulkLoading}
            />
        </div>
    );
}
