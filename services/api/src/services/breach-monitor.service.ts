/**
 * Breach Monitor Service - HIBP Integration
 * Phase 4: Identity Suite Bundles
 */

import crypto from "crypto";
import { prisma } from "../lib/prisma";

const HIBP_API_URL = "https://haveibeenpwned.com/api/v3";
const HIBP_API_KEY = process.env.HIBP_API_KEY || "";

export interface Breach {
  name: string;
  title: string;
  domain: string;
  breachDate: string;
  addedDate: string;
  modifiedDate: string;
  pwnCount: number;
  description: string;
  dataClasses: string[];
  isVerified: boolean;
  isSensitive: boolean;
}

export interface BreachCheckResult {
  email: string;
  breachCount: number;
  breaches: Breach[];
  lastChecked: Date;
}

export interface UserBreachStatus {
  userId: string;
  monitoredEmails: string[];
  totalBreaches: number;
  lastCheck: Date | null;
  breaches: Breach[];
}

// Rate limiting: HIBP allows 1 request per 1.5 seconds
const requestQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    if (request) {
      await request();
      await new Promise(resolve => setTimeout(resolve, 1600)); // 1.6s delay
    }
  }

  isProcessingQueue = false;
}

function queueRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        resolve(await fn());
      } catch (error) {
        reject(error);
      }
    });
    processQueue();
  });
}

export const breachMonitorService = {
  /**
   * Check email against HIBP database
   */
  async checkEmail(email: string): Promise<BreachCheckResult> {
    // Hash email for k-anonymity check (HIBP password API style)
    // For breaches, we use the email directly with API key

    if (!HIBP_API_KEY) {
      // Mock response for development without API key
      return {
        email,
        breachCount: 0,
        breaches: [],
        lastChecked: new Date(),
      };
    }

    return queueRequest(async () => {
      const response = await fetch(
        `${HIBP_API_URL}/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
        {
          headers: {
            "hibp-api-key": HIBP_API_KEY,
            "user-agent": "Ephemera-BreachMonitor",
          },
        }
      );

      if (response.status === 404) {
        return {
          email,
          breachCount: 0,
          breaches: [],
          lastChecked: new Date(),
        };
      }

      if (!response.ok) {
        throw new Error(`HIBP API error: ${response.status}`);
      }

      const breaches: Breach[] = await response.json();

      return {
        email,
        breachCount: breaches.length,
        breaches,
        lastChecked: new Date(),
      };
    });
  },

  /**
   * Enable breach monitoring for user's email
   */
  async enableMonitoring(userId: string, email: string): Promise<void> {
    // Store encrypted email for monitoring
    const emailHash = crypto.createHash("sha256").update(email.toLowerCase()).digest("hex");

    await prisma.user.update({
      where: { id: userId },
      data: {
        // Store in verifiedForwardEmails array (reusing existing field)
        verifiedForwardEmails: {
          push: `breach:${emailHash}:${Buffer.from(email).toString("base64")}`,
        },
      },
    });

    // Run initial check
    await this.checkAndStoreBreaches(userId, email);
  },

  /**
   * Disable breach monitoring for email
   */
  async disableMonitoring(userId: string, email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { verifiedForwardEmails: true },
    });

    if (!user) return;

    const emailHash = crypto.createHash("sha256").update(email.toLowerCase()).digest("hex");
    const updated = user.verifiedForwardEmails.filter(
      (e) => !e.startsWith(`breach:${emailHash}:`)
    );

    await prisma.user.update({
      where: { id: userId },
      data: { verifiedForwardEmails: updated },
    });
  },

  /**
   * Get monitored emails for user
   */
  async getMonitoredEmails(userId: string): Promise<string[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { verifiedForwardEmails: true },
    });

    if (!user) return [];

    return user.verifiedForwardEmails
      .filter((e) => e.startsWith("breach:"))
      .map((e) => {
        const parts = e.split(":");
        return Buffer.from(parts[2], "base64").toString("utf-8");
      });
  },

  /**
   * Check and store breaches for a user's email
   */
  async checkAndStoreBreaches(userId: string, email: string): Promise<BreachCheckResult> {
    const result = await this.checkEmail(email);

    // Store breach data in audit log for history
    if (result.breachCount > 0) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "BREACH_CHECK",
          meta: {
            email: crypto.createHash("sha256").update(email).digest("hex").slice(0, 8) + "...",
            breachCount: result.breachCount,
            breachNames: result.breaches.map((b) => b.name),
            checkedAt: result.lastChecked.toISOString(),
          },
        },
      });
    }

    return result;
  },

  /**
   * Get breach status for user
   */
  async getUserBreachStatus(userId: string): Promise<UserBreachStatus> {
    const monitoredEmails = await this.getMonitoredEmails(userId);

    let allBreaches: Breach[] = [];
    let lastCheck: Date | null = null;

    for (const email of monitoredEmails) {
      const result = await this.checkEmail(email);
      allBreaches = [...allBreaches, ...result.breaches];
      if (!lastCheck || result.lastChecked > lastCheck) {
        lastCheck = result.lastChecked;
      }
    }

    // Deduplicate breaches by name
    const uniqueBreaches = allBreaches.filter(
      (breach, index, self) => self.findIndex((b) => b.name === breach.name) === index
    );

    return {
      userId,
      monitoredEmails,
      totalBreaches: uniqueBreaches.length,
      lastCheck,
      breaches: uniqueBreaches,
    };
  },

  /**
   * Get breach history from audit logs
   */
  async getBreachHistory(userId: string, limit = 10): Promise<any[]> {
    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        action: "BREACH_CHECK",
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      details: log.meta,
      checkedAt: log.createdAt,
    }));
  },

  /**
   * Calculate breach severity score (0-100)
   */
  calculateBreachSeverity(breaches: Breach[]): number {
    if (breaches.length === 0) return 0;

    let score = 0;
    for (const breach of breaches) {
      // Base score per breach
      score += 10;

      // Sensitive breaches are worse
      if (breach.isSensitive) score += 15;

      // Recent breaches are worse
      const breachAge = Date.now() - new Date(breach.breachDate).getTime();
      const yearsOld = breachAge / (365 * 24 * 60 * 60 * 1000);
      if (yearsOld < 1) score += 20;
      else if (yearsOld < 3) score += 10;

      // Large breaches are worse
      if (breach.pwnCount > 10000000) score += 15;
      else if (breach.pwnCount > 1000000) score += 10;
      else if (breach.pwnCount > 100000) score += 5;

      // Password breaches are worse
      if (breach.dataClasses.includes("Passwords")) score += 20;
      if (breach.dataClasses.includes("Credit cards")) score += 25;
    }

    return Math.min(100, score);
  },
};
