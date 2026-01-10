import { useState, useEffect } from "react";
import { GlassCard } from "../ui/GlassCard";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input"; // Assuming Input component exists
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import { toast } from "react-hot-toast";
import { WebhookLogs } from "./WebhookLogs";
import type { Webhook } from "../../types";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface DeveloperSettingsProps {
    // Props if needed
}

interface ApiKey {
    id: string;
    prefix: string;
    name: string;
    createdAt: string;
    lastUsedAt?: string;
    key?: string; // Only present on creation response
}

// eslint-disable-next-line no-empty-pattern
export function DeveloperSettings({ }: DeveloperSettingsProps) {
    const { token } = useAuth();

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

    useEffect(() => {
        if (token) {
            loadKeys();
            loadWebhooks();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    // --- API KEYS LOGIC ---

    const loadKeys = async () => {
        setKeysLoading(true);
        try {
            const data = await api<{ keys: ApiKey[] }>("/api-keys", { token });
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
                token,
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
            await api(`/api-keys/${id}`, { method: "DELETE", token });
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
            const data = await api<Webhook[]>("/webhooks", { token });
            setWebhooks(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            // Don't toast on initial load error to avoid spamming if service is down, just log
        } finally {
            setWebhooksLoading(false);
        }
    };

    const handleCreateWebhook = async () => {
        if (!newWebhookName || !newWebhookUrl) {
            toast.error("Vui lòng nhập tên và URL");
            return;
        }

        // Basic URL validation
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
                token,
                body: {
                    name: newWebhookName,
                    url: newWebhookUrl,
                    events: ["email.received"] // Default for now
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
            await api(`/webhooks/${id}`, { method: "DELETE", token });
            setWebhooks(webhooks.filter(w => w.id !== id));
            toast.success("Đã xóa Webhook");
        } catch {
            toast.error("Không thể xóa Webhook");
        }
    };

    const handleTestWebhook = async (id: string) => {
        const toastId = toast.loading("Đang gửi sự kiện test...");
        try {
            await api(`/webhooks/${id}/test`, { method: "POST", token });
            toast.success("Đã gửi sự kiện test thành công!", { id: toastId });
        } catch {
            toast.error("Gửi test thất bại. Kiểm tra URL endpoint của bạn.", { id: toastId });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Đã sao chép vào bộ nhớ tạm");
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div>
                <h2 className="text-3xl font-bold text-nebula-text mb-2 tracking-tight">Cài đặt cho nhà phát triển</h2>
                <p className="text-nebula-text-muted font-body">Quản lý API key và Webhook để tích hợp hệ thống.</p>
            </div>

            {/* API Keys Section */}
            <section className="glass-panel rounded-xl p-6 bg-nebula-surface border border-nebula-border border-l-4 border-l-nebula-violet/70 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-nebula-text mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-nebula-violet">api</span>
                            API Key
                        </h3>
                        <p className="text-sm text-nebula-text-muted font-body">Sử dụng API Key để truy cập Ephemera từ ứng dụng của bạn.</p>
                    </div>
                </div>

                {newKey && (
                    <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-lg animate-pulse-once">
                        <p className="text-warning text-sm mb-2 font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">warning</span>
                            Đã tạo API Key mới
                        </p>
                        <p className="text-xs text-nebula-text-secondary mb-3">Sao chép key này ngay bây giờ. Vì lý do bảo mật, bạn sẽ không thể thấy lại nó lần nữa!</p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 bg-nebula-elevated p-2 rounded text-sm font-mono text-nebula-text break-all border border-nebula-border">
                                {newKey}
                            </code>
                            <Button size="sm" onClick={() => copyToClipboard(newKey)}>Sao chép</Button>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {keysLoading ? (
                        <div className="text-center py-4 text-nebula-text-muted italic">Đang tải danh sách key...</div>
                    ) : keys.length === 0 ? (
                        <div className="text-center py-8 bg-nebula-elevated/50 rounded-lg border border-nebula-border border-dashed">
                            <span className="material-symbols-outlined text-nebula-text-muted text-3xl mb-2">key_off</span>
                            <p className="text-nebula-text-muted text-sm">Chưa có API key nào. Hãy tạo một cái để bắt đầu.</p>
                        </div>
                    ) : (
                        keys.map(key => (
                            <div key={key.id} className="bg-nebula-elevated/50 rounded-lg p-4 border border-nebula-border flex items-center justify-between gap-4 group hover:border-nebula-border-highlight transition-colors">
                                <div className="flex flex-col gap-1 overflow-hidden">
                                    <span className="text-xs text-nebula-text-muted uppercase font-bold tracking-wider">{key.name}</span>
                                    <code className="text-sm text-success font-mono truncate bg-success/10 px-1.5 py-0.5 rounded w-fit">{key.prefix}****************</code>
                                    <span className="text-[10px] text-nebula-text-muted">Ngày tạo: {new Date(key.createdAt).toLocaleDateString("vi-VN")}</span>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => handleDeleteKey(key.id)}
                                        className="p-2 hover:bg-nebula-elevated rounded-md text-nebula-text-muted hover:text-danger transition-colors"
                                        title="Thu hồi Key"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">block</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-6">
                    <Button onClick={handleCreateKey} disabled={creatingKey || keysLoading}>
                        {creatingKey ? "Đang tạo..." : "Tạo Key mới"}
                    </Button>
                </div>
            </section>

            {/* Webhooks Section */}
            <section className="glass-panel rounded-xl p-6 bg-nebula-surface border border-nebula-border border-l-4 border-l-nebula-violet/70 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-nebula-text mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-nebula-violet">webhook</span>
                            Webhooks
                        </h3>
                        <p className="text-sm text-nebula-text-muted font-body">Nhận thông báo HTTP POST khi có sự kiện (ví dụ: email đến).</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => setIsWebhookModalOpen(true)}>
                        + Thêm Webhook
                    </Button>
                </div>

                <div className="space-y-3">
                    {webhooksLoading ? (
                        <div className="text-center py-4 text-nebula-text-muted italic">Đang tải webhooks...</div>
                    ) : webhooks.length === 0 ? (
                        <div className="text-center py-8 bg-nebula-elevated/50 rounded-lg border border-nebula-border border-dashed">
                            <span className="material-symbols-outlined text-nebula-text-muted text-3xl mb-2">device_hub</span>
                            <p className="text-nebula-text-muted text-sm">Chưa cấu hình Webhook nào.</p>
                        </div>
                    ) : (
                        webhooks.map(hook => (
                            <div key={hook.id} className="bg-nebula-elevated/50 rounded-lg p-4 border border-nebula-border flex flex-col gap-3 group hover:border-nebula-border-highlight transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col gap-1 overflow-hidden">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-nebula-text text-sm">{hook.name}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${hook.isActive ? 'bg-success/10 text-success border-success/20' : 'bg-nebula-elevated text-nebula-text-muted border-nebula-border'}`}>
                                                {hook.isActive ? 'ACTIVE' : 'INACTIVE'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-nebula-text-muted truncate">
                                            <span className="material-symbols-outlined text-[14px]">link</span>
                                            <span className="truncate">{hook.url}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <Button size="sm" variant="ghost" onClick={() => setSelectedWebhookForLogs(hook)} title="Xem lịch sử">
                                            Logs
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => handleTestWebhook(hook.id)} title="Gửi test payload">
                                            Test
                                        </Button>
                                        <button
                                            onClick={() => handleDeleteWebhook(hook.id)}
                                            className="p-1.5 hover:bg-nebula-elevated rounded-md text-nebula-text-muted hover:text-danger transition-colors"
                                            title="Xóa Webhook"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-2 flex-wrap border-t border-nebula-border pt-2 mt-1">
                                    {hook.events.map(evt => (
                                        <span key={evt} className="text-[10px] bg-nebula-violet/10 text-nebula-violet px-2 py-0.5 rounded border border-nebula-violet/20">
                                            {evt}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Create Webhook Modal */}
            {isWebhookModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <GlassCard className="w-full max-w-md p-6 space-y-6 animate-fade-in-up">
                        <h3 className="text-xl font-bold text-nebula-text">Thêm Webhook Mới</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-nebula-text-secondary mb-1">Tên gợi nhớ</label>
                                <Input
                                    value={newWebhookName}
                                    onChange={e => setNewWebhookName(e.target.value)}
                                    placeholder="VD: Production Backend"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-nebula-text-secondary mb-1">URL Endpoint</label>
                                <Input
                                    value={newWebhookUrl}
                                    onChange={e => setNewWebhookUrl(e.target.value)}
                                    placeholder="https://api.yoursite.com/webhooks/email"
                                />
                                <p className="text-[10px] text-nebula-text-muted mt-1">Chúng tôi sẽ gửi HTTP POST request đến URL này.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-nebula-text-secondary mb-2">Sự kiện đăng ký</label>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" checked disabled className="rounded bg-nebula-elevated border-nebula-border text-nebula-violet" />
                                    <span className="text-sm text-nebula-text">email.received</span>
                                    <span className="text-xs text-nebula-text-muted">(Mặc định)</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="ghost" onClick={() => setIsWebhookModalOpen(false)}>Hủy</Button>
                            <Button onClick={handleCreateWebhook} disabled={creatingWebhook}>
                                {creatingWebhook ? "Đang tạo..." : "Tạo Webhook"}
                            </Button>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Webhook Logs Modal */}
            {selectedWebhookForLogs && (
                <WebhookLogs
                    webhookId={selectedWebhookForLogs.id}
                    webhookName={selectedWebhookForLogs.name}
                    onClose={() => setSelectedWebhookForLogs(null)}
                />
            )}
        </div>
    );
}
