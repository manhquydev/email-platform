
import { useState, useEffect, useRef } from "react";
import { api } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: "INFO" | "WARNING" | "SUCCESS" | "ERROR" | "PROMOTION";
    isRead: boolean;
    createdAt: string;
    imageUrl?: string;
}

const NotificationIcon = ({ type }: { type: string }) => {
    // Professional Monochrome Icons (Black/Dark Gray)
    const iconClass = "w-5 h-5 text-foreground/80"; // Slightly softer black/white

    switch (type) {
        case 'WARNING':
            return (
                <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            );
        case 'SUCCESS':
            return (
                <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
        case 'ERROR':
            return (
                <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
        case 'PROMOTION':
            return (
                <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
            );
        case 'INFO':
        default:
            return (
                <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
    }
};

export function NotificationCenter() {
    const { token } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        if (!token) return;
        try {
            const res = await api<{ notifications: Notification[], unreadCount: number }>("/notifications", { token });
            setNotifications(res.notifications);
            setUnreadCount(res.unreadCount);
        } catch (e) {
            console.error("Failed to fetch notifications", e);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [token]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const markAsRead = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        try {
            await api(`/notifications/${id}/read`, { method: "PATCH", token });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (e) {
            console.error(e);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api(`/notifications/read-all`, { method: "PATCH", token });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            {/* Trigger Button - Clean & Professional */}
            <button
                className="relative p-2.5 text-muted hover:text-foreground transition-all duration-200 rounded-lg hover:bg-surface-hover/80 active:scale-95 group"
                onClick={() => setIsOpen(!isOpen)}
                title="Thông báo"
            >
                <svg className="w-5 h-5 group-hover:stroke-foreground transition-colors" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground opacity-30"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-foreground border-2 border-bg"></span>
                    </span>
                )}
            </button>

            {/* Dropdown - Glassmorphism & Modern Layout */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 glass shadow-xl shadow-black/5 rounded-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right ring-1 ring-border/50">
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-border/50 flex justify-between items-center bg-surface/50 backdrop-blur-sm">
                        <h3 className="font-semibold text-sm tracking-tight text-foreground">THÔNG BÁO</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs font-medium text-muted hover:text-foreground transition-colors flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-surface-elevated/50"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Đánh dấu đã đọc
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-[450px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                        {notifications.length === 0 ? (
                            <div className="py-12 px-6 text-center">
                                <div className="w-12 h-12 bg-surface-hover/50 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-6 h-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <p className="text-sm font-medium text-foreground">Tuyệt vời!</p>
                                <p className="text-xs text-muted mt-1">Bạn không có thông báo mới nào.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/30">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`group relative p-4 hover:bg-surface-hover transition-all duration-200 cursor-pointer ${!notification.isRead ? 'bg-surface-hover/30' : ''}`}
                                        onClick={() => !notification.isRead && markAsRead(notification.id)}
                                    >
                                        <div className="flex gap-4 items-start">
                                            {/* Icon */}
                                            <div className="mt-0.5 p-2 rounded-xl bg-surface border border-border/50 group-hover:border-foreground/20 transition-colors shadow-sm text-foreground/70">
                                                <NotificationIcon type={notification.type} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0 space-y-1.5">
                                                <div className="flex justify-between items-start gap-2">
                                                    <h4 className={`text-sm leading-tight ${!notification.isRead ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
                                                        {notification.title}
                                                    </h4>
                                                    <span className="text-[10px] uppercase tracking-wide text-muted/80 pt-0.5 whitespace-nowrap font-medium">
                                                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: vi })}
                                                    </span>
                                                </div>

                                                <p className="text-xs text-muted leading-relaxed line-clamp-3">
                                                    {notification.message}
                                                </p>

                                                {notification.imageUrl && (
                                                    <div className="mt-3 rounded-lg overflow-hidden border border-border/50 shadow-sm relative group-hover:shadow-md transition-all">
                                                        <img
                                                            src={notification.imageUrl}
                                                            alt="Attachment"
                                                            className="w-full h-auto object-cover max-h-40 bg-surface-elevated/50"
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Unread Indicator - Professional Dot */}
                                        {!notification.isRead && (
                                            <div className="absolute top-5 right-4 w-2 h-2 rounded-full bg-foreground shadow-sm"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Footer - Optional 'View All' */}
                    {notifications.length > 5 && (
                        <div className="p-2 border-t border-border/50 bg-surface/50 text-center">
                            <button className="text-xs font-medium text-muted hover:text-foreground transition-colors w-full py-1">
                                Xem tất cả
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
