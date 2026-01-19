/**
 * Custom hook for UsersPage data management
 * Handles user CRUD, bulk actions, pagination, search
 */
import { useState, useEffect, useCallback } from "react";
import { api } from "../../../utils/api";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import type { User, BulkAction } from "./types";
import { PAGE_SIZE } from "./types";

export interface UseUsersPageDataReturn {
    // Data
    users: User[];
    loading: boolean;
    total: number;
    page: number;
    search: string;
    updating: string | null;
    // Selection
    selectedIds: Set<string>;
    isAllSelected: boolean;
    // Modals
    confirmDelete: User | null;
    confirmCancelSub: User | null;
    confirmBulk: BulkAction | null;
    bulkLoading: boolean;
    // Setters
    setSearch: (v: string) => void;
    setPage: (v: number) => void;
    setConfirmDelete: (v: User | null) => void;
    setConfirmCancelSub: (v: User | null) => void;
    setConfirmBulk: (v: BulkAction | null) => void;
    // Selection handlers
    handleSelectAll: () => void;
    handleSelectOne: (id: string) => void;
    clearSelection: () => void;
    // Actions
    handleRoleChange: (userId: string, newRole: "ADMIN" | "USER") => Promise<void>;
    handleTierChange: (userId: string, tier: string) => Promise<void>;
    handleCancelSubscription: (userId: string) => void;
    confirmCancelSubscription: (userId: string) => Promise<void>;
    handleToggleDisable: (user: User) => Promise<void>;
    handleDelete: (user: User) => Promise<void>;
    handleForceVerify: (userId: string) => Promise<void>;
    handleBulkAction: (action: BulkAction) => void;
    confirmBulkAction: (action: BulkAction) => Promise<void>;
    // Pagination
    totalPages: number;
}

export function useUsersPageData(): UseUsersPageDataReturn {
    const { token } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [updating, setUpdating] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
    const [confirmCancelSub, setConfirmCancelSub] = useState<User | null>(null);
    const [confirmBulk, setConfirmBulk] = useState<BulkAction | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);

    // Load users with search and pagination
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

    // Role change
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

    // Tier change
    const handleTierChange = async (userId: string, tier: string) => {
        setUpdating(userId);
        try {
            const res = await api<{ user: User }>(`/admin/users/${userId}/tier`, {
                method: "PATCH", token, body: { tier }
            });
            toast.success("Đã cập nhật gói cước và gia hạn");
            setUsers(users.map(u => u.id === userId ? { ...u, ...res.user } : u));
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setUpdating(null);
        }
    };

    // Cancel subscription - open modal
    const handleCancelSubscription = (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (user) setConfirmCancelSub(user);
    };

    // Cancel subscription - confirm
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

    // Toggle disable
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

    // Delete user
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

    // Force verify email
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

    // Selection handlers
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

    const clearSelection = () => setSelectedIds(new Set());

    // Bulk action - open modal
    const handleBulkAction = (action: BulkAction) => {
        if (selectedIds.size === 0) return;
        setConfirmBulk(action);
    };

    // Bulk action - confirm
    const confirmBulkAction = async (action: BulkAction) => {
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

    return {
        users,
        loading,
        total,
        page,
        search,
        updating,
        selectedIds,
        isAllSelected,
        confirmDelete,
        confirmCancelSub,
        confirmBulk,
        bulkLoading,
        setSearch,
        setPage,
        setConfirmDelete,
        setConfirmCancelSub,
        setConfirmBulk,
        handleSelectAll,
        handleSelectOne,
        clearSelection,
        handleRoleChange,
        handleTierChange,
        handleCancelSubscription,
        confirmCancelSubscription,
        handleToggleDisable,
        handleDelete,
        handleForceVerify,
        handleBulkAction,
        confirmBulkAction,
        totalPages,
    };
}
