/**
 * Hook for Focus Dashboard message actions
 * Handles select, delete, pin, mark unread
 */
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../utils/api';
import type { Message } from '../../../types';

export interface UseFocusMessageActionsProps {
    selectedMessage: Message | null;
    setSelectedMessage: React.Dispatch<React.SetStateAction<Message | null>>;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setShowDetail: React.Dispatch<React.SetStateAction<boolean>>;
    setBusy: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface UseFocusMessageActionsReturn {
    handleSelectMessage: (msg: Message) => Promise<void>;
    handleDeleteMessage: () => Promise<void>;
    handleTogglePin: () => Promise<void>;
    handleMarkUnread: () => Promise<void>;
}

export function useFocusMessageActions({
    selectedMessage,
    setSelectedMessage,
    setMessages,
    setShowDetail,
    setBusy,
}: UseFocusMessageActionsProps): UseFocusMessageActionsReturn {
    const { token } = useAuth();

    const handleSelectMessage = useCallback(async (msg: Message) => {
        setSelectedMessage(msg);
        setShowDetail(true);

        // Mark as read
        if (!msg.isRead) {
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
            try {
                await api(`/messages/${msg.id}/read`, { method: "PATCH", token, body: { isRead: true } });
            } catch (error) {
                console.error('[FocusDashboard] Mark as read failed:', error);
            }
        }
    }, [token, setSelectedMessage, setMessages, setShowDetail]);

    const handleDeleteMessage = useCallback(async () => {
        if (!selectedMessage) return;
        try {
            setBusy(true);
            await api(`/messages/${selectedMessage.id}`, { method: "DELETE", token });
            setMessages(prev => prev.filter(m => m.id !== selectedMessage.id));
            setSelectedMessage(null);
            setShowDetail(false);
            toast.success("Đã xóa email");
        } catch (error) {
            console.error('[FocusDashboard] Delete message failed:', error);
            toast.error("Không thể xóa email");
        } finally {
            setBusy(false);
        }
    }, [selectedMessage, token, setMessages, setSelectedMessage, setShowDetail, setBusy]);

    const handleTogglePin = useCallback(async () => {
        if (!selectedMessage) return;
        const newPinned = !selectedMessage.isPinned;
        setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, isPinned: newPinned } : m));
        setSelectedMessage(prev => prev ? { ...prev, isPinned: newPinned } : null);
        try {
            await api(`/messages/${selectedMessage.id}/pin`, { method: "PATCH", token, body: { isPinned: newPinned } });
            toast.success(newPinned ? "Đã ghim email" : "Đã bỏ ghim");
        } catch (error) {
            console.error('[FocusDashboard] Toggle pin failed:', error);
            setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, isPinned: !newPinned } : m));
            toast.error("Không thể cập nhật");
        }
    }, [selectedMessage, token, setMessages, setSelectedMessage]);

    const handleMarkUnread = useCallback(async () => {
        if (!selectedMessage) return;
        setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, isRead: false } : m));
        setSelectedMessage(prev => prev ? { ...prev, isRead: false } : null);
        try {
            await api(`/messages/${selectedMessage.id}/read`, { method: "PATCH", token, body: { isRead: false } });
            toast.success("Đã đánh dấu chưa đọc");
        } catch (error) {
            console.error('[FocusDashboard] Mark unread failed:', error);
            toast.error("Không thể cập nhật trạng thái");
        }
    }, [selectedMessage, token, setMessages, setSelectedMessage]);

    return {
        handleSelectMessage,
        handleDeleteMessage,
        handleTogglePin,
        handleMarkUnread,
    };
}
