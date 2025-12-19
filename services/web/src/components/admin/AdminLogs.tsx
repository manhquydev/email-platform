import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import { formatDistanceToNow, format } from "date-fns";
import { vi } from "date-fns/locale";

// ... (retain interfaces)

interface AuditLog {
    id: string;
    action: string;
    meta: Record<string, any> | null;
    createdAt: string;
    user: { email: string } | null;
}

const PAGE_SIZE = 50;

export function AdminLogs({ token }: { token: string }) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterAction, setFilterAction] = useState<string>("");
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

            // Client-side date filtering (API can be enhanced later for server-side)
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

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    // Reset page when filters change
    useEffect(() => {
        setPage(0);
    }, [filterAction, startDate, endDate]);

    const actionLabels: Record<string, string> = {
        // Auth actions
        USER_REGISTERED: "Đăng ký tài khoản",
        EMAIL_VERIFIED: "Xác thực email",
        LOGIN: "Đăng nhập",
        PASSWORD_CHANGED: "Đổi mật khẩu",

        // User management
        USER_UPDATED: "Cập nhật user",

        // Domain actions
        DOMAIN_CREATED: "Tạo domain",
        DOMAIN_VERIFIED: "Xác thực domain",
        DOMAIN_DELETED: "Xóa domain",

        // Inbox actions
        INBOX_CREATED: "Tạo inbox",
        PUBLIC_INBOX_CREATED: "Tạo inbox công khai",

        // Message actions
        MESSAGE_DELETED: "Xóa email",

        // Rule actions
        RULE_CREATED: "Tạo quy tắc",
        RULE_DELETED: "Xóa quy tắc",

        // Abuse actions
        ABUSE_REPORTED: "Báo cáo vi phạm",
        ABUSE_REPORT_UPDATED: "Cập nhật báo cáo",
    };

    // Get unique actions from current data for filter dropdown
    const availableActions = Object.keys(actionLabels);
    const totalPages = Math.ceil(total / PAGE_SIZE);

    const handleRefresh = () => {
        loadLogs();
        toast.success("Đã làm mới");
    };

    const handleClearFilters = () => {
        setFilterAction("");
        setStartDate("");
        setEndDate("");
        setPage(0);
    };

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

    return (
        <div className="p-6 max-w-5xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold">Nhật ký hoạt động</h1>
                    <p className="text-sm text-muted mt-1">
                        Theo dõi các thao tác trong hệ thống
                        {total > 0 && <span className="ml-2 text-xs">({total} tổng)</span>}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExport}
                        className="text-sm px-3 py-1.5 border border-border rounded-md hover:bg-bg flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Xuất CSV
                    </button>
                    <button
                        onClick={handleRefresh}
                        className="text-sm px-3 py-1.5 border border-border rounded-md hover:bg-bg"
                    >
                        ↻ Làm mới
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-surface border border-border rounded-lg p-4 mb-4">
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-xs text-muted mb-1.5">Hành động</label>
                        <select
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            className="text-sm w-44"
                        >
                            <option value="">Tất cả</option>
                            {availableActions.map((action) => (
                                <option key={action} value={action}>
                                    {actionLabels[action] || action}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-muted mb-1.5">Từ ngày</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="text-sm w-36"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-muted mb-1.5">Đến ngày</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="text-sm w-36"
                        />
                    </div>
                    {(filterAction || startDate || endDate) && (
                        <button
                            onClick={handleClearFilters}
                            className="text-xs text-muted hover:text-primary"
                        >
                            Xóa bộ lọc
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="spinner"></div>
                </div>
            ) : (
                <>
                    <div className="bg-surface border border-border rounded-lg overflow-hidden">
                        <div className="max-h-[600px] overflow-y-auto divide-y divide-border">
                            {logs.map((log) => (
                                <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-bg/50">
                                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0"></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-sm font-medium">
                                                {actionLabels[log.action] || log.action}
                                            </span>
                                            <span className="text-xs text-muted">
                                                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: vi })}
                                            </span>
                                            <span className="text-xs text-muted">
                                                ({format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })})
                                            </span>
                                        </div>
                                        {log.user && (
                                            <div className="text-xs text-muted">
                                                {log.user.email}
                                            </div>
                                        )}
                                        {log.meta && Object.keys(log.meta).length > 0 && (
                                            <div className="text-xs text-muted bg-bg rounded p-2 mt-2 font-mono overflow-x-auto">
                                                {JSON.stringify(log.meta)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {logs.length === 0 && (
                                <div className="text-center py-12 text-muted text-sm">
                                    Không có nhật ký nào
                                </div>
                            )}
                        </div>
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
        </div>
    );
}
