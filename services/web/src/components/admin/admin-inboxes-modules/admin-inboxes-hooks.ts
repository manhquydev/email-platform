/**
 * Types and hooks for AdminInboxes
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../utils/api";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import toast from "react-hot-toast";

export interface Inbox {
    id: string;
    localPart: string;
    domain: { name: string };
    owner: { email: string };
    ownerId: string;
    createdAt: string;
    expiresAt: string | null;
    _count: { messages: number };
}

export const PAGE_SIZE = 20;

/** Hook to manage admin inboxes state and actions */
export function useAdminInboxes(token: string) {
    const [inboxes, setInboxes] = useState<Inbox[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [updating, setUpdating] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Inbox | null>(null);
    const [transferTarget, setTransferTarget] = useState<Inbox | null>(null);
    const [loadingAction, setLoadingAction] = useState(false);
    const { user } = useAuth();

    const loadInboxes = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            params.set("limit", String(PAGE_SIZE));
            params.set("offset", String(page * PAGE_SIZE));

            const res = await api<{ data: Inbox[]; meta: { total: number } }>(`/inboxes?${params}`, { token });
            setInboxes(res.data);
            setTotal(res.meta.total);
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token, search, page]);

    useEffect(() => { loadInboxes(); }, [loadInboxes]);
    useEffect(() => { setPage(0); }, [search]);

    const handleDelete = async (id: string) => {
        const inbox = inboxes.find(i => i.id === id);
        if (inbox) setDeleteTarget(inbox);
    };

    const confirmDelete = async (inbox: Inbox) => {
        const email = `${inbox.localPart}@${inbox.domain.name}`;
        setLoadingAction(true);
        setUpdating(inbox.id);
        try {
            await api(`/inboxes/${inbox.id}`, { method: "DELETE", token });
            toast.success(`Đã xóa ${email}`);
            setDeleteTarget(null);
            await loadInboxes();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoadingAction(false);
            setUpdating(null);
        }
    };

    const handleTransfer = async (inbox: Inbox) => {
        setTransferTarget(inbox);
    };

    const confirmTransfer = async (inbox: Inbox) => {
        const defaultEmail = user?.email || "admin@example.com";
        const email = prompt(`Chuyển quyền sở hữu hộp thư ${inbox.localPart}@${inbox.domain.name}?\nNhập email chủ sở hữu mới:`, defaultEmail);
        if (email === null) return;

        setLoadingAction(true);
        setUpdating(inbox.id);
        try {
            if (!email) {
                toast.error("Vui lòng nhập email");
                setLoadingAction(false);
                setUpdating(null);
                return;
            }

            await api(`/inboxes/${inbox.id}`, {
                method: "PATCH",
                token,
                body: { ownerEmail: email }
            });

            toast.success(`Đã chuyển sang cho ${email}`);
            setTransferTarget(null);
            await loadInboxes();
        } catch (e) {
            toast.error(getFriendlyErrorMessage((e as Error).message));
        } finally {
            setUpdating(null);
            setLoadingAction(false);
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return {
        inboxes,
        loading,
        search,
        setSearch,
        page,
        setPage,
        total,
        updating,
        deleteTarget,
        setDeleteTarget,
        transferTarget,
        setTransferTarget,
        loadingAction,
        totalPages,
        handleDelete,
        confirmDelete,
        handleTransfer,
        confirmTransfer
    };
}
