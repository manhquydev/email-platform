/**
 * Types for Telegram Management Page
 */

export interface TelegramOverview {
    userLinks: number;
    inboxLinks: {
        total: number;
        active: number;
        paused: number;
        revoked: number;
    };
    notifications24h: {
        sent: number;
        failed: number;
        successRate: number;
    };
}

export interface UserLink {
    id: string;
    email: string;
    telegramChatId: string;
    telegramLinkedAt: string;
    tier: string;
    createdAt: string;
}

export interface InboxLink {
    id: string;
    inboxEmail: string;
    telegramChatId: string;
    telegramUsername: string | null;
    createdAt: string;
    status: "ACTIVE" | "PAUSED" | "REVOKED";
    notificationsSent: number;
    notificationsFailed: number;
}

export type TabType = "overview" | "user-links" | "inbox-links";
export type StatusFilterType = "ACTIVE" | "PAUSED" | "REVOKED" | "all";

export const PAGE_SIZE = 20;
