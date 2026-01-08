/**
 * useMessageActions Hook
 * Message CRUD operations (read, delete, pin, etc.)
 */

import { useCallback } from "react";
import toast from "react-hot-toast";
import { api } from "../utils/api";
import type { Message } from "../types";

interface UseMessageActionsOptions {
    token: string | null;
    selectedMessage: Message | null;
    setSelectedMessage: React.Dispatch<React.SetStateAction<Message | null>>;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setBusy: React.Dispatch<React.SetStateAction<boolean>>;
}

interface UseMessageActionsReturn {
    handleSelectMessage: (msg: Message) => Promise<void>;
    handleMarkUnread: (msgId: string) => Promise<void>;
    handleDeleteMessage: (msgId: string) => Promise<void>;
    handleTogglePin: (msgId: string, isPinned: boolean) => Promise<void>;
    copyOTP: (otp: string) => void;
    copyContent: (content: string) => void;
}

export function useMessageActions({
    token,
    selectedMessage,
    setSelectedMessage,
    setMessages,
    setBusy,
}: UseMessageActionsOptions): UseMessageActionsReturn {

    const handleSelectMessage = useCallback(async (msg: Message) => {
        setSelectedMessage(msg);
        if (!msg.isRead) {
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
            try {
                await api(`/messages/${msg.id}/read`, { method: "PATCH", token: token ?? undefined, body: { isRead: true } });
            } catch {
                /* background operation */
            }
        }
    }, [token, setSelectedMessage, setMessages]);

    const handleMarkUnread = useCallback(async (msgId: string) => {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isRead: false } : m));
        if (selectedMessage?.id === msgId) {
            setSelectedMessage(prev => prev ? { ...prev, isRead: false } : null);
        }
        try {
            await api(`/messages/${msgId}/read`, { method: "PATCH", token: token ?? undefined, body: { isRead: false } });
            toast.success("Đã đánh dấu chưa đọc");
        } catch {
            toast.error("Không thể cập nhật trạng thái");
        }
    }, [token, selectedMessage, setSelectedMessage, setMessages]);

    const handleDeleteMessage = useCallback(async (msgId: string) => {
        try {
            setBusy(true);
            setMessages(prev => prev.filter(m => m.id !== msgId));
            if (selectedMessage?.id === msgId) {
                setSelectedMessage(null);
            }
            toast.success("Đã xóa email");
        } catch {
            toast.error("Không thể xóa email");
        } finally {
            setBusy(false);
        }
    }, [selectedMessage, setSelectedMessage, setMessages, setBusy]);

    const handleTogglePin = useCallback(async (msgId: string, isPinned: boolean) => {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isPinned } : m));
        if (selectedMessage?.id === msgId) {
            setSelectedMessage(prev => prev ? { ...prev, isPinned } : null);
        }
        try {
            await api(`/messages/${msgId}/pin`, { method: "PATCH", token: token ?? undefined, body: { isPinned } });
            toast.success(isPinned ? "Đã ghim email" : "Đã bỏ ghim");
        } catch {
            toast.error("Không thể cập nhật");
        }
    }, [token, selectedMessage, setSelectedMessage, setMessages]);

    const copyOTP = useCallback((otp: string) => {
        navigator.clipboard.writeText(otp);
        toast.success(`Đã copy OTP: ${otp}`);
    }, []);

    const copyContent = useCallback((content: string) => {
        navigator.clipboard.writeText(content);
        toast.success("Đã sao chép nội dung");
    }, []);

    return {
        handleSelectMessage,
        handleMarkUnread,
        handleDeleteMessage,
        handleTogglePin,
        copyOTP,
        copyContent,
    };
}
