/**
 * Custom hook for WebhookLogs data management
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../utils/api";
import { toast } from "react-hot-toast";
import type { WebhookLog } from "./webhook-logs-types";

export function useWebhookLogs(webhookId: string) {
    const { token } = useAuth();
    const [logs, setLogs] = useState<WebhookLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState<string | null>(null);
    const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api<WebhookLog[]>(`/webhooks/${webhookId}/logs`, { token });
            setLogs(Array.isArray(data) ? data : []);
        } catch {
            toast.error("Không thể tải lịch sử webhook");
        } finally {
            setLoading(false);
        }
    }, [webhookId, token]);

    const handleRetry = useCallback(async (logId: string) => {
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
    }, [webhookId, token, loadLogs]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    return {
        logs, loading, retrying, selectedLog,
        setSelectedLog, loadLogs, handleRetry
    };
}
