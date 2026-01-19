/**
 * Action definitions for QuickActions
 */
import toast from "react-hot-toast";
import type { Message } from "../../types";
import type { ActionItem } from "./quick-actions-types";

/** Get primary actions for quick action bar */
export function getPrimaryActions(
    message: Message,
    onReply?: () => void,
    onForward?: () => void,
    onPin?: (isPinned: boolean) => void,
    onSnooze?: () => void
): ActionItem[] {
    return [
        {
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            label: "Trả lời",
            onClick: onReply,
            primary: true,
        },
        {
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            label: "Chuyển tiếp",
            onClick: onForward,
        },
        {
            icon: (
                <svg className="w-4 h-4" fill={message.isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            label: message.isPinned ? "Bỏ ghim" : "Ghim",
            onClick: () => onPin?.(!message.isPinned),
            active: message.isPinned,
            color: "text-yellow-500",
        },
        {
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            label: "Nhắc lại sau",
            onClick: onSnooze,
            color: "text-purple-500",
        },
    ];
}

/** Get secondary/more actions for dropdown */
export function getMoreActions(
    message: Message,
    onMarkUnread?: () => void,
    onLabel?: () => void,
    onDelete?: () => void
): ActionItem[] {
    const handleCopy = () => {
        const content = message.textBody || message.subject || '';
        navigator.clipboard.writeText(content).then(() => {
            toast.success('Đã sao chép nội dung');
        }).catch(() => {
            toast.error('Không thể sao chép');
        });
    };

    return [
        {
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            label: "Sao chép",
            onClick: handleCopy,
        },
        {
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" />
                </svg>
            ),
            label: "Đánh dấu chưa đọc",
            onClick: onMarkUnread,
            hidden: !message.isRead,
        },
        {
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            label: "Gán nhãn",
            onClick: onLabel,
        },
        {
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            label: "Xóa",
            onClick: onDelete,
            color: "text-danger",
        },
    ];
}
