/**
 * Types for NotificationsSettings components
 */

export interface TelegramStatus {
    linked: boolean;
    linkedAt?: string;
    notifyOnEmail: boolean;
}

export interface InboxTelegramLink {
    id: string;
    inboxEmail: string;
    telegramUsername?: string;
    createdAt: string;
}
