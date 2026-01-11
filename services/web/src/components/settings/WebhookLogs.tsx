import { useState, useEffect } from "react";
import { GlassCard } from "../ui/GlassCard";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import { toast } from "react-hot-toast";

interface WebhookLog {
    id: string;
    webhookId: string;
    eventType: string;
    statusCode?: number;
    responseBody?: string;
    duration?: number;
    payload: Record<string, unknown>;
    createdAt: string;
}

type LogStatus = "SUCCESS" | "FAILED" | "PENDING";

interface WebhookLogsProps {
    webhookId: string;
    webhookName: string;
    onClose: () => void;
}

// Helper function to derive status from statusCode
function getLogStatus(log: WebhookLog): LogStatus {
    if (!log.statusCode) return "PENDING";
    if (log.statusCode >= 200 && log.statusCode < 300) return "SUCCESS";
    return "FAILED";
}

export function WebhookLogs({ webhookId, webhookName, onClose }: WebhookLogsProps) {
    const { token } = useAuth();
    const [logs, setLogs] = useState<WebhookLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState<string | null>(null);
    const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

    useEffect(() => {
        loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [webhookId]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            // Backend returns array directly, not { logs: [] }
            const data = await api<WebhookLog[]>(`/webhooks/${webhookId}/logs`, { token });
            setLogs(Array.isArray(data) ? data : []);
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

    const getStatusBadge = (status: LogStatus, statusCode?: number) => {
        switch (status) {
            case "SUCCESS":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-success/10 text-success rounded-full">
                        <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                        {statusCode || "OK"}
                    </span>
                );
            case "FAILED":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-danger/10 text-danger rounded-full">
                        <span className="w-1.5 h-1.5 bg-danger rounded-full"></span>
                        {statusCode || "Failed"}
                    </span>
                );
            case "PENDING":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-warning/10 text-warning rounded-full">
                        <span className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse"></span>
                        Pending
                    </span>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <GlassCard className="w-full max-w-4xl max-h-[80vh] flex flex-col animate-fade-in-up">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-nebula-border">
                    <div>
                        <h3 className="text-lg font-bold text-nebula-text flex items-center gap-2">
                            <span className="material-symbols-outlined text-nebula-violet">history</span>
                            Lịch sử Webhook
                        </h3>
                        <p className="text-sm text-nebula-text-muted">{webhookName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={loadLogs} disabled={loading}>
                            <span className="material-symbols-outlined text-sm">refresh</span>
                        </Button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-nebula-elevated rounded-lg text-nebula-text-muted hover:text-nebula-text transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-4 gap-4 p-4 bg-nebula-elevated">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-nebula-text">{logs.length}</div>
                        <div className="text-xs text-nebula-text-muted">Tổng số</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-success">
                            {logs.filter(l => getLogStatus(l) === "SUCCESS").length}
                        </div>
                        <div className="text-xs text-nebula-text-muted">Thành công</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-danger">
                            {logs.filter(l => getLogStatus(l) === "FAILED").length}
                        </div>
                        <div className="text-xs text-nebula-text-muted">Thất bại</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-info">
                            {logs.length > 0
                                ? Math.round(
                                    logs.filter(l => l.duration).reduce((sum, l) => sum + (l.duration || 0), 0) /
                                    logs.filter(l => l.duration).length
                                ) || 0
                                : 0}ms
                        </div>
                        <div className="text-xs text-nebula-text-muted">Thời gian TB</div>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-nebula-violet"></div>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12 text-nebula-text-muted">
                            <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                            <p>Chưa có lịch sử webhook nào</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-nebula-elevated sticky top-0">
                                <tr className="text-left text-xs text-nebula-text-muted uppercase">
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3">Sự kiện</th>
                                    <th className="px-4 py-3">Thời gian</th>
                                    <th className="px-4 py-3">Response</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-nebula-border">
                                {logs.map(log => {
                                    const status = getLogStatus(log);
                                    return (
                                        <tr
                                            key={log.id}
                                            className="hover:bg-nebula-elevated transition-colors cursor-pointer"
                                            onClick={() => setSelectedLog(log)}
                                        >
                                            <td className="px-4 py-3">
                                                {getStatusBadge(status, log.statusCode)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-nebula-violet font-mono">
                                                    {log.eventType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-nebula-text-muted">
                                                {new Date(log.createdAt).toLocaleString("vi-VN")}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-nebula-text-muted">
                                                {log.duration ? `${log.duration}ms` : "-"}
                                            </td>
                                            <td className="px-4 py-3">
                                                {status === "FAILED" && (
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
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Log Detail Modal */}
                {selectedLog && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4">
                        <div className="bg-nebula-surface rounded-xl w-full max-w-2xl max-h-[70vh] flex flex-col border border-nebula-border">
                            <div className="flex items-center justify-between p-4 border-b border-nebula-border">
                                <div className="flex items-center gap-3">
                                    {getStatusBadge(getLogStatus(selectedLog), selectedLog.statusCode)}
                                    <span className="text-nebula-text font-medium">{selectedLog.eventType}</span>
                                </div>
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="p-1 hover:bg-nebula-elevated rounded text-nebula-text-muted"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-4 space-y-4">
                                <div>
                                    <h4 className="text-xs text-nebula-text-muted uppercase mb-2">Thông tin</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-nebula-text-muted">Thời gian:</span>
                                            <span className="text-nebula-text ml-2">
                                                {new Date(selectedLog.createdAt).toLocaleString("vi-VN")}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-nebula-text-muted">Response time:</span>
                                            <span className="text-nebula-text ml-2">
                                                {selectedLog.duration ? `${selectedLog.duration}ms` : "N/A"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-nebula-text-muted">Status code:</span>
                                            <span className="text-nebula-text ml-2">{selectedLog.statusCode || "N/A"}</span>
                                        </div>
                                    </div>
                                </div>

                                {selectedLog.responseBody && getLogStatus(selectedLog) === "FAILED" && (
                                    <div>
                                        <h4 className="text-xs text-nebula-text-muted uppercase mb-2">Response</h4>
                                        <pre className="bg-danger/10 border border-danger/20 rounded p-3 text-sm text-danger overflow-auto max-h-[100px]">
                                            {selectedLog.responseBody}
                                        </pre>
                                    </div>
                                )}

                                <div>
                                    <h4 className="text-xs text-nebula-text-muted uppercase mb-2">Payload</h4>
                                    <pre className="bg-nebula-elevated rounded p-3 text-sm text-nebula-text-secondary overflow-auto max-h-[200px] font-mono">
                                        {JSON.stringify(selectedLog.payload, null, 2)}
                                    </pre>
                                </div>
                            </div>

                            <div className="p-4 border-t border-nebula-border flex justify-end gap-2">
                                {getLogStatus(selectedLog) === "FAILED" && (
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
