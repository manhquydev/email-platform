/**
 * Custom hook for DeveloperSettings data and actions
 */
import { useState, useEffect } from "react";
import { api } from "../../../utils/api";
import { toast } from "react-hot-toast";
import type { Webhook } from "../../../types";
import type { ApiKey } from "./types";

export function useDeveloperSettingsData(token: string | null) {
    // API Key State
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [keysLoading, setKeysLoading] = useState(false);
    const [creatingKey, setCreatingKey] = useState(false);
    const [newKey, setNewKey] = useState<string | null>(null);

    // Webhook State
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [webhooksLoading, setWebhooksLoading] = useState(false);
    const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
    const [selectedWebhookForLogs, setSelectedWebhookForLogs] = useState<Webhook | null>(null);

    // Webhook Form State
    const [newWebhookName, setNewWebhookName] = useState("");
    const [newWebhookUrl, setNewWebhookUrl] = useState("");
    const [creatingWebhook, setCreatingWebhook] = useState(false);

    // --- API KEYS LOGIC ---
    const loadKeys = async () => {
        setKeysLoading(true);
        try {
            const data = await api<{ keys: ApiKey[] }>("/api-keys", { token: token ?? undefined });
            setKeys(data?.keys || []);
        } catch {
            toast.error("Không thể tải danh sách API key");
            setKeys([]);
        } finally {
            setKeysLoading(false);
        }
    };

    const handleCreateKey = async () => {
        setCreatingKey(true);
        try {
            const name = `Khóa ngày ${new Date().toLocaleDateString("vi-VN")}`;
            const data = await api<{ apiKey: ApiKey }>("/api-keys", {
                method: "POST",
                token: token ?? undefined,
                body: { name }
            });
            setKeys([data.apiKey, ...keys]);
            setNewKey(data.apiKey.key || null);
            toast.success("Đã tạo API Key! Hãy sao chép ngay.");
        } catch {
            toast.error("Không thể tạo API key");
        } finally {
            setCreatingKey(false);
        }
    };

    const handleDeleteKey = async (id: string) => {
        if (!confirm("Thu hồi API Key này? Các ứng dụng đang sử dụng nó sẽ ngừng hoạt động.")) return;
        try {
            await api(`/api-keys/${id}`, { method: "DELETE", token: token ?? undefined });
            setKeys(keys.filter(k => k.id !== id));
            toast.success("Đã thu hồi API Key");
        } catch {
            toast.error("Không thể thu hồi key");
        }
    };

    // --- WEBHOOKS LOGIC ---
    const loadWebhooks = async () => {
        setWebhooksLoading(true);
        try {
            const data = await api<Webhook[]>("/webhooks", { token: token ?? undefined });
            setWebhooks(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setWebhooksLoading(false);
        }
    };

    const handleCreateWebhook = async () => {
        if (!newWebhookName || !newWebhookUrl) {
            toast.error("Vui lòng nhập tên và URL");
            return;
        }

        try {
            new URL(newWebhookUrl);
        } catch {
            toast.error("URL không hợp lệ (phải bắt đầu bằng http:// hoặc https://)");
            return;
        }

        setCreatingWebhook(true);
        try {
            const newWebhook = await api<Webhook>("/webhooks", {
                method: "POST",
                token: token ?? undefined,
                body: {
                    name: newWebhookName,
                    url: newWebhookUrl,
                    events: ["email.received"]
                }
            });
            setWebhooks([newWebhook, ...webhooks]);
            toast.success("Đã tạo Webhook");
            setIsWebhookModalOpen(false);
            setNewWebhookName("");
            setNewWebhookUrl("");
        } catch {
            toast.error("Không thể tạo Webhook");
        } finally {
            setCreatingWebhook(false);
        }
    };

    const handleDeleteWebhook = async (id: string) => {
        if (!confirm("Xóa Webhook này?")) return;
        try {
            await api(`/webhooks/${id}`, { method: "DELETE", token: token ?? undefined });
            setWebhooks(webhooks.filter(w => w.id !== id));
            toast.success("Đã xóa Webhook");
        } catch {
            toast.error("Không thể xóa Webhook");
        }
    };

    const handleTestWebhook = async (id: string) => {
        const toastId = toast.loading("Đang gửi sự kiện test...");
        try {
            await api(`/webhooks/${id}/test`, { method: "POST", token: token ?? undefined });
            toast.success("Đã gửi sự kiện test thành công!", { id: toastId });
        } catch {
            toast.error("Gửi test thất bại. Kiểm tra URL endpoint của bạn.", { id: toastId });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Đã sao chép vào bộ nhớ tạm");
    };

    const openWebhookModal = () => setIsWebhookModalOpen(true);
    const closeWebhookModal = () => setIsWebhookModalOpen(false);
    const closeWebhookLogs = () => setSelectedWebhookForLogs(null);

    useEffect(() => {
        if (token) {
            loadKeys();
            loadWebhooks();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    return {
        // API Keys
        keys,
        keysLoading,
        creatingKey,
        newKey,
        handleCreateKey,
        handleDeleteKey,
        copyToClipboard,
        // Webhooks
        webhooks,
        webhooksLoading,
        isWebhookModalOpen,
        selectedWebhookForLogs,
        newWebhookName,
        setNewWebhookName,
        newWebhookUrl,
        setNewWebhookUrl,
        creatingWebhook,
        openWebhookModal,
        closeWebhookModal,
        handleCreateWebhook,
        handleDeleteWebhook,
        handleTestWebhook,
        setSelectedWebhookForLogs,
        closeWebhookLogs
    };
}
