/**
 * Cleanup Ephemeral Inboxes Cron Job
 * Phase 5: Public Ephemeral Inbox
 *
 * Runs every 5 minutes to delete expired ephemeral inboxes and messages
 */

import { ephemeralInboxService } from "../services/ephemeral-inbox.service";

let cleanupInterval: NodeJS.Timeout | null = null;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Run cleanup job
 */
async function runCleanup(): Promise<void> {
  const startTime = Date.now();

  try {
    const result = await ephemeralInboxService.cleanupExpired();
    const duration = Date.now() - startTime;

    if (result.deletedInboxes > 0 || result.deletedMessages > 0) {
      console.log(
        `[Ephemeral Cleanup] Deleted ${result.deletedInboxes} inboxes, ${result.deletedMessages} messages in ${duration}ms`
      );
    }
  } catch (error) {
    console.error("[Ephemeral Cleanup] Error:", error);
  }
}

/**
 * Start the cleanup cron job
 */
export function startEphemeralCleanup(): void {
  if (cleanupInterval) {
    console.warn("[Ephemeral Cleanup] Already running");
    return;
  }

  console.log(`[Ephemeral Cleanup] Starting (interval: ${CLEANUP_INTERVAL_MS / 1000}s)`);

  // Run immediately on start
  runCleanup();

  // Schedule recurring cleanup
  cleanupInterval = setInterval(runCleanup, CLEANUP_INTERVAL_MS);
}

/**
 * Stop the cleanup cron job
 */
export function stopEphemeralCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log("[Ephemeral Cleanup] Stopped");
  }
}

/**
 * Get cleanup job status
 */
export function getCleanupStatus(): { running: boolean; intervalMs: number } {
  return {
    running: cleanupInterval !== null,
    intervalMs: CLEANUP_INTERVAL_MS,
  };
}
