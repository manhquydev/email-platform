/**
 * Admin Backup Routes
 * Backup management, status, and restore functionality
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { exec, execFile, spawn } from "child_process";
import { promisify } from "util";
import { readdir, stat } from "fs/promises";
import { createWriteStream } from "fs";
import { createGzip } from "zlib";
import { join } from "path";
import { recordAudit } from "../../utils/audit";
import { validatePathWithin } from "../../utils/path-validation";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// Backup directory - configurable via env
const BACKUP_DIR = process.env.BACKUP_DIR || "/app/backups";
const CLOUD_BACKUP_SCRIPT = process.env.CLOUD_BACKUP_SCRIPT || "/app/scripts/cloud-backup.sh";

// Container names discovered from `docker ps` must match this allowlist before they are
// passed to execFile — defends against shell-metachar / argument injection.
const CONTAINER_NAME_REGEX = /^[a-zA-Z0-9_.-]+$/;
function isValidContainerName(name: string): boolean {
    return CONTAINER_NAME_REGEX.test(name) && name.length > 0 && name.length <= 64;
}

interface BackupFile {
    name: string;
    size: number;
    sizeFormatted: string;
    createdAt: string;
    type: "postgres" | "redis" | "storage" | "unknown";
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Stream `pg_dump` from a container straight through gzip into the backup file.
 * Uses spawn with an argument array (no shell), so neither the container name nor the
 * output path can be used for command injection, and the dump never buffers in memory.
 */
async function dumpPostgresToGzip(container: string, outFile: string, timeoutMs = 120000): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        const child = spawn(
            "docker",
            ["exec", container, "pg_dump", "-U", "postgres", "-d", "email_service"],
            { stdio: ["ignore", "pipe", "pipe"] },
        );

        const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
        let stderr = "";
        let settled = false;
        const fail = (err: Error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            reject(err);
        };

        child.stderr.on("data", (d) => { stderr += d.toString(); });
        child.on("error", fail);

        const out = createWriteStream(outFile);
        const gzip = createGzip();
        out.on("error", fail);
        gzip.on("error", fail);
        child.stdout.pipe(gzip).pipe(out);

        out.on("finish", () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve();
        });
        child.on("close", (code) => {
            if (code !== 0) fail(new Error(`pg_dump exited with code ${code}: ${stderr.slice(0, 200)}`));
        });
    });
}

export async function adminBackupRoutes(app: FastifyInstance) {
    // Get backup status and list
    app.get("/admin/backup/status", { preHandler: app.requireAdmin }, async (request, reply) => {
        try {
            const localBackups: BackupFile[] = [];

            // List local backups - scan subdirectories (postgres/, redis/, storage/)
            try {
                const scanDirectory = async (dir: string, type: "postgres" | "redis" | "storage") => {
                    try {
                        const dirPath = join(BACKUP_DIR, dir);
                        const files = await readdir(dirPath);
                        for (const file of files) {
                            // Support encrypted files (.gpg) and regular backups
                            if (file.endsWith(".sql.gz") || file.endsWith(".sql.gz.gpg") ||
                                file.endsWith(".rdb") || file.endsWith(".tar.gz") ||
                                file.endsWith(".tar.gz.gpg")) {
                                const filePath = join(dirPath, file);
                                const stats = await stat(filePath);
                                localBackups.push({
                                    name: `${dir}/${file}`,
                                    size: stats.size,
                                    sizeFormatted: formatBytes(stats.size),
                                    createdAt: stats.mtime.toISOString(),
                                    type
                                });
                            }
                        }
                    } catch {
                        // Subdirectory may not exist yet
                    }
                };

                // Scan all subdirectories in parallel
                await Promise.all([
                    scanDirectory("postgres/encrypted", "postgres"),
                    scanDirectory("postgres/daily", "postgres"),
                    scanDirectory("redis", "redis"),
                    scanDirectory("storage", "storage")
                ]);
            } catch {
                // Backup dir may not exist yet
            }

            // Sort by date descending
            localBackups.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            // Check cloud backups via rclone (static command, no user input)
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

            // Get disk usage (static command, no user input)
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
            request.log.error({ err }, "backup status failed");
            return reply.status(500).send({ error: "Failed to get backup status" });
        }
    });

    // Trigger manual backup. Heavy operation (spawns pg_dump / cloud script): cap at a few
    // runs per hour per admin on top of the global limiter.
    app.post(
        "/admin/backup/trigger",
        { preHandler: app.requireAdmin, config: { rateLimit: { max: 3, timeWindow: "1 hour" } } },
        async (request, reply) => {
            const body = z.object({
                type: z.enum(["local", "cloud"]).default("local"),
            }).safeParse(request.body);

            if (!body.success) {
                return reply.status(400).send({ error: "Invalid request" });
            }

            try {
                const userId = (request.user as any).userId;

                if (body.data.type === "cloud") {
                    // Run cloud backup script via execFile (script path passed as an arg, no shell)
                    await execFileAsync("bash", [CLOUD_BACKUP_SCRIPT], { timeout: 300000 });
                    await recordAudit(userId, "BACKUP_CLOUD_TRIGGERED", {});
                    return { success: true, message: "Cloud backup completed successfully" };
                } else {
                    // Find postgres container via execFile + JS-side filtering (no shell pipe)
                    const { stdout: psOut } = await execFileAsync("docker", [
                        "ps", "--format", "{{.Names}}", "--filter", "status=running",
                    ]);
                    const containerName = psOut
                        .split("\n")
                        .map((n) => n.trim())
                        .find((n) => n.includes("postgres"));

                    if (!containerName || !isValidContainerName(containerName)) {
                        return reply.status(500).send({ error: "PostgreSQL container not found" });
                    }

                    // Output path uses a server-generated timestamp only (no user input)
                    const timestamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
                    const backupFile = `${BACKUP_DIR}/backup_postgres_${timestamp}.sql.gz`;

                    await dumpPostgresToGzip(containerName, backupFile);

                    await recordAudit(userId, "BACKUP_LOCAL_TRIGGERED", { file: backupFile });
                    return { success: true, message: "Local backup completed", file: backupFile };
                }
            } catch (err: any) {
                request.log.error({ err }, "backup trigger failed");
                return reply.status(500).send({ error: "Backup failed" });
            }
        },
    );

    // Download backup file
    app.get("/admin/backup/download/:filename", { preHandler: app.requireAdmin }, async (request, reply) => {
        const { filename } = request.params as { filename: string };

        let safeName: string;
        try {
            // Decode first so percent-encoded traversal (%2e%2e / %2f) is caught by the checks below
            safeName = decodeURIComponent(filename);
        } catch {
            return reply.status(400).send({ error: "Invalid filename" });
        }

        if (safeName.includes("..") || safeName.includes("/") || safeName.includes("\\") || safeName.includes("\0")) {
            return reply.status(400).send({ error: "Invalid filename" });
        }

        let filePath: string;
        try {
            filePath = validatePathWithin(BACKUP_DIR, safeName);
        } catch {
            return reply.status(400).send({ error: "Invalid filename" });
        }

        try {
            await stat(filePath);
            await recordAudit((request.user as any).userId, "BACKUP_DOWNLOADED", { filename: safeName });
            return reply.sendFile(safeName, BACKUP_DIR);
        } catch {
            return reply.status(404).send({ error: "Backup file not found" });
        }
    });

    // Delete old backups
    app.delete("/admin/backup/:filename", { preHandler: app.requireAdmin }, async (request, reply) => {
        const { filename } = request.params as { filename: string };

        let safeName: string;
        try {
            safeName = decodeURIComponent(filename);
        } catch {
            return reply.status(400).send({ error: "Invalid filename" });
        }

        if (safeName.includes("..") || safeName.includes("/") || safeName.includes("\\") || safeName.includes("\0")) {
            return reply.status(400).send({ error: "Invalid filename" });
        }

        let filePath: string;
        try {
            filePath = validatePathWithin(BACKUP_DIR, safeName);
        } catch {
            return reply.status(400).send({ error: "Invalid filename" });
        }

        try {
            const { unlink } = await import("fs/promises");
            await unlink(filePath);

            await recordAudit((request.user as any).userId, "BACKUP_DELETED", { filename: safeName });

            return { success: true, message: "Backup deleted" };
        } catch {
            return reply.status(404).send({ error: "Backup file not found" });
        }
    });

    // Get backup logs (static command, no user input)
    app.get("/admin/backup/logs", { preHandler: app.requireAdmin }, async (request, reply) => {
        try {
            const { stdout } = await execAsync("tail -100 /var/log/cloud-backup.log 2>/dev/null || echo 'No logs available'");
            return { logs: stdout };
        } catch {
            return { logs: "Unable to read backup logs" };
        }
    });
}
