/**
 * Custom hooks for AdminLogs
 */
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { api } from "../../../utils/api";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import { type AuditLog, PAGE_SIZE } from "./admin-logs-utils";

interface UseAdminLogsOptions {
    token: string;
}

/** Hook to manage admin logs fetching and filtering */
export function useAdminLogs({ token }: UseAdminLogsOptions) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterAction, setFilterAction] = useState("");
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("limit", String(PAGE_SIZE));
            params.set("offset", String(page * PAGE_SIZE));
            if (filterAction) params.set("action", filterAction);

            const res = await api<{ data: AuditLog[]; meta: { total: number } }>(`/admin/audit-logs?${params}`, { token });

            let filteredData = res.data;
            if (startDate) {
                const start = new Date(startDate);
                filteredData = filteredData.filter(log => new Date(log.createdAt) >= start);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filteredData = filteredData.filter(log => new Date(log.createdAt) <= end);
            }

            setLogs(filteredData);
            setTotal(res.meta.total);
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token, filterAction, page, startDate, endDate]);

    useEffect(() => { loadLogs(); }, [loadLogs]);
    useEffect(() => { setPage(0); }, [filterAction, startDate, endDate]);

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            if (filterAction) params.set("action", filterAction);
            if (startDate) params.set("startDate", startDate);
            if (endDate) params.set("endDate", endDate);

            const response = await fetch(`${import.meta.env.VITE_API_URL || ""}/admin/audit-logs/export?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Export failed");

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success("Đã xuất file CSV");
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        }
    };

    const clearFilters = () => {
        setFilterAction("");
        setStartDate("");
        setEndDate("");
        setPage(0);
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return {
        logs,
        loading,
        filterAction,
        setFilterAction,
        page,
        setPage,
        total,
        totalPages,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        loadLogs,
        handleExport,
        clearFilters
    };
}
