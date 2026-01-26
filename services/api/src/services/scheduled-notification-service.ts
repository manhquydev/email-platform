/**
 * ScheduledNotification Service - Business logic for scheduling notifications
 */
import { prisma } from '../lib/prisma';

export interface ScheduleNotificationPayload {
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'PROMOTION';
  targetMode: 'SPECIFIC' | 'ALL' | 'SEGMENT';
  targetUserId?: string;
  templateId?: string;
  imageUrl?: string;
  scheduledFor: Date;
  createdBy: string;
}

export interface UpdateScheduledPayload {
  title?: string;
  message?: string;
  type?: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'PROMOTION';
  scheduledFor?: Date;
  imageUrl?: string;
}

/**
 * Create a scheduled notification
 */
export async function createScheduledNotification(payload: ScheduleNotificationPayload) {
  // Validate scheduledFor is in the future
  if (payload.scheduledFor <= new Date()) {
    throw new Error('Scheduled time must be in the future');
  }

  return prisma.scheduledNotification.create({
    data: {
      title: payload.title,
      message: payload.message,
      type: payload.type,
      targetMode: payload.targetMode,
      targetUserId: payload.targetUserId ?? null,
      templateId: payload.templateId ?? null,
      imageUrl: payload.imageUrl ?? null,
      scheduledFor: payload.scheduledFor,
      createdBy: payload.createdBy,
      status: 'PENDING',
    },
  });
}

/**
 * List scheduled notifications with optional status filter
 */
export async function listScheduledNotifications(
  status?: 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'FAILED',
  limit = 50,
  offset = 0
) {
  const where = status ? { status } : {};

  const [items, total] = await Promise.all([
    prisma.scheduledNotification.findMany({
      where,
      orderBy: { scheduledFor: 'asc' },
      take: limit,
      skip: offset,
      include: {
        template: { select: { name: true } },
      },
    }),
    prisma.scheduledNotification.count({ where }),
  ]);

  return { items, total };
}

/**
 * Get single scheduled notification by ID
 */
export async function getScheduledNotification(id: string) {
  return prisma.scheduledNotification.findUnique({
    where: { id },
    include: {
      template: true,
    },
  });
}

/**
 * Update scheduled notification (only if PENDING and >5min before execution)
 */
export async function updateScheduledNotification(id: string, payload: UpdateScheduledPayload) {
  const existing = await prisma.scheduledNotification.findUnique({ where: { id } });

  if (!existing) {
    throw new Error('Scheduled notification not found');
  }

  if (existing.status !== 'PENDING') {
    throw new Error('Can only update pending notifications');
  }

  // Check if less than 5 minutes until execution
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  if (existing.scheduledFor <= fiveMinutesFromNow) {
    throw new Error('Cannot update notification within 5 minutes of execution');
  }

  // Validate new scheduledFor if provided
  if (payload.scheduledFor && payload.scheduledFor <= new Date()) {
    throw new Error('Scheduled time must be in the future');
  }

  return prisma.scheduledNotification.update({
    where: { id },
    data: payload,
  });
}

/**
 * Cancel scheduled notification (only if PENDING and >5min before execution)
 */
export async function cancelScheduledNotification(id: string) {
  const existing = await prisma.scheduledNotification.findUnique({ where: { id } });

  if (!existing) {
    throw new Error('Scheduled notification not found');
  }

  if (existing.status !== 'PENDING') {
    throw new Error('Can only cancel pending notifications');
  }

  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  if (existing.scheduledFor <= fiveMinutesFromNow) {
    throw new Error('Cannot cancel notification within 5 minutes of execution');
  }

  return prisma.scheduledNotification.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });
}

/**
 * Get pending notifications that are due for execution
 */
export async function getPendingDueNotifications() {
  const now = new Date();
  return prisma.scheduledNotification.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: { lte: now },
    },
    include: {
      template: true,
    },
  });
}

/**
 * Mark notification as executed
 */
export async function markAsExecuted(id: string) {
  return prisma.scheduledNotification.update({
    where: { id },
    data: {
      status: 'EXECUTED',
      executedAt: new Date(),
    },
  });
}

/**
 * Mark notification as failed
 */
export async function markAsFailed(id: string, _errorMessage?: string) {
  return prisma.scheduledNotification.update({
    where: { id },
    data: {
      status: 'FAILED',
    },
  });
}
