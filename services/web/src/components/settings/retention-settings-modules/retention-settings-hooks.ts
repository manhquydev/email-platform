/**
 * Types, constants, and hooks for RetentionSettings
 */
import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../utils/api";
import { toast } from "react-hot-toast";
import type { Inbox } from "../../../types";

export interface RetentionSettingsProps {
    userInboxes?: Inbox[];
    userTier?: string;
    userRetentionDays?: number | null;
    onUserRetentionChange?: (days: number | null) => void;
}

/** Inbox with optional retentionDays field */
export type InboxWithRetention = Inbox & { retentionDays?: number | null };

/** Tier limits for retention (days) */
export const TIER_LIMITS: Record<string, { max: number; label: string }> = {
    FREE: { max: 7, label: "Free" },
    STARTER: { max: 30, label: "Starter" },
    PROFESSIONAL: { max: 90, label: "Professional" },
    ENTERPRISE: { max: 365, label: "Enterprise" },
};

/** Retention option for select dropdown */
export interface RetentionOption {
    value: number | null;
    label: string;
}

/** Get filtered retention options based on tier max */
export function getRetentionOptions(maxDays: number): RetentionOption[] {
    const allOptions: RetentionOption[] = [
        { value: null, label: "Mặc định theo gói" },
        { value: 1, label: "1 ngày" },
        { value: 3, label: "3 ngày" },
        { value: 7, label: "7 ngày" },
        { value: 14, label: "14 ngày" },
        { value: 30, label: "30 ngày" },
        { value: 60, label: "60 ngày" },
        { value: 90, label: "90 ngày" },
        { value: 180, label: "180 ngày" },
        { value: 365, label: "365 ngày" },
    ];
    return allOptions.filter(opt => opt.value === null || opt.value <= maxDays);
}

/** Hook to manage retention settings state and actions */
export function useRetentionSettings(props: RetentionSettingsProps) {
    const {
        userInboxes = [],
        userTier = "FREE",
        userRetentionDays,
        onUserRetentionChange
    } = props;

    const { token } = useAuth();
    const [selectedInbox, setSelectedInbox] = useState<InboxWithRetention | null>(null);
    const [inboxRetention, setInboxRetention] = useState<number | null>(null);
    const [defaultRetention, setDefaultRetention] = useState<number | null>(userRetentionDays ?? null);
    const [saving, setSaving] = useState(false);

    const tierInfo = TIER_LIMITS[userTier] || TIER_LIMITS.FREE;
    const retentionOptions = getRetentionOptions(tierInfo.max);

    useEffect(() => {
        setDefaultRetention(userRetentionDays ?? null);
    }, [userRetentionDays]);

    const handleInboxSelect = (inbox: Inbox) => {
        const inboxWithRetention = inbox as InboxWithRetention;
        setSelectedInbox(inboxWithRetention);
        setInboxRetention(inboxWithRetention.retentionDays ?? null);
    };

    const handleSaveInboxRetention = async () => {
        if (!selectedInbox) return;
        setSaving(true);
        try {
            await api(`/inboxes/${selectedInbox.id}`, {
                method: "PATCH",
                token,
                body: { retentionDays: inboxRetention }
            });
            toast.success("Đã cập nhật thời gian lưu trữ cho inbox");
            setSelectedInbox({ ...selectedInbox, retentionDays: inboxRetention });
        } catch (err: unknown) {
            toast.error((err as Error)?.message || "Không thể cập nhật");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveDefaultRetention = async () => {
        setSaving(true);
        try {
            await api("/auth/me", {
                method: "PATCH",
                token,
                body: { retentionDays: defaultRetention }
            });
            toast.success("Đã cập nhật thời gian lưu trữ mặc định");
            onUserRetentionChange?.(defaultRetention);
        } catch (err: unknown) {
            toast.error((err as Error)?.message || "Không thể cập nhật");
        } finally {
            setSaving(false);
        }
    };

    return {
        userInboxes,
        userTier,
        tierInfo,
        retentionOptions,
        selectedInbox,
        setSelectedInbox,
        inboxRetention,
        setInboxRetention,
        defaultRetention,
        setDefaultRetention,
        saving,
        handleInboxSelect,
        handleSaveInboxRetention,
        handleSaveDefaultRetention
    };
}
