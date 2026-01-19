/**
 * Hook for Telegram Management actions
 * Handles unlink, revoke, reactivate operations
 */
import { useState, useCallback } from "react";
import { api } from "../../../utils/api";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";

export interface ConfirmUnlinkState {
    type: "user" | "inbox";
    id: string;
    email: string;
}

export interface UseTelegramActionsProps {
    loadUserLinks: () => Promise<void>;
    loadInboxLinks: () => Promise<void>;
    loadOverview: () => Promise<void>;
}

export interface UseTelegramActionsReturn {
    confirmUnlink: ConfirmUnlinkState | null;
    setConfirmUnlink: (state: ConfirmUnlinkState | null) => void;
    actionLoading: boolean;
    handleUnlinkUser: (userId: string) => Promise<void>;
    handleRevokeInboxLink: (linkId: string) => Promise<void>;
    handleReactivateInboxLink: (linkId: string) => Promise<void>;
}

export function useTelegramActions({
    loadUserLinks,
    loadInboxLinks,
    loadOverview,
}: UseTelegramActionsProps): UseTelegramActionsReturn {
    const { token } = useAuth();
    const [confirmUnlink, setConfirmUnlink] = useState<ConfirmUnlinkState | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const handleUnlinkUser = useCallback(async (userId: string) => {
        setActionLoading(true);
        try {
            await api(`/admin/telegram/user-links/${userId}/unlink`, {
                method: "POST",
                token,
                body: { reason: "Admin action" },
            });
            toast.success("Đã hủy liên kết Telegram");
            setConfirmUnlink(null);
            loadUserLinks();
            loadOverview();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setActionLoading(false);
        }
    }, [token, loadUserLinks, loadOverview]);

    const handleRevokeInboxLink = useCallback(async (linkId: string) => {
        setActionLoading(true);
        try {
            await api(`/admin/telegram/inbox-links/${linkId}/revoke`, {
                method: "POST",
                token,
                body: { reason: "Admin action" },
            });
            toast.success("Đã thu hồi liên kết");
            setConfirmUnlink(null);
            loadInboxLinks();
            loadOverview();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setActionLoading(false);
        }
    }, [token, loadInboxLinks, loadOverview]);

    const handleReactivateInboxLink = useCallback(async (linkId: string) => {
        setActionLoading(true);
        try {
            await api(`/admin/telegram/inbox-links/${linkId}/reactivate`, {
                method: "POST",
                token,
            });
            toast.success("Đã kích hoạt lại liên kết");
            loadInboxLinks();
            loadOverview();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setActionLoading(false);
        }
    }, [token, loadInboxLinks, loadOverview]);

    return {
        confirmUnlink,
        setConfirmUnlink,
        actionLoading,
        handleUnlinkUser,
        handleRevokeInboxLink,
        handleReactivateInboxLink,
    };
}
