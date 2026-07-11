/**
 * UI components for DeveloperSettings
 */
import { GlassCard } from "../../ui/GlassCard";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Badge } from "../../ui/Badge";
import type { Webhook } from "../../../types";
import type { ApiKey } from "./types";

// --- API Keys Section ---
interface ApiKeysSectionProps {
    keys: ApiKey[];
    keysLoading: boolean;
    creatingKey: boolean;
    newKey: string | null;
    onCreateKey: () => void;
    onDeleteKey: (id: string) => void;
    onCopy: (text: string) => void;
}

export function ApiKeysSection({ keys, keysLoading, creatingKey, newKey, onCreateKey, onDeleteKey, onCopy }: ApiKeysSectionProps) {
    return (
        <section className="rounded-xl p-6 bg-semantic-bg-elevated border border-semantic-border border-l-4 border-l-semantic-accent/70 shadow-semantic-sm">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-semantic-text-main mb-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-semantic-accent">api</span>
                        API Key
                    </h3>
                    <p className="text-sm text-semantic-text-muted font-body">Sử dụng API Key để truy cập Ephemera từ ứng dụng của bạn.</p>
                </div>
            </div>

            {/* One-time full-key reveal on creation. Intentional (GitHub/Stripe-style
                create-once secret display) — do NOT mask, this is the only place the
                caller ever sees the complete unmasked key. */}
            {newKey && (
                <div className="mb-6 p-4 bg-semantic-warning-subtle border border-semantic-warning/30 rounded-lg animate-pulse-once">
                    <p className="text-semantic-warning text-sm mb-2 font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        Đã tạo API Key mới
                    </p>
                    <p className="text-xs text-semantic-text-secondary mb-3">Sao chép key này ngay bây giờ. Vì lý do bảo mật, bạn sẽ không thể thấy lại nó lần nữa!</p>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 bg-semantic-bg-secondary p-2 rounded text-sm font-mono text-semantic-text-main break-all border border-semantic-border">
                            {newKey}
                        </code>
                        <Button size="sm" onClick={() => onCopy(newKey)}>Sao chép</Button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {keysLoading ? (
                    <div className="text-center py-4 text-semantic-text-muted italic">Đang tải danh sách key...</div>
                ) : keys.length === 0 ? (
                    <div className="text-center py-8 bg-semantic-bg-secondary/50 rounded-lg border border-semantic-border border-dashed">
                        <span className="material-symbols-outlined text-semantic-text-muted text-3xl mb-2">key_off</span>
                        <p className="text-semantic-text-muted text-sm">Chưa có API key nào. Hãy tạo một cái để bắt đầu.</p>
                    </div>
                ) : (
                    keys.map(key => (
                        <ApiKeyItem key={key.id} apiKey={key} onDelete={onDeleteKey} />
                    ))
                )}
            </div>

            <div className="mt-6">
                <Button onClick={onCreateKey} disabled={creatingKey || keysLoading}>
                    {creatingKey ? "Đang tạo..." : "Tạo Key mới"}
                </Button>
            </div>
        </section>
    );
}

/** Permanent masked list view — only ever renders `prefix` + a fixed-length
 * mask, never the full `apiKey.key` (which is absent from the list API
 * response after creation anyway). Mask character count is unchanged. */
function ApiKeyItem({ apiKey, onDelete }: { apiKey: ApiKey; onDelete: (id: string) => void }) {
    return (
        <div className="bg-semantic-bg-secondary/50 rounded-lg p-4 border border-semantic-border flex items-center justify-between gap-4 group hover:border-semantic-border-hover transition-colors">
            <div className="flex flex-col gap-1 overflow-hidden">
                <span className="text-xs text-semantic-text-muted uppercase font-bold tracking-wider">{apiKey.name}</span>
                <code className="text-sm text-semantic-success font-mono truncate bg-semantic-success-subtle px-1.5 py-0.5 rounded w-fit">{apiKey.prefix}****************</code>
                <span className="text-[10px] text-semantic-text-muted">Ngày tạo: {new Date(apiKey.createdAt).toLocaleDateString("vi-VN")}</span>
            </div>
            <div className="flex gap-2 shrink-0">
                <button
                    onClick={() => onDelete(apiKey.id)}
                    className="p-2 hover:bg-semantic-bg-hover rounded-md text-semantic-text-muted hover:text-semantic-danger transition-colors"
                    title="Thu hồi Key"
                >
                    <span className="material-symbols-outlined text-[20px]">block</span>
                </button>
            </div>
        </div>
    );
}

// --- Webhooks Section ---
interface WebhooksSectionProps {
    webhooks: Webhook[];
    webhooksLoading: boolean;
    onAddWebhook: () => void;
    onDeleteWebhook: (id: string) => void;
    onTestWebhook: (id: string) => void;
    onViewLogs: (webhook: Webhook) => void;
}

export function WebhooksSection({ webhooks, webhooksLoading, onAddWebhook, onDeleteWebhook, onTestWebhook, onViewLogs }: WebhooksSectionProps) {
    return (
        <section className="rounded-xl p-6 bg-semantic-bg-elevated border border-semantic-border border-l-4 border-l-semantic-accent/70 shadow-semantic-sm">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-lg font-bold text-semantic-text-main mb-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-semantic-accent">webhook</span>
                        Webhooks
                    </h3>
                    <p className="text-sm text-semantic-text-muted font-body">Nhận thông báo HTTP POST khi có sự kiện (ví dụ: email đến).</p>
                </div>
                <Button size="sm" variant="secondary" onClick={onAddWebhook}>
                    + Thêm Webhook
                </Button>
            </div>

            <div className="space-y-3">
                {webhooksLoading ? (
                    <div className="text-center py-4 text-semantic-text-muted italic">Đang tải webhooks...</div>
                ) : webhooks.length === 0 ? (
                    <div className="text-center py-8 bg-semantic-bg-secondary/50 rounded-lg border border-semantic-border border-dashed">
                        <span className="material-symbols-outlined text-semantic-text-muted text-3xl mb-2">device_hub</span>
                        <p className="text-semantic-text-muted text-sm">Chưa cấu hình Webhook nào.</p>
                    </div>
                ) : (
                    webhooks.map(hook => (
                        <WebhookItem key={hook.id} webhook={hook} onDelete={onDeleteWebhook} onTest={onTestWebhook} onViewLogs={onViewLogs} />
                    ))
                )}
            </div>
        </section>
    );
}

function WebhookItem({ webhook, onDelete, onTest, onViewLogs }: { webhook: Webhook; onDelete: (id: string) => void; onTest: (id: string) => void; onViewLogs: (w: Webhook) => void }) {
    return (
        <div className="bg-semantic-bg-secondary/50 rounded-lg p-4 border border-semantic-border flex flex-col gap-3 group hover:border-semantic-border-hover transition-colors">
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-semantic-text-main text-sm">{webhook.name}</span>
                        <Badge variant={webhook.isActive ? 'success' : 'default'}>
                            {webhook.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-semantic-text-muted truncate">
                        <span className="material-symbols-outlined text-[14px]">link</span>
                        <span className="truncate">{webhook.url}</span>
                    </div>
                </div>
                <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => onViewLogs(webhook)} title="Xem lịch sử">Logs</Button>
                    <Button size="sm" variant="ghost" onClick={() => onTest(webhook.id)} title="Gửi test payload">Test</Button>
                    <button onClick={() => onDelete(webhook.id)} className="p-1.5 hover:bg-semantic-bg-hover rounded-md text-semantic-text-muted hover:text-semantic-danger transition-colors" title="Xóa Webhook">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            </div>
            <div className="flex gap-2 flex-wrap border-t border-semantic-border pt-2 mt-1">
                {webhook.events.map(evt => (
                    <span key={evt} className="text-[10px] bg-semantic-accent-subtle text-semantic-accent-text px-2 py-0.5 rounded border border-semantic-accent/20">
                        {evt}
                    </span>
                ))}
            </div>
        </div>
    );
}

// --- Create Webhook Modal ---
interface WebhookModalProps {
    name: string;
    url: string;
    creating: boolean;
    onNameChange: (name: string) => void;
    onUrlChange: (url: string) => void;
    onSubmit: () => void;
    onClose: () => void;
}

export function WebhookModal({ name, url, creating, onNameChange, onUrlChange, onSubmit, onClose }: WebhookModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <GlassCard className="w-full max-w-md p-6 space-y-6 animate-fade-in-up">
                <h3 className="text-xl font-bold text-semantic-text-main">Thêm Webhook Mới</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-semantic-text-secondary mb-1">Tên gợi nhớ</label>
                        <Input value={name} onChange={e => onNameChange(e.target.value)} placeholder="VD: Production Backend" autoFocus />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-semantic-text-secondary mb-1">URL Endpoint</label>
                        <Input value={url} onChange={e => onUrlChange(e.target.value)} placeholder="https://api.yoursite.com/webhooks/email" />
                        <p className="text-[10px] text-semantic-text-muted mt-1">Chúng tôi sẽ gửi HTTP POST request đến URL này.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-semantic-text-secondary mb-2">Sự kiện đăng ký</label>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked disabled className="rounded bg-semantic-bg-secondary border-semantic-border text-semantic-accent" />
                            <span className="text-sm text-semantic-text-main">email.received</span>
                            <span className="text-xs text-semantic-text-muted">(Mặc định)</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={onClose}>Hủy</Button>
                    <Button onClick={onSubmit} disabled={creating}>
                        {creating ? "Đang tạo..." : "Tạo Webhook"}
                    </Button>
                </div>
            </GlassCard>
        </div>
    );
}
