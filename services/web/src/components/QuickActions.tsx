import { useState } from "react";
import toast from "react-hot-toast";
import type { Message } from "../types";

interface QuickActionsProps {
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

export function QuickActions({
    message,
    onReply,
    onForward,
    onDelete,
    onPin,
    onMarkUnread,
    onSnooze,
    onLabel,
    visible = true,
    position,
}: QuickActionsProps) {
    const [showMore, setShowMore] = useState(false);

    if (!visible) return null;

    const handleCopy = () => {
        const content = message.textBody || message.subject || '';
        navigator.clipboard.writeText(content).then(() => {
            toast.success('Đã sao chép nội dung');
        }).catch(() => {
            toast.error('Không thể sao chép');
        });
    };

    const actions = [
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

    const moreActions = [
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

    const style = position ? {
        position: 'fixed' as const,
        left: position.x,
        top: position.y,
        zIndex: 50,
    } : {};

    return (
        <div
            className="glass rounded-xl shadow-lg p-1.5 animate-scale-in flex items-center gap-0.5"
            style={style}
        >
            {/* Primary Actions */}
            {actions.map((action, idx) => (
                <button
                    key={idx}
                    onClick={(e) => {
                        e.stopPropagation();
                        action.onClick?.();
                    }}
                    className={`
                        p-2 rounded-lg transition-all hover-lift
                        ${action.primary ? 'bg-primary text-white hover:bg-primary-hover' : 'hover:bg-primary-light'}
                        ${action.active ? action.color : 'text-muted hover:text-text-main'}
                    `}
                    title={action.label}
                >
                    {action.icon}
                </button>
            ))}

            {/* Divider */}
            <div className="w-px h-6 bg-border mx-1" />

            {/* More Actions Toggle */}
            <div className="relative">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowMore(!showMore);
                    }}
                    className={`p-2 rounded-lg transition-all hover:bg-primary-light ${showMore ? 'bg-primary-light text-primary' : 'text-muted hover:text-text-main'}`}
                    title="Thêm thao tác"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                {/* Dropdown Menu */}
                {showMore && (
                    <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[180px] animate-fade-in-up z-50">
                        {moreActions.filter(a => !a.hidden).map((action, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    action.onClick?.();
                                    setShowMore(false);
                                }}
                                className={`
                                    w-full px-3 py-2 flex items-center gap-2 text-sm text-left
                                    hover:bg-primary-light transition-colors
                                    ${action.color || 'text-text-main'}
                                `}
                            >
                                {action.icon}
                                <span>{action.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Floating Quick Actions Bar - shows when hovering a message
interface FloatingQuickActionsBarProps {
    show: boolean;
    message: Message | null;
    onReply?: () => void;
    onForward?: () => void;
    onDelete?: () => void;
    onPin?: (msgId: string, isPinned: boolean) => void;
    onMarkUnread?: (msgId: string) => void;
    onSnooze?: (msgId: string) => void;
}

export function FloatingQuickActionsBar({
    show,
    message,
    onReply,
    onForward,
    onDelete,
    onPin,
    onMarkUnread,
    onSnooze,
}: FloatingQuickActionsBarProps) {
    if (!show || !message) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
            <QuickActions
                message={message}
                onReply={onReply}
                onForward={onForward}
                onDelete={onDelete}
                onPin={(isPinned) => onPin?.(message.id, isPinned)}
                onMarkUnread={() => onMarkUnread?.(message.id)}
                onSnooze={() => onSnooze?.(message.id)}
            />
        </div>
    );
}
