import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface AuditLog {
    id: string;
    action: string;
    meta: Record<string, any> | null;
    createdAt: string;
    user: { email: string } | null;
}

export function AdminLogs({ token }: { token: string }) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterAction, setFilterAction] = useState<string>("");

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: "100" });
            if (filterAction) params.set("action", filterAction);

            const res = await api<{ data: AuditLog[] }>(`/admin/audit-logs?${params}`, { token });
            setLogs(res.data);
        } catch (err) {
            toast.error("Không thể tải nhật ký");
        } finally {
            setLoading(false);
        }
    }, [token, filterAction]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const actionLabels: Record<string, string> = {
        RULE_CREATED: "Tạo quy tắc",
        RULE_DELETED: "Xóa quy tắc",
        USER_UPDATED: "Cập nhật user",
        ABUSE_REPORTED: "Báo cáo vi phạm",
        ABUSE_REPORT_UPDATED: "Cập nhật báo cáo",
        LOGIN: "Đăng nhập",
        PASSWORD_CHANGED: "Đổi mật khẩu",
    };

    const uniqueActions = [...new Set(logs.map((l) => l.action))];

    return (
        <div className="p-6 max-w-5xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold">Nhật ký hoạt động</h1>
                    <p className="text-sm text-muted mt-1">Theo dõi các thao tác trong hệ thống</p>
                </div>
                <select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    className="text-sm w-44"
                >
                    <option value="">Tất cả hành động</option>
                    {uniqueActions.map((action) => (
                        <option key={action} value={action}>
                            {actionLabels[action] || action}
                        </option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="spinner"></div>
                </div>
            ) : (
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
            )}
        </div>
    );
}
