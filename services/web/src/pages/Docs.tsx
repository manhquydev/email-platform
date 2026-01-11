import { Link } from "react-router-dom";
import { GlassCard } from "../components/ui/GlassCard";
import { useState } from "react";

type DocSection = "quickstart" | "api" | "webhooks" | "sdks";

const codeExamples = {
    createInbox: `curl -X POST https://api.manhquy.click/inboxes \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"domainId": "your-domain-id"}'`,

    listMessages: `curl https://api.manhquy.click/inboxes/{inbox_id}/messages \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    webhookPayload: `{
  "event": "email.received",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "msg_abc123",
    "inboxId": "inbox_xyz",
    "from": "sender@example.com",
    "subject": "Welcome!",
    "preview": "Thanks for signing up..."
  }
}`,

    verifyWebhook: `import crypto from 'crypto';

function verifyWebhookSignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`
};

export function Docs() {
    const [activeSection, setActiveSection] = useState<DocSection>("quickstart");

    return (
        <div className="min-h-screen pt-24 pb-20 neo-mesh-bg text-white">
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
                {/* Header */}
                <div className="text-center mb-12 animate-fade-in-up">
                    <span className="inline-block px-3 py-1 rounded bg-blue-500/20 text-blue-300 text-sm font-bold mb-4 border border-blue-500/30">
                        DEVELOPER HUB
                    </span>
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-200 via-white to-blue-200 bg-clip-text text-transparent">
                        Tài Liệu API
                    </h1>
                    <p className="text-nebula-text-muted text-lg max-w-2xl mx-auto">
                        Hướng dẫn tích hợp, API reference, và các ví dụ code để bạn bắt đầu xây dựng với Ephemera.
                    </p>
                </div>

                {/* Navigation Tabs */}
                <div className="flex flex-wrap justify-center gap-2 mb-12">
                    {[
                        { id: "quickstart", label: "Bắt đầu nhanh", icon: "rocket_launch" },
                        { id: "api", label: "API Reference", icon: "api" },
                        { id: "webhooks", label: "Webhooks", icon: "webhook" },
                        { id: "sdks", label: "SDKs", icon: "code" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSection(tab.id as DocSection)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                                activeSection === tab.id
                                    ? "bg-nebula-violet text-white"
                                    : "bg-white/5 text-nebula-text-muted hover:bg-white/10"
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Sections */}
                <div className="max-w-4xl mx-auto">
                    {/* Quickstart */}
                    {activeSection === "quickstart" && (
                        <div className="space-y-8 animate-fade-in-up">
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
                                <pre className="bg-nebula-elevated rounded-lg p-4 border border-nebula-border overflow-x-auto">
                                    <code className="text-sm text-slate-300">{codeExamples.createInbox}</code>
                                </pre>
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
                    )}

                    {/* API Reference */}
                    {activeSection === "api" && (
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
                                    {[
                                        { method: "POST", path: "/inboxes", desc: "Tạo inbox mới" },
                                        { method: "GET", path: "/inboxes", desc: "Liệt kê inbox" },
                                        { method: "GET", path: "/inboxes/:id", desc: "Chi tiết inbox" },
                                        { method: "DELETE", path: "/inboxes/:id", desc: "Xóa inbox" },
                                        { method: "GET", path: "/inboxes/:id/messages", desc: "Danh sách email" },
                                        { method: "GET", path: "/messages/:id", desc: "Chi tiết email" },
                                        { method: "DELETE", path: "/messages/:id", desc: "Xóa email" },
                                        { method: "GET", path: "/domains", desc: "Liệt kê domain" },
                                        { method: "POST", path: "/webhooks", desc: "Tạo webhook" },
                                        { method: "GET", path: "/webhooks", desc: "Liệt kê webhook" },
                                        { method: "DELETE", path: "/webhooks/:id", desc: "Xóa webhook" },
                                        { method: "POST", path: "/webhooks/:id/test", desc: "Test webhook" },
                                        { method: "GET", path: "/api-keys", desc: "Liệt kê API key" },
                                        { method: "POST", path: "/api-keys", desc: "Tạo API key" },
                                        { method: "DELETE", path: "/api-keys/:id", desc: "Thu hồi API key" },
                                    ].map((ep, i) => (
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
                    )}

                    {/* Webhooks */}
                    {activeSection === "webhooks" && (
                        <div className="space-y-6 animate-fade-in-up">
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
                                        <code className="text-blue-400">test.event</code>
                                        <p className="text-sm text-nebula-text-muted mt-1">Sự kiện test từ nút "Test" trong dashboard</p>
                                    </div>
                                </div>
                            </GlassCard>

                            <GlassCard className="p-8">
                                <h2 className="text-2xl font-bold mb-4">Payload Example</h2>
                                <pre className="bg-nebula-elevated rounded-lg p-4 border border-nebula-border overflow-x-auto">
                                    <code className="text-sm text-slate-300">{codeExamples.webhookPayload}</code>
                                </pre>
                            </GlassCard>

                            <GlassCard className="p-8">
                                <h2 className="text-2xl font-bold mb-4">Xác thực Signature</h2>
                                <p className="text-nebula-text-muted mb-4">
                                    Mỗi webhook request có header <code className="text-nebula-violet">X-Webhook-Signature</code> chứa HMAC-SHA256 của body.
                                </p>
                                <pre className="bg-nebula-elevated rounded-lg p-4 border border-nebula-border overflow-x-auto">
                                    <code className="text-sm text-slate-300">{codeExamples.verifyWebhook}</code>
                                </pre>
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
                                        Delays: 1m, 5m, 30m, 2h, 24h
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-nebula-violet text-sm">schedule</span>
                                        Có thể retry thủ công từ dashboard
                                    </li>
                                </ul>
                            </GlassCard>
                        </div>
                    )}

                    {/* SDKs */}
                    {activeSection === "sdks" && (
                        <div className="space-y-6 animate-fade-in-up">
                            <GlassCard className="p-8 border-l-4 border-l-yellow-500">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-yellow-400">construction</span>
                                    <h3 className="text-lg font-bold text-yellow-400">Coming Soon</h3>
                                </div>
                                <p className="text-nebula-text-muted">
                                    SDK chính thức đang được phát triển. Hiện tại, bạn có thể sử dụng REST API trực tiếp với bất kỳ HTTP client nào.
                                </p>
                            </GlassCard>

                            <GlassCard className="p-8">
                                <h2 className="text-2xl font-bold mb-4">Planned SDKs</h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {[
                                        { name: "JavaScript/TypeScript", icon: "🟨", status: "Đang phát triển" },
                                        { name: "Python", icon: "🐍", status: "Planned Q2 2024" },
                                        { name: "Go", icon: "🔵", status: "Planned Q3 2024" },
                                        { name: "PHP", icon: "🐘", status: "Community" },
                                    ].map((sdk, i) => (
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
                                    <code className="text-sm text-slate-300">{`const response = await fetch('https://api.manhquy.click/inboxes', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ domainId: 'your-domain-id' })
});

const inbox = await response.json();
console.log(inbox.address); // random@yourdomain.com`}</code>
                                </pre>
                            </GlassCard>
                        </div>
                    )}
                </div>

                {/* Footer CTA */}
                <div className="mt-16 text-center">
                    <p className="text-nebula-text-muted mb-4">
                        Cần hỗ trợ thêm?
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link to="/support" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                            <span className="material-symbols-outlined text-sm">support_agent</span>
                            Liên hệ hỗ trợ
                        </Link>
                        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                            <span className="material-symbols-outlined text-sm">code</span>
                            GitHub
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
