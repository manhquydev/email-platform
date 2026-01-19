/**
 * Custom hook for AdminSystem data and actions
 */
import { useState, useEffect, useCallback } from "react";
import { api } from "../../../utils/api";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import toast from "react-hot-toast";
import type { SystemStats, Setting, HistoryPoint } from "./types";

export function useAdminSystemData(token: string) {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [settings, setSettings] = useState<Setting[]>([]);
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<HistoryPoint[]>([]);
    const [saving, setSaving] = useState(false);
    const [localLimitMode, setLocalLimitMode] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            const [statsRes, settingsRes] = await Promise.all([
                api<{ system: SystemStats }>("/admin/system-info", { token }),
                api<{ settings: Setting[] }>("/admin/system/settings", { token })
            ]);
            setStats(statsRes.system);
            setSettings(settingsRes.settings);

            if (statsRes.system.resources) {
                setHistory(prev => {
                    const newHistory = [...prev, {
                        time: new Date().toLocaleTimeString(),
                        cpu: statsRes.system.resources?.cpuLoad,
                        mem: Math.round((statsRes.system.resources?.memUsed || 0) / (statsRes.system.resources?.memTotal || 1) * 100)
                    }];
                    return newHistory.slice(-20);
                });
            }
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, [loadData]);

    const handleUpdateSetting = async (key: string, value: string) => {
        setSaving(true);
        try {
            await api("/admin/system/settings", {
                method: "POST",
                token,
                body: { key, value }
            });
            toast.success("Đã cập nhật cài đặt");
            await loadData();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setSaving(false);
        }
    };

    const handleSaveInboxLimits = async () => {
        setSaving(true);
        try {
            const limitMode = (document.getElementById('limit-mode-select') as HTMLSelectElement).value;
            const maxEmails = (document.getElementById('max-emails-input') as HTMLInputElement)?.value || "100";
            const maxDays = (document.getElementById('max-days-input') as HTMLInputElement)?.value || "7";

            await Promise.all([
                api("/admin/system/settings", { method: "POST", token, body: { key: "PUBLIC_INBOX_LIMIT_MODE", value: limitMode } }),
                api("/admin/system/settings", { method: "POST", token, body: { key: "PUBLIC_INBOX_MAX_EMAILS", value: maxEmails } }),
                api("/admin/system/settings", { method: "POST", token, body: { key: "PUBLIC_INBOX_MAX_DAYS", value: maxDays } })
            ]);

            toast.success("Đã cập nhật giới hạn inbox");
            setLocalLimitMode(null);
            await loadData();
        } catch (e) {
            toast.error("Lỗi: " + (e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const handleCleanup = async () => {
        setSaving(true);
        try {
            await api("/admin/system/cleanup", { method: "POST", token });
            toast.success("Đã kích hoạt dọn dẹp hệ thống");
        } catch (e) {
            toast.error("Lỗi: " + (e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const handleCheckDb = async () => {
        setSaving(true);
        try {
            await api("/admin/system/check-db", { method: "POST", token });
            toast.success("Kết nối Database: Ổn định");
        } catch (e) {
            toast.error("Lỗi kết nối DB: " + (e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    // Derived values
    const retentionDays = settings.find(s => s.key === "RETENTION_DAYS")?.value || "30";
    const inboxLimitModeSetting = settings.find(s => s.key === "PUBLIC_INBOX_LIMIT_MODE")?.value || "none";
    const inboxLimitMode = localLimitMode !== null ? localLimitMode : inboxLimitModeSetting;
    const inboxMaxEmails = settings.find(s => s.key === "PUBLIC_INBOX_MAX_EMAILS")?.value || "100";
    const inboxMaxDays = settings.find(s => s.key === "PUBLIC_INBOX_MAX_DAYS")?.value || "7";

    return {
        stats,
        loading,
        history,
        saving,
        retentionDays,
        inboxLimitMode,
        inboxMaxEmails,
        inboxMaxDays,
        setLocalLimitMode,
        loadData,
        handleUpdateSetting,
        handleSaveInboxLimits,
        handleCleanup,
        handleCheckDb
    };
}
