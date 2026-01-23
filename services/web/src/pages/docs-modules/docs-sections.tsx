/**
 * Section components for Docs page
 * Vibe Coding Ready - Easy copy/download for AI assistants
 */
import { Link } from "react-router-dom";
import { useState } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { CODE_EXAMPLES, API_ENDPOINTS, AVAILABLE_SDKS } from "./docs-data";

// Copy button component for code blocks
function CopyButton({ text, className = "" }: { text: string; className?: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 transition-colors ${className}`}
            title="Copy to clipboard"
        >
            <span className="material-symbols-outlined !text-[14px]">
                {copied ? "check" : "content_copy"}
            </span>
            {copied ? "Copied!" : "Copy"}
        </button>
    );
}

// Download markdown docs banner
function VibeCodingBanner() {
    return (
        <GlassCard className="p-6 mb-8 border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-500/10 to-transparent">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-purple-400">magic_button</span>
                        <h3 className="text-lg font-bold text-purple-300">Vibe Coding Ready</h3>
                    </div>
                    <p className="text-nebula-text-muted text-sm">
                        Tải tài liệu Markdown để đưa vào AI assistant (Claude, Cursor, Copilot) và generate code tự động.
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <a
                        href="/docs/api-reference.md"
                        download="ephemera-api-reference.md"
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                        <span className="material-symbols-outlined !text-[18px]">download</span>
                        API Reference
                    </a>
                    <a
                        href="/docs/webhook-guide.md"
                        download="ephemera-webhook-guide.md"
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                        <span className="material-symbols-outlined !text-[18px]">download</span>
                        Webhook Guide
                    </a>
                    <a
                        href="/docs/sdk-guide.md"
                        download="ephemera-sdk-guide.md"
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                        <span className="material-symbols-outlined !text-[18px]">download</span>
                        SDK Guide
                    </a>
                </div>
            </div>
        </GlassCard>
    );
}

// Code block with copy button
function CodeBlock({ code }: { code: string }) {
    return (
        <div className="relative group">
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <CopyButton text={code} />
            </div>
            <pre className="bg-nebula-elevated rounded-lg p-4 border border-nebula-border overflow-x-auto">
                <code className="text-sm text-slate-300">{code}</code>
            </pre>
        </div>
    );
}

// --- Quickstart Section ---
export function QuickstartSection() {
    return (
        <div className="space-y-8 animate-fade-in-up">
            <VibeCodingBanner />

            <GlassCard className="p-8">
                <h2 className="text-2xl font-bold mb-4">1. Lấy API Key</h2>
                <p className="text-nebula-text-muted mb-4">
                    Truy cập <Link to="/app/settings?tab=developer" className="text-nebula-violet hover:underline">Settings → Developer</Link> để tạo API Key mới.
                </p>
                <div className="bg-nebula-elevated rounded-lg p-4 border border-nebula-border">
                    <code className="text-green-300 text-sm">epk_live_xxxxxxxxxxxxxxxxxxxxxxxx</code>
                </div>
            </GlassCard>

            <GlassCard className="p-8">
                <h2 className="text-2xl font-bold mb-4">2. Tạo Inbox đầu tiên</h2>
                <p className="text-nebula-text-muted mb-4">
                    Gọi API để tạo inbox mới. Inbox sẽ có địa chỉ email ngẫu nhiên thuộc domain của bạn.
                </p>
                <CodeBlock code={CODE_EXAMPLES.createInbox} />
            </GlassCard>

            <GlassCard className="p-8">
                <h2 className="text-2xl font-bold mb-4">3. Nhận Email</h2>
                <p className="text-nebula-text-muted mb-4">
                    Có 2 cách để nhận email mới:
                </p>
                <ul className="space-y-3 text-nebula-text-muted">
                    <li className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-green-400 text-sm mt-1">check</span>
                        <span><strong>Polling:</strong> Gọi GET /inboxes/:id/messages định kỳ</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-green-400 text-sm mt-1">check</span>
                        <span><strong>Webhooks:</strong> Nhận HTTP POST khi có email mới (khuyến nghị)</span>
                    </li>
                </ul>
            </GlassCard>
        </div>
    );
}

// --- API Reference Section ---
export function ApiReferenceSection() {
    return (
        <div className="space-y-6 animate-fade-in-up">
            <GlassCard className="p-8">
                <h2 className="text-2xl font-bold mb-4">Base URL</h2>
                <code className="block bg-nebula-elevated rounded-lg p-4 border border-nebula-border text-green-300">
                    https://api.manhquy.click
                </code>
            </GlassCard>

            <GlassCard className="p-8">
                <h2 className="text-2xl font-bold mb-6">Endpoints</h2>
                <div className="space-y-4">
                    {API_ENDPOINTS.map((ep, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 bg-nebula-elevated/50 rounded-lg border border-nebula-border">
                            <span className={`px-2 py-1 rounded text-xs font-mono font-bold ${
                                ep.method === "GET" ? "bg-blue-500/20 text-blue-400" :
                                ep.method === "POST" ? "bg-green-500/20 text-green-400" :
                                "bg-red-500/20 text-red-400"
                            }`}>
                                {ep.method}
                            </span>
                            <code className="text-sm text-slate-300 flex-1">{ep.path}</code>
                            <span className="text-sm text-nebula-text-muted">{ep.desc}</span>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <GlassCard className="p-8">
                <h2 className="text-2xl font-bold mb-4">Authentication</h2>
                <p className="text-nebula-text-muted mb-4">
                    Sử dụng header Authorization với Bearer token:
                </p>
                <pre className="bg-nebula-elevated rounded-lg p-4 border border-nebula-border">
                    <code className="text-sm text-slate-300">Authorization: Bearer YOUR_API_KEY</code>
                </pre>
            </GlassCard>

            <GlassCard className="p-8">
                <h2 className="text-2xl font-bold mb-4">Rate Limits</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-nebula-elevated/50 rounded-lg border border-nebula-border">
                        <div className="text-2xl font-bold text-nebula-violet">100</div>
                        <div className="text-sm text-nebula-text-muted">requests/phút (Free)</div>
                    </div>
                    <div className="p-4 bg-nebula-elevated/50 rounded-lg border border-nebula-border">
                        <div className="text-2xl font-bold text-nebula-violet">1000</div>
                        <div className="text-sm text-nebula-text-muted">requests/phút (Pro)</div>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}

// --- Webhooks Section ---
export function WebhooksSection() {
    return (
        <div className="space-y-6 animate-fade-in-up">
            <VibeCodingBanner />

            <GlassCard className="p-8">
                <h2 className="text-2xl font-bold mb-4">Cấu hình Webhook</h2>
                <p className="text-nebula-text-muted mb-4">
                    Vào <Link to="/app/settings?tab=developer" className="text-nebula-violet hover:underline">Settings → Developer</Link> để tạo webhook endpoint.
                </p>
                <ul className="space-y-2 text-nebula-text-muted">
                    <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        URL phải là HTTPS và public accessible
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        Response phải trả về 2xx trong 30 giây
                    </li>
                </ul>
            </GlassCard>

            <GlassCard className="p-8">
                <h2 className="text-2xl font-bold mb-4">Events</h2>
                <div className="space-y-3">
                    <div className="p-4 bg-nebula-elevated/50 rounded-lg border border-nebula-border">
                        <code className="text-green-400">email.received</code>
                        <p className="text-sm text-nebula-text-muted mt-1">Khi có email mới đến inbox</p>
                    </div>
                    <div className="p-4 bg-nebula-elevated/50 rounded-lg border border-nebula-border">
                        <code className="text-blue-400">email.read</code>
                        <p className="text-sm text-nebula-text-muted mt-1">Khi email được đánh dấu đã đọc</p>
                    </div>
                    <div className="p-4 bg-nebula-elevated/50 rounded-lg border border-nebula-border">
                        <code className="text-red-400">email.deleted</code>
                        <p className="text-sm text-nebula-text-muted mt-1">Khi email bị xóa</p>
                    </div>
                    <div className="p-4 bg-nebula-elevated/50 rounded-lg border border-nebula-border">
                        <code className="text-green-400">email.forwarded</code>
                        <p className="text-sm text-nebula-text-muted mt-1">Khi email được forward</p>
                    </div>
                    <div className="p-4 bg-nebula-elevated/50 rounded-lg border border-nebula-border">
                        <code className="text-purple-400">test.event</code>
                        <p className="text-sm text-nebula-text-muted mt-1">Sự kiện test từ nút "Test" trong dashboard</p>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="p-8">
                <h2 className="text-2xl font-bold mb-4">Payload Example</h2>
                <CodeBlock code={CODE_EXAMPLES.webhookPayload} />
            </GlassCard>

            <GlassCard className="p-8">
                <h2 className="text-2xl font-bold mb-4">Xác thực Signature</h2>
                <p className="text-nebula-text-muted mb-4">
                    Mỗi webhook request có header <code className="text-nebula-violet">X-Ephemera-Signature</code> chứa HMAC-SHA256 của body.
                </p>
                <CodeBlock code={CODE_EXAMPLES.verifyWebhook} />
            </GlassCard>

            <GlassCard className="p-8">
                <h2 className="text-2xl font-bold mb-4">Retry Policy</h2>
                <ul className="space-y-2 text-nebula-text-muted">
                    <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-nebula-violet text-sm">schedule</span>
                        5 lần retry với exponential backoff
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-nebula-violet text-sm">schedule</span>
                        Delays: 1s, 2s, 4s, 8s, 16s
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-nebula-violet text-sm">schedule</span>
                        Có thể retry thủ công từ dashboard
                    </li>
                </ul>
            </GlassCard>
        </div>
    );
}

// --- SDKs Section ---
export function SdksSection() {
    return (
        <div className="space-y-6 animate-fade-in-up">
            <GlassCard className="p-8 border-l-4 border-l-green-500">
                <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-green-400">check_circle</span>
                    <h3 className="text-lg font-bold text-green-400">SDKs Available</h3>
                </div>
                <p className="text-nebula-text-muted">
                    7 SDK chính thức đã sẵn sàng! Cài đặt SDK cho ngôn ngữ của bạn và bắt đầu tích hợp API.
                </p>
            </GlassCard>

            <GlassCard className="p-8">
                <h2 className="text-2xl font-bold mb-4">Official SDKs</h2>
                <div className="grid md:grid-cols-2 gap-4">
                    {AVAILABLE_SDKS.map((sdk, i) => (
                        <div key={i} className="p-4 bg-nebula-elevated/50 rounded-lg border border-nebula-border">
                            <div className="flex items-center gap-2 mb-2">
                                <span>{sdk.icon}</span>
                                <span className="font-medium">{sdk.name}</span>
                            </div>
                            <span className="text-xs text-nebula-text-muted">{sdk.status}</span>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <GlassCard className="p-8">
                <h2 className="text-2xl font-bold mb-4">Sử dụng với fetch</h2>
                <pre className="bg-nebula-elevated rounded-lg p-4 border border-nebula-border overflow-x-auto">
                    <code className="text-sm text-slate-300">{CODE_EXAMPLES.fetchExample}</code>
                </pre>
            </GlassCard>
        </div>
    );
}
