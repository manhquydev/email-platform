/**
 * Admin Backup Management - Main component
 * Modules extracted to admin-backup-modules/
 */
import { LoadingSpinner, SectionHeader } from "./AdminUIComponents";
import {
    useAdminBackupData,
    StatusOverview,
    QuickActions,
    BackupList,
    BackupInfoCard,
    LogsModal,
    LocalStorageIcon,
    CloudIcon
} from "./admin-backup-modules";

export function AdminBackup({ token }: { token: string }) {
    const {
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
    } = useAdminBackupData(token);

    if (loading && !status) return <LoadingSpinner />;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <SectionHeader
                title="Quản lý Backup"
                subtitle="Sao lưu và khôi phục dữ liệu hệ thống"
            />

            {/* Status Overview */}
            <StatusOverview status={status} timeSinceLastBackup={timeSinceLastBackup} />

            {/* Quick Actions */}
            <QuickActions
                actionLoading={actionLoading}
                rcloneConfigured={status?.rcloneConfigured || false}
                onTriggerBackup={triggerBackup}
                onLoadLogs={loadLogs}
                onRefresh={loadStatus}
            />

            {/* Backup Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BackupList
                    title="Local Backups"
                    icon={<LocalStorageIcon />}
                    backups={status?.localBackups || []}
                    emptyMessage="Chưa có backup local"
                    showActions
                    actionLoading={actionLoading}
                    onDownload={downloadBackup}
                    onDelete={deleteBackup}
                />

                <BackupList
                    title="Cloud Backups (Google Drive)"
                    icon={<CloudIcon />}
                    backups={status?.cloudBackups || []}
                    emptyMessage="Chưa có backup trên cloud"
                    notConfigured={!status?.rcloneConfigured}
                />
            </div>

            {/* Backup Info */}
            <BackupInfoCard />

            {/* Logs Modal */}
            {showLogs && <LogsModal logs={logs} onClose={closeLogs} />}
        </div>
    );
}
