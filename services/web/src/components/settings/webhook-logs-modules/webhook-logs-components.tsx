/**
 * UI components for WebhookLogs
 */
import { GlassCard } from "../../ui/GlassCard";
import { Button } from "../../ui/Button";
import type { WebhookLog, LogStatus } from "./webhook-logs-types";
import { getLogStatus, calculateLogStats } from "./webhook-logs-types";

/** Status badge component */
export function StatusBadge({ status, statusCode }: { status: LogStatus; statusCode?: number }) {
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
}

/** Modal header */
interface ModalHeaderProps {
    webhookName: string;
    loading: boolean;
    onRefresh: () => void;
    onClose: () => void;
}

export function ModalHeader({ webhookName, loading, onRefresh, onClose }: ModalHeaderProps) {
    return (
        <div className="flex items-center justify-between p-4 border-b border-nebula-border">
            <div>
                <h3 className="text-lg font-bold text-nebula-text flex items-center gap-2">
                    <span className="material-symbols-outlined text-nebula-violet">history</span>
                    Lịch sử Webhook
                </h3>
                <p className="text-sm text-nebula-text-muted">{webhookName}</p>
            </div>
            <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={onRefresh} disabled={loading}>
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
    );
}

/** Stats summary bar */
export function StatsSummary({ logs }: { logs: WebhookLog[] }) {
    const stats = calculateLogStats(logs);
    return (
        <div className="grid grid-cols-4 gap-4 p-4 bg-nebula-elevated">
            <div className="text-center">
                <div className="text-2xl font-bold text-nebula-text">{stats.total}</div>
                <div className="text-xs text-nebula-text-muted">Tổng số</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold text-success">{stats.successCount}</div>
                <div className="text-xs text-nebula-text-muted">Thành công</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold text-danger">{stats.failedCount}</div>
                <div className="text-xs text-nebula-text-muted">Thất bại</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold text-info">{stats.avgDuration}ms</div>
                <div className="text-xs text-nebula-text-muted">Thời gian TB</div>
            </div>
        </div>
    );
}

/** Logs table */
interface LogsTableProps {
    logs: WebhookLog[];
    loading: boolean;
    retrying: string | null;
    onSelectLog: (log: WebhookLog) => void;
    onRetry: (logId: string) => void;
}

export function LogsTable({ logs, loading, retrying, onSelectLog, onRetry }: LogsTableProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-nebula-violet"></div>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-center py-12 text-nebula-text-muted">
                <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                <p>Chưa có lịch sử webhook nào</p>
            </div>
        );
    }

    return (
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
                            onClick={() => onSelectLog(log)}
                        >
                            <td className="px-4 py-3"><StatusBadge status={status} statusCode={log.statusCode} /></td>
                            <td className="px-4 py-3">
                                <span className="text-sm text-nebula-violet font-mono">{log.eventType}</span>
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
                                        onClick={(e) => { e.stopPropagation(); onRetry(log.id); }}
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
    );
}

/** Log detail modal */
interface LogDetailModalProps {
    log: WebhookLog | null;
    onClose: () => void;
    onRetry: (logId: string) => void;
}

export function LogDetailModal({ log, onClose, onRetry }: LogDetailModalProps) {
    if (!log) return null;
    const status = getLogStatus(log);

    return (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-nebula-surface rounded-xl w-full max-w-2xl max-h-[70vh] flex flex-col border border-nebula-border">
                <div className="flex items-center justify-between p-4 border-b border-nebula-border">
                    <div className="flex items-center gap-3">
                        <StatusBadge status={status} statusCode={log.statusCode} />
                        <span className="text-nebula-text font-medium">{log.eventType}</span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-nebula-elevated rounded text-nebula-text-muted">
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-4">
                    <div>
                        <h4 className="text-xs text-nebula-text-muted uppercase mb-2">Thông tin</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-nebula-text-muted">Thời gian:</span>
                                <span className="text-nebula-text ml-2">{new Date(log.createdAt).toLocaleString("vi-VN")}</span>
                            </div>
                            <div>
                                <span className="text-nebula-text-muted">Response time:</span>
                                <span className="text-nebula-text ml-2">{log.duration ? `${log.duration}ms` : "N/A"}</span>
                            </div>
                            <div>
                                <span className="text-nebula-text-muted">Status code:</span>
                                <span className="text-nebula-text ml-2">{log.statusCode || "N/A"}</span>
                            </div>
                        </div>
                    </div>

                    {log.responseBody && status === "FAILED" && (
                        <div>
                            <h4 className="text-xs text-nebula-text-muted uppercase mb-2">Response</h4>
                            <pre className="bg-danger/10 border border-danger/20 rounded p-3 text-sm text-danger overflow-auto max-h-[100px]">
                                {log.responseBody}
                            </pre>
                        </div>
                    )}

                    <div>
                        <h4 className="text-xs text-nebula-text-muted uppercase mb-2">Payload</h4>
                        <pre className="bg-nebula-elevated rounded p-3 text-sm text-nebula-text-secondary overflow-auto max-h-[200px] font-mono">
                            {JSON.stringify(log.payload, null, 2)}
                        </pre>
                    </div>
                </div>

                <div className="p-4 border-t border-nebula-border flex justify-end gap-2">
                    {status === "FAILED" && (
                        <Button size="sm" onClick={() => { onRetry(log.id); onClose(); }}>Retry</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={onClose}>Đóng</Button>
                </div>
            </div>
        </div>
    );
}

/** Main modal wrapper */
interface WebhookLogsModalProps {
    webhookName: string;
    loading: boolean;
    logs: WebhookLog[];
    retrying: string | null;
    selectedLog: WebhookLog | null;
    onRefresh: () => void;
    onClose: () => void;
    onSelectLog: (log: WebhookLog | null) => void;
    onRetry: (logId: string) => void;
}

export function WebhookLogsModal({
    webhookName, loading, logs, retrying, selectedLog,
    onRefresh, onClose, onSelectLog, onRetry
}: WebhookLogsModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <GlassCard className="w-full max-w-4xl max-h-[80vh] flex flex-col animate-fade-in-up">
                <ModalHeader webhookName={webhookName} loading={loading} onRefresh={onRefresh} onClose={onClose} />
                <StatsSummary logs={logs} />
                <div className="flex-1 overflow-auto">
                    <LogsTable logs={logs} loading={loading} retrying={retrying} onSelectLog={onSelectLog} onRetry={onRetry} />
                </div>
                <LogDetailModal log={selectedLog} onClose={() => onSelectLog(null)} onRetry={onRetry} />
            </GlassCard>
        </div>
    );
}
