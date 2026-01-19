/**
 * Types for MessageList components
 */
import type { RefObject } from "react";
import type { Message, Inbox } from "../../types";

export interface MessageListProps {
    inbox?: Inbox;
    messages: Message[];
    selectedMessageId: string | undefined;
    onSelectMessage: (msg: Message) => void;
    onMarkUnread: (msgId: string) => void;
    onTogglePin: (msgId: string, isPinned: boolean) => void;
    onSnooze: (msgId: string, until: Date | null) => void;
    search: string;
    onSearchChange: (val: string) => void;
    hasAttachments: boolean;
    onToggleAttachments: () => void;
    onRefresh: () => void;
    loading: boolean;
    canLoadMore: boolean;
    onLoadMore: () => void;
    onBack?: () => void;
    searchInputRef?: RefObject<HTMLInputElement | null>;
    // Bulk selection
    selectedIds: Set<string>;
    onToggleSelect: (msgId: string) => void;
    onSelectAll: () => void;
    onClearSelection: () => void;
    onBulkDelete: () => void;
    onBulkMarkRead: () => void;
    // Swipe actions
    onDelete: (msgId: string) => void;
}

export const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

export const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};
