/**
 * Custom hook for Admin Backup data and actions
 */
import { useState, useEffect, useCallback } from "react";
import { api, API_BASE } from "../../../utils/api";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import toast from "react-hot-toast";
import type { BackupStatus } from "./types";

export function useAdminBackupData(token: string) {
    const [status, setStatus] = useState<BackupStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [logs, setLogs] = useState<string>("");
    const [showLogs, setShowLogs] = useState(false);

    const loadStatus = useCallback(async () => {
        try {
            const res = await api<{ status: BackupStatus }>("/admin/backup/status", { token });
            setStatus(res.status);
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadStatus();
        const interval = setInterval(loadStatus, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [loadStatus]);

    const triggerBackup = async (type: "local" | "cloud") => {
        setActionLoading(type);
        try {
            await api("/admin/backup/trigger", {
                method: "POST",
                token,
                body: { type }
            });
            toast.success(type === "cloud" ? "Cloud backup hoàn tất!" : "Local backup hoàn tất!");
            await loadStatus();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setActionLoading(null);
        }
    };

    const deleteBackup = async (filename: string) => {
        if (!confirm(`Xác nhận xóa backup: ${filename}?`)) return;

        setActionLoading(filename);
        try {
            await api(`/admin/backup/${encodeURIComponent(filename)}`, {
                method: "DELETE",
                token
            });
            toast.success("Đã xóa backup");
            await loadStatus();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setActionLoading(null);
        }
    };

    const downloadBackup = (filename: string) => {
        window.open(`${API_BASE}/admin/backup/download/${encodeURIComponent(filename)}?token=${token}`, "_blank");
    };

    const loadLogs = async () => {
        try {
            const res = await api<{ logs: string }>("/admin/backup/logs", { token });
            setLogs(res.logs);
            setShowLogs(true);
        } catch {
            toast.error("Không thể tải logs");
        }
    };

    const closeLogs = () => setShowLogs(false);

    // Calculate time since last backup
    const timeSinceLastBackup = status?.lastBackupTime
        ? Math.round((Date.now() - new Date(status.lastBackupTime).getTime()) / 1000 / 60 / 60)
        : null;

    return {
        status,
        loading,
        actionLoading,
        logs,
        showLogs,
        timeSinceLastBackup,
        loadStatus,
        triggerBackup,
        deleteBackup,
        downloadBackup,
        loadLogs,
        closeLogs
    };
}
