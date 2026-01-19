/**
 * Types and utilities for InboxToolbar
 */
import type { Inbox } from "../../types";

export interface InboxToolbarProps {
    inboxes: Inbox[];
    currentInbox: Inbox | null;
    onSelectInbox: (inbox: Inbox) => void;
    onCreateInbox: () => void;
    onDeleteInbox?: (inbox: Inbox) => void;
}

/** Get formatted email address from inbox */
export function getEmailAddress(inbox: Inbox): string {
    return `${inbox.localPart}@${inbox.domain?.name || 'domain'}`;
}

/** Calculate TTL remaining display text */
export function getTTLRemaining(expiresAt: string | null | undefined): string | null {
    if (!expiresAt) return null;
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    if (diffMs <= 0) return "Đã hết hạn";
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (diffDays > 0) return `Còn ${diffDays} ngày`;
    if (diffHours > 0) return `Còn ${diffHours} giờ`;
    return "Sắp hết hạn";
}
