/**
 * Admin Backup Routes
 * Backup management, status, and restore functionality
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { recordAudit } from "../../utils/audit";

const execAsync = promisify(exec);

// Backup directory - configurable via env
const BACKUP_DIR = process.env.BACKUP_DIR || "/app/backups";
const CLOUD_BACKUP_SCRIPT = process.env.CLOUD_BACKUP_SCRIPT || "/app/scripts/cloud-backup.sh";

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

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export async function adminBackupRoutes(app: FastifyInstance) {
    // Get backup status and list
    app.get("/admin/backup/status", { preHandler: app.requireAdmin }, async (request, reply) => {
        try {
            const localBackups: BackupFile[] = [];

            // List local backups
            try {
                const files = await readdir(BACKUP_DIR);
                for (const file of files) {
                    if (file.endsWith(".sql.gz") || file.endsWith(".rdb")) {
                        const filePath = join(BACKUP_DIR, file);
                        const stats = await stat(filePath);
                        localBackups.push({
                            name: file,
                            size: stats.size,
                            sizeFormatted: formatBytes(stats.size),
                            createdAt: stats.mtime.toISOString(),
                            type: file.includes("postgres") ? "postgres" :
                                  file.includes("redis") ? "redis" : "unknown"
                        });
                    }
                }
            } catch {
                // Backup dir may not exist yet
            }

            // Sort by date descending
            localBackups.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            // Check cloud backups via rclone
            let cloudBackups: BackupFile[] = [];
            let rcloneConfigured = false;

            try {
                const { stdout } = await execAsync("rclone ls gdrive:email-platform-backups/ --max-depth 2 2>/dev/null || echo ''", {
                    timeout: 30000
                });

                if (stdout.trim()) {
                    rcloneConfigured = true;
                    const lines = stdout.trim().split("\n").filter(l => l.trim());
                    for (const line of lines) {
                        const match = line.trim().match(/(\d+)\s+(.+)/);
                        if (match) {
                            const size = parseInt(match[1]);
                            const name = match[2];
                            cloudBackups.push({
                                name,
                                size,
                                sizeFormatted: formatBytes(size),
                                createdAt: "", // rclone ls doesn't provide dates
                                type: name.includes("postgres") ? "postgres" :
                                      name.includes("redis") ? "redis" : "unknown"
                            });
                        }
                    }
                }
            } catch {
                // rclone not configured or failed
            }

            // Get disk usage
            let diskUsage = { used: 0, available: 0, percentage: 0 };
            try {
                const { stdout } = await execAsync("df -B1 / | tail -1");
                const parts = stdout.trim().split(/\s+/);
                if (parts.length >= 4) {
                    const total = parseInt(parts[1]) || 0;
                    const used = parseInt(parts[2]) || 0;
                    const available = parseInt(parts[3]) || 0;
                    diskUsage = {
                        used: Math.round(used / 1024 / 1024 / 1024),
                        available: Math.round(available / 1024 / 1024 / 1024),
                        percentage: total > 0 ? Math.round((used / total) * 100) : 0
                    };
                }
            } catch {
                // Ignore disk check errors
            }

            // Last backup time
            const lastBackupTime = localBackups.length > 0 ? localBackups[0].createdAt : null;

            // Next scheduled backup (3 AM daily)
            const now = new Date();
            const next3AM = new Date(now);
            next3AM.setHours(3, 0, 0, 0);
            if (next3AM <= now) {
                next3AM.setDate(next3AM.getDate() + 1);
            }

            return {
                status: {
                    localBackups: localBackups.slice(0, 20), // Last 20
                    cloudBackups: cloudBackups.slice(0, 20),
                    lastBackupTime,
                    nextScheduledBackup: next3AM.toISOString(),
                    diskUsage,
                    rcloneConfigured
                }
            };
        } catch (err: any) {
            return reply.status(500).send({ error: "Failed to get backup status: " + err.message });
        }
    });

    // Trigger manual backup
    app.post("/admin/backup/trigger", { preHandler: app.requireAdmin }, async (request, reply) => {
        const body = z.object({
            type: z.enum(["local", "cloud"]).default("local"),
        }).safeParse(request.body);

        if (!body.success) {
            return reply.status(400).send({ error: "Invalid request" });
        }

        try {
            const userId = (request.user as any).userId;

            if (body.data.type === "cloud") {
                // Run cloud backup script
                await execAsync(`bash ${CLOUD_BACKUP_SCRIPT}`, { timeout: 300000 });
                await recordAudit(userId, "BACKUP_CLOUD_TRIGGERED", {});
                return { success: true, message: "Cloud backup completed successfully" };
            } else {
                // Run local backup only
                const timestamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
                const backupFile = `${BACKUP_DIR}/backup_postgres_${timestamp}.sql.gz`;

                // Find postgres container
                const { stdout: containerName } = await execAsync(
                    "docker ps --format '{{.Names}}' | grep postgres | head -1"
                );

                if (!containerName.trim()) {
                    return reply.status(500).send({ error: "PostgreSQL container not found" });
                }

                // Run pg_dump
                await execAsync(
                    `docker exec ${containerName.trim()} pg_dump -U postgres -d email_service | gzip > ${backupFile}`,
                    { timeout: 120000 }
                );

                await recordAudit(userId, "BACKUP_LOCAL_TRIGGERED", { file: backupFile });
                return { success: true, message: "Local backup completed", file: backupFile };
            }
        } catch (err: any) {
            return reply.status(500).send({ error: "Backup failed: " + err.message });
        }
    });

    // Download backup file
    app.get("/admin/backup/download/:filename", { preHandler: app.requireAdmin }, async (request, reply) => {
        const { filename } = request.params as { filename: string };

        // Security: prevent path traversal
        if (filename.includes("..") || filename.includes("/")) {
            return reply.status(400).send({ error: "Invalid filename" });
        }

        const filePath = join(BACKUP_DIR, filename);

        try {
            await stat(filePath);

            await recordAudit((request.user as any).userId, "BACKUP_DOWNLOADED", { filename });

            return reply.sendFile(filename, BACKUP_DIR);
        } catch {
            return reply.status(404).send({ error: "Backup file not found" });
        }
    });

    // Delete old backups
    app.delete("/admin/backup/:filename", { preHandler: app.requireAdmin }, async (request, reply) => {
        const { filename } = request.params as { filename: string };

        // Security: prevent path traversal
        if (filename.includes("..") || filename.includes("/")) {
            return reply.status(400).send({ error: "Invalid filename" });
        }

        const filePath = join(BACKUP_DIR, filename);

        try {
            const { unlink } = await import("fs/promises");
            await unlink(filePath);

            await recordAudit((request.user as any).userId, "BACKUP_DELETED", { filename });

            return { success: true, message: "Backup deleted" };
        } catch {
            return reply.status(404).send({ error: "Backup file not found" });
        }
    });

    // Get backup logs
    app.get("/admin/backup/logs", { preHandler: app.requireAdmin }, async (request, reply) => {
        try {
            const { stdout } = await execAsync("tail -100 /var/log/cloud-backup.log 2>/dev/null || echo 'No logs available'");
            return { logs: stdout };
        } catch {
            return { logs: "Unable to read backup logs" };
        }
    });
}
