/**
 * Notification Scheduler Cron - Executes pending scheduled notifications
 */
import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import {
  getPendingDueNotifications,
  markAsExecuted,
  markAsFailed,
} from '../services/scheduled-notification-service';

let isRunning = false;

/**
 * Execute a single scheduled notification
 */
async function executeScheduledNotification(scheduled: {
  id: string;
  title: string;
  message: string;
  type: string;
  targetMode: string;
  targetUserId: string | null;
  imageUrl: string | null;
}) {
  const { id, title, message, type, targetMode, targetUserId, imageUrl } = scheduled;

  try {
    if (targetMode === 'single' && targetUserId) {
      // Send to single user
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          title,
          message,
          type: type as 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'PROMOTION',
          imageUrl,
        },
      });
    } else {
      // Send to all users
      const users = await prisma.user.findMany({ select: { id: true } });
      await prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          title,
          message,
          type: type as 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'PROMOTION',
          imageUrl,
        })),
      });
    }

    await markAsExecuted(id);
    console.log(`[Scheduler] Executed notification ${id}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await markAsFailed(id, errorMsg);
    console.error(`[Scheduler] Failed notification ${id}:`, errorMsg);
  }
}

/**
 * Process all pending due notifications
 */
async function processPendingNotifications() {
  if (isRunning) {
    console.log('[Scheduler] Previous run still in progress, skipping');
    return;
  }

  isRunning = true;

  try {
    const pending = await getPendingDueNotifications();

    if (pending.length === 0) {
      return;
    }

    console.log(`[Scheduler] Processing ${pending.length} pending notifications`);

    for (const scheduled of pending) {
      await executeScheduledNotification(scheduled);
    }
  } catch (error) {
    console.error('[Scheduler] Error processing notifications:', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Check for past-due notifications on startup
 */
async function processPastDueOnStartup() {
  console.log('[Scheduler] Checking for past-due notifications...');
  await processPendingNotifications();
}

/**
 * Start the notification scheduler cron job
 * Runs every minute to check for due notifications
 */
export function startNotificationScheduler() {
  // Process any past-due notifications immediately on startup
  processPastDueOnStartup();

  // Schedule to run every minute
  cron.schedule('* * * * *', processPendingNotifications);

  console.log('[Scheduler] Notification scheduler started (runs every minute)');
}

/**
 * Stop the scheduler (for graceful shutdown)
 */
export function stopNotificationScheduler() {
  // node-cron tasks are stopped when process exits
  console.log('[Scheduler] Notification scheduler stopped');
}
