/**
 * Types and helpers for WebhookLogs
 */

export interface WebhookLog {
    id: string;
    webhookId: string;
    eventType: string;
    statusCode?: number;
    responseBody?: string;
    duration?: number;
    payload: Record<string, unknown>;
    createdAt: string;
}

export type LogStatus = "SUCCESS" | "FAILED" | "PENDING";

export interface WebhookLogsProps {
    webhookId: string;
    webhookName: string;
    onClose: () => void;
}

/** Derive status from statusCode */
export function getLogStatus(log: WebhookLog): LogStatus {
    if (!log.statusCode) return "PENDING";
    if (log.statusCode >= 200 && log.statusCode < 300) return "SUCCESS";
    return "FAILED";
}

/** Calculate stats from logs */
export function calculateLogStats(logs: WebhookLog[]) {
    const successCount = logs.filter(l => getLogStatus(l) === "SUCCESS").length;
    const failedCount = logs.filter(l => getLogStatus(l) === "FAILED").length;
    const logsWithDuration = logs.filter(l => l.duration);
    const avgDuration = logsWithDuration.length > 0
        ? Math.round(logsWithDuration.reduce((sum, l) => sum + (l.duration || 0), 0) / logsWithDuration.length)
        : 0;

    return { total: logs.length, successCount, failedCount, avgDuration };
}
