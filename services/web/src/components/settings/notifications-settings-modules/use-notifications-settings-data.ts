/**
 * Custom hook for NotificationsSettings data and actions
 */
import { useState, useEffect, useCallback } from "react";
import { api } from "../../../utils/api";
import toast from "react-hot-toast";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import type { TelegramStatus, InboxTelegramLink } from "./types";

export function useNotificationsSettingsData(token: string | null) {
    // Telegram account state
    const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);
    const [telegramLinkToken, setTelegramLinkToken] = useState<string | null>(null);
    const [telegramBotLink, setTelegramBotLink] = useState<string | null>(null);
    const [telegramBusy, setTelegramBusy] = useState(false);
    const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);

    // Inbox telegram links state
    const [inboxLinks, setInboxLinks] = useState<InboxTelegramLink[]>([]);
    const [inboxLinksLoading, setInboxLinksLoading] = useState(false);
    const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

    // --- LOAD DATA ---
    const loadTelegramStatus = useCallback(async () => {
        if (!token) return;
        try {
            const status = await api<TelegramStatus>("/telegram/status", { token });
            setTelegramStatus(status);
        } catch {
            // Telegram not configured, ignore
        }
    }, [token]);

    const loadInboxLinks = useCallback(async () => {
        if (!token) return;
        setInboxLinksLoading(true);
        try {
            const res = await api<{ links: InboxTelegramLink[] }>("/telegram/inbox-links", { token });
            setInboxLinks(res.links || []);
        } catch {
            // Ignore errors
        } finally {
            setInboxLinksLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadTelegramStatus();
        loadInboxLinks();
    }, [loadTelegramStatus, loadInboxLinks]);

    // --- INBOX LINK ACTIONS ---
    const unlinkInbox = async (linkId: string) => {
        setUnlinkingId(linkId);
        try {
            await api(`/telegram/inbox-links/${linkId}`, { method: "DELETE", token: token ?? undefined });
            setInboxLinks(prev => prev.filter(l => l.id !== linkId));
            toast.success("Đã hủy liên kết hộp thư");
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setUnlinkingId(null);
        }
    };

    // --- TELEGRAM ACCOUNT ACTIONS ---
    const generateTelegramLink = async () => {
        setTelegramBusy(true);
        try {
            const res = await api<{ token: string; botLink: string }>(
                "/telegram/link-token",
                { method: "POST", token: token ?? undefined }
            );
            setTelegramLinkToken(res.token);
            setTelegramBotLink(res.botLink);
            toast.success("Đã tạo mã liên kết!");
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTelegramBusy(false);
        }
    };

    const toggleTelegramNotify = async () => {
        if (!telegramStatus) return;
        setTelegramBusy(true);
        try {
            await api("/telegram/preferences", {
                method: "PATCH",
                token: token ?? undefined,
                body: { notifyOnEmail: !telegramStatus.notifyOnEmail }
            });
            setTelegramStatus(prev => prev ? { ...prev, notifyOnEmail: !prev.notifyOnEmail } : null);
            toast.success(telegramStatus.notifyOnEmail ? "Đã tắt thông báo" : "Đã bật thông báo");
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTelegramBusy(false);
        }
    };

    const confirmUnlinkTelegram = async () => {
        setTelegramBusy(true);
        try {
            await api("/telegram/unlink", { method: "DELETE", token: token ?? undefined });
            setTelegramStatus({ linked: false, notifyOnEmail: true });
            toast.success("Đã hủy liên kết Telegram");
            setShowUnlinkConfirm(false);
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTelegramBusy(false);
        }
    };

    const copyLinkToken = () => {
        if (telegramLinkToken) {
            navigator.clipboard.writeText(telegramLinkToken);
            toast.success("Đã sao chép!");
        }
    };

    return {
        // Telegram account
        telegramStatus,
        telegramLinkToken,
        telegramBotLink,
        telegramBusy,
        showUnlinkConfirm,
        setShowUnlinkConfirm,
        generateTelegramLink,
        toggleTelegramNotify,
        confirmUnlinkTelegram,
        copyLinkToken,
        // Inbox links
        inboxLinks,
        inboxLinksLoading,
        unlinkingId,
        unlinkInbox
    };
}
