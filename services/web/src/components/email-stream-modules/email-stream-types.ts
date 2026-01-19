/**
 * Types and helpers for EmailStream
 */
import type { Message } from "../../types";

export interface EmailStreamProps {
    messages: Message[];
    selectedMessageId: string | null;
    onSelectMessage: (message: Message) => void;
    onCopyOTP?: (otp: string) => void;
    className?: string;
}

export interface GroupedMessages {
    today: Message[];
    yesterday: Message[];
    thisWeek: Message[];
    earlier: Message[];
}

/** Determine which time group a message belongs to */
export function getTimeGroup(date: Date): keyof GroupedMessages {
    const now = new Date();
    const messageDate = new Date(date);

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    if (messageDate >= todayStart) return 'today';
    if (messageDate >= yesterdayStart) return 'yesterday';
    if (messageDate >= weekStart) return 'thisWeek';
    return 'earlier';
}

/** Format relative time in Vietnamese */
export function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'vừa xong';
    if (minutes < 60) return `${minutes} phút`;
    if (hours < 24) return `${hours} giờ`;
    if (days < 7) return `${days} ngày`;
    return new Date(date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
}

/** Group messages by time periods */
export function groupMessagesByTime(messages: Message[]): GroupedMessages {
    const groups: GroupedMessages = {
        today: [],
        yesterday: [],
        thisWeek: [],
        earlier: []
    };

    messages.forEach(msg => {
        const group = getTimeGroup(new Date(msg.receivedAt));
        groups[group].push(msg);
    });

    return groups;
}

/** Time group labels in Vietnamese */
export const TIME_GROUP_LABELS: Record<keyof GroupedMessages, string> = {
    today: 'Hôm nay',
    yesterday: 'Hôm qua',
    thisWeek: 'Tuần này',
    earlier: 'Trước đó'
};
