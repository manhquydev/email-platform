import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import toast from "react-hot-toast";

interface User {
    id: string;
    email: string;
    role: "ADMIN" | "USER";
    emailVerified: string | null;
    isDisabled?: boolean;
    createdAt: string;
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
        } catch {
            toast.error("Không thể tải danh sách");
        } finally {
            setLoading(false);
        }
    }, [token, search, page]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    // Reset page when search changes
    useEffect(() => {
        setPage(0);
    }, [search]);

    const handleRoleChange = async (userId: string, newRole: "ADMIN" | "USER") => {
        setUpdating(userId);
        try {
            await api(`/admin/users/${userId}`, {
                method: "PATCH",
                token,
                body: { role: newRole },
            });
            toast.success("Đã cập nhật quyền");
            await loadUsers();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setUpdating(null);
        }
    };

    const handleToggleDisable = async (user: User) => {
        setUpdating(user.id);
        try {
            await api(`/admin/users/${user.id}`, {
                method: "PATCH",
                token,
                body: { isDisabled: !user.isDisabled },
            });
            toast.success(user.isDisabled ? "Đã kích hoạt tài khoản" : "Đã vô hiệu hóa tài khoản");
            await loadUsers();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setUpdating(null);
        }
    };

    const handleForceVerify = async (userId: string) => {
        setUpdating(userId);
        try {
            await api(`/admin/users/${userId}/verify`, {
                method: "POST",
                token,
            });
            toast.success("Đã xác thực email");
            await loadUsers();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setUpdating(null);
        }
    };

    const handleDelete = async (user: User) => {
        setUpdating(user.id);
        try {
            await api(`/admin/users/${user.id}`, {
                method: "DELETE",
                token,
            });
            toast.success(`Đã xóa ${user.email}`);
            setConfirmDelete(null);
            await loadUsers();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setUpdating(null);
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="p-6 max-w-5xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold">Người dùng</h1>
                    <p className="text-sm text-muted mt-1">
                        Quản lý tài khoản trong hệ thống
                        {total > 0 && <span className="ml-2 text-xs">({total} tổng)</span>}
                    </p>
                </div>
                <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="text-sm w-56"
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="spinner"></div>
                </div>
            ) : (
                <>
                    <div className="bg-surface border border-border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-bg text-left">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-muted">Email</th>
                                    <th className="px-4 py-3 font-medium text-muted">Quyền</th>
                                    <th className="px-4 py-3 font-medium text-muted">Trạng thái</th>
                                    <th className="px-4 py-3 font-medium text-muted">Domains</th>
                                    <th className="px-4 py-3 font-medium text-muted">Ngày tạo</th>
                                    <th className="px-4 py-3 font-medium text-muted">Quyền</th>
                                    <th className="px-4 py-3 font-medium text-muted text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {users.map((user) => (
                                    <tr key={user.id} className={`hover:bg-bg/50 ${user.isDisabled ? "opacity-50" : ""}`}>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{user.email}</div>
                                            {user.isDisabled && <span className="text-xs text-red-500">Đã vô hiệu hóa</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${user.role === "ADMIN" ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-600"
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.emailVerified ? (
                                                <span className="text-green-600 text-xs">✓ Đã xác thực</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleForceVerify(user.id)}
                                                    disabled={updating === user.id}
                                                    className="text-amber-600 text-xs hover:underline disabled:opacity-50"
                                                >
                                                    Xác thực →
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-muted">{user._count.domains}</td>
                                        <td className="px-4 py-3 text-muted">
                                            {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value as "ADMIN" | "USER")}
                                                disabled={updating === user.id}
                                                className="text-xs py-1 px-2 w-20"
                                            >
                                                <option value="USER">USER</option>
                                                <option value="ADMIN">ADMIN</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleToggleDisable(user)}
                                                    disabled={updating === user.id}
                                                    className={`text-xs px-2 py-1 rounded ${user.isDisabled
                                                        ? "text-green-600 hover:bg-green-50"
                                                        : "text-amber-600 hover:bg-amber-50"
                                                        } disabled:opacity-50`}
                                                    title={user.isDisabled ? "Kích hoạt" : "Vô hiệu hóa"}
                                                >
                                                    {user.isDisabled ? "Kích hoạt" : "Khóa"}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDelete(user)}
                                                    disabled={updating === user.id}
                                                    className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50 disabled:opacity-50"
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {users.length === 0 && (
                            <div className="px-4 py-12 text-center text-muted text-sm">
                                Không tìm thấy người dùng
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted">
                                Trang {page + 1} / {totalPages}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ← Trước
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                    disabled={page >= totalPages - 1}
                                    className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Sau →
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-surface border border-border rounded-lg p-6 max-w-md mx-4">
                        <h3 className="text-lg font-semibold mb-2">Xác nhận xóa</h3>
                        <p className="text-sm text-muted mb-4">
                            Bạn có chắc muốn xóa người dùng <strong>{confirmDelete.email}</strong>?
                            Tất cả domain, inbox và email của họ sẽ bị xóa vĩnh viễn.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-bg"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => handleDelete(confirmDelete)}
                                disabled={updating === confirmDelete.id}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                            >
                                {updating === confirmDelete.id ? "Đang xóa..." : "Xóa"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
