import { useState, useEffect } from "react";
import { GlassCard } from "../ui/GlassCard";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import { toast } from "react-hot-toast";

interface WebhookLog {
    id: string;
    webhookId: string;
    event: string;
    status: "SUCCESS" | "FAILED" | "PENDING";
    statusCode?: number;
    responseTime?: number;
    errorMessage?: string;
    payload: Record<string, unknown>;
    createdAt: string;
    retriedAt?: string;
    retryCount: number;
}

interface WebhookLogsProps {
    webhookId: string;
    webhookName: string;
    onClose: () => void;
}

export function WebhookLogs({ webhookId, webhookName, onClose }: WebhookLogsProps) {
    const { token } = useAuth();
    const [logs, setLogs] = useState<WebhookLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState<string | null>(null);
    const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

    useEffect(() => {
        loadLogs();
    }, [webhookId]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await api<{ logs: WebhookLog[] }>(`/webhooks/${webhookId}/logs`, { token });
            setLogs(data?.logs || []);
        } catch {
            toast.error("Không thể tải lịch sử webhook");
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = async (logId: string) => {
        setRetrying(logId);
        try {
            await api(`/webhooks/${webhookId}/logs/${logId}/retry`, {
                method: "POST",
                token,
            });
            toast.success("Đã gửi lại webhook");
            loadLogs();
        } catch {
            toast.error("Không thể gửi lại");
        } finally {
            setRetrying(null);
        }
    };

    const getStatusBadge = (status: WebhookLog["status"], statusCode?: number) => {
        switch (status) {
            case "SUCCESS":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded-full">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        {statusCode || "OK"}
                    </span>
                );
            case "FAILED":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-full">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        {statusCode || "Failed"}
                    </span>
                );
            case "PENDING":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded-full">
                        <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></span>
                        Pending
                    </span>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <GlassCard className="w-full max-w-4xl max-h-[80vh] flex flex-col animate-fade-in-up">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-purple-400">history</span>
                            Lịch sử Webhook
                        </h3>
                        <p className="text-sm text-gray-400">{webhookName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={loadLogs} disabled={loading}>
                            <span className="material-symbols-outlined text-sm">refresh</span>
                        </Button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-4 gap-4 p-4 bg-black/20">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-white">{logs.length}</div>
                        <div className="text-xs text-gray-400">Tổng số</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                            {logs.filter(l => l.status === "SUCCESS").length}
                        </div>
                        <div className="text-xs text-gray-400">Thành công</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">
                            {logs.filter(l => l.status === "FAILED").length}
                        </div>
                        <div className="text-xs text-gray-400">Thất bại</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                            {logs.length > 0
                                ? Math.round(
                                    logs.filter(l => l.responseTime).reduce((sum, l) => sum + (l.responseTime || 0), 0) /
                                    logs.filter(l => l.responseTime).length
                                ) || 0
                                : 0}ms
                        </div>
                        <div className="text-xs text-gray-400">Thời gian TB</div>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                            <p>Chưa có lịch sử webhook nào</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-black/30 sticky top-0">
                                <tr className="text-left text-xs text-gray-400 uppercase">
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3">Sự kiện</th>
                                    <th className="px-4 py-3">Thời gian</th>
                                    <th className="px-4 py-3">Response</th>
                                    <th className="px-4 py-3">Retry</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {logs.map(log => (
                                    <tr
                                        key={log.id}
                                        className="hover:bg-white/5 transition-colors cursor-pointer"
                                        onClick={() => setSelectedLog(log)}
                                    >
                                        <td className="px-4 py-3">
                                            {getStatusBadge(log.status, log.statusCode)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-purple-400 font-mono">
                                                {log.event}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-400">
                                            {new Date(log.createdAt).toLocaleString("vi-VN")}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-400">
                                            {log.responseTime ? `${log.responseTime}ms` : "-"}
                                        </td>
                                        <td className="px-4 py-3">
                                            {log.retryCount > 0 && (
                                                <span className="text-xs text-yellow-400">
                                                    {log.retryCount}x
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {log.status === "FAILED" && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRetry(log.id);
                                                    }}
                                                    disabled={retrying === log.id}
                                                >
                                                    {retrying === log.id ? "..." : "Retry"}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Log Detail Modal */}
                {selectedLog && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4">
                        <div className="bg-slate-900 rounded-xl w-full max-w-2xl max-h-[70vh] flex flex-col border border-white/10">
                            <div className="flex items-center justify-between p-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    {getStatusBadge(selectedLog.status, selectedLog.statusCode)}
                                    <span className="text-white font-medium">{selectedLog.event}</span>
                                </div>
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="p-1 hover:bg-white/10 rounded text-gray-400"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-4 space-y-4">
                                <div>
                                    <h4 className="text-xs text-gray-400 uppercase mb-2">Thông tin</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-gray-500">Thời gian:</span>
                                            <span className="text-white ml-2">
                                                {new Date(selectedLog.createdAt).toLocaleString("vi-VN")}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Response time:</span>
                                            <span className="text-white ml-2">
                                                {selectedLog.responseTime ? `${selectedLog.responseTime}ms` : "N/A"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Status code:</span>
                                            <span className="text-white ml-2">{selectedLog.statusCode || "N/A"}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Retry count:</span>
                                            <span className="text-white ml-2">{selectedLog.retryCount}</span>
                                        </div>
                                    </div>
                                </div>

                                {selectedLog.errorMessage && (
                                    <div>
                                        <h4 className="text-xs text-gray-400 uppercase mb-2">Lỗi</h4>
                                        <pre className="bg-red-500/10 border border-red-500/20 rounded p-3 text-sm text-red-400 overflow-auto">
                                            {selectedLog.errorMessage}
                                        </pre>
                                    </div>
                                )}

                                <div>
                                    <h4 className="text-xs text-gray-400 uppercase mb-2">Payload</h4>
                                    <pre className="bg-black/50 rounded p-3 text-sm text-gray-300 overflow-auto max-h-[200px] font-mono">
                                        {JSON.stringify(selectedLog.payload, null, 2)}
                                    </pre>
                                </div>
                            </div>

                            <div className="p-4 border-t border-white/10 flex justify-end gap-2">
                                {selectedLog.status === "FAILED" && (
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            handleRetry(selectedLog.id);
                                            setSelectedLog(null);
                                        }}
                                    >
                                        Retry
                                    </Button>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => setSelectedLog(null)}>
                                    Đóng
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </GlassCard>
        </div>
    );
}
