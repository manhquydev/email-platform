import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { appConfig } from '../config';

const execAsync = promisify(exec);

export interface BackupConfig {
    databaseUrl: string;
    backupDir: string;
    retentionDays: number;
    s3Bucket?: string;
    gcsBucket?: string;
    webhookUrl?: string;
}

export interface BackupResult {
    success: boolean;
    backupFile?: string;
    size?: string;
    error?: string;
    timestamp: Date;
}

export class BackupService {
    private config: BackupConfig;

    constructor() {
        this.config = {
            databaseUrl: process.env.DATABASE_URL || '',
            backupDir: process.env.BACKUP_DIR || path.join(process.cwd(), 'backups'),
            retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
            s3Bucket: process.env.S3_BACKUP_BUCKET,
            gcsBucket: process.env.GCS_BACKUP_BUCKET,
            webhookUrl: process.env.BACKUP_NOTIFICATION_WEBHOOK,
        };

        // Ensure backup directory exists
        if (!existsSync(this.config.backupDir)) {
            mkdirSync(this.config.backupDir, { recursive: true });
        }
    }

    /**
     * Create a database backup
     */
    async backupDatabase(name?: string): Promise<BackupResult> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupName = name || `backup_${timestamp}`;
        const backupFile = path.join(this.config.backupDir, `${backupName}.sql`);

        try {
            // Build pg_dump command
            const cmd = `pg_dump \
                --format=custom \
                --compress=9 \
                --no-password \
                --verbose \
                --file="${backupFile}" \
                "${this.config.databaseUrl}"`;

            // Set password environment variable
            const env = {
                ...process.env,
                PGPASSWORD: this.extractPasswordFromUrl(this.config.databaseUrl),
            };

            // Execute backup
            const { stdout, stderr } = await execAsync(cmd, { env });

            // Verify backup was created
            if (!existsSync(backupFile)) {
                return {
                    success: false,
                    error: 'Backup file was not created',
                    timestamp: new Date(),
                };
            }

            // Get backup size
            const { size } = await execAsync(`du -h "${backupFile}"`);

            // Create checksum
            await execAsync(`sha256sum "${backupFile}" > "${backupFile}.sha256"`);

            // Clean up old backups
            await this.cleanupOldBackups();

            // Upload to cloud if configured
            if (this.config.s3Bucket || this.config.gcsBucket) {
                await this.uploadToCloud(backupFile);
            }

            // Send notification
            if (this.config.webhookUrl) {
                await this.sendNotification({
                    type: 'database',
                    file: backupFile,
                    size: size.trim(),
                    timestamp: new Date(),
                });
            }

            return {
                success: true,
                backupFile,
                size: size.trim(),
                timestamp: new Date(),
            };

        } catch (error: any) {
            console.error('Database backup failed:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date(),
            };
        }
    }

    /**
     * Backup storage directory
     */
    async backupStorage(name?: string): Promise<BackupResult> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupName = name || `storage_backup_${timestamp}`;
        const backupFile = path.join(this.config.backupDir, `${backupName}.tar.gz`);
        const storageDir = appConfig.storageDir;

        try {
            // Check if storage directory exists
            if (!existsSync(storageDir)) {
                return {
                    success: false,
                    error: `Storage directory not found: ${storageDir}`,
                    timestamp: new Date(),
                };
            }

            // Create tar archive with exclusions
            const cmd = `tar \
                --exclude="*.tmp" \
                --exclude="*.temp" \
                --exclude="cache/*" \
                --exclude="temp/*" \
                --exclude="*.pid" \
                --exclude="*.sock" \
                -czf "${backupFile}" \
                -C "$(dirname "${storageDir}")" \
                "$(basename "${storageDir}")"`

            const { stdout, stderr } = await execAsync(cmd);

            // Verify backup was created
            if (!existsSync(backupFile)) {
                return {
                    success: false,
                    error: 'Storage backup file was not created',
                    timestamp: new Date(),
                };
            }

            // Get backup size
            const { stdout: sizeOutput } = await execAsync(`du -h "${backupFile}"`);
            const size = sizeOutput.trim();

            // Create checksum
            await execAsync(`sha256sum "${backupFile}" > "${backupFile}.sha256"`);

            // Clean up old storage backups
            await this.cleanupOldBackups('storage_backup_');

            // Upload to cloud if configured
            if (this.config.s3Bucket || this.config.gcsBucket) {
                await this.uploadToCloud(backupFile, 'storage-backups/');
            }

            // Send notification
            if (this.config.webhookUrl) {
                await this.sendNotification({
                    type: 'storage',
                    file: backupFile,
                    size: size.trim(),
                    timestamp: new Date(),
                });
            }

            return {
                success: true,
                backupFile,
                size: size.trim(),
                timestamp: new Date(),
            };

        } catch (error: any) {
            console.error('Storage backup failed:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date(),
            };
        }
    }

    /**
     * List available backups
     */
    async listBackups(type: 'database' | 'storage' = 'database'): Promise<string[]> {
        const prefix = type === 'storage' ? 'storage_backup_' : 'backup_';
        const extension = type === 'storage' ? '.tar.gz' : '.sql';

        try {
            const { stdout } = await execAsync(
                `find "${this.config.backupDir}" -name "${prefix}*${extension}" -type f -printf "%T@ %p\\n" | sort -nr | cut -d' ' -f2-`
            );

            return stdout.trim().split('\n').filter(Boolean);
        } catch (error) {
            return [];
        }
    }

    /**
     * Restore from backup
     */
    async restoreDatabase(backupFile: string): Promise<BackupResult> {
        try {
            const fullPath = backupFile.startsWith('/') ? backupFile :
                path.join(this.config.backupDir, backupFile);

            if (!existsSync(fullPath)) {
                return {
                    success: false,
                    error: 'Backup file not found',
                    timestamp: new Date(),
                };
            }

            // Verify integrity
            const checksumFile = `${fullPath}.sha256`;
            if (existsSync(checksumFile)) {
                await execAsync(`sha256sum -c "${checksumFile}"`);
            }

            // Create pre-restore backup
            const preRestoreName = `pre_restore_${Date.now()}`;
            await this.backupDatabase(preRestoreName);

            // Extract database info from URL
            const { host, port, user, database } = this.parseDatabaseUrl(this.config.databaseUrl);

            // Build restore command
            const cmd = `pg_restore \
                --host="${host}" \
                --port="${port}" \
                --username="${user}" \
                --dbname="${database}" \
                --verbose \
                --clean \
                --if-exists \
                --no-password \
                "${fullPath}"`;

            const env = {
                ...process.env,
                PGPASSWORD: this.extractPasswordFromUrl(this.config.databaseUrl),
            };

            await execAsync(cmd, { env });

            return {
                success: true,
                timestamp: new Date(),
            };

        } catch (error: any) {
            console.error('Database restore failed:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date(),
            };
        }
    }

    /**
     * Clean up old backups
     */
    private async cleanupOldBackups(prefix: string = 'backup_'): Promise<void> {
        try {
            await execAsync(
                `find "${this.config.backupDir}" -name "${prefix}*" -type f -mtime +${this.config.retentionDays} -delete`
            );
        } catch (error) {
            console.warn('Failed to cleanup old backups:', error);
        }
    }

    /**
     * Upload backup to cloud storage
     */
    private async uploadToCloud(filePath: string, prefix: string = 'database-backups/'): Promise<void> {
        try {
            if (this.config.s3Bucket) {
                await execAsync(`aws s3 cp "${filePath}" "s3://${this.config.s3Bucket}/${prefix}"`);
                await execAsync(`aws s3 cp "${filePath}.sha256" "s3://${this.config.s3Bucket}/${prefix}"`);
            }

            if (this.config.gcsBucket) {
                await execAsync(`gsutil cp "${filePath}" "gs://${this.config.gcsBucket}/${prefix}"`);
                await execAsync(`gsutil cp "${filePath}.sha256" "gs://${this.config.gcsBucket}/${prefix}"`);
            }
        } catch (error) {
            console.warn('Failed to upload to cloud storage:', error);
        }
    }

    /**
     * Send backup notification
     */
    private async sendNotification(data: {
        type: 'database' | 'storage';
        file: string;
        size: string;
        timestamp: Date;
    }): Promise<void> {
        try {
            const payload = {
                text: `${data.type === 'database' ? 'Database' : 'Storage'} backup completed successfully`,
                attachments: [
                    {
                        color: 'good',
                        fields: [
                            { title: 'File', value: data.file, short: true },
                            { title: 'Size', value: data.size, short: true },
                            { title: 'Type', value: data.type, short: true },
                            { title: 'Time', value: data.timestamp.toISOString(), short: true },
                        ],
                    },
                ],
            };

            await execAsync(
                `curl -X POST -H "Content-Type: application/json" -d '${JSON.stringify(payload)}' "${this.config.webhookUrl}"`
            );
        } catch (error) {
            console.warn('Failed to send notification:', error);
        }
    }

    /**
     * Extract password from database URL
     */
    private extractPasswordFromUrl(url: string): string {
        const match = url.match(/postgresql:\/\/[^:]*:([^@]+)@/);
        return match ? match[1] : '';
    }

    /**
     * Parse database URL into components
     */
    private parseDatabaseUrl(url: string): {
        host: string;
        port: string;
        user: string;
        database: string;
    } {
        const urlObj = new URL(url);
        return {
            host: urlObj.hostname || 'localhost',
            port: urlObj.port || '5432',
            user: urlObj.username || 'postgres',
            database: urlObj.pathname.slice(1) || 'email_service',
        };
    }
}

export const backupService = new BackupService();