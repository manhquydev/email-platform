/**
 * System Settings Helper
 * Provides typed access to SystemSetting table with defaults
 */

import { prisma } from "../lib/prisma";

export type InboxLimitMode = "none" | "count" | "days" | "both";

export interface PublicInboxSettings {
  limitMode: InboxLimitMode;
  maxEmails: number;
  maxDays: number;
}

// Default values for settings
const DEFAULTS: Record<string, string> = {
  PUBLIC_INBOX_LIMIT_MODE: "none",
  PUBLIC_INBOX_MAX_EMAILS: "100",
  PUBLIC_INBOX_MAX_DAYS: "7",
  REQUIRE_EMAIL_VERIFICATION: "true", // Default: require verification
};

/**
 * Get a system setting value by key, with default fallback
 */
export async function getSystemSetting(key: string): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  return setting?.value ?? DEFAULTS[key] ?? "";
}

/**
 * Get all public inbox limit settings
 */
export async function getPublicInboxSettings(): Promise<PublicInboxSettings> {
  const [mode, maxEmails, maxDays] = await Promise.all([
    getSystemSetting("PUBLIC_INBOX_LIMIT_MODE"),
    getSystemSetting("PUBLIC_INBOX_MAX_EMAILS"),
    getSystemSetting("PUBLIC_INBOX_MAX_DAYS"),
  ]);

  return {
    limitMode: (mode as InboxLimitMode) || "none",
    maxEmails: parseInt(maxEmails, 10) || 100,
    maxDays: parseInt(maxDays, 10) || 7,
  };
}

/**
 * Calculate date cutoff based on maxDays setting
 */
export function getDateCutoff(maxDays: number): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDays);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
}

/**
 * Check if email verification is required for new registrations
 * Reads from DB (dynamic) with ENV fallback
 */
export async function isEmailVerificationRequired(): Promise<boolean> {
  const value = await getSystemSetting("REQUIRE_EMAIL_VERIFICATION");
  return value.toLowerCase() === "true";
}
