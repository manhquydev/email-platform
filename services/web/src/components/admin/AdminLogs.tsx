import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import { formatDistanceToNow, format } from "date-fns";
import { vi } from "date-fns/locale";
import {
    GlassCard, SectionHeader, PremiumButton, PremiumSelect,
    EmptyState, LoadingSpinner, Pagination
} from "./AdminUIComponents";

interface AuditLog {
    id: string;
    action: string;
    meta: Record<string, unknown> | null;
    createdAt: string;
    user: { email: string } | null;
}

const PAGE_SIZE = 50;

export function AdminLogs({ token }: { token: string }) {
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
        } catch {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token, filterAction, page, startDate, endDate]);

    useEffect(() => { loadLogs(); }, [loadLogs]);
    useEffect(() => { setPage(0); }, [filterAction, startDate, endDate]);

    const actionLabels: Record<string, string> = {
        USER_REGISTERED: "Đăng ký tài khoản",
        EMAIL_VERIFIED: "Xác thực email",
        LOGIN: "Đăng nhập",
        PASSWORD_CHANGED: "Đổi mật khẩu",
        USER_UPDATED: "Cập nhật user",
        DOMAIN_CREATED: "Tạo domain",
        DOMAIN_VERIFIED: "Xác thực domain",
        DOMAIN_DELETED: "Xóa domain",
        INBOX_CREATED: "Tạo inbox",
        PUBLIC_INBOX_CREATED: "Tạo inbox công khai",
        MESSAGE_DELETED: "Xóa email",
        RULE_CREATED: "Tạo quy tắc",
        RULE_DELETED: "Xóa quy tắc",
        ABUSE_REPORTED: "Báo cáo vi phạm",
        ABUSE_REPORT_UPDATED: "Cập nhật báo cáo",
    };

    const availableActions = Object.keys(actionLabels);
    const totalPages = Math.ceil(total / PAGE_SIZE);

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
        } catch {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <SectionHeader
                title="Nhật ký hoạt động"
                subtitle={`Theo dõi các thao tác trong hệ thống${total > 0 ? ` (${total} tổng)` : ""}`}
                action={
                    <div className="flex items-center gap-2">
                        <PremiumButton variant="secondary" onClick={handleExport}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            Xuất CSV
                        </PremiumButton>
                        <PremiumButton variant="secondary" onClick={() => { loadLogs(); toast.success("Đã làm mới"); }}>
                            ↻ Làm mới
                        </PremiumButton>
                    </div>
                }
            />

            {/* Filters */}
            <GlassCard className="mb-6" padding="p-4" hover={false}>
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Hành động</label>
                        <PremiumSelect
                            value={filterAction}
                            onChange={setFilterAction}
                            options={[
                                { value: "", label: "Tất cả" },
                                ...availableActions.map(a => ({ value: a, label: actionLabels[a] || a }))
                            ]}
                            className="w-48"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Từ ngày</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-4 py-2.5 text-sm w-40 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Đến ngày</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-4 py-2.5 text-sm w-40 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                    </div>
                    {(filterAction || startDate || endDate) && (
                        <PremiumButton variant="ghost" size="sm" onClick={() => { setFilterAction(""); setStartDate(""); setEndDate(""); setPage(0); }}>
                            Xóa bộ lọc
                        </PremiumButton>
                    )}
                </div>
            </GlassCard>

            {loading ? (
                <LoadingSpinner />
            ) : logs.length === 0 ? (
                <GlassCard hover={false}>
                    <EmptyState title="Không có nhật ký nào" description="Thử thay đổi bộ lọc" />
                </GlassCard>
            ) : (
                <GlassCard padding="p-0" hover={false}>
                    <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-200 dark:divide-slate-600/50">
                        {logs.map((log) => (
                            <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <div className="w-2.5 h-2.5 rounded-full bg-primary mt-2 shrink-0 ring-4 ring-primary/20" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                            {actionLabels[log.action] || log.action}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: vi })}
                                        </span>
                                        <span className="text-xs text-slate-400 dark:text-slate-500">
                                            ({format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })})
                                        </span>
                                    </div>
                                    {log.user && (
                                        <div className="text-xs text-slate-600 dark:text-slate-400">
                                            {log.user.email}
                                        </div>
                                    )}
                                    {log.meta && Object.keys(log.meta).length > 0 && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5 mt-2 font-mono overflow-x-auto">
                                            {JSON.stringify(log.meta)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            )}

            {totalPages > 1 && (
                <Pagination currentPage={page + 1} totalPages={totalPages} onPageChange={(p) => setPage(p - 1)} />
            )}
        </div>
    );
}
