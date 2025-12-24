import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import {
    GlassCard, SectionHeader, PremiumTable, TableHeader, TableHeaderCell,
    TableBody, TableRow, TableCell, StatusBadge, PremiumButton, PremiumInput,
    EmptyState, LoadingSpinner, Pagination, BulkActionsBar
} from "./AdminUIComponents";

interface User {
    id: string;
    email: string;
    role: "ADMIN" | "USER";
    emailVerified: string | null;
    isDisabled?: boolean;
    createdAt: string;
    tier: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
    subscriptionStatus: "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";
    _count: { domains: number };
}

const PAGE_SIZE = 20;

export function AdminUsers({ token }: { token: string }) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [updating, setUpdating] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
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
            await api(`/admin/users/${userId}`, { method: "PATCH", token, body: { role: newRole } });
            toast.success("Đã cập nhật quyền");
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
            await api(`/admin/users/${user.id}`, { method: "PATCH", token, body: { isDisabled: !user.isDisabled } });
            toast.success(user.isDisabled ? "Đã kích hoạt tài khoản" : "Đã vô hiệu hóa tài khoản");
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

    const handleSelectAll = () => {
        setSelectedIds(selectedIds.size === users.length ? new Set() : new Set(users.map(u => u.id)));
    };

    const handleSelectOne = (id: string) => {
        const newSet = new Set(selectedIds);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleBulkAction = async (action: "enable" | "disable" | "delete") => {
        if (selectedIds.size === 0) return;
        const labels = { enable: "kích hoạt", disable: "vô hiệu hóa", delete: "xóa" };
        if (action === "delete" && !confirm(`Bạn có chắc muốn ${labels[action]} ${selectedIds.size} người dùng?`)) return;

        setBulkLoading(true);
        try {
            const res = await api<{ affected: number }>("/admin/users/bulk", {
                method: "POST", token, body: { userIds: Array.from(selectedIds), action }
            });
            toast.success(`Đã ${labels[action]} ${res.affected} người dùng`);
            setSelectedIds(new Set());
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
        <div className="p-6 max-w-7xl mx-auto">
            <SectionHeader
                title="Người dùng"
                subtitle={`Quản lý tài khoản trong hệ thống${total > 0 ? ` (${total} tổng)` : ""}`}
                action={
                    <PremiumInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Tìm kiếm..."
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
                                <TableHeaderCell>Quyền</TableHeaderCell>
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
                                            {user.email}
                                        </div>
                                        {user.isDisabled && <StatusBadge status="Đã khóa" variant="danger" />}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <StatusBadge
                                                status={user.tier}
                                                variant={user.tier === "FREE" ? "default" : "success"}
                                            />
                                            <div className="text-[10px] text-slate-500">{user.subscriptionStatus}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user.id, e.target.value as "ADMIN" | "USER")}
                                            disabled={updating === user.id}
                                            className="text-xs py-1.5 px-2 w-20 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                        >
                                            <option value="USER">USER</option>
                                            <option value="ADMIN">ADMIN</option>
                                        </select>
                                    </TableCell>
                                    <TableCell>
                                        {user.emailVerified ? (
                                            <StatusBadge status="✓ Đã xác thực" variant="success" />
                                        ) : (
                                            <button
                                                onClick={() => handleForceVerify(user.id)}
                                                disabled={updating === user.id}
                                                className="text-xs text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50"
                                            >
                                                Xác thực →
                                            </button>
                                        )}
                                    </TableCell>
                                    <TableCell>{user._count.domains}</TableCell>
                                    <TableCell>{new Date(user.createdAt).toLocaleDateString("vi-VN")}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <PremiumButton
                                                variant={user.isDisabled ? "secondary" : "ghost"}
                                                size="sm"
                                                onClick={() => handleToggleDisable(user)}
                                                disabled={updating === user.id}
                                            >
                                                {user.isDisabled ? "Mở khóa" : "Khóa"}
                                            </PremiumButton>
                                            <PremiumButton
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setConfirmDelete(user)}
                                                disabled={updating === user.id}
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                Xóa
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

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <GlassCard className="max-w-md mx-4" hover={false}>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Xác nhận xóa</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                            Bạn có chắc muốn xóa người dùng <strong className="text-slate-900 dark:text-white">{confirmDelete.email}</strong>?
                            Tất cả domain, inbox và email của họ sẽ bị xóa vĩnh viễn.
                        </p>
                        <div className="flex justify-end gap-3">
                            <PremiumButton variant="secondary" onClick={() => setConfirmDelete(null)}>
                                Hủy
                            </PremiumButton>
                            <PremiumButton
                                variant="danger"
                                onClick={() => handleDelete(confirmDelete)}
                                disabled={updating === confirmDelete.id}
                            >
                                {updating === confirmDelete.id ? "Đang xóa..." : "Xóa"}
                            </PremiumButton>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}
