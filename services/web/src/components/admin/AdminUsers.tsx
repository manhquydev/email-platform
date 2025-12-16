import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import toast from "react-hot-toast";

interface User {
    id: string;
    email: string;
    role: "ADMIN" | "USER";
    emailVerified: string | null;
    createdAt: string;
    _count: { domains: number };
}

export function AdminUsers({ token }: { token: string }) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [updating, setUpdating] = useState<string | null>(null);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            params.set("limit", "50");

            const res = await api<{ data: User[] }>(`/admin/users?${params}`, { token });
            setUsers(res.data);
        } catch (err) {
            toast.error("Không thể tải danh sách người dùng");
        } finally {
            setLoading(false);
        }
    }, [token, search]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleRoleChange = async (userId: string, newRole: "ADMIN" | "USER") => {
        setUpdating(userId);
        try {
            await api(`/admin/users/${userId}`, {
                method: "PATCH",
                token,
                body: { role: newRole },
            });
            toast.success("Đã cập nhật quyền người dùng");
            await loadUsers();
        } catch (err) {
            toast.error("Lỗi: " + (err as Error).message);
        } finally {
            setUpdating(null);
        }
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Quản lý người dùng</h2>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Tìm kiếm email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="text-sm w-64"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="spinner"></div>
                </div>
            ) : (
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-bg border-b border-border">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold">Email</th>
                                <th className="text-left px-4 py-3 font-semibold">Quyền</th>
                                <th className="text-left px-4 py-3 font-semibold">Xác thực</th>
                                <th className="text-left px-4 py-3 font-semibold">Domains</th>
                                <th className="text-left px-4 py-3 font-semibold">Ngày tạo</th>
                                <th className="text-left px-4 py-3 font-semibold">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b border-border hover:bg-bg transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="font-medium">{user.email}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`text-xs font-bold px-2 py-1 rounded ${user.role === "ADMIN"
                                                    ? "bg-purple-100 text-purple-700"
                                                    : "bg-gray-100 text-gray-700"
                                                }`}
                                        >
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {user.emailVerified ? (
                                            <span className="text-green-600">✓ Đã xác thực</span>
                                        ) : (
                                            <span className="text-yellow-600">⏳ Chờ xác thực</span>
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
                                            className="text-xs py-1 px-2"
                                        >
                                            <option value="USER">USER</option>
                                            <option value="ADMIN">ADMIN</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-muted">
                                        Không tìm thấy người dùng nào
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
