/**
 * Hook for InboxManager action handlers
 * Handles inbox CRUD, selection, batch operations, and message actions
 */
import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../utils/api";
import type { Inbox, Message } from "../../../types";

export interface UseInboxManagerActionsProps {
    activeInbox: Inbox | null;
    inboxes: Inbox[];
    filteredInboxes: Inbox[];
    setBusy: React.Dispatch<React.SetStateAction<boolean>>;
    setInboxes: React.Dispatch<React.SetStateAction<Inbox[]>>;
    setActiveInbox: React.Dispatch<React.SetStateAction<Inbox | null>>;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    loadInboxes: () => Promise<void>;
}

export interface UseInboxManagerActionsReturn {
    // Selection state
    selectedInboxIds: Set<string>;
    setSelectedInboxIds: React.Dispatch<React.SetStateAction<Set<string>>>;

    // Modal states
    inboxToDelete: Inbox | null;
    inboxToTransfer: Inbox | null;
    inboxForVisibilityRules: Inbox | null;
    showBatchDeleteConfirm: boolean;
    isBatchDeleting: boolean;
    inboxForActionSheet: Inbox | null;

    // Modal setters
    setInboxToDelete: (inbox: Inbox | null) => void;
    setInboxToTransfer: (inbox: Inbox | null) => void;
    setInboxForVisibilityRules: (inbox: Inbox | null) => void;
    setShowBatchDeleteConfirm: (show: boolean) => void;
    setInboxForActionSheet: (inbox: Inbox | null) => void;

    // Action handlers
    handleSelectInbox: (inbox: Inbox) => void;
    handleViewMessages: (inbox: Inbox, setActiveTab: (tab: 'inboxes' | 'messages') => void) => void;
    handleToggleSelect: (inboxId: string) => void;
    handleSelectAll: () => void;
    handleDeleteInbox: (inbox: Inbox) => void;
    confirmDeleteInbox: () => Promise<void>;
    handleBatchDelete: () => void;
    confirmBatchDelete: () => Promise<void>;
    handleCopyAll: () => void;
    handleShareModeChange: (inboxId: string, shareMode: 'PUBLIC' | 'PRIVATE') => Promise<void>;
    handleExtendInbox: (inbox: Inbox) => Promise<void>;
    handleTogglePermanent: (inbox: Inbox) => Promise<void>;
    handleSelectMessage: (msg: Message) => Promise<void>;
    handleCreateInboxFromSelector: (domainId: string, localPart: string, expiresAt?: number) => Promise<void>;
    handleLongPress: (inbox: Inbox) => void;

    // Message detail state
    showDetail: boolean;
    selectedMessage: Message | null;
    setShowDetail: (show: boolean) => void;
    setSelectedMessage: React.Dispatch<React.SetStateAction<Message | null>>;
}

export function useInboxManagerActions({
    activeInbox,
    filteredInboxes,
    setBusy,
    setInboxes,
    setActiveInbox,
    setMessages,
}: UseInboxManagerActionsProps): UseInboxManagerActionsReturn {
    const { token } = useAuth();

    // Selection state
    const [selectedInboxIds, setSelectedInboxIds] = useState<Set<string>>(new Set());

    // Modal states
    const [inboxToDelete, setInboxToDelete] = useState<Inbox | null>(null);
    const [inboxToTransfer, setInboxToTransfer] = useState<Inbox | null>(null);
    const [inboxForVisibilityRules, setInboxForVisibilityRules] = useState<Inbox | null>(null);
    const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const [inboxForActionSheet, setInboxForActionSheet] = useState<Inbox | null>(null);

    // Message detail state
    const [showDetail, setShowDetail] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

    // --- Action Handlers ---
    const handleSelectInbox = useCallback((inbox: Inbox) => setActiveInbox(inbox), [setActiveInbox]);

    const handleViewMessages = useCallback((inbox: Inbox, setActiveTab: (tab: 'inboxes' | 'messages') => void) => {
        setActiveInbox(inbox);
        setActiveTab('messages');
    }, [setActiveInbox]);

    const handleToggleSelect = useCallback((inboxId: string) => {
        setSelectedInboxIds(prev => {
            const next = new Set(prev);
            next.has(inboxId) ? next.delete(inboxId) : next.add(inboxId);
            return next;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        setSelectedInboxIds(prev =>
            prev.size === filteredInboxes.length ? new Set() : new Set(filteredInboxes.map(i => i.id))
        );
    }, [filteredInboxes]);

    const handleDeleteInbox = useCallback((inbox: Inbox) => setInboxToDelete(inbox), []);

    const confirmDeleteInbox = useCallback(async () => {
        if (!inboxToDelete) return;
        setBusy(true);
        try {
            await api(`/inboxes/${inboxToDelete.id}`, { method: "DELETE", token });
            setInboxes(prev => prev.filter(i => i.id !== inboxToDelete.id));
            if (activeInbox?.id === inboxToDelete.id) {
                setActiveInbox(null);
                setMessages([]);
            }
            toast.success("Đã xóa hộp thư");
            setInboxToDelete(null);
        } catch (err) {
            console.error('[InboxManager] Delete inbox failed:', err);
            toast.error("Không thể xóa hộp thư");
        } finally {
            setBusy(false);
        }
    }, [inboxToDelete, token, activeInbox?.id, setBusy, setInboxes, setActiveInbox, setMessages]);

    const handleBatchDelete = useCallback(() => {
        if (selectedInboxIds.size === 0) return;
        setShowBatchDeleteConfirm(true);
    }, [selectedInboxIds.size]);

    const confirmBatchDelete = useCallback(async () => {
        setIsBatchDeleting(true);
        let deleted = 0;
        for (const id of selectedInboxIds) {
            try {
                await api(`/inboxes/${id}`, { method: "DELETE", token });
                deleted++;
            } catch (err) {
                console.error('[InboxManager] Batch delete item failed:', err);
            }
        }
        setInboxes(prev => prev.filter(i => !selectedInboxIds.has(i.id)));
        if (activeInbox && selectedInboxIds.has(activeInbox.id)) {
            setActiveInbox(null);
            setMessages([]);
        }
        setSelectedInboxIds(new Set());
        setIsBatchDeleting(false);
        setShowBatchDeleteConfirm(false);
        toast.success(`Đã xóa ${deleted} hộp thư`);
    }, [selectedInboxIds, token, activeInbox, setInboxes, setActiveInbox, setMessages]);

    const handleCopyAll = useCallback(() => {
        if (selectedInboxIds.size === 0) return;
        const emails = filteredInboxes
            .filter(i => selectedInboxIds.has(i.id))
            .map(i => `${i.localPart}@${i.domain?.name}`)
            .join('\n');
        navigator.clipboard.writeText(emails);
        toast.success(`Đã sao chép ${selectedInboxIds.size} địa chỉ`);
    }, [selectedInboxIds, filteredInboxes]);

    const handleShareModeChange = useCallback(async (inboxId: string, shareMode: 'PUBLIC' | 'PRIVATE') => {
        try {
            await api(`/inboxes/${inboxId}`, { method: "PATCH", token, body: { shareMode } });
            setInboxes(prev => prev.map(i => i.id === inboxId ? { ...i, shareMode } : i));
            toast.success(shareMode === 'PUBLIC' ? 'Inbox is now public' : 'Inbox is now private');
        } catch (err) {
            console.error('[InboxManager] Share mode change failed:', err);
            toast.error("Failed to update share mode");
        }
    }, [token, setInboxes]);

    const handleExtendInbox = useCallback(async (inbox: Inbox) => {
        if (!token) return;
        setBusy(true);
        try {
            const currentExpiresAt = inbox.expiresAt ? new Date(inbox.expiresAt).getTime() : Date.now();
            const newExpiresAt = new Date(currentExpiresAt + 10 * 60 * 1000).toISOString();
            await api(`/inboxes/${inbox.id}`, { method: "PATCH", body: { expiresAt: newExpiresAt }, token });
            setInboxes(prev => prev.map(i => i.id === inbox.id ? { ...i, expiresAt: newExpiresAt } : i));
            if (activeInbox?.id === inbox.id) {
                setActiveInbox(prev => prev ? { ...prev, expiresAt: newExpiresAt } : null);
            }
            toast.success("Đã gia hạn thêm 10 phút!");
        } catch (err) {
            console.error('[InboxManager] Extend inbox failed:', err);
            toast.error("Lỗi gia hạn inbox");
        } finally {
            setBusy(false);
        }
    }, [token, activeInbox?.id, setBusy, setInboxes, setActiveInbox]);

    const handleTogglePermanent = useCallback(async (inbox: Inbox) => {
        if (!token) return;
        setBusy(true);
        try {
            const isPermanent = !inbox.expiresAt;
            const newExpiresAt = isPermanent ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;
            await api(`/inboxes/${inbox.id}`, { method: "PATCH", body: { expiresAt: newExpiresAt }, token });
            setInboxes(prev => prev.map(i => i.id === inbox.id ? { ...i, expiresAt: newExpiresAt } : i));
            if (activeInbox?.id === inbox.id) {
                setActiveInbox(prev => prev ? { ...prev, expiresAt: newExpiresAt } : null);
            }
            toast.success(isPermanent ? "Đã chuyển sang Có hạn (24h)" : "Đã chuyển sang Vĩnh viễn");
        } catch (err) {
            console.error('[InboxManager] Toggle permanent failed:', err);
            toast.error("Lỗi chuyển đổi trạng thái hộp thư");
        } finally {
            setBusy(false);
        }
    }, [token, activeInbox?.id, setBusy, setInboxes, setActiveInbox]);

    const handleSelectMessage = useCallback(async (msg: Message) => {
        setSelectedMessage(msg);
        setShowDetail(true);
        if (!msg.isRead) {
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
            try {
                await api(`/messages/${msg.id}/read`, { method: "PATCH", token, body: { isRead: true } });
            } catch (err) {
                console.error('[InboxManager] Mark read failed:', err);
            }
        }
    }, [token, setMessages]);

    const handleCreateInboxFromSelector = useCallback(async (domainId: string, localPart: string, expiresAt?: number) => {
        try {
            const body: { domainId: string; localPart: string; expiresAt?: number } = { domainId, localPart };
            if (expiresAt) body.expiresAt = expiresAt;
            const newInbox = await api<Inbox>("/inboxes", { method: "POST", token, body });
            if (newInbox) {
                setInboxes(prev => [newInbox, ...prev]);
                toast.success("Đã tạo hộp thư mới");
            }
        } catch (err) {
            console.error('[InboxManager] Create inbox failed:', err);
            toast.error("Không thể tạo hộp thư");
        }
    }, [token, setInboxes]);

    const handleLongPress = useCallback((inbox: Inbox) => setInboxForActionSheet(inbox), []);

    return {
        // Selection state
        selectedInboxIds,
        setSelectedInboxIds,
        // Modal states
        inboxToDelete,
        inboxToTransfer,
        inboxForVisibilityRules,
        showBatchDeleteConfirm,
        isBatchDeleting,
        inboxForActionSheet,
        // Modal setters
        setInboxToDelete,
        setInboxToTransfer,
        setInboxForVisibilityRules,
        setShowBatchDeleteConfirm,
        setInboxForActionSheet,
        // Action handlers
        handleSelectInbox,
        handleViewMessages,
        handleToggleSelect,
        handleSelectAll,
        handleDeleteInbox,
        confirmDeleteInbox,
        handleBatchDelete,
        confirmBatchDelete,
        handleCopyAll,
        handleShareModeChange,
        handleExtendInbox,
        handleTogglePermanent,
        handleSelectMessage,
        handleCreateInboxFromSelector,
        handleLongPress,
        // Message detail state
        showDetail,
        selectedMessage,
        setShowDetail,
        setSelectedMessage,
    };
}
