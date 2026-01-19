/**
 * Hook for Focus Dashboard inbox actions
 * Handles create, delete inbox, copy email
 */
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../utils/api';
import type { Inbox } from '../../../types';

export interface UseFocusInboxActionsProps {
    inboxes: Inbox[];
    selectedInbox: string;
    currentInbox: Inbox | undefined;
    setInboxes: React.Dispatch<React.SetStateAction<Inbox[]>>;
    setSelectedInbox: (id: string) => void;
    setMessages: React.Dispatch<React.SetStateAction<unknown[]>>;
    setBusy: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface UseFocusInboxActionsReturn {
    handleDeleteInbox: (inbox: Inbox) => Promise<void>;
    handleCopyEmail: () => void;
    handleCreateInboxFromSelector: (domainId: string, localPart: string, expiresAt?: number) => Promise<void>;
}

export function useFocusInboxActions({
    selectedInbox,
    currentInbox,
    setInboxes,
    setSelectedInbox,
    setMessages,
    setBusy,
}: UseFocusInboxActionsProps): UseFocusInboxActionsReturn {
    const { token } = useAuth();

    const handleDeleteInbox = useCallback(async (inbox: Inbox) => {
        try {
            setBusy(true);
            await api(`/inboxes/${inbox.id}`, { method: "DELETE", token });
            setInboxes(prev => prev.filter(i => i.id !== inbox.id));
            if (selectedInbox === inbox.id) {
                setSelectedInbox("");
                setMessages([]);
            }
            toast.success("Đã xóa hộp thư");
        } catch (error) {
            console.error('[FocusDashboard] Delete inbox failed:', error);
            toast.error("Không thể xóa hộp thư");
        } finally {
            setBusy(false);
        }
    }, [token, selectedInbox, setInboxes, setSelectedInbox, setMessages, setBusy]);

    const handleCopyEmail = useCallback(() => {
        if (currentInbox) {
            const email = `${currentInbox.localPart}@${currentInbox.domain?.name}`;
            navigator.clipboard.writeText(email);
            toast.success("Đã sao chép địa chỉ email!", { icon: "📋", duration: 2000 });
        }
    }, [currentInbox]);

    const handleCreateInboxFromSelector = useCallback(async (domainId: string, localPart: string, expiresAt?: number) => {
        try {
            const body: { domainId: string; localPart: string; expiresAt?: number } = { domainId, localPart };
            if (expiresAt) body.expiresAt = expiresAt;
            const newInbox = await api<Inbox>("/inboxes", { method: "POST", token, body });
            if (newInbox) {
                setInboxes(prev => [newInbox, ...prev]);
                setSelectedInbox(newInbox.id);
                toast.success("Đã tạo hộp thư mới");
            }
        } catch (error) {
            console.error('[FocusDashboard] Create inbox failed:', error);
            toast.error("Không thể tạo hộp thư");
        }
    }, [token, setInboxes, setSelectedInbox]);

    return {
        handleDeleteInbox,
        handleCopyEmail,
        handleCreateInboxFromSelector,
    };
}
