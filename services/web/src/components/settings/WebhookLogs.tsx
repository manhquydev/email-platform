/**
 * WebhookLogs - Webhook delivery history modal
 * Modules extracted to webhook-logs-modules/
 */
import {
    type WebhookLogsProps,
    useWebhookLogs,
    WebhookLogsModal
} from "./webhook-logs-modules";

export function WebhookLogs({ webhookId, webhookName, onClose }: WebhookLogsProps) {
    const {
        logs, loading, retrying, selectedLog,
        setSelectedLog, loadLogs, handleRetry
    } = useWebhookLogs(webhookId);

    return (
        <WebhookLogsModal
            webhookName={webhookName}
            loading={loading}
            logs={logs}
            retrying={retrying}
            selectedLog={selectedLog}
            onRefresh={loadLogs}
            onClose={onClose}
            onSelectLog={setSelectedLog}
            onRetry={handleRetry}
        />
    );
}
