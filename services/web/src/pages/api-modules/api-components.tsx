/**
 * UI components for API page - Redesigned with Glassmorphism
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import type { Endpoint } from "./api-constants";
import { getMethodColor } from "./api-constants";

/** Search bar component - prominent in hero */
interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
    return (
        <div className="max-w-2xl mx-auto mb-12">
            <div className="relative group">
                <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden focus-within:border-blue-500/50 transition-colors">
                    <span className="material-symbols-outlined text-slate-400 ml-5 text-xl">search</span>
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Tìm endpoint, method, hoặc tính năng..."
                        className="w-full px-4 py-4 bg-transparent text-[#F1F5F9] placeholder-slate-500 outline-none text-base"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                    />
                    {value && (
                        <button
                            onClick={() => onChange("")}
                            className="mr-4 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/** Quick action cards below search */
export function QuickActionCards() {
    const actions = [
        { icon: "rocket_launch", label: "Quickstart", desc: "Bắt đầu trong 5 phút", href: "/docs" },
        { icon: "code", label: "SDKs", desc: "7 ngôn ngữ hỗ trợ", href: "/docs?section=sdks" },
        { icon: "webhook", label: "Webhooks", desc: "Real-time events", href: "/docs?section=webhooks" },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {actions.map((action) => (
                <Link
                    key={action.label}
                    to={action.href}
                    className="group flex items-center gap-4 p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 hover:border-blue-500/30 transition-all duration-200 cursor-pointer"
                >
                    <div className="w-10 h-10 flex items-center justify-center bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                        <span className="material-symbols-outlined text-blue-400">{action.icon}</span>
                    </div>
                    <div>
                        <div className="font-semibold text-[#F1F5F9] text-sm">{action.label}</div>
                        <div className="text-xs text-slate-500">{action.desc}</div>
                    </div>
                </Link>
            ))}
        </div>
    );
}

/** Code example panel - redesigned */
const CODE_EXAMPLE = `# Tạo inbox mới
curl -X POST https://api.manhquy.click/inboxes \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"domainId": "..."}'

# Response
{
  "id": "inbox_abc123",
  "address": "random@yourdomain.com",
  "createdAt": "2024-01-15T10:30:00Z"
}`;

export function CodeExample() {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(CODE_EXAMPLE);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative rounded-2xl overflow-hidden group">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative bg-[#1E293B]/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/60" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                            <div className="w-3 h-3 rounded-full bg-green-500/60" />
                        </div>
                        <span className="text-xs text-slate-500 ml-2 font-mono">example.sh</span>
                    </div>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-white bg-white/5 rounded hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-sm">
                            {copied ? "check" : "content_copy"}
                        </span>
                        {copied ? "Copied!" : "Copy"}
                    </button>
                </div>

                {/* Code content */}
                <div className="p-6 font-mono text-sm text-slate-300 space-y-1 overflow-x-auto">
                    <div className="text-slate-500"># Tạo inbox mới</div>
                    <div className="text-green-400">$ curl -X POST https://api.manhquy.click/inboxes \</div>
                    <div className="pl-4">-H <span className="text-amber-300">"Authorization: Bearer $API_KEY"</span> \</div>
                    <div className="pl-4">-H <span className="text-amber-300">"Content-Type: application/json"</span> \</div>
                    <div className="pl-4">-d <span className="text-amber-300">'{`{"domainId": "..."}`}'</span></div>
                    <div className="h-4" />
                    <div className="text-slate-500"># Response</div>
                    <div className="text-blue-300">{"{"}</div>
                    <div className="pl-4"><span className="text-purple-400">"id"</span>: <span className="text-green-300">"inbox_abc123"</span>,</div>
                    <div className="pl-4"><span className="text-purple-400">"address"</span>: <span className="text-green-300">"random@yourdomain.com"</span>,</div>
                    <div className="pl-4"><span className="text-purple-400">"createdAt"</span>: <span className="text-green-300">"2024-01-15T10:30:00Z"</span></div>
                    <div className="text-blue-300">{"}"}</div>
                </div>
            </div>
        </div>
    );
}

/** API features description - redesigned */
export function APIFeatures() {
    const features = [
        {
            icon: "api",
            title: "REST API Mạnh Mẽ",
            desc: "Toàn bộ chức năng của nền tảng đều có thể truy cập qua API chuẩn RESTful. Xác thực bằng JWT token hoặc API Key."
        },
        {
            icon: "webhook",
            title: "Webhooks Thời Gian Thực",
            desc: "Nhận thông báo HTTP POST ngay khi có email mới đến inbox. Hỗ trợ retry tự động và xác thực HMAC-SHA256."
        },
        {
            icon: "speed",
            title: "Rate Limits Linh Hoạt",
            desc: "Rate limit tùy theo gói đăng ký. Gói Pro hỗ trợ lên đến 1000 requests/phút."
        }
    ];

    return (
        <div className="space-y-6">
            {features.map((feature) => (
                <div key={feature.title} className="group p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/[0.08] hover:border-blue-500/30 transition-all duration-200">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 flex items-center justify-center bg-blue-500/20 rounded-lg shrink-0">
                            <span className="material-symbols-outlined text-blue-400">{feature.icon}</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                {feature.title}
                            </h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                {feature.desc}
                            </p>
                        </div>
                    </div>
                </div>
            ))}

            <div className="flex gap-3 pt-4">
                <Link
                    to="/docs"
                    className="inline-flex items-center gap-2 bg-[#3B82F6] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#2563EB] transition-colors cursor-pointer"
                >
                    <span className="material-symbols-outlined text-lg">description</span>
                    Xem Tài Liệu
                </Link>
                <Link
                    to="/settings?tab=developer"
                    className="inline-flex items-center gap-2 bg-white/10 text-[#F1F5F9] px-5 py-2.5 rounded-xl font-semibold hover:bg-white/20 transition-colors cursor-pointer"
                >
                    <span className="material-symbols-outlined text-lg">key</span>
                    Lấy API Key
                </Link>
            </div>
        </div>
    );
}

/** Single endpoint card - redesigned */
interface EndpointCardProps {
    endpoint: Endpoint;
}

export function EndpointCard({ endpoint }: EndpointCardProps) {
    return (
        <div className="group p-5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/[0.08] hover:border-blue-500/30 transition-all duration-200 cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
                <span className={`${getMethodColor(endpoint.color)} px-2.5 py-1 rounded-md text-xs font-mono font-bold`}>
                    {endpoint.method}
                </span>
                <code className="text-sm text-slate-300 font-mono">{endpoint.path}</code>
            </div>
            <p className="text-sm text-slate-400">{endpoint.description}</p>
        </div>
    );
}

/** Authentication section - redesigned */
export function AuthenticationSection() {
    return (
        <div className="mb-20">
            <h2 className="text-2xl font-bold text-[#F1F5F9] mb-8 text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Xác Thực
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:border-blue-500/30 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 flex items-center justify-center bg-blue-500/20 rounded-lg">
                            <span className="material-symbols-outlined text-blue-400">key</span>
                        </div>
                        <h3 className="text-lg font-semibold text-[#F1F5F9]">API Key</h3>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">
                        Sử dụng cho server-to-server. Tạo trong Settings → Developer.
                    </p>
                    <code className="block bg-[#1E293B] p-3 rounded-lg text-sm text-green-400 font-mono border border-white/5">
                        Authorization: Bearer epk_live_xxx...
                    </code>
                </div>
                <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:border-blue-500/30 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 flex items-center justify-center bg-purple-500/20 rounded-lg">
                            <span className="material-symbols-outlined text-purple-400">token</span>
                        </div>
                        <h3 className="text-lg font-semibold text-[#F1F5F9]">JWT Token</h3>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">
                        Sử dụng cho client-side. Lấy từ POST /auth/login.
                    </p>
                    <code className="block bg-[#1E293B] p-3 rounded-lg text-sm text-green-400 font-mono border border-white/5">
                        Authorization: Bearer eyJhbGc...
                    </code>
                </div>
            </div>
        </div>
    );
}

/** Webhook section - redesigned */
export function WebhookSection() {
    return (
        <div className="mb-20">
            <h2 className="text-2xl font-bold text-[#F1F5F9] mb-8 text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Webhooks
            </h2>
            <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-lg font-semibold text-[#F1F5F9] mb-4">Sự kiện hỗ trợ</h3>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-3">
                                <span className="w-2 h-2 bg-green-400 rounded-full" />
                                <code className="text-sm text-slate-300 font-mono">email.received</code>
                                <span className="text-sm text-slate-500">- Email mới đến</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="w-2 h-2 bg-blue-400 rounded-full" />
                                <code className="text-sm text-slate-300 font-mono">test.event</code>
                                <span className="text-sm text-slate-500">- Kiểm tra kết nối</span>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-[#F1F5F9] mb-4">Tính năng</h3>
                        <ul className="space-y-3">
                            {["Xác thực HMAC-SHA256", "Retry tự động (5 lần)", "Idempotency key", "Logs & retry thủ công"].map((feature) => (
                                <li key={feature} className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-green-400 text-lg">check_circle</span>
                                    <span className="text-sm text-slate-400">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
