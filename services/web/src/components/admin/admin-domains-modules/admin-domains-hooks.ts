/**
 * Types and hooks for AdminDomains
 */
import { useState, useEffect, useCallback } from "react";
import { api } from "../../../utils/api";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import toast from "react-hot-toast";

export interface Domain {
    id: string;
    name: string;
    status: "PENDING" | "VERIFIED" | "FAILED";
    contributionStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
    isPublic: boolean;
    owner?: { email: string };
    createdAt: string;
}

export const PAGE_SIZE = 10;

/** Hook to manage admin domains state and actions */
export function useAdminDomains(token: string) {
    const [domains, setDomains] = useState<Domain[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<string>("ALL");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (filter !== "ALL") params.set("contributionStatus", filter);
            params.set("limit", String(PAGE_SIZE));
            params.set("offset", String(page * PAGE_SIZE));

            const res = await api<{ data: Domain[]; meta: { total: number } }>(`/admin/domains?${params}`, { token });
            setDomains(res.data);
            setTotal(res.meta.total);
            setSelectedIds(new Set());
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token, search, filter, page]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleReview = async (domainId: string, status: "APPROVED" | "REJECTED") => {
        setUpdating(domainId);
        try {
            await api(`/admin/domains/${domainId}/review`, {
                method: "POST",
                token,
                body: { status }
            });
            toast.success(status === "APPROVED" ? "Đã duyệt tên miền" : "Đã từ chối");
            await loadData();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setUpdating(null);
        }
    };

    const handleBulkAction = async (action: "APPROVED" | "REJECTED") => {
        const ids = Array.from(selectedIds);
        setLoading(true);
        try {
            await Promise.all(ids.map(id =>
                api(`/admin/domains/${id}/review`, {
                    method: "POST",
                    token,
                    body: { status: action }
                })
            ));
            toast.success(`Đã xử lý ${ids.length} mục`);
            await loadData();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectAll = (checked: boolean) => {
        if (checked) setSelectedIds(new Set(domains.map(d => d.id)));
        else setSelectedIds(new Set());
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return {
        domains,
        loading,
        updating,
        page,
        setPage,
        total,
        search,
        setSearch,
        filter,
        setFilter,
        selectedIds,
        setSelectedIds,
        totalPages,
        handleReview,
        handleBulkAction,
        toggleSelectAll,
        toggleSelect
    };
}
