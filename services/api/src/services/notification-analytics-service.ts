/**
 * Notification Analytics Service
 * Aggregates notification statistics for the analytics dashboard
 */

import { prisma } from '../lib/prisma';

export interface AnalyticsDateRange {
    from: Date;
    to: Date;
}

export interface AnalyticsSummary {
    totalSent: number;
    deliveryRate: number;
    acknowledgeRate: number;
    trend: {
        sent: number;      // % change vs previous period
        rate: number;      // % change vs previous period
    };
}

export interface DailyVolume {
    date: string;
    sent: number;
    delivered: number;
    failed: number;
}

export interface ChannelBreakdown {
    channel: string;
    count: number;
    rate: number;
}

export interface FailureReason {
    reason: string;
    count: number;
}

export interface TemplatePerformance {
    templateId: string;
    templateName: string;
    sent: number;
    deliveryRate: number;
    acknowledgeRate: number;
}

export interface NotificationAnalytics {
    summary: AnalyticsSummary;
    dailyVolume: DailyVolume[];
    channelBreakdown: ChannelBreakdown[];
    failureReasons: FailureReason[];
    templatePerformance: TemplatePerformance[];
}

/**
 * Get summary statistics for the date range
 */
async function getSummaryStats(range: AnalyticsDateRange): Promise<AnalyticsSummary> {
    // Current period stats
    const logs = await prisma.notificationLog.findMany({
        where: {
            sentAt: { gte: range.from, lte: range.to },
        },
        select: {
            status: true,
            metadata: true,
        },
    });

    const totalSent = logs.length;
    const delivered = logs.filter(l => l.status === 'SENT').length;
    const acknowledged = logs.filter(l => {
        const meta = l.metadata as Record<string, any> | null;
        return meta?.acknowledgedAt;
    }).length;

    const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0;
    const acknowledgeRate = delivered > 0 ? Math.round((acknowledged / delivered) * 100) : 0;

    // Previous period for trend calculation
    const periodMs = range.to.getTime() - range.from.getTime();
    const prevFrom = new Date(range.from.getTime() - periodMs);
    const prevTo = new Date(range.from.getTime() - 1);

    const prevLogs = await prisma.notificationLog.findMany({
        where: {
            sentAt: { gte: prevFrom, lte: prevTo },
        },
        select: { status: true },
    });

    const prevTotal = prevLogs.length;
    const prevDelivered = prevLogs.filter(l => l.status === 'SENT').length;
    const prevRate = prevTotal > 0 ? (prevDelivered / prevTotal) * 100 : 0;

    const sentTrend = prevTotal > 0 ? Math.round(((totalSent - prevTotal) / prevTotal) * 100) : 0;
    const rateTrend = prevRate > 0 ? Math.round(deliveryRate - prevRate) : 0;

    return {
        totalSent,
        deliveryRate,
        acknowledgeRate,
        trend: { sent: sentTrend, rate: rateTrend },
    };
}

/**
 * Get daily volume breakdown
 */
async function getDailyVolume(range: AnalyticsDateRange): Promise<DailyVolume[]> {
    const logs = await prisma.notificationLog.findMany({
        where: {
            sentAt: { gte: range.from, lte: range.to },
        },
        select: {
            sentAt: true,
            status: true,
        },
        orderBy: { sentAt: 'asc' },
    });

    // Group by date
    const dailyMap = new Map<string, { sent: number; delivered: number; failed: number }>();

    for (const log of logs) {
        const dateKey = log.sentAt.toISOString().split('T')[0];
        const entry = dailyMap.get(dateKey) || { sent: 0, delivered: 0, failed: 0 };
        entry.sent++;
        if (log.status === 'SENT') entry.delivered++;
        else if (log.status === 'FAILED') entry.failed++;
        dailyMap.set(dateKey, entry);
    }

    return Array.from(dailyMap.entries()).map(([date, stats]) => ({
        date,
        ...stats,
    }));
}

/**
 * Get channel breakdown (Web vs Telegram)
 */
async function getChannelBreakdown(range: AnalyticsDateRange): Promise<ChannelBreakdown[]> {
    const channels = await prisma.notificationLog.groupBy({
        by: ['channel'],
        where: {
            sentAt: { gte: range.from, lte: range.to },
        },
        _count: { _all: true },
    });

    const total = channels.reduce((sum, c) => sum + c._count._all, 0);

    return channels.map(c => ({
        channel: c.channel,
        count: c._count._all,
        rate: total > 0 ? Math.round((c._count._all / total) * 100) : 0,
    }));
}

/**
 * Get failure reasons breakdown
 */
async function getFailureReasons(range: AnalyticsDateRange): Promise<FailureReason[]> {
    const failures = await prisma.notificationLog.findMany({
        where: {
            sentAt: { gte: range.from, lte: range.to },
            status: 'FAILED',
        },
        select: { errorMessage: true },
    });

    const reasonMap = new Map<string, number>();
    for (const f of failures) {
        const reason = f.errorMessage || 'Unknown error';
        reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
    }

    return Array.from(reasonMap.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 reasons
}

/**
 * Get per-template performance
 */
async function getTemplatePerformance(range: AnalyticsDateRange): Promise<TemplatePerformance[]> {
    // Get notifications with templates in the date range
    const notifications = await prisma.notification.findMany({
        where: {
            createdAt: { gte: range.from, lte: range.to },
            templateId: { not: null },
        },
        select: {
            id: true,
            templateId: true,
            template: { select: { name: true } },
        },
    });

    // Group by template
    const templateMap = new Map<string, { name: string; ids: string[] }>();
    for (const n of notifications) {
        if (!n.templateId) continue;
        const entry = templateMap.get(n.templateId) || { name: n.template?.name || 'Unknown', ids: [] };
        entry.ids.push(n.id);
        templateMap.set(n.templateId, entry);
    }

    const results: TemplatePerformance[] = [];

    for (const [templateId, { name, ids }] of templateMap.entries()) {
        if (ids.length === 0) continue;

        const logs = await prisma.notificationLog.findMany({
            where: { notificationId: { in: ids } },
            select: { status: true, metadata: true },
        });

        const sent = logs.length;
        const delivered = logs.filter(l => l.status === 'SENT').length;
        const acknowledged = logs.filter(l => {
            const meta = l.metadata as Record<string, any> | null;
            return meta?.acknowledgedAt;
        }).length;

        results.push({
            templateId,
            templateName: name,
            sent,
            deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
            acknowledgeRate: delivered > 0 ? Math.round((acknowledged / delivered) * 100) : 0,
        });
    }

    return results.sort((a, b) => b.sent - a.sent);
}

/**
 * Main analytics function - aggregates all stats
 */
export async function getNotificationAnalytics(range: AnalyticsDateRange): Promise<NotificationAnalytics> {
    const [summary, dailyVolume, channelBreakdown, failureReasons, templatePerformance] = await Promise.all([
        getSummaryStats(range),
        getDailyVolume(range),
        getChannelBreakdown(range),
        getFailureReasons(range),
        getTemplatePerformance(range),
    ]);

    return {
        summary,
        dailyVolume,
        channelBreakdown,
        failureReasons,
        templatePerformance,
    };
}
