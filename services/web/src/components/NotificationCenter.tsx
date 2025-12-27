
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
        fetchNotifications();
        // Poll every 60 seconds
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [token]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const markAsRead = async (id: string) => {
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

    const getIcon = (type: string) => {
        switch (type) {
            case 'INFO': return 'ℹ️';
            case 'WARNING': return '⚠️';
            case 'SUCCESS': return '✅';
            case 'ERROR': return '❌';
            case 'PROMOTION': return '🎉';
            default: return '📢';
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                className="relative p-2 text-muted hover:text-foreground transition-colors rounded-full hover:bg-surface-hover"
                onClick={() => setIsOpen(!isOpen)}
                title="Thông báo"
            >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-bg"></span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-surface border border-border rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-border flex justify-between items-center bg-surface-hover/50">
                        <h3 className="font-semibold text-sm">Thông báo</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-xs text-primary hover:underline">
                                Đánh dấu tất cả đã đọc
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-muted text-sm">
                                Không có thông báo nào
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-surface-hover transition-colors ${!notification.isRead ? 'bg-primary/5' : ''}`}
                                        onClick={() => !notification.isRead && markAsRead(notification.id)}
                                    >
                                        <div className="flex gap-3">
                                            <div className="text-xl flex-shrink-0 mt-1">
                                                {getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className={`text-sm ${!notification.isRead ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
                                                        {notification.title}
                                                    </h4>
                                                    <span className="text-[10px] text-muted flex-shrink-0 whitespace-nowrap ml-2">
                                                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: vi })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted leading-relaxed line-clamp-3">
                                                    {notification.message}
                                                </p>
                                                {notification.imageUrl && (
                                                    <div className="mt-2 rounded-md overflow-hidden border border-border">
                                                        <img
                                                            src={notification.imageUrl}
                                                            alt="Attachment"
                                                            className="w-full h-auto object-cover max-h-32"
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                )}
                                                {!notification.isRead && (
                                                    <span className="inline-block w-2 h-2 rounded-full bg-primary mt-1"></span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
