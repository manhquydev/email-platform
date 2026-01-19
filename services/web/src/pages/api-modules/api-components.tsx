/**
 * UI components for API page
 */
import { Link } from "react-router-dom";
import type { Endpoint } from "./api-constants";
import { getMethodColor } from "./api-constants";

/** Code example panel */
export function CodeExample() {
    return (
        <div className="relative rounded-lg overflow-hidden shadow-2xl border border-[var(--nebula-border)] group">
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--nebula-violet)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20"></div>
            <div className="bg-[#0a0a16] h-auto w-full flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
                    <span className="text-xs text-slate-400">example.sh</span>
                    <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                        <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                    </div>
                </div>
                <div className="p-6 font-mono text-xs sm:text-sm text-slate-300 space-y-2 relative overflow-hidden">
                    <div className="flex"><span className="text-slate-500"># Tạo inbox mới</span></div>
                    <div className="flex text-green-400">$ curl -X POST https://api.manhquy.click/inboxes \</div>
                    <div className="flex pl-4">-H <span className="text-yellow-300">"Authorization: Bearer $API_KEY"</span> \</div>
                    <div className="flex pl-4">-H <span className="text-yellow-300">"Content-Type: application/json"</span> \</div>
                    <div className="flex pl-4">-d <span className="text-yellow-300">'{`{"domainId": "..."}`}'</span></div>
                    <div className="flex mt-4"></div>
                    <div className="flex"><span className="text-slate-500"># Response</span></div>
                    <div className="flex text-blue-300">{`{`}</div>
                    <div className="flex pl-4"><span className="text-purple-400">"id"</span>: <span className="text-green-300">"inbox_abc123"</span>,</div>
                    <div className="flex pl-4"><span className="text-purple-400">"address"</span>: <span className="text-green-300">"random@yourdomain.com"</span>,</div>
                    <div className="flex pl-4"><span className="text-purple-400">"createdAt"</span>: <span className="text-green-300">"2024-01-15T10:30:00Z"</span></div>
                    <div className="flex text-blue-300">{`}`}</div>
                </div>
            </div>
        </div>
    );
}

/** API features description */
export function APIFeatures() {
    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-2xl font-bold text-white mb-2">REST API Mạnh Mẽ</h3>
                <p className="text-[var(--nebula-text-secondary)]">
                    Toàn bộ chức năng của nền tảng đều có thể truy cập qua API chuẩn RESTful. Xác thực bằng JWT token hoặc API Key.
                </p>
            </div>
            <div>
                <h3 className="text-2xl font-bold text-white mb-2">Webhooks Thời Gian Thực</h3>
                <p className="text-[var(--nebula-text-secondary)]">
                    Nhận thông báo HTTP POST ngay khi có email mới đến inbox. Hỗ trợ retry tự động và xác thực HMAC-SHA256.
                </p>
            </div>
            <div>
                <h3 className="text-2xl font-bold text-white mb-2">Giới Hạn & Quotas</h3>
                <p className="text-[var(--nebula-text-secondary)]">
                    Rate limit linh hoạt tùy theo gói đăng ký. Gói Spectre hỗ trợ lên đến 1000 requests/phút.
                </p>
            </div>
            <div className="pt-6 flex gap-4">
                <Link to="/docs" className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-slate-200 transition-colors">
                    <span className="material-symbols-outlined">description</span>
                    Xem Tài Liệu API
                </Link>
                <Link to="/app/settings?tab=developer" className="inline-flex items-center gap-2 bg-[var(--nebula-violet)] text-white px-6 py-3 rounded-lg font-bold hover:bg-[var(--nebula-violet-dark)] transition-colors">
                    <span className="material-symbols-outlined">key</span>
                    Lấy API Key
                </Link>
            </div>
        </div>
    );
}

/** Single endpoint card */
interface EndpointCardProps {
    endpoint: Endpoint;
}

export function EndpointCard({ endpoint }: EndpointCardProps) {
    return (
        <div className="bg-[var(--nebula-surface)] border border-[var(--nebula-border)] p-6 rounded-xl hover:border-[var(--nebula-violet)]/50 transition-colors">
            <div className="flex items-center gap-3 mb-4">
                <span className={`${getMethodColor(endpoint.color)} px-2 py-1 rounded text-xs font-mono font-bold`}>
                    {endpoint.method}
                </span>
                <code className="text-sm text-slate-300">{endpoint.path}</code>
            </div>
            <p className="text-[var(--nebula-text-secondary)] text-sm">{endpoint.description}</p>
        </div>
    );
}

/** Authentication section */
export function AuthenticationSection() {
    return (
        <div className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Xác Thực</h2>
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-[var(--nebula-surface)] border border-[var(--nebula-border)] p-8 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="material-symbols-outlined text-[var(--nebula-violet)]">key</span>
                        <h3 className="text-xl font-bold text-white">API Key</h3>
                    </div>
                    <p className="text-[var(--nebula-text-secondary)] mb-4">
                        Sử dụng cho server-to-server. Tạo trong Settings → Developer.
                    </p>
                    <code className="block bg-black/30 p-3 rounded text-sm text-green-300 font-mono">
                        Authorization: Bearer epk_live_xxx...
                    </code>
                </div>
                <div className="bg-[var(--nebula-surface)] border border-[var(--nebula-border)] p-8 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="material-symbols-outlined text-[var(--nebula-violet)]">token</span>
                        <h3 className="text-xl font-bold text-white">JWT Token</h3>
                    </div>
                    <p className="text-[var(--nebula-text-secondary)] mb-4">
                        Sử dụng cho client-side. Lấy từ POST /auth/login.
                    </p>
                    <code className="block bg-black/30 p-3 rounded text-sm text-green-300 font-mono">
                        Authorization: Bearer eyJhbGc...
                    </code>
                </div>
            </div>
        </div>
    );
}

/** Webhook section */
export function WebhookSection() {
    return (
        <div className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Webhooks</h2>
            <div className="bg-[var(--nebula-surface)] border border-[var(--nebula-border)] p-8 rounded-xl">
                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4">Sự kiện hỗ trợ</h3>
                        <ul className="space-y-2 text-[var(--nebula-text-secondary)]">
                            <li className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                <code className="text-sm">email.received</code> - Email mới đến
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                <code className="text-sm">test.event</code> - Kiểm tra kết nối
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4">Tính năng</h3>
                        <ul className="space-y-2 text-[var(--nebula-text-secondary)]">
                            <li className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-400 text-sm">check</span>
                                Xác thực HMAC-SHA256
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-400 text-sm">check</span>
                                Retry tự động (5 lần, exponential backoff)
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-400 text-sm">check</span>
                                Idempotency key ngăn trùng lặp
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-400 text-sm">check</span>
                                Xem logs và retry thủ công
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
