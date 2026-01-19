/**
 * Types and helpers for AnalyticsPage
 */

export interface AnalyticsStats {
    totalSearches: number;
    totalMessageViews: number;
    totalMessageLists: number;
    totalAttachmentDownloads: number;
    uniqueIPs: number;
    uniqueSessions: number;
    topInboxes: Array<{ email: string; views: number }>;
    recentActivity: Array<{
        id: string;
        action: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: Record<string, any>;
        createdAt: string;
    }>;
    timeRange: string;
}

export interface Session {
    sessionId: string;
    ip: string;
    userAgent: string;
    firstSeen: string;
    lastSeen: string;
    searchCount: number;
    viewCount: number;
    inboxesAccessed: string[];
}

export const PAGE_SIZE = 20;

export const formatDate = (date: string) => new Date(date).toLocaleString("vi-VN");

export const getActionLabel = (action: string) => {
    switch (action) {
        case "PUBLIC_INBOX_SEARCHED": return "Tìm kiếm";
        case "PUBLIC_MESSAGE_VIEWED": return "Xem email";
        case "PUBLIC_MESSAGES_LISTED": return "Xem danh sách";
        case "PUBLIC_ATTACHMENT_DOWNLOADED": return "Tải file";
        default: return action;
    }
};

export const getActionColor = (action: string) => {
    switch (action) {
        case "PUBLIC_INBOX_SEARCHED": return "bg-blue-500/20 text-blue-400";
        case "PUBLIC_MESSAGE_VIEWED": return "bg-green-500/20 text-green-400";
        case "PUBLIC_MESSAGES_LISTED": return "bg-purple-500/20 text-purple-400";
        case "PUBLIC_ATTACHMENT_DOWNLOADED": return "bg-orange-500/20 text-orange-400";
        default: return "bg-gray-500/20 text-gray-400";
    }
};

export const TIME_RANGES = ["7d", "30d", "all"] as const;
export type TimeRange = typeof TIME_RANGES[number];

export const getTimeRangeLabel = (range: TimeRange) => {
    switch (range) {
        case "7d": return "7 ngày";
        case "30d": return "30 ngày";
        case "all": return "Tất cả";
    }
};
