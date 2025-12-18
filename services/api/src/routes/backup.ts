/**
 * Backup Routes
 * Handles backup and restore operations
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { backupService } from '../services/backupService';

const createBackupSchema = z.object({
    type: z.enum(['database', 'storage']),
    name: z.string().optional(),
});

const restoreSchema = z.object({
    backupFile: z.string(),
});

export const backupRoutes: FastifyPluginAsync = async (app) => {
    // Create backup
    app.post('/backups', { preHandler: app.requireAdmin }, async (req: FastifyRequest, reply: FastifyReply) => {
        const body = createBackupSchema.parse(req.body);

        const result = await backupService.backupDatabase(
            body.type === 'storage' ? undefined : body.name
        );

        if (body.type === 'storage') {
            const storageResult = await backupService.backupStorage(body.name);
            return {
                database: result,
                storage: storageResult,
            };
        }

        return result;
    });

    // Create database backup
    app.post('/backups/database', { preHandler: app.requireAdmin }, async (req: FastifyRequest, reply: FastifyReply) => {
        const body = createBackupSchema.parse(req.body);
        const result = await backupService.backupDatabase(body.name);

        if (!result.success) {
            return reply.status(500).send(result);
        }

        return result;
    });

    // Create storage backup
    app.post('/backups/storage', { preHandler: app.requireAdmin }, async (req: FastifyRequest, reply: FastifyReply) => {
        const body = createBackupSchema.parse(req.body);
        const result = await backupService.backupStorage(body.name);

        if (!result.success) {
            return reply.status(500).send(result);
        }

        return result;
    });

    // List backups
    app.get('/backups', { preHandler: app.requireAdmin }, async (req: FastifyRequest, reply: FastifyReply) => {
        const type = (req.query as any).type as 'database' | 'storage' || 'database';

        const [databaseBackups, storageBackups] = await Promise.all([
            backupService.listBackups('database'),
            backupService.listBackups('storage'),
        ]);

        return {
            database: databaseBackups,
            storage: storageBackups,
            count: {
                database: databaseBackups.length,
                storage: storageBackups.length,
            },
        };
    });

    // Restore database
    app.post('/backups/restore', { preHandler: app.requireAdmin }, async (req: FastifyRequest, reply: FastifyReply) => {
        const body = restoreSchema.parse(req.body);

        // DANGEROUS OPERATION - Require additional confirmation
        const confirmHeader = req.headers['x-confirm-restore'];
        if (confirmHeader !== 'YES-I-UNDERSTAND-THE-RISKS') {
            return reply.status(400).send({
                error: 'Missing confirmation header',
                message: 'Add header: X-Confirm-Restore: YES-I-UNDERSTAND-THE-RISKS',
                warning: 'This will DELETE ALL current data and restore from backup',
            });
        }

        const result = await backupService.restoreDatabase(body.backupFile);

        if (!result.success) {
            return reply.status(500).send(result);
        }

        return {
            success: true,
            message: 'Database restored successfully. Please restart the application.',
            restoredFrom: body.backupFile,
            timestamp: new Date(),
        };
    });

    // Download backup
    app.get('/backups/download/:filename', { preHandler: app.requireAdmin }, async (req: FastifyRequest, reply: FastifyReply) => {
        const { filename } = req.params as { filename: string };

        // Validate filename to prevent directory traversal
        if (!/^[a-zA-Z0-9_.-]+$/.test(filename)) {
            return reply.status(400).send({ error: 'Invalid filename' });
        }

        const filePath = `/app/backups/${filename}`;

        try {
            const fs = require('fs');
            if (!fs.existsSync(filePath)) {
                return reply.status(404).send({ error: 'Backup file not found' });
            }

            // Set appropriate headers
            const stat = fs.statSync(filePath);
            reply.header('Content-Type', 'application/octet-stream');
            reply.header('Content-Length', stat.size);
            reply.header('Content-Disposition', `attachment; filename="${filename}"`);

            // Stream the file
            const fileStream = fs.createReadStream(filePath);
            return reply.send(fileStream);

        } catch (error: any) {
            app.log.error('Error downloading backup:', error);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // Delete backup
    app.delete('/backups/:filename', { preHandler: app.requireAdmin }, async (req: FastifyRequest, reply: FastifyReply) => {
        const { filename } = req.params as { filename: string };

        // Validate filename
        if (!/^[a-zA-Z0-9_.-]+$/.test(filename)) {
            return reply.status(400).send({ error: 'Invalid filename' });
        }

        const filePath = `/app/backups/${filename}`;
        const checksumPath = `${filePath}.sha256`;

        try {
            const fs = require('fs');
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            // Delete backup file
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // Delete checksum file
            if (fs.existsSync(checksumPath)) {
                fs.unlinkSync(checksumPath);
            }

            return { success: true, message: 'Backup deleted successfully' };

        } catch (error: any) {
            app.log.error('Error deleting backup:', error);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // Backup status and configuration
    app.get('/backups/status', { preHandler: app.requireAdmin }, async () => {
        const [databaseBackups, storageBackups] = await Promise.all([
            backupService.listBackups('database'),
            backupService.listBackups('storage'),
        ]);

        const fs = require('fs');

        // Calculate total backup size
        let totalSize = 0;
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            const { stdout } = await execAsync(`du -sb /app/backups 2>/dev/null | cut -f1`);
            totalSize = parseInt(stdout) || 0;
        } catch (error) {
            // Directory might not exist
        }

        return {
            config: {
                backupDir: '/app/backups',
                retentionDays: process.env.BACKUP_RETENTION_DAYS || 30,
                s3Enabled: !!process.env.S3_BACKUP_BUCKET,
                gcsEnabled: !!process.env.GCS_BACKUP_BUCKET,
                notificationsEnabled: !!process.env.BACKUP_NOTIFICATION_WEBHOOK,
            },
            status: {
                databaseBackups: databaseBackups.length,
                storageBackups: storageBackups.length,
                totalSizeBytes: totalSize,
                totalSizeHuman: formatBytes(totalSize),
                lastDatabaseBackup: databaseBackups[0] || null,
                lastStorageBackup: storageBackups[0] || null,
            },
        };
    });
};

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}