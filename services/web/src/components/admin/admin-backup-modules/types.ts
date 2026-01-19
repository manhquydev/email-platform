/**
 * Types for Admin Backup management
 */

export interface BackupFile {
    name: string;
    size: number;
    sizeFormatted: string;
    createdAt: string;
    type: "postgres" | "redis" | "unknown";
}

export interface BackupStatus {
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
