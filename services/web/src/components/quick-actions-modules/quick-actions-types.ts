/**
 * Types and constants for QuickActions
 */
import type { Message } from "../../types";

export interface QuickActionsProps {
    message: Message;
    onReply?: () => void;
    onForward?: () => void;
    onDelete?: () => void;
    onPin?: (isPinned: boolean) => void;
    onMarkUnread?: () => void;
    onSnooze?: () => void;
    onLabel?: () => void;
    visible?: boolean;
    position?: { x: number; y: number };
}

export interface FloatingQuickActionsBarProps {
    show: boolean;
    message: Message | null;
    onReply?: () => void;
    onForward?: () => void;
    onDelete?: () => void;
    onPin?: (msgId: string, isPinned: boolean) => void;
    onMarkUnread?: (msgId: string) => void;
    onSnooze?: (msgId: string) => void;
}

export interface ActionItem {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    primary?: boolean;
    active?: boolean;
    color?: string;
    hidden?: boolean;
}
