/**
 * Section components for Docs page - Redesigned with Glassmorphism
 * Vibe Coding Ready - Easy copy/download for AI assistants
 */
import { Link } from "react-router-dom";
import { useState } from "react";
import { CODE_EXAMPLES, API_ENDPOINTS, AVAILABLE_SDKS, DOC_SECTIONS } from "./docs-data";
import type { DocSection } from "./docs-data";

/** Search bar for docs page */
interface DocsSearchBarProps {
    value: string;
    onChange: (value: string) => void;
}

export function DocsSearchBar({ value, onChange }: DocsSearchBarProps) {
    return (
        <div className="max-w-xl mx-auto">
            <div className="relative group">
                <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden focus-within:border-blue-500/50 transition-colors">
                    <span className="material-symbols-outlined text-slate-400 ml-4 text-lg">search</span>
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Tìm trong tài liệu..."
                        className="w-full px-3 py-3 bg-transparent text-[#F1F5F9] placeholder-slate-500 outline-none text-sm"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                    />
                    <kbd className="hidden md:flex items-center gap-1 px-2 py-1 mr-3 text-xs text-slate-500 bg-white/5 rounded border border-white/10">
                        <span>⌘</span>K
                    </kbd>
                </div>
            </div>
        </div>
    );
}

/** Sidebar navigation */
interface DocsSidebarProps {
    activeSection: DocSection;
    onSectionChange: (section: DocSection) => void;
    isOpen: boolean;
}

export function DocsSidebar({ activeSection, onSectionChange, isOpen }: DocsSidebarProps) {
    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => onSectionChange(activeSection)} />
            )}

            {/* Sidebar */}
            <aside className={`
                w-64 shrink-0
                lg:block lg:relative lg:bg-transparent
                ${isOpen ? 'fixed inset-y-0 left-0 z-50 bg-[#0F172A] pt-20 px-4' : 'hidden'}
            `}>
                <nav className="sticky top-28 space-y-1">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-3">
                        Documentation
                    </div>
                    {DOC_SECTIONS.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => onSectionChange(section.id as DocSection)}
                            className={`
                                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer
                                ${activeSection === section.id
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-[#F1F5F9] border border-transparent'
                                }
                            `}
                        >
                            <span className="material-symbols-outlined text-lg">{section.icon}</span>
                            <div>
                                <div className="font-medium text-sm">{section.label}</div>
                                <div className="text-xs text-slate-500">{section.desc}</div>
                            </div>
                        </button>
                    ))}

                    {/* Quick links */}
                    <div className="pt-6 mt-6 border-t border-white/10">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-3">
                            Resources
                        </div>
                        <Link
                            to="/api"
                            className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-[#F1F5F9] rounded-lg transition-colors cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                            <span className="text-sm">API Overview</span>
                        </Link>
                        <a
                            href="/docs/api-reference.md"
                            download
                            className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-[#F1F5F9] rounded-lg transition-colors cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-lg">download</span>
                            <span className="text-sm">Download Docs</span>
                        </a>
                    </div>
                </nav>
            </aside>
        </>
    );
}

/** Glass card wrapper */
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl ${className}`}>
            {children}
        </div>
    );
}

/** Copy button component for code blocks */
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
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 transition-colors cursor-pointer ${className}`}
            title="Copy to clipboard"
        >
            <span className="material-symbols-outlined !text-[14px]">
                {copied ? "check" : "content_copy"}
            </span>
            {copied ? "Copied!" : "Copy"}
        </button>
    );
}

/** Code block with copy button */
function CodeBlock({ code }: { code: string }) {
    return (
        <div className="relative group">
            <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <CopyButton text={code} />
            </div>
            <pre className="bg-[#1E293B] rounded-xl p-4 border border-white/5 overflow-x-auto">
                <code className="text-sm text-slate-300 font-mono">{code}</code>
            </pre>
        </div>
    );
}

/** Vibe Coding banner */
function VibeCodingBanner() {
    return (
        <GlassCard className="p-6 mb-8 border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-500/10 to-transparent">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-purple-400">magic_button</span>
                        <h3 className="text-lg font-bold text-purple-300">Vibe Coding Ready</h3>
                    </div>
                    <p className="text-slate-400 text-sm">
                        Tải tài liệu Markdown để đưa vào AI assistant và generate code tự động.
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <a
                        href="/docs/api-reference.md"
                        download="ephemera-api-reference.md"
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-white text-sm font-medium transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined !text-[18px]">download</span>
                        API Reference
                    </a>
                    <a
                        href="/docs/webhook-guide.md"
                        download="ephemera-webhook-guide.md"
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[#F1F5F9] text-sm font-medium transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined !text-[18px]">download</span>
                        Webhooks
                    </a>
                    <a
                        href="/docs/sdk-guide.md"
                        download="ephemera-sdk-guide.md"
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-xl text-white text-sm font-medium transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined !text-[18px]">download</span>
                        SDK Guide
                    </a>
                </div>
            </div>
        </GlassCard>
    );
}

// --- Quickstart Section ---
export function QuickstartSection() {
    return (
        <div className="space-y-6">
            <VibeCodingBanner />

            <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 flex items-center justify-center bg-blue-500/20 rounded-lg text-blue-400 font-bold text-sm">1</div>
                    <h2 className="text-xl font-bold text-[#F1F5F9]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Lấy API Key</h2>
                </div>
                <p className="text-slate-400 mb-4 text-sm">
                    Truy cập <Link to="/settings?tab=developer" className="text-blue-400 hover:underline">Settings → Developer</Link> để tạo API Key mới.
                </p>
                <code className="block bg-[#1E293B] rounded-lg p-3 text-green-400 text-sm font-mono border border-white/5">
                    epk_live_xxxxxxxxxxxxxxxxxxxxxxxx
                </code>
            </GlassCard>

            <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 flex items-center justify-center bg-blue-500/20 rounded-lg text-blue-400 font-bold text-sm">2</div>
                    <h2 className="text-xl font-bold text-[#F1F5F9]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Tạo Inbox đầu tiên</h2>
                </div>
                <p className="text-slate-400 mb-4 text-sm">
                    Gọi API để tạo inbox mới. Inbox sẽ có địa chỉ email ngẫu nhiên thuộc domain của bạn.
                </p>
                <CodeBlock code={CODE_EXAMPLES.createInbox} />
            </GlassCard>

            <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 flex items-center justify-center bg-blue-500/20 rounded-lg text-blue-400 font-bold text-sm">3</div>
                    <h2 className="text-xl font-bold text-[#F1F5F9]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Nhận Email</h2>
                </div>
                <p className="text-slate-400 mb-4 text-sm">Có 2 cách để nhận email mới:</p>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#1E293B]/50 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-blue-400">sync</span>
                            <span className="font-medium text-[#F1F5F9]">Polling</span>
                        </div>
                        <p className="text-xs text-slate-500">Gọi GET /inboxes/:id/messages định kỳ</p>
                    </div>
                    <div className="p-4 bg-[#1E293B]/50 rounded-xl border border-green-500/30">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-green-400">webhook</span>
                            <span className="font-medium text-[#F1F5F9]">Webhooks</span>
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Khuyến nghị</span>
                        </div>
                        <p className="text-xs text-slate-500">Nhận HTTP POST khi có email mới</p>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}

// --- API Reference Section ---
export function ApiReferenceSection() {
    return (
        <div className="space-y-6">
            <GlassCard className="p-6">
                <h2 className="text-xl font-bold text-[#F1F5F9] mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Base URL</h2>
                <code className="block bg-[#1E293B] rounded-lg p-3 text-green-400 font-mono border border-white/5">
                    https://api.manhquy.click
                </code>
            </GlassCard>

            <GlassCard className="p-6">
                <h2 className="text-xl font-bold text-[#F1F5F9] mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Endpoints</h2>
                <div className="space-y-2">
                    {API_ENDPOINTS.map((ep, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 bg-[#1E293B]/50 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors cursor-pointer">
                            <span className={`px-2 py-1 rounded text-xs font-mono font-bold ${
                                ep.method === "GET" ? "bg-blue-500/20 text-blue-400" :
                                ep.method === "POST" ? "bg-green-500/20 text-green-400" :
                                "bg-red-500/20 text-red-400"
                            }`}>
                                {ep.method}
                            </span>
                            <code className="text-sm text-slate-300 flex-1 font-mono">{ep.path}</code>
                            <span className="text-sm text-slate-500 hidden md:block">{ep.desc}</span>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <div className="grid md:grid-cols-2 gap-6">
                <GlassCard className="p-6">
                    <h2 className="text-xl font-bold text-[#F1F5F9] mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Authentication</h2>
                    <p className="text-slate-400 mb-4 text-sm">
                        Sử dụng header Authorization với Bearer token:
                    </p>
                    <code className="block bg-[#1E293B] rounded-lg p-3 text-sm text-slate-300 font-mono border border-white/5">
                        Authorization: Bearer YOUR_API_KEY
                    </code>
                </GlassCard>

                <GlassCard className="p-6">
                    <h2 className="text-xl font-bold text-[#F1F5F9] mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Rate Limits</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-[#1E293B]/50 rounded-xl border border-white/5">
                            <div className="text-2xl font-bold text-blue-400">100</div>
                            <div className="text-xs text-slate-500">req/min (Free)</div>
                        </div>
                        <div className="p-4 bg-[#1E293B]/50 rounded-xl border border-white/5">
                            <div className="text-2xl font-bold text-green-400">1000</div>
                            <div className="text-xs text-slate-500">req/min (Pro)</div>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}

// --- Webhooks Section ---
export function WebhooksSection() {
    return (
        <div className="space-y-6">
            <VibeCodingBanner />

            <GlassCard className="p-6">
                <h2 className="text-xl font-bold text-[#F1F5F9] mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Cấu hình Webhook</h2>
                <p className="text-slate-400 mb-4 text-sm">
                    Vào <Link to="/settings?tab=developer" className="text-blue-400 hover:underline">Settings → Developer</Link> để tạo webhook endpoint.
                </p>
                <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#1E293B]/50 rounded-lg text-xs text-slate-400">
                        <span className="w-2 h-2 bg-green-400 rounded-full" />
                        URL phải là HTTPS
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#1E293B]/50 rounded-lg text-xs text-slate-400">
                        <span className="w-2 h-2 bg-green-400 rounded-full" />
                        Response 2xx trong 30s
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h2 className="text-xl font-bold text-[#F1F5F9] mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Events</h2>
                <div className="grid md:grid-cols-2 gap-3">
                    {[
                        { event: "email.received", desc: "Email mới đến inbox", color: "green" },
                        { event: "email.read", desc: "Email được đánh dấu đã đọc", color: "blue" },
                        { event: "email.deleted", desc: "Email bị xóa", color: "red" },
                        { event: "email.forwarded", desc: "Email được forward", color: "green" },
                        { event: "test.event", desc: "Sự kiện test từ dashboard", color: "purple" },
                    ].map((item) => (
                        <div key={item.event} className="p-3 bg-[#1E293B]/50 rounded-xl border border-white/5">
                            <code className={`text-${item.color}-400 text-sm`}>{item.event}</code>
                            <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h2 className="text-xl font-bold text-[#F1F5F9] mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Payload Example</h2>
                <CodeBlock code={CODE_EXAMPLES.webhookPayload} />
            </GlassCard>

            <GlassCard className="p-6">
                <h2 className="text-xl font-bold text-[#F1F5F9] mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Xác thực Signature</h2>
                <p className="text-slate-400 mb-4 text-sm">
                    Mỗi webhook có header <code className="text-blue-400">X-Ephemera-Signature</code> chứa HMAC-SHA256 của body.
                </p>
                <CodeBlock code={CODE_EXAMPLES.verifyWebhook} />
            </GlassCard>
        </div>
    );
}

// --- SDKs Section ---
/** Official language logos from CDN */
const SDK_LOGOS: Record<string, string> = {
    javascript: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
    python: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
    go: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original-wordmark.svg",
    php: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg",
    java: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg",
    dotnet: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dotnetcore/dotnetcore-original.svg",
    terminal: "", // Will use material icon
};

export function SdksSection() {
    const [copiedPath, setCopiedPath] = useState<string | null>(null);

    const handleCopyPath = async (path: string) => {
        await navigator.clipboard.writeText(path);
        setCopiedPath(path);
        setTimeout(() => setCopiedPath(null), 2000);
    };

    // All SDKs are now available - no need to filter
    const availableSdks = AVAILABLE_SDKS;

    return (
        <div className="space-y-6">
            <GlassCard className="p-6 border-l-4 border-l-amber-500">
                <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-outlined text-amber-400">info</span>
                    <h3 className="text-lg font-bold text-amber-400">SDK Status</h3>
                </div>
                <p className="text-slate-400 text-sm">
                    SDKs đang được phát triển trong monorepo. Source code có sẵn trong thư mục <code className="text-blue-400">packages/</code>.
                    Chưa publish lên npm/pypi - sử dụng trực tiếp từ source hoặc link local.
                </p>
            </GlassCard>

            {/* Available SDKs */}
            <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <span className="material-symbols-outlined text-green-400">check_circle</span>
                    <h2 className="text-xl font-bold text-[#F1F5F9]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Source Available
                    </h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    {availableSdks.map((sdk) => (
                        <div
                            key={sdk.name}
                            className="group p-4 bg-[#1E293B]/50 rounded-xl border border-white/5 hover:border-green-500/30 transition-all duration-200"
                        >
                            <div className="flex items-center gap-4">
                                {/* Logo container - rounded */}
                                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 border border-white/10 group-hover:border-white/20 transition-colors overflow-hidden shrink-0">
                                    {SDK_LOGOS[sdk.icon] ? (
                                        <img
                                            src={SDK_LOGOS[sdk.icon]}
                                            alt={`${sdk.name} logo`}
                                            className="w-7 h-7 object-contain"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <span className="material-symbols-outlined text-slate-400">terminal</span>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-[#F1F5F9]">{sdk.name}</span>
                                        <span className="flex items-center gap-1 text-xs text-green-400">
                                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                                            Available
                                        </span>
                                    </div>
                                    {/* Description */}
                                    <p className="text-xs text-slate-500 mb-1">{sdk.description}</p>
                                    {/* Source path with copy */}
                                    <div className="flex items-center gap-2">
                                        <code className="text-xs text-blue-400/70 font-mono truncate">{sdk.path}</code>
                                        <button
                                            onClick={() => handleCopyPath(sdk.path)}
                                            className="shrink-0 p-1 text-slate-500 hover:text-blue-400 transition-colors cursor-pointer"
                                            title="Copy source path"
                                        >
                                            <span className="material-symbols-outlined !text-[14px]">
                                                {copiedPath === sdk.path ? "check" : "content_copy"}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h2 className="text-xl font-bold text-[#F1F5F9] mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Quick Start với JavaScript
                </h2>
                <CodeBlock code={CODE_EXAMPLES.fetchExample} />
            </GlassCard>
        </div>
    );
}
