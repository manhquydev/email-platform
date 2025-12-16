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

    const actionLabels: Record<string, { label: string; icon: string; color: string }> = {
        RULE_CREATED: { label: "Tạo quy tắc", icon: "➕", color: "text-green-600" },
        RULE_DELETED: { label: "Xóa quy tắc", icon: "🗑️", color: "text-red-600" },
        USER_UPDATED: { label: "Cập nhật user", icon: "👤", color: "text-blue-600" },
        ABUSE_REPORTED: { label: "Báo cáo vi phạm", icon: "🚨", color: "text-orange-600" },
        ABUSE_REPORT_UPDATED: { label: "Cập nhật báo cáo", icon: "📝", color: "text-purple-600" },
        LOGIN: { label: "Đăng nhập", icon: "🔑", color: "text-gray-600" },
        PASSWORD_CHANGED: { label: "Đổi mật khẩu", icon: "🔒", color: "text-indigo-600" },
    };

    const uniqueActions = [...new Set(logs.map((l) => l.action))];

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Nhật ký hoạt động</h2>
                <select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    className="text-sm"
                >
                    <option value="">Tất cả hành động</option>
                    {uniqueActions.map((action) => (
                        <option key={action} value={action}>
                            {actionLabels[action]?.label || action}
                        </option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="spinner"></div>
                </div>
            ) : (
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <div className="max-h-[600px] overflow-y-auto">
                        {logs.map((log) => {
                            const actionInfo = actionLabels[log.action] || {
                                label: log.action,
                                icon: "📋",
                                color: "text-gray-600"
                            };

                            return (
                                <div
                                    key={log.id}
                                    className="flex items-start gap-4 p-4 border-b border-border hover:bg-bg transition-colors"
                                >
                                    <div className="text-xl">{actionInfo.icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`font-medium ${actionInfo.color}`}>
                                                {actionInfo.label}
                                            </span>
                                            <span className="text-xs text-muted">
                                                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: vi })}
                                            </span>
                                        </div>
                                        {log.user && (
                                            <div className="text-sm text-muted">
                                                Bởi: {log.user.email}
                                            </div>
                                        )}
                                        {log.meta && Object.keys(log.meta).length > 0 && (
                                            <div className="text-xs text-muted bg-bg rounded p-2 mt-2 font-mono overflow-x-auto">
                                                {JSON.stringify(log.meta, null, 2)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {logs.length === 0 && (
                            <div className="text-center py-12 text-muted">
                                Không có nhật ký hoạt động nào
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
