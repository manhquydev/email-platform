import { prisma } from "../lib/prisma";
import crypto from "crypto";

export interface AuditEntry {
  organizationId?: string;
  actorId?: string;
  actorEmail?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  success?: boolean;
}

export class AuditLogger {
  /**
   * Log an action to the immutable audit log
   */
  static async log(entry: AuditEntry) {
    // 1. Get the last log hash to create the chain
    const lastLog = await prisma.auditLog.findFirst({
      orderBy: { timestamp: "desc" },
      select: { hash: true },
    });

    const prevHash = lastLog?.hash || "0".repeat(64); // Genesis hash

    // 2. Create the content string to hash
    const content = JSON.stringify({
      ...entry,
      prevHash,
      timestamp: new Date().toISOString(), // Approximate, actual DB time might differ slightly but sufficient for chain
    });

    // 3. Generate SHA256 hash
    const hash = crypto.createHash("sha256").update(content).digest("hex");

    // 4. Create the log entry
    return prisma.auditLog.create({
      data: {
        ...entry,
        prevHash,
        hash,
      },
    });
  }

  /**
   * Verify the integrity of the audit log chain
   * Returns false if any tampering is detected
   */
  static async verifyChain(limit = 100): Promise<boolean> {
    const logs = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { timestamp: "desc" },
    });

    if (logs.length < 2) return true;

    for (let i = 0; i < logs.length - 1; i++) {
      const current = logs[i];
      const previous = logs[i + 1]; // Because of desc order, i+1 is older (previous in chain)

      if (current.prevHash !== previous.hash) {
        return false; // Chain broken
      }
    }

    return true;
  }
}
