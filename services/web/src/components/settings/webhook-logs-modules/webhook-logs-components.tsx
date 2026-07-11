/**
 * UI components for WebhookLogs
 */
import { GlassCard } from "../../ui/GlassCard";
import { Button } from "../../ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "../../ui/Table";
import type { WebhookLog, LogStatus } from "./webhook-logs-types";
import { getLogStatus, calculateLogStats } from "./webhook-logs-types";

/** Status badge component */
export function StatusBadge({ status, statusCode }: { status: LogStatus; statusCode?: number }) {
    switch (status) {
        case "SUCCESS":
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-semantic-success-subtle text-semantic-success rounded-full">
                    <span className="w-1.5 h-1.5 bg-semantic-success rounded-full"></span>
                    {statusCode || "OK"}
                </span>
            );
        case "FAILED":
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-semantic-danger-subtle text-semantic-danger rounded-full">
                    <span className="w-1.5 h-1.5 bg-semantic-danger rounded-full"></span>
                    {statusCode || "Failed"}
                </span>
            );
        case "PENDING":
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-semantic-warning-subtle text-semantic-warning rounded-full">
                    <span className="w-1.5 h-1.5 bg-semantic-warning rounded-full animate-pulse"></span>
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
        <div className="flex items-center justify-between p-4 border-b border-semantic-border">
            <div>
                <h3 className="text-lg font-bold text-semantic-text-main flex items-center gap-2">
                    <span className="material-symbols-outlined text-semantic-accent">history</span>
                    Lịch sử Webhook
                </h3>
                <p className="text-sm text-semantic-text-muted">{webhookName}</p>
            </div>
            <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={onRefresh} disabled={loading}>
                    <span className="material-symbols-outlined text-sm">refresh</span>
                </Button>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-semantic-bg-hover rounded-lg text-semantic-text-muted hover:text-semantic-text-main transition-colors"
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
        <div className="grid grid-cols-4 gap-4 p-4 bg-semantic-bg-secondary">
            <div className="text-center">
                <div className="text-2xl font-bold text-semantic-text-main">{stats.total}</div>
                <div className="text-xs text-semantic-text-muted">Tổng số</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold text-semantic-success">{stats.successCount}</div>
                <div className="text-xs text-semantic-text-muted">Thành công</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold text-semantic-danger">{stats.failedCount}</div>
                <div className="text-xs text-semantic-text-muted">Thất bại</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold text-semantic-info">{stats.avgDuration}ms</div>
                <div className="text-xs text-semantic-text-muted">Thời gian TB</div>
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
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-semantic-accent"></div>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-center py-12 text-semantic-text-muted">
                <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                <p>Chưa có lịch sử webhook nào</p>
            </div>
        );
    }

    return (
        <Table className="border-none rounded-none">
            <TableCaption>Lịch sử gửi webhook</TableCaption>
            <TableHeader className="sticky top-0">
                <tr>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Sự kiện</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead aria-hidden="true"></TableHead>
                </tr>
            </TableHeader>
            <TableBody>
                {logs.map(log => {
                    const status = getLogStatus(log);
                    return (
                        <TableRow
                            key={log.id}
                            className="cursor-pointer"
                            onClick={() => onSelectLog(log)}
                        >
                            <TableCell><StatusBadge status={status} statusCode={log.statusCode} /></TableCell>
                            <TableCell>
                                <span className="text-sm text-semantic-accent-text font-mono">{log.eventType}</span>
                            </TableCell>
                            <TableCell className="text-sm text-semantic-text-muted">
                                {new Date(log.createdAt).toLocaleString("vi-VN")}
                            </TableCell>
                            <TableCell className="text-sm text-semantic-text-muted">
                                {log.duration ? `${log.duration}ms` : "-"}
                            </TableCell>
                            <TableCell>
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
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
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
            <div className="bg-semantic-bg-elevated rounded-xl w-full max-w-2xl max-h-[70vh] flex flex-col border border-semantic-border">
                <div className="flex items-center justify-between p-4 border-b border-semantic-border">
                    <div className="flex items-center gap-3">
                        <StatusBadge status={status} statusCode={log.statusCode} />
                        <span className="text-semantic-text-main font-medium">{log.eventType}</span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-semantic-bg-hover rounded text-semantic-text-muted">
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-4">
                    <div>
                        <h4 className="text-xs text-semantic-text-muted uppercase mb-2">Thông tin</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-semantic-text-muted">Thời gian:</span>
                                <span className="text-semantic-text-main ml-2">{new Date(log.createdAt).toLocaleString("vi-VN")}</span>
                            </div>
                            <div>
                                <span className="text-semantic-text-muted">Response time:</span>
                                <span className="text-semantic-text-main ml-2">{log.duration ? `${log.duration}ms` : "N/A"}</span>
                            </div>
                            <div>
                                <span className="text-semantic-text-muted">Status code:</span>
                                <span className="text-semantic-text-main ml-2">{log.statusCode || "N/A"}</span>
                            </div>
                        </div>
                    </div>

                    {log.responseBody && status === "FAILED" && (
                        <div>
                            <h4 className="text-xs text-semantic-text-muted uppercase mb-2">Response</h4>
                            <pre className="bg-semantic-danger-subtle border border-semantic-danger/20 rounded p-3 text-sm text-semantic-danger overflow-auto max-h-[100px]">
                                {log.responseBody}
                            </pre>
                        </div>
                    )}

                    <div>
                        <h4 className="text-xs text-semantic-text-muted uppercase mb-2">Payload</h4>
                        <pre className="bg-semantic-bg-secondary rounded p-3 text-sm text-semantic-text-secondary overflow-auto max-h-[200px] font-mono">
                            {JSON.stringify(log.payload, null, 2)}
                        </pre>
                    </div>
                </div>

                <div className="p-4 border-t border-semantic-border flex justify-end gap-2">
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
