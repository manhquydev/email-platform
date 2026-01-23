/**
 * Hook for message actions (select, delete, pin, mark read/unread)
 * Extracted from Dashboard.tsx for modularity
 */
import { useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../utils/api";
import { messageService } from "../../../services";
import type { Message } from "../../../types";

export interface UseMessageActionsProps {
    messages: Message[];
    selectedMessage: Message | null;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setSelectedMessage: React.Dispatch<React.SetStateAction<Message | null>>;
}

export interface UseMessageActionsReturn {
    handleSelectMessage: (msg: Message) => Promise<void>;
    handleMarkUnread: (msgId: string) => Promise<void>;
    handleDeleteMessage: (msgId: string) => Promise<void>;
    handleTogglePin: (msgId: string, isPinned: boolean) => Promise<void>;
    copyOTP: (otp: string) => void;
}

export function useMessageActions({
    messages: _messages, // eslint-disable-line @typescript-eslint/no-unused-vars
    selectedMessage,
    setMessages,
    setSelectedMessage
}: UseMessageActionsProps): UseMessageActionsReturn {
    // Note: _messages kept for potential future use (e.g., batch operations)
    const { token } = useAuth();

    const handleSelectMessage = useCallback(async (msg: Message) => {
        setSelectedMessage(msg);
        if (!msg.isRead) {
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
            try { await messageService.markAsRead(msg.id, true); }
            catch (error) { console.error('[Dashboard] Background mark-as-read failed:', error); }
        }
    }, [setSelectedMessage, setMessages]);

    const handleMarkUnread = useCallback(async (msgId: string) => {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isRead: false } : m));
        if (selectedMessage?.id === msgId) {
            setSelectedMessage(prev => prev ? { ...prev, isRead: false } : null);
        }
        try {
            await messageService.markAsRead(msgId, false);
            toast.success("Đã đánh dấu chưa đọc");
        } catch {
            toast.error("Không thể cập nhật trạng thái");
        }
    }, [selectedMessage, setMessages, setSelectedMessage]);

    const handleDeleteMessage = useCallback(async (msgId: string) => {
        try {
            await messageService.delete(msgId);
            setMessages(prev => prev.filter(m => m.id !== msgId));
            if (selectedMessage?.id === msgId) setSelectedMessage(null);
            toast.success("Đã xóa email");
        } catch (error) {
            console.error('[Dashboard] Delete message failed:', error);
            toast.error("Không thể xóa email");
        }
    }, [selectedMessage, setMessages, setSelectedMessage]);

    const handleTogglePin = useCallback(async (msgId: string, isPinned: boolean) => {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isPinned } : m));
        if (selectedMessage?.id === msgId) {
            setSelectedMessage(prev => prev ? { ...prev, isPinned } : null);
        }
        try {
            await api(`/messages/${msgId}/pin`, { method: "PATCH", token, body: { isPinned } });
            toast.success(isPinned ? "Đã ghim email" : "Đã bỏ ghim");
        } catch (error) {
            console.error('[Dashboard] Toggle pin failed:', error);
            toast.error("Không thể cập nhật");
        }
    }, [selectedMessage, setMessages, setSelectedMessage, token]);

    const copyOTP = useCallback((otp: string) => {
        navigator.clipboard.writeText(otp);
        toast.success(`Đã copy OTP: ${otp}`);
    }, []);

    // Memoize return object to prevent unnecessary re-renders
    return useMemo(() => ({
        handleSelectMessage,
        handleMarkUnread,
        handleDeleteMessage,
        handleTogglePin,
        copyOTP
    }), [handleSelectMessage, handleMarkUnread, handleDeleteMessage, handleTogglePin, copyOTP]);
}
