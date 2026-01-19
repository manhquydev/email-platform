/**
 * UI components for Admin Backup management
 */
import { GlassCard, PremiumButton } from "../AdminUIComponents";
import type { BackupFile, BackupStatus } from "./types";

// --- Status Overview Cards ---
interface StatusOverviewProps {
    status: BackupStatus | null;
    timeSinceLastBackup: number | null;
}

export function StatusOverview({ status, timeSinceLastBackup }: StatusOverviewProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Last Backup */}
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

            {/* Next Backup */}
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

            {/* Disk Usage */}
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

            {/* Cloud Status */}
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
    );
}

// --- Quick Actions Bar ---
interface QuickActionsProps {
    actionLoading: string | null;
    rcloneConfigured: boolean;
    onTriggerBackup: (type: "local" | "cloud") => void;
    onLoadLogs: () => void;
    onRefresh: () => void;
}

export function QuickActions({ actionLoading, rcloneConfigured, onTriggerBackup, onLoadLogs, onRefresh }: QuickActionsProps) {
    return (
        <GlassCard>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-nebula-text">Hành động nhanh</h3>
            </div>
            <div className="flex flex-wrap gap-3">
                <PremiumButton onClick={() => onTriggerBackup("local")} disabled={actionLoading !== null} size="sm">
                    {actionLoading === "local" ? (
                        <><SpinnerIcon /> Đang backup...</>
                    ) : (
                        <><DatabaseIcon /> Backup Local</>
                    )}
                </PremiumButton>

                <PremiumButton onClick={() => onTriggerBackup("cloud")} disabled={actionLoading !== null || !rcloneConfigured} variant="secondary" size="sm">
                    {actionLoading === "cloud" ? (
                        <><SpinnerIcon /> Đang backup...</>
                    ) : (
                        <><CloudUploadIcon /> Backup Cloud</>
                    )}
                </PremiumButton>

                <PremiumButton onClick={onLoadLogs} variant="secondary" size="sm">
                    <LogsIcon /> Xem Logs
                </PremiumButton>

                <PremiumButton onClick={onRefresh} variant="secondary" size="sm">
                    <RefreshIcon /> Refresh
                </PremiumButton>
            </div>
        </GlassCard>
    );
}

// --- Backup List Component ---
interface BackupListProps {
    title: string;
    icon: React.ReactNode;
    backups: BackupFile[];
    emptyMessage: string;
    showActions?: boolean;
    actionLoading?: string | null;
    onDownload?: (filename: string) => void;
    onDelete?: (filename: string) => void;
    notConfigured?: boolean;
}

export function BackupList({ title, icon, backups, emptyMessage, showActions, actionLoading, onDownload, onDelete, notConfigured }: BackupListProps) {
    return (
        <GlassCard>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-nebula-text flex items-center gap-2">
                    {icon}
                    {title}
                </h3>
                <span className="text-xs text-nebula-text-muted">{backups.length} files</span>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {notConfigured ? (
                    <div className="text-sm text-amber-400 text-center py-8">
                        <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Cloud backup chưa được cấu hình
                    </div>
                ) : backups.length === 0 ? (
                    <div className="text-sm text-nebula-text-muted text-center py-8">{emptyMessage}</div>
                ) : (
                    backups.map((backup, i) => (
                        <BackupItem
                            key={`${backup.name}-${i}`}
                            backup={backup}
                            showActions={showActions}
                            actionLoading={actionLoading}
                            onDownload={onDownload}
                            onDelete={onDelete}
                        />
                    ))
                )}
            </div>
        </GlassCard>
    );
}

// --- Single Backup Item ---
interface BackupItemProps {
    backup: BackupFile;
    showActions?: boolean;
    actionLoading?: string | null;
    onDownload?: (filename: string) => void;
    onDelete?: (filename: string) => void;
}

function BackupItem({ backup, showActions, actionLoading, onDownload, onDelete }: BackupItemProps) {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all">
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{backup.name}</div>
                <div className="text-xs text-nebula-text-muted flex gap-3">
                    <span>{backup.sizeFormatted}</span>
                    {backup.createdAt && <span>{new Date(backup.createdAt).toLocaleString("vi-VN")}</span>}
                </div>
            </div>
            {showActions && onDownload && onDelete ? (
                <div className="flex gap-1 ml-2">
                    <button onClick={() => onDownload(backup.name)} className="p-2 rounded-lg hover:bg-white/10 transition-colors text-blue-400" title="Download">
                        <DownloadIcon />
                    </button>
                    <button onClick={() => onDelete(backup.name)} disabled={actionLoading === backup.name} className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-red-400" title="Delete">
                        <DeleteIcon />
                    </button>
                </div>
            ) : (
                <span className={`text-xs px-2 py-1 rounded-full ${
                    backup.type === "postgres" ? "bg-blue-500/20 text-blue-400" :
                    backup.type === "redis" ? "bg-red-500/20 text-red-400" :
                    "bg-gray-500/20 text-gray-400"
                }`}>
                    {backup.type}
                </span>
            )}
        </div>
    );
}

// --- Info Card ---
export function BackupInfoCard() {
    return (
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
    );
}

// --- Logs Modal ---
interface LogsModalProps {
    logs: string;
    onClose: () => void;
}

export function LogsModal({ logs, onClose }: LogsModalProps) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-nebula-surface border border-white/10 rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="font-semibold">Backup Logs</h3>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
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
    );
}

// --- Icons ---
function SpinnerIcon() {
    return (
        <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

function DatabaseIcon() {
    return (
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </svg>
    );
}

function CloudUploadIcon() {
    return (
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
    );
}

function LogsIcon() {
    return (
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    );
}

function RefreshIcon() {
    return (
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
    );
}

function DownloadIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
    );
}

function DeleteIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    );
}

export function LocalStorageIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
    );
}

export function CloudIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
    );
}
