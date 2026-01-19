/**
 * Types and constants for AdminDashboard
 */

export interface Stats {
    totalUsers: number;
    totalDomains: number;
    verifiedDomains: number;
    totalInboxes: number;
    totalMessages: number;
    totalRules: number;
    openReports: number;
}

export interface TrendData {
    current: number;
    previous: number;
    trend: number;
}

export interface Trends {
    users: TrendData;
    emails: TrendData;
    inboxes: TrendData;
    domains: TrendData;
}

export interface ActivityItem {
    id: string;
    action: string;
    createdAt: string;
    user: { email: string } | null;
    meta: Record<string, unknown> | null;
}

export interface TimeSeriesData {
    date: string;
    emails: number;
    users: number;
    inboxes: number;
}

export interface RevenueStats {
    totalRevenue: number;
    mrr: number;
    activeSubscribers: number;
}

export const AUTO_REFRESH_INTERVAL = 30000;
