import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'PROMOTION';
    isRead: boolean;
    createdAt: string;
    imageUrl?: string;
}

interface DropdownPosition {
    top?: number;
    bottom?: number;
    left: number;
    width?: number;
    maxHeight?: number;
}


const NotificationIcon = ({ type }: { type: string }) => {
    const iconClass = 'w-5 h-5 text-gray-600 dark:text-gray-300';
    switch (type) {
        case 'WARNING':
            return (<svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>);
        case 'SUCCESS':
            return (<svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
        case 'ERROR':
            return (<svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
        case 'PROMOTION':
            return (<svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>);
        default:
            return (<svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
    }
};

export function NotificationCenter() {
    const { token } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<DropdownPosition>({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        if (!token) return;
        try {
            const res = await api<{ notifications: Notification[], unreadCount: number }>('/notifications', { token });
            setNotifications(res.notifications);
            setUnreadCount(res.unreadCount);
        } catch (e) {
            console.error('Failed to fetch notifications', e);
        }
    };

    const calculatePosition = useCallback(() => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const isMobile = window.innerWidth < 768;
        const dropdownWidth = isMobile ? window.innerWidth - 32 : 384;
        const dropdownHeight = 450;
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;

        if (isMobile) {
            setPosition({
                top: rect.bottom + 12,
                left: 16,
                width: dropdownWidth,
                maxHeight: Math.min(dropdownHeight, spaceBelow - 24)
            });
        } else {
            const left = rect.right - dropdownWidth;
            if (spaceBelow < dropdownHeight + 24 && spaceAbove > spaceBelow) {
                setPosition({
                    bottom: viewportHeight - rect.top + 12,
                    left: Math.max(16, left),
                    maxHeight: Math.min(dropdownHeight, spaceAbove - 24)
                });
            } else {
                setPosition({
                    top: rect.bottom + 12,
                    left: Math.max(16, left),
                    maxHeight: Math.min(dropdownHeight, spaceBelow - 24)
                });
            }
        }
    }, []);

    const handleToggle = () => {
        if (!isOpen) calculatePosition();
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [token]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            if (!buttonRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('resize', calculatePosition);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', calculatePosition);
        };
    }, [isOpen, calculatePosition]);

    const markAsRead = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        try {
            await api(`/notifications/${id}/read`, { method: 'PATCH', token });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (e) { console.error(e); }
    };

    const markAllAsRead = async () => {
        try {
            await api(`/notifications/read-all`, { method: 'PATCH', token });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (e) { console.error(e); }
    };

    const dropdown = isOpen && (
        <div
            ref={dropdownRef}
            className="fixed bg-white dark:bg-slate-900 shadow-2xl shadow-black/20 rounded-2xl z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-black/10 dark:ring-white/10"
            style={{ top: position.top, bottom: position.bottom, left: position.left, width: position.width || 384, maxHeight: position.maxHeight || 450 }}
        >
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex justify-between items-center bg-gray-50/80 dark:bg-slate-800/80">
                <h3 className="font-semibold text-sm tracking-tight text-gray-900 dark:text-white">THONG BAO</h3>
                {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        Đánh dấu đã đọc
                    </button>
                )}
            </div>
            <div className="max-h[450px] overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="py-12 px-6 text-center">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Tuyệt vời!</p>
                        <p className="text-xs text-gray-500 mt-1">Bạn không có thông báo mới áào.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-slate-800">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`group relative p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer ${notification.isRead === false ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                onClick={() => notification.isRead === false && markAsRead(notification.id)}
                            >
                                <div className="flex gap-4 items-start">
                                    <div className="mt-0.5 p-2 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200/50 dark:border-slate-700/50 shadow-sm">
                                        <NotificationIcon type={notification.type} />
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className={`text-sm leading-tight ${notification.isRead === false ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                                                {notification.title}
                                            </h4>
                                            <span className="text-[10px] uppercase tracking-wide text-gray-400 pt-0.5 whitespace-nowrap font-medium">
                                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: vi })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">{notification.message}</p>
                                        {notification.imageUrl && (
                                            <div className="mt-3 rounded-lg overflow-hidden border border-gray-200/50 dark:border-slate-700/50 shadow-sm">
                                                <img src={notification.imageUrl} alt="Attachment" className="w-full h-auto object-cover max-h-40 bg-gray-100" loading="lazy" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {notification.isRead === false && <div className="absolute top-5 right-4 w-2 h-2 rounded-full bg-blue-500 shadow-sm"></div>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {notifications.length > 5 && (
                <div className="p-2 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 text-center">
                    <button className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors w-full py-1">Xem tất cả</button>
                </div>
            )}
        </div>
    );

    return (
        <>
            <button
                ref={buttonRef}
                className="relative p-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 rounded-lg hover:bg-gray-100/80 dark:hover:bg-white/5 active:scale-95 group"
                onClick={handleToggle}
                title="Thông báo"
            >
                <svg className="w-5 h-5 transition-colors" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500 border-2 border-white dark:border-slate-900"></span>
                    </span>
                )}
            </button>
            {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
        </>
    );
}
