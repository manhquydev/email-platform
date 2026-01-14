import { useState, useEffect, useCallback } from "react";
import { api, API_BASE } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import {
    GlassCard, SectionHeader, PremiumButton, LoadingSpinner
} from "./AdminUIComponents";

interface BackupFile {
    name: string;
    size: number;
    sizeFormatted: string;
    createdAt: string;
    type: "postgres" | "redis" | "unknown";
}

interface BackupStatus {
    localBackups: BackupFile[];
    cloudBackups: BackupFile[];
    lastBackupTime: string | null;
    nextScheduledBackup: string;
    diskUsage: {
        used: number;
        available: number;
        percentage: number;
    };
    rcloneConfigured: boolean;
}

export function AdminBackup({ token }: { token: string }) {
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

    if (loading && !status) return <LoadingSpinner />;

    const timeSinceLastBackup = status?.lastBackupTime
        ? Math.round((Date.now() - new Date(status.lastBackupTime).getTime()) / 1000 / 60 / 60)
        : null;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <SectionHeader
                title="Quản lý Backup"
                subtitle="Sao lưu và khôi phục dữ liệu hệ thống"
            />

            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <GlassCard className="p-4">
                    <div className="text-xs text-nebula-text-muted mb-1">Backup gần nhất</div>
                    <div className="text-lg font-semibold">
                        {timeSinceLastBackup !== null ? (
                            <span className={timeSinceLastBackup > 12 ? "text-amber-400" : "text-green-400"}>
                                {timeSinceLastBackup}h trước
                            </span>
                        ) : (
                            <span className="text-red-400">Chưa có</span>
                        )}
                    </div>
                </GlassCard>

                <GlassCard className="p-4">
                    <div className="text-xs text-nebula-text-muted mb-1">Backup tiếp theo</div>
                    <div className="text-lg font-semibold text-blue-400">
                        {status?.nextScheduledBackup
                            ? new Date(status.nextScheduledBackup).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit"
                            })
                            : "N/A"}
                    </div>
                </GlassCard>

                <GlassCard className="p-4">
                    <div className="text-xs text-nebula-text-muted mb-1">Disk Usage</div>
                    <div className="text-lg font-semibold">
                        <span className={status?.diskUsage.percentage && status.diskUsage.percentage > 80 ? "text-red-400" : "text-green-400"}>
                            {status?.diskUsage.percentage || 0}%
                        </span>
                        <span className="text-xs text-nebula-text-muted ml-2">
                            ({status?.diskUsage.available || 0}GB free)
                        </span>
                    </div>
                </GlassCard>

                <GlassCard className="p-4">
                    <div className="text-xs text-nebula-text-muted mb-1">Cloud Backup</div>
                    <div className="text-lg font-semibold">
                        {status?.rcloneConfigured ? (
                            <span className="text-green-400 flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Đã cấu hình
                            </span>
                        ) : (
                            <span className="text-amber-400">Chưa cấu hình</span>
                        )}
                    </div>
                </GlassCard>
            </div>

            {/* Quick Actions */}
            <GlassCard>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-nebula-text">Hành động nhanh</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                    <PremiumButton
                        onClick={() => triggerBackup("local")}
                        disabled={actionLoading !== null}
                        size="sm"
                    >
                        {actionLoading === "local" ? (
                            <>
                                <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Đang backup...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                </svg>
                                Backup Local
                            </>
                        )}
                    </PremiumButton>

                    <PremiumButton
                        onClick={() => triggerBackup("cloud")}
                        disabled={actionLoading !== null || !status?.rcloneConfigured}
                        variant="secondary"
                        size="sm"
                    >
                        {actionLoading === "cloud" ? (
                            <>
                                <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Đang backup...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                Backup Cloud
                            </>
                        )}
                    </PremiumButton>

                    <PremiumButton
                        onClick={loadLogs}
                        variant="secondary"
                        size="sm"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Xem Logs
                    </PremiumButton>

                    <PremiumButton
                        onClick={loadStatus}
                        variant="secondary"
                        size="sm"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </PremiumButton>
                </div>
            </GlassCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Local Backups */}
                <GlassCard>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-nebula-text flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            Local Backups
                        </h3>
                        <span className="text-xs text-nebula-text-muted">
                            {status?.localBackups.length || 0} files
                        </span>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {status?.localBackups.length === 0 ? (
                            <div className="text-sm text-nebula-text-muted text-center py-8">
                                Chưa có backup local
                            </div>
                        ) : (
                            status?.localBackups.map((backup) => (
                                <div
                                    key={backup.name}
                                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{backup.name}</div>
                                        <div className="text-xs text-nebula-text-muted flex gap-3">
                                            <span>{backup.sizeFormatted}</span>
                                            <span>
                                                {new Date(backup.createdAt).toLocaleString("vi-VN")}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                        <button
                                            onClick={() => downloadBackup(backup.name)}
                                            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-blue-400"
                                            title="Download"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => deleteBackup(backup.name)}
                                            disabled={actionLoading === backup.name}
                                            className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-red-400"
                                            title="Delete"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </GlassCard>

                {/* Cloud Backups */}
                <GlassCard>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-nebula-text flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                            </svg>
                            Cloud Backups (Google Drive)
                        </h3>
                        <span className="text-xs text-nebula-text-muted">
                            {status?.cloudBackups.length || 0} files
                        </span>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {!status?.rcloneConfigured ? (
                            <div className="text-sm text-amber-400 text-center py-8">
                                <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Cloud backup chưa được cấu hình
                            </div>
                        ) : status?.cloudBackups.length === 0 ? (
                            <div className="text-sm text-nebula-text-muted text-center py-8">
                                Chưa có backup trên cloud
                            </div>
                        ) : (
                            status?.cloudBackups.map((backup, i) => (
                                <div
                                    key={`${backup.name}-${i}`}
                                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{backup.name}</div>
                                        <div className="text-xs text-nebula-text-muted">
                                            {backup.sizeFormatted}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                            backup.type === "postgres" ? "bg-blue-500/20 text-blue-400" :
                                            backup.type === "redis" ? "bg-red-500/20 text-red-400" :
                                            "bg-gray-500/20 text-gray-400"
                                        }`}>
                                            {backup.type}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </GlassCard>
            </div>

            {/* Backup Info */}
            <GlassCard>
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-200">
                    <strong>Thông tin Backup:</strong>
                    <ul className="list-disc ml-4 mt-2 space-y-1 text-blue-200/80">
                        <li><strong>Local backup:</strong> Tự động mỗi 6 giờ, giữ 7 ngày</li>
                        <li><strong>Cloud backup:</strong> Tự động 3:00 AM hàng ngày, giữ 30 ngày</li>
                        <li><strong>Restore:</strong> Tải backup về và chạy: <code className="bg-white/10 px-1 rounded">gunzip -c backup.sql.gz | docker exec -i postgres psql -U postgres</code></li>
                    </ul>
                </div>
            </GlassCard>

            {/* Logs Modal */}
            {showLogs && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-nebula-surface border border-white/10 rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="font-semibold">Backup Logs</h3>
                            <button
                                onClick={() => setShowLogs(false)}
                                className="p-2 rounded-lg hover:bg-white/10"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <pre className="p-4 text-xs font-mono overflow-auto max-h-[60vh] bg-black/20">
                            {logs || "No logs available"}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}
