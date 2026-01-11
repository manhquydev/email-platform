import { Link } from "react-router-dom";

const endpoints = [
    {
        method: "POST",
        path: "/inboxes",
        description: "Tạo inbox mới với domain tùy chọn",
        color: "green"
    },
    {
        method: "GET",
        path: "/inboxes",
        description: "Liệt kê tất cả inbox của bạn",
        color: "blue"
    },
    {
        method: "GET",
        path: "/inboxes/:id/messages",
        description: "Lấy danh sách email trong inbox",
        color: "blue"
    },
    {
        method: "GET",
        path: "/messages/:id",
        description: "Đọc nội dung chi tiết email (HTML/Text)",
        color: "blue"
    },
    {
        method: "DELETE",
        path: "/messages/:id",
        description: "Xóa một email",
        color: "red"
    },
    {
        method: "GET",
        path: "/domains",
        description: "Liệt kê domain đã cấu hình",
        color: "blue"
    },
    {
        method: "POST",
        path: "/webhooks",
        description: "Tạo webhook nhận thông báo email",
        color: "green"
    },
    {
        method: "GET",
        path: "/api-keys",
        description: "Quản lý API key của bạn",
        color: "blue"
    },
    {
        method: "GET",
        path: "/attachments/:id/download",
        description: "Tải file đính kèm",
        color: "blue"
    }
];

const getMethodColor = (color: string) => {
    switch (color) {
        case "green": return "bg-green-500/20 text-green-400";
        case "blue": return "bg-blue-500/20 text-blue-400";
        case "red": return "bg-red-500/20 text-red-400";
        case "yellow": return "bg-yellow-500/20 text-yellow-400";
        default: return "bg-slate-500/20 text-slate-400";
    }
};

export function API() {
    return (
        <div className="pt-24 min-h-screen bg-[#050510] relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-[var(--nebula-violet)]/5 blur-[100px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-6 py-12 z-10 relative">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded text-xs font-bold bg-[var(--nebula-violet)]/20 text-[var(--nebula-violet)] uppercase tracking-wider mb-6">
                        Developer First
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                        API Cho Tự Động Hóa
                    </h1>
                    <p className="text-xl text-[var(--nebula-text-secondary)] max-w-3xl mx-auto font-light">
                        Tích hợp Ephemera vào CI/CD pipeline, test suite, hoặc ứng dụng của bạn với REST API đầy đủ.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
                    {/* Visual / Code Example */}
                    <div className="order-2 lg:order-1">
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
                    </div>

                    {/* Content */}
                    <div className="order-1 lg:order-2 space-y-8">
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
                </div>

                {/* Endpoints Quick Look */}
                <div className="mb-20">
                    <h2 className="text-3xl font-bold text-white mb-8 text-center">Các Endpoint Chính</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {endpoints.map((endpoint, index) => (
                            <div key={index} className="bg-[var(--nebula-surface)] border border-[var(--nebula-border)] p-6 rounded-xl hover:border-[var(--nebula-violet)]/50 transition-colors">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className={`${getMethodColor(endpoint.color)} px-2 py-1 rounded text-xs font-mono font-bold`}>
                                        {endpoint.method}
                                    </span>
                                    <code className="text-sm text-slate-300">{endpoint.path}</code>
                                </div>
                                <p className="text-[var(--nebula-text-secondary)] text-sm">{endpoint.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Authentication Section */}
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

                {/* Webhook Section */}
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
            </div>
        </div>
    );
}
