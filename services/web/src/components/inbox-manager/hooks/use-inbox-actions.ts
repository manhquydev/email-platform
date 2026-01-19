/**
 * Custom hook for inbox CRUD operations
 * Extracted from InboxManager.tsx for modularity
 */
import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../utils/api";
import type { Inbox, Message, ShareMode } from "../../../types";

export interface UseInboxActionsProps {
    inboxes: Inbox[];
    setInboxes: React.Dispatch<React.SetStateAction<Inbox[]>>;
    activeInbox: Inbox | null;
    setActiveInbox: React.Dispatch<React.SetStateAction<Inbox | null>>;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    filteredInboxes: Inbox[];
}

export interface UseInboxActionsReturn {
    // Selection
    selectedInboxIds: Set<string>;
    setSelectedInboxIds: React.Dispatch<React.SetStateAction<Set<string>>>;

    // Delete states
    inboxToDelete: Inbox | null;
    setInboxToDelete: React.Dispatch<React.SetStateAction<Inbox | null>>;
    inboxToTransfer: Inbox | null;
    setInboxToTransfer: React.Dispatch<React.SetStateAction<Inbox | null>>;
    inboxForVisibilityRules: Inbox | null;
    setInboxForVisibilityRules: React.Dispatch<React.SetStateAction<Inbox | null>>;

    // Batch operations
    isBatchDeleting: boolean;
    showBatchDeleteConfirm: boolean;
    setShowBatchDeleteConfirm: React.Dispatch<React.SetStateAction<boolean>>;

    // Handlers
    handleSelectInbox: (inbox: Inbox) => void;
    handleToggleSelect: (inboxId: string) => void;
    handleSelectAll: () => void;
    handleDeleteInbox: (inbox: Inbox) => void;
    confirmDeleteInbox: () => Promise<void>;
    handleBatchDelete: () => void;
    confirmBatchDelete: () => Promise<void>;
    handleCopyAll: () => void;
    handleShareModeChange: (inboxId: string, shareMode: ShareMode) => Promise<void>;
    handleExtendInbox: (inboxId: string) => Promise<void>;
    handleTogglePermanent: (inboxId: string) => Promise<void>;

    // Loading
    busy: boolean;
    setBusy: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useInboxActions({
    inboxes,
    setInboxes,
    activeInbox,
    setActiveInbox,
    setMessages,
    filteredInboxes
}: UseInboxActionsProps): UseInboxActionsReturn {
    const { token } = useAuth();
    const [busy, setBusy] = useState(false);

    // Selection state
    const [selectedInboxIds, setSelectedInboxIds] = useState<Set<string>>(new Set());

    // Modal states
    const [inboxToDelete, setInboxToDelete] = useState<Inbox | null>(null);
    const [inboxToTransfer, setInboxToTransfer] = useState<Inbox | null>(null);
    const [inboxForVisibilityRules, setInboxForVisibilityRules] = useState<Inbox | null>(null);

    // Batch delete states
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

    const handleSelectInbox = (inbox: Inbox) => {
        setActiveInbox(inbox);
    };

    const handleToggleSelect = (inboxId: string) => {
        setSelectedInboxIds(prev => {
            const next = new Set(prev);
            if (next.has(inboxId)) {
                next.delete(inboxId);
            } else {
                next.add(inboxId);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedInboxIds.size === filteredInboxes.length) {
            setSelectedInboxIds(new Set());
        } else {
            setSelectedInboxIds(new Set(filteredInboxes.map(i => i.id)));
        }
    };

    const handleDeleteInbox = (inbox: Inbox) => {
        setInboxToDelete(inbox);
    };

    const confirmDeleteInbox = async () => {
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
        } catch {
            toast.error("Không thể xóa hộp thư");
        } finally {
            setBusy(false);
        }
    };

    const handleBatchDelete = useCallback(() => {
        if (selectedInboxIds.size === 0) return;
        setShowBatchDeleteConfirm(true);
    }, [selectedInboxIds]);

    const confirmBatchDelete = async () => {
        setIsBatchDeleting(true);
        let deleted = 0;
        for (const id of selectedInboxIds) {
            try {
                await api(`/inboxes/${id}`, { method: "DELETE", token });
                deleted++;
            } catch { /* Ignore individual deletion error */ }
        }
        setInboxes(prev => prev.filter(i => !selectedInboxIds.has(i.id)));
        setSelectedInboxIds(new Set());
        if (activeInbox && selectedInboxIds.has(activeInbox.id)) {
            setActiveInbox(null);
            setMessages([]);
        }
        setIsBatchDeleting(false);
        setShowBatchDeleteConfirm(false);
        toast.success(`Đã xóa ${deleted} hộp thư`);
    };

    const handleCopyAll = () => {
        if (selectedInboxIds.size === 0) return;
        const emails = filteredInboxes
            .filter(i => selectedInboxIds.has(i.id))
            .map(i => `${i.localPart}@${i.domain?.name}`)
            .join('\n');
        navigator.clipboard.writeText(emails);
        toast.success(`Đã sao chép ${selectedInboxIds.size} địa chỉ`);
    };

    const handleShareModeChange = async (inboxId: string, shareMode: ShareMode) => {
        try {
            const updated = await api<{ inbox: Inbox }>(`/inboxes/${inboxId}`, {
                method: "PATCH",
                token,
                body: { shareMode }
            });
            if (updated?.inbox) {
                setInboxes(prev => prev.map(i => i.id === inboxId ? { ...i, shareMode } : i));
                toast.success(shareMode === 'PUBLIC' ? 'Inbox is now public' : 'Inbox is now private');
            }
        } catch {
            toast.error("Failed to update share mode");
        }
    };

    const handleExtendInbox = async (inboxId: string) => {
        if (!token) return;
        setBusy(true);
        try {
            const inbox = inboxes.find(i => i.id === inboxId);
            if (!inbox) return;
            const currentExpiresAt = inbox.expiresAt ? new Date(inbox.expiresAt).getTime() : Date.now();
            const newExpiresAt = new Date(currentExpiresAt + 10 * 60 * 1000).toISOString();
            await api(`/inboxes/${inboxId}`, { method: "PATCH", body: { expiresAt: newExpiresAt }, token });
            setInboxes(prev => prev.map(i => i.id === inboxId ? { ...i, expiresAt: newExpiresAt } : i));
            if (activeInbox?.id === inboxId) {
                setActiveInbox(prev => prev ? { ...prev, expiresAt: newExpiresAt } : null);
            }
            toast.success("Đã gia hạn thêm 10 phút!");
        } catch {
            toast.error("Lỗi gia hạn inbox");
        } finally {
            setBusy(false);
        }
    };

    const handleTogglePermanent = async (inboxId: string) => {
        if (!token) return;
        setBusy(true);
        try {
            const inbox = inboxes.find(i => i.id === inboxId);
            if (!inbox) return;
            const isPermanent = !inbox.expiresAt;
            const newExpiresAt = isPermanent
                ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                : null;
            await api(`/inboxes/${inboxId}`, {
                method: "PATCH",
                body: { expiresAt: newExpiresAt },
                token
            });
            setInboxes(prev => prev.map(i => i.id === inboxId ? { ...i, expiresAt: newExpiresAt } : i));
            if (activeInbox?.id === inboxId) {
                setActiveInbox(prev => prev ? { ...prev, expiresAt: newExpiresAt } : null);
            }
            toast.success(isPermanent ? "Đã chuyển sang Có hạn (24h)" : "Đã chuyển sang Vĩnh viễn");
        } catch {
            toast.error("Lỗi chuyển đổi trạng thái hộp thư");
        } finally {
            setBusy(false);
        }
    };

    return {
        selectedInboxIds,
        setSelectedInboxIds,
        inboxToDelete,
        setInboxToDelete,
        inboxToTransfer,
        setInboxToTransfer,
        inboxForVisibilityRules,
        setInboxForVisibilityRules,
        isBatchDeleting,
        showBatchDeleteConfirm,
        setShowBatchDeleteConfirm,
        handleSelectInbox,
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
        busy,
        setBusy
    };
}
