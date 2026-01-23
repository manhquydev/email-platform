/**
 * Types and hooks for NotificationCenter
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeContext } from '../../hooks/useRealtimeContext';
import type { RealtimeEvent, NotificationNewPayload } from '../../types/realtime';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'PROMOTION';
    isRead: boolean;
    createdAt: string;
    imageUrl?: string;
}

export interface DropdownPosition {
    top?: number;
    bottom?: number;
    left: number;
    width?: number;
    maxHeight?: number;
}

/** Hook to manage notification center state and actions */
export function useNotificationCenter() {
    const { token } = useAuth();
    const { subscribe, unsubscribe, isConnected } = useRealtimeContext();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<DropdownPosition>({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        if (!token) return;
        try {
            const res = await api<{ notifications: Notification[], unreadCount: number }>('/notifications', { token });
            setNotifications(res.notifications);
            setUnreadCount(res.unreadCount);
        } catch (e) {
            console.error('Failed to fetch notifications', e);
        }
    }, [token]);

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

    // Initial fetch
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchNotifications();
    }, [fetchNotifications]);

    // Realtime notification updates
    useEffect(() => {
        const handleRealtimeEvent = (event: RealtimeEvent) => {
            if (event.type === 'notification.new') {
                const payload = event.payload as unknown as NotificationNewPayload;
                setNotifications(prev => [{
                    id: payload.id,
                    title: payload.title,
                    message: payload.message,
                    type: payload.type as Notification['type'],
                    isRead: false,
                    createdAt: new Date().toISOString(),
                }, ...prev]);
                setUnreadCount(prev => prev + 1);
            }
        };

        subscribe('notification-center', handleRealtimeEvent);
        return () => unsubscribe('notification-center');
    }, [subscribe, unsubscribe]);

    // Fallback polling when realtime disconnected
    useEffect(() => {
        if (isConnected) return;
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [fetchNotifications, isConnected]);

    // Click outside and resize handlers
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

    return {
        notifications,
        unreadCount,
        isOpen,
        position,
        buttonRef,
        dropdownRef,
        handleToggle,
        markAsRead,
        markAllAsRead
    };
}
