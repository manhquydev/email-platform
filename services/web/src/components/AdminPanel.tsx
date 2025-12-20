import { useState, useEffect, useCallback, type FormEvent } from "react";
import { api } from "../utils/api";
import { getFriendlyErrorMessage } from "../utils/errorMapping";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { AdminDashboard } from "./admin/AdminDashboard";
import { AdminUsers } from "./admin/AdminUsers";
import { AdminReports } from "./admin/AdminReports";
import { AdminLogs } from "./admin/AdminLogs";
import { AdminEmails } from "./admin/AdminEmails";

type TabType = "dashboard" | "users" | "emails" | "rules" | "domains" | "reports" | "logs" | "settings";

interface Tab {
    id: TabType;
    label: string;
    icon: React.ReactNode;
    badge?: number;
}

interface SidebarCounts {
    openReports: number;
    totalUsers: number;
    totalDomains: number;
}

// SVG Icons - Simple and Consistent (Heroicons Outline style)
const icons = {
    dashboard: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h7v7H3V3zm11 0h7v7h-7V3zm-11 11h7v7H3v-7zm11 0h7v7h-7v-7z" />
        </svg>
    ),
    users: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm12 10v-2a4 4 0 0 0-3-3.87m-4-12a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    shield: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    ),
    globe: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
    ),
    flag: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1v12zm0 0v6" />
        </svg>
    ),
    clock: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
        </svg>
    ),
    cog: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    ),
    back: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7l-7 7 7 7" />
        </svg>
    ),
    search: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
    ),
    email: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
    ),
};

// Badge Component
function Badge({ count, color = "red" }: { count: number; color?: "red" | "blue" | "green" }) {
    if (count === 0) return null;

    const colorClasses = {
        red: "bg-red-500 text-white",
        blue: "bg-blue-500 text-white",
        green: "bg-green-500 text-white",
    };

    return (
        <span className={`ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full ${colorClasses[color]}`}>
            {count > 99 ? "99+" : count}
        </span>
    );
}

export function AdminPanel({ token }: { token: string }) {
    const [activeTab, setActiveTab] = useState<TabType>("dashboard");
    const [counts, setCounts] = useState<SidebarCounts>({ openReports: 0, totalUsers: 0, totalDomains: 0 });
    const [searchQuery, setSearchQuery] = useState("");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Fetch counts for badges
    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const res = await api<{ stats: { openReports: number; totalUsers: number; totalDomains: number } }>("/admin/stats", { token });
                setCounts({
                    openReports: res.stats.openReports,
                    totalUsers: res.stats.totalUsers,
                    totalDomains: res.stats.totalDomains,
                });
            } catch {
                // Silent fail for badge counts
            }
        };
        fetchCounts();
        // Refresh every 60 seconds
        const interval = setInterval(fetchCounts, 60000);
        return () => clearInterval(interval);
    }, [token]);

    // Load saved theme preference
    useEffect(() => {
        const savedTheme = localStorage.getItem("admin-theme");
        if (savedTheme === "dark") {
            document.documentElement.classList.add("dark");
            document.documentElement.setAttribute("data-theme", "dark");
        } else if (savedTheme === "light") {
            document.documentElement.classList.remove("dark");
            document.documentElement.setAttribute("data-theme", "light");
        }
    }, []);

    const tabs: Tab[] = [
        { id: "dashboard", label: "Tổng quan", icon: icons.dashboard },
        { id: "users", label: "Người dùng", icon: icons.users, badge: counts.totalUsers },
        { id: "emails", label: "Email", icon: icons.email },
        { id: "rules", label: "Quy tắc bảo vệ", icon: icons.shield },
        { id: "domains", label: "Tên miền", icon: icons.globe, badge: counts.totalDomains },
        { id: "reports", label: "Báo cáo", icon: icons.flag, badge: counts.openReports },
        { id: "logs", label: "Nhật ký", icon: icons.clock },
        { id: "settings", label: "Cài đặt", icon: icons.cog },
    ];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            // Navigate to users tab with search
            setActiveTab("users");
        }
    };

    return (
        <div className="h-screen flex bg-white dark:bg-[#0A0A0B] admin-layout">
            {/* Sidebar */}
            <div className={`${sidebarCollapsed ? "w-16" : "w-64"} bg-gray-50 dark:bg-[#0A0A0B] border-r border-gray-200 dark:border-white/10 flex flex-col admin-sidebar transition-all duration-200`}>
                {/* Header */}
                <div className="h-16 px-4 flex items-center justify-between border-b border-gray-200 dark:border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#0A0A0B] dark:bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        {!sidebarCollapsed && <span className="font-semibold text-sm text-gray-900 dark:text-white">Quản trị</span>}
                    </div>
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-colors"
                        title={sidebarCollapsed ? "Mở rộng" : "Thu gọn"}
                    >
                        <svg className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                </div>

                {/* Search Bar */}
                {!sidebarCollapsed && (
                    <form onSubmit={handleSearch} className="px-3 py-3 border-b border-gray-200 dark:border-white/10">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">{icons.search}</span>
                            <input
                                type="text"
                                placeholder="Tìm kiếm..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>
                    </form>
                )}

                {/* Navigation */}
                <nav className="flex-1 py-4 px-3 overflow-y-auto">
                    <div className="space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${activeTab === tab.id
                                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                                    }`}
                                title={sidebarCollapsed ? tab.label : undefined}
                            >
                                <span className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ${activeTab === tab.id ? "text-white" : "text-gray-500 dark:text-gray-400"}`}>
                                    {tab.icon}
                                </span>
                                {!sidebarCollapsed && (
                                    <>
                                        <span className="ml-3 flex-1 text-left">{tab.label}</span>
                                        {tab.id === "reports" && tab.badge ? (
                                            <Badge count={tab.badge} color="red" />
                                        ) : null}
                                    </>
                                )}
                                {sidebarCollapsed && tab.id === "reports" && counts.openReports > 0 && (
                                    <span className="absolute right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                                )}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-gray-200 dark:border-white/10 space-y-2">
                    {/* Dark Mode Toggle */}
                    <button
                        onClick={() => {
                            const isDark = document.documentElement.classList.contains("dark");
                            if (isDark) {
                                document.documentElement.classList.remove("dark");
                                document.documentElement.setAttribute("data-theme", "light");
                                localStorage.setItem("admin-theme", "light");
                            } else {
                                document.documentElement.classList.add("dark");
                                document.documentElement.setAttribute("data-theme", "dark");
                                localStorage.setItem("admin-theme", "dark");
                            }
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${sidebarCollapsed ? "justify-center" : ""}`}
                        title={sidebarCollapsed ? "Chế độ tối/sáng" : undefined}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                        </svg>
                        {!sidebarCollapsed && <span>Chế độ tối/sáng</span>}
                    </button>
                    <Link
                        to="/"
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${sidebarCollapsed ? "justify-center" : ""}`}
                        title={sidebarCollapsed ? "Quay lại" : undefined}
                    >
                        {icons.back}
                        {!sidebarCollapsed && <span>Quay lại</span>}
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === "dashboard" && <AdminDashboard token={token} />}
                {activeTab === "users" && <AdminUsers token={token} />}
                {activeTab === "emails" && <AdminEmails token={token} />}
                {activeTab === "rules" && <RulesList token={token} />}
                {activeTab === "domains" && <DomainsList token={token} />}
                {activeTab === "reports" && <AdminReports token={token} />}
                {activeTab === "logs" && <AdminLogs token={token} />}
                {activeTab === "settings" && <SettingsPanel token={token} />}
            </div>
        </div>
    );
}


function RulesList({ token }: { token: string }) {
    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [newValue, setNewValue] = useState("");
    const [newType, setNewType] = useState("BLOCK");
    const [newScope, setNewScope] = useState("SENDER_DOMAIN");
    const [error, setError] = useState("");

    const loadRules = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api<{ data: any[] }>("/abuse/rules", { token });
            setRules(res.data);
        } catch (err) {
            setError(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadRules();
    }, [loadRules]);

    const addRule = async () => {
        if (!newValue) return;
        setLoading(true);
        setError("");
        try {
            await api("/abuse/rules", {
                method: "POST",
                token,
                body: { type: newType, scope: newScope, value: newValue },
            });
            setNewValue("");
            toast.success("Đã thêm quy tắc");
            await loadRules();
        } catch (err) {
            setError(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    };

    const deleteRule = async (id: string) => {
        if (!confirm("Xóa quy tắc này?")) return;
        setLoading(true);
        try {
            await api(`/abuse/rules/${id}`, { method: "DELETE", token });
            toast.success("Đã xóa");
            await loadRules();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    };

    const scopeLabels: Record<string, string> = {
        SENDER_DOMAIN: "Tên miền gửi",
        SENDER_EMAIL: "Email gửi",
        RECIPIENT_DOMAIN: "Tên miền nhận",
        RECIPIENT_INBOX: "Hộp thư nhận",
        SOURCE_IP: "Địa chỉ IP",
    };

    return (
        <div className="p-6 max-w-5xl">
            <div className="mb-6">
                <h1 className="text-xl font-semibold">Quy tắc bảo vệ</h1>
                <p className="text-sm text-muted mt-1">Quản lý các quy tắc chặn hoặc cho phép email</p>
            </div>

            {/* Add Rule Form */}
            <div className="bg-surface border border-border rounded-lg p-5 mb-6">
                <h3 className="text-sm font-medium mb-4">Thêm quy tắc mới</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-xs text-muted mb-1.5">Loại</label>
                        <select value={newType} onChange={(e) => setNewType(e.target.value)} className="text-sm">
                            <option value="BLOCK">Chặn</option>
                            <option value="ALLOW">Cho phép</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-muted mb-1.5">Phạm vi</label>
                        <select value={newScope} onChange={(e) => setNewScope(e.target.value)} className="text-sm">
                            <option value="SENDER_DOMAIN">Tên miền gửi</option>
                            <option value="SENDER_EMAIL">Email gửi</option>
                            <option value="RECIPIENT_DOMAIN">Tên miền nhận</option>
                            <option value="SOURCE_IP">Địa chỉ IP</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-muted mb-1.5">Giá trị</label>
                        <input
                            className="text-sm"
                            placeholder="example.com"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addRule()}
                        />
                    </div>
                    <button onClick={addRule} disabled={loading || !newValue} className="btn-primary h-10">
                        Thêm
                    </button>
                </div>
                {error && <div className="mt-3 text-sm text-danger">{error}</div>}
            </div>

            {/* Rules Table */}
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-bg text-left">
                        <tr>
                            <th className="px-4 py-3 font-medium text-muted">Loại</th>
                            <th className="px-4 py-3 font-medium text-muted">Phạm vi</th>
                            <th className="px-4 py-3 font-medium text-muted">Giá trị</th>
                            <th className="px-4 py-3 font-medium text-muted w-20"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {rules.map((r) => (
                            <tr key={r.id} className="hover:bg-bg/50">
                                <td className="px-4 py-3">
                                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${r.type === "BLOCK" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                                        }`}>
                                        {r.type === "BLOCK" ? "Chặn" : "Cho phép"}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-muted">{scopeLabels[r.scope] || r.scope}</td>
                                <td className="px-4 py-3 font-mono text-xs">{r.value}</td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => deleteRule(r.id)}
                                        disabled={loading}
                                        className="text-xs text-muted hover:text-danger transition-colors"
                                    >
                                        Xóa
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {rules.length === 0 && (
                    <div className="px-4 py-12 text-center text-muted text-sm">
                        Chưa có quy tắc nào
                    </div>
                )}
            </div>
        </div>
    );
}

function DomainsList({ token }: { token: string }) {
    const [domains, setDomains] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // Bulk selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);

    const loadDomains = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api<{ data: any[] }>("/domains?limit=100", { token });
            setDomains(res.data);
            setSelectedIds(new Set());
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadDomains();
    }, [loadDomains]);

    const handleVerify = async (domainId: string, tokenVal: string) => {
        setVerifyingId(domainId);
        try {
            await api(`/domains/${domainId}/verify`, { method: "POST", token, body: { token: tokenVal } });
            toast.success("Đã xác thực");
            await loadDomains();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setVerifyingId(null);
        }
    };

    const handleDelete = async (domainId: string) => {
        if (!confirm("Xóa tên miền này?")) return;
        setDeletingId(domainId);
        try {
            await api(`/domains/${domainId}`, { method: "DELETE", token });
            toast.success("Đã xóa");
            await loadDomains();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setDeletingId(null);
        }
    };

    const copyToken = (val: string) => {
        navigator.clipboard.writeText(val);
        toast.success("Đã sao chép");
    };

    const handleTogglePublic = async (domainId: string, currentPublic: boolean) => {
        setTogglingId(domainId);
        try {
            await api(`/domains/${domainId}`, {
                method: "PATCH",
                token,
                body: { isPublic: !currentPublic }
            });
            toast.success(currentPublic ? "Đã chuyển sang riêng tư" : "Đã công khai cho tất cả");
            await loadDomains();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setTogglingId(null);
        }
    };

    // Bulk selection handlers
    const handleSelectAll = () => {
        if (selectedIds.size === domains.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(domains.map(d => d.id)));
        }
    };

    const handleSelectOne = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleBulkAction = async (action: "verify" | "make_public" | "make_private" | "delete") => {
        if (selectedIds.size === 0) return;

        const actionLabels = {
            verify: "xác thực",
            make_public: "công khai",
            make_private: "chuyển riêng tư",
            delete: "xóa"
        };

        if (action === "delete") {
            if (!confirm(`Bạn có chắc muốn xóa ${selectedIds.size} domain? Hành động này không thể hoàn tác.`)) {
                return;
            }
        }

        setBulkLoading(true);
        try {
            const res = await api<{ affected: number }>("/admin/domains/bulk", {
                method: "POST",
                token,
                body: { domainIds: Array.from(selectedIds), action }
            });
            toast.success(`Đã ${actionLabels[action]} ${res.affected} domain`);
            setSelectedIds(new Set());
            await loadDomains();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setBulkLoading(false);
        }
    };

    const isAllSelected = domains.length > 0 && selectedIds.size === domains.length;
    const isSomeSelected = selectedIds.size > 0;

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>;
    }

    return (
        <div className="p-6 max-w-6xl">
            <div className="mb-6">
                <h1 className="text-xl font-semibold">Tên miền</h1>
                <p className="text-sm text-muted mt-1">Quản lý các tên miền trong hệ thống ({domains.length} tổng)</p>
            </div>

            {/* Bulk Actions Bar */}
            {isSomeSelected && (
                <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between animate-fade-in">
                    <span className="text-sm font-medium">Đã chọn {selectedIds.size} domain</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleBulkAction("verify")}
                            disabled={bulkLoading}
                            className="px-3 py-1.5 text-sm bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 disabled:opacity-50"
                        >
                            Xác thực
                        </button>
                        <button
                            onClick={() => handleBulkAction("make_public")}
                            disabled={bulkLoading}
                            className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50"
                        >
                            Công khai
                        </button>
                        <button
                            onClick={() => handleBulkAction("make_private")}
                            disabled={bulkLoading}
                            className="px-3 py-1.5 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100 disabled:opacity-50"
                        >
                            Riêng tư
                        </button>
                        <button
                            onClick={() => handleBulkAction("delete")}
                            disabled={bulkLoading}
                            className="px-3 py-1.5 text-sm bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50"
                        >
                            Xóa
                        </button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="px-2 py-1.5 text-sm text-muted hover:text-text-main"
                        >
                            Bỏ chọn
                        </button>
                    </div>
                </div>
            )}

            {/* DNS Configuration Help */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">📧 Cấu hình DNS để nhận email</h3>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                    Để nhận được email, người dùng cần thêm các bản ghi DNS sau vào domain của họ:
                </p>
                <div className="bg-white dark:bg-white/5 rounded border border-blue-200 dark:border-blue-800/50 overflow-hidden">
                    <table className="w-full text-xs">
                        <thead className="bg-blue-100 dark:bg-blue-900/30">
                            <tr>
                                <th className="px-3 py-2 text-left font-semibold text-blue-800 dark:text-blue-300">Type</th>
                                <th className="px-3 py-2 text-left font-semibold text-blue-800 dark:text-blue-300">Host</th>
                                <th className="px-3 py-2 text-left font-semibold text-blue-800 dark:text-blue-300">Value</th>
                                <th className="px-3 py-2 text-left font-semibold text-blue-800 dark:text-blue-300">Mục đích</th>
                            </tr>
                        </thead>
                        <tbody className="text-blue-700 dark:text-blue-400">
                            <tr className="border-t border-blue-200 dark:border-blue-800/50">
                                <td className="px-3 py-2 font-mono font-bold text-red-600 dark:text-red-400">MX</td>
                                <td className="px-3 py-2 font-mono">@</td>
                                <td className="px-3 py-2 font-mono">mail.[domain] (priority 10)</td>
                                <td className="px-3 py-2">⚠️ Bắt buộc để nhận email</td>
                            </tr>
                            <tr className="border-t border-blue-200 dark:border-blue-800/50">
                                <td className="px-3 py-2 font-mono font-bold text-blue-600 dark:text-blue-400">A</td>
                                <td className="px-3 py-2 font-mono">mail</td>
                                <td className="px-3 py-2 font-mono">IP của mail server</td>
                                <td className="px-3 py-2">Trỏ mail subdomain về IP</td>
                            </tr>
                            <tr className="border-t border-blue-200 dark:border-blue-800/50">
                                <td className="px-3 py-2 font-mono font-bold text-green-600 dark:text-green-400">TXT</td>
                                <td className="px-3 py-2 font-mono">@</td>
                                <td className="px-3 py-2 font-mono">[verification token]</td>
                                <td className="px-3 py-2">Xác minh sở hữu domain</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-bg text-left">
                        <tr>
                            <th className="px-4 py-3 font-medium text-muted w-10">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 rounded border-border"
                                />
                            </th>
                            <th className="px-4 py-3 font-medium text-muted">Tên miền</th>
                            <th className="px-4 py-3 font-medium text-muted">Trạng thái</th>
                            <th className="px-4 py-3 font-medium text-muted">Công khai</th>
                            <th className="px-4 py-3 font-medium text-muted">Chủ sở hữu</th>
                            <th className="px-4 py-3 font-medium text-muted">Ngày tạo</th>
                            <th className="px-4 py-3 font-medium text-muted w-32"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {domains.map((d) => (
                            <tr key={d.id} className={`hover:bg-bg/50 ${selectedIds.has(d.id) ? "bg-primary/5" : ""}`}>
                                <td className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(d.id)}
                                        onChange={() => handleSelectOne(d.id)}
                                        className="w-4 h-4 rounded border-border"
                                    />
                                </td>
                                <td className="px-4 py-3 font-medium">{d.name}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${d.status === "VERIFIED" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                                        }`}>
                                        {d.status === "VERIFIED" ? "Đã xác thực" : "Chờ xác thực"}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => handleTogglePublic(d.id, d.isPublic)}
                                        disabled={togglingId === d.id}
                                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded cursor-pointer transition-colors ${d.isPublic
                                            ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                            }`}
                                    >
                                        {togglingId === d.id ? (
                                            <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>
                                        ) : d.isPublic ? "Public" : "Private"}
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-muted">{d.owner?.email || "—"}</td>
                                <td className="px-4 py-3 text-muted">{new Date(d.createdAt).toLocaleDateString("vi-VN")}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        {d.status !== "VERIFIED" && (
                                            <>
                                                <button onClick={() => copyToken(d.verificationToken)} className="text-xs text-muted hover:text-primary">
                                                    Token
                                                </button>
                                                <button
                                                    onClick={() => handleVerify(d.id, d.verificationToken)}
                                                    disabled={verifyingId === d.id}
                                                    className="text-xs text-primary hover:underline"
                                                >
                                                    Xác thực
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => handleDelete(d.id)}
                                            disabled={deletingId === d.id}
                                            className="text-xs text-muted hover:text-danger"
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {domains.length === 0 && (
                    <div className="px-4 py-12 text-center text-muted text-sm">Chưa có tên miền nào</div>
                )}
            </div>
        </div>
    );
}

function SettingsPanel({ token }: { token: string }) {
    const [password, setPassword] = useState("");
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);
    const [profile, setProfile] = useState<{
        email: string;
        role: string;
        createdAt: string;
        twoFactorEnabled?: boolean;
        _count: { domains: number };
    } | null>(null);
    const [systemInfo, setSystemInfo] = useState<{
        userCount: number;
        domainCount: number;
        messageCount: number;
        recentLogins24h: number;
        serverTime: string;
    } | null>(null);

    // 2FA states
    const [twoFAStep, setTwoFAStep] = useState<"idle" | "setup" | "verify" | "backup">("idle");
    const [qrCode, setQrCode] = useState("");
    const [totpSecret, setTotpSecret] = useState("");
    const [verifyCode, setVerifyCode] = useState("");
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [twoFABusy, setTwoFABusy] = useState(false);
    const [twoFAError, setTwoFAError] = useState("");

    const loadProfile = useCallback(async () => {
        try {
            const profileRes = await api<{ user: typeof profile }>("/admin/profile", { token });
            setProfile(profileRes.user);
        } catch (e) {
            // Silent fail
        }
    }, [token]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [profileRes, systemRes] = await Promise.all([
                    api<{ user: typeof profile }>("/admin/profile", { token }),
                    api<{ system: typeof systemInfo }>("/admin/system-info", { token }),
                ]);
                setProfile(profileRes.user);
                setSystemInfo(systemRes.system);
            } catch (e) {
                // Silent fail
            }
        };
        loadData();
    }, [token]);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!password || password.length < 6) {
            setErr("Mật khẩu phải có ít nhất 6 ký tự");
            return;
        }
        setBusy(true);
        setMsg("");
        setErr("");
        try {
            await api("/auth/change-password", { method: "POST", token, body: { newPassword: password } });
            setMsg("Đã cập nhật mật khẩu");
            setPassword("");
        } catch (error) {
            setErr(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setBusy(false);
        }
    };

    // 2FA handlers
    const setup2FA = async () => {
        setTwoFABusy(true);
        setTwoFAError("");
        try {
            const res = await api<{ qrCode: string; secret: string }>("/auth/2fa/setup", { method: "POST", token });
            setQrCode(res.qrCode);
            setTotpSecret(res.secret);
            setTwoFAStep("setup");
        } catch (error) {
            setTwoFAError(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTwoFABusy(false);
        }
    };

    const enable2FA = async () => {
        if (verifyCode.length !== 6) {
            setTwoFAError("Vui lòng nhập mã 6 chữ số");
            return;
        }
        setTwoFABusy(true);
        setTwoFAError("");
        try {
            const res = await api<{ ok: boolean; backupCodes: string[] }>("/auth/2fa/enable", {
                method: "POST",
                token,
                body: { code: verifyCode }
            });
            setBackupCodes(res.backupCodes);
            setTwoFAStep("backup");
            toast.success("2FA đã được kích hoạt!");
            loadProfile();
        } catch (error) {
            setTwoFAError(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTwoFABusy(false);
        }
    };

    const disable2FA = async () => {
        const pwd = prompt("Nhập mật khẩu để tắt 2FA:");
        if (!pwd) return;

        setTwoFABusy(true);
        setTwoFAError("");
        try {
            await api("/auth/2fa/disable", { method: "POST", token, body: { password: pwd } });
            toast.success("2FA đã được tắt");
            setTwoFAStep("idle");
            loadProfile();
        } catch (error) {
            setTwoFAError(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTwoFABusy(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl">
            <div className="mb-6">
                <h1 className="text-xl font-semibold">Cài đặt</h1>
                <p className="text-sm text-muted mt-1">Quản lý tài khoản và hệ thống</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Admin Profile */}
                <div className="bg-surface border border-border rounded-lg p-5">
                    <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        Thông tin tài khoản
                    </h3>
                    {profile ? (
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted">Email</span>
                                <span className="font-medium">{profile.email}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Vai trò</span>
                                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-purple-50 text-purple-600">
                                    {profile.role}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Tạo tài khoản</span>
                                <span>{new Date(profile.createdAt).toLocaleDateString("vi-VN")}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Domains sở hữu</span>
                                <span>{profile._count.domains}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-muted">Đang tải...</div>
                    )}
                </div>

                {/* System Info */}
                <div className="bg-surface border border-border rounded-lg p-5">
                    <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
                        </svg>
                        Thông tin hệ thống
                    </h3>
                    {systemInfo ? (
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted">Tổng người dùng</span>
                                <span className="font-medium">{systemInfo.userCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Tổng domains</span>
                                <span>{systemInfo.domainCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Tổng email</span>
                                <span>{systemInfo.messageCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Đăng nhập 24h</span>
                                <span className="text-green-600">{systemInfo.recentLogins24h}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-muted">Đang tải...</div>
                    )}
                </div>
            </div>

            {/* Change Password */}
            <div className="bg-surface border border-border rounded-lg p-5 mt-6">
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    Đổi mật khẩu
                </h3>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-muted mb-1.5">Mật khẩu mới</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Tối thiểu 6 ký tự"
                            className="text-sm w-full max-w-xs"
                            minLength={6}
                            required
                        />
                    </div>
                    <button type="submit" disabled={busy} className="btn-primary h-10 px-6">
                        {busy ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                    </button>
                    {msg && <div className="text-sm text-green-600">{msg}</div>}
                    {err && <div className="text-sm text-danger">{err}</div>}
                </form>
            </div>

            {/* Two-Factor Authentication */}
            <div className="bg-surface border border-border rounded-lg p-5 mt-6">
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    Xác thực hai yếu tố (2FA)
                </h3>

                {twoFAError && <div className="text-sm text-danger mb-3">{twoFAError}</div>}

                {/* Status: Not enabled */}
                {!profile?.twoFactorEnabled && twoFAStep === "idle" && (
                    <div className="space-y-3">
                        <p className="text-sm text-muted">
                            Bảo vệ tài khoản của bạn bằng xác thực hai yếu tố sử dụng ứng dụng như Google Authenticator.
                        </p>
                        <button onClick={setup2FA} disabled={twoFABusy} className="btn-primary h-10 px-6">
                            {twoFABusy ? "Đang thiết lập..." : "Kích hoạt 2FA"}
                        </button>
                    </div>
                )}

                {/* Step: Show QR code */}
                {twoFAStep === "setup" && (
                    <div className="space-y-4">
                        <p className="text-sm text-muted">Quét mã QR bằng ứng dụng xác thực:</p>
                        <div className="bg-white p-4 rounded-lg inline-block border border-border">
                            <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                        </div>
                        <p className="text-xs text-muted">Hoặc nhập thủ công: <code className="bg-bg px-2 py-1 rounded text-xs">{totpSecret}</code></p>
                        <div className="pt-2">
                            <label className="block text-xs text-muted mb-1.5">Nhập mã 6 chữ số từ ứng dụng:</label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={verifyCode}
                                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    className="text-sm w-32 text-center tracking-widest font-mono"
                                    maxLength={6}
                                />
                                <button onClick={enable2FA} disabled={twoFABusy || verifyCode.length !== 6} className="btn-primary h-10 px-6">
                                    {twoFABusy ? "Đang xác minh..." : "Xác nhận"}
                                </button>
                                <button onClick={() => setTwoFAStep("idle")} className="btn btn-secondary h-10 px-4">Hủy</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step: Show backup codes */}
                {twoFAStep === "backup" && (
                    <div className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h4 className="font-medium text-yellow-800 mb-2">⚠️ Lưu mã khôi phục</h4>
                            <p className="text-sm text-yellow-700 mb-3">
                                Lưu các mã này ở nơi an toàn. Bạn sẽ không thể xem lại chúng!
                            </p>
                            <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded border border-yellow-300">
                                {backupCodes.map((code, i) => (
                                    <code key={i} className="text-sm font-mono">{code}</code>
                                ))}
                            </div>
                        </div>
                        <button onClick={() => setTwoFAStep("idle")} className="btn-primary h-10 px-6">
                            Tôi đã lưu mã
                        </button>
                    </div>
                )}

                {/* Status: Enabled */}
                {profile?.twoFactorEnabled && twoFAStep === "idle" && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span className="text-green-600 font-medium">2FA đang được kích hoạt</span>
                        </div>
                        <button onClick={disable2FA} disabled={twoFABusy} className="text-sm px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded hover:bg-red-100">
                            {twoFABusy ? "Đang tắt..." : "Tắt 2FA"}
                        </button>
                    </div>
                )}
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-5 mt-6">
                <h3 className="text-sm font-medium mb-2 text-red-800 dark:text-red-300 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    Vùng nguy hiểm
                </h3>
                <p className="text-xs text-red-700 dark:text-red-400 mb-3">
                    Các thao tác này có thể ảnh hưởng đến toàn bộ hệ thống. Hãy cẩn thận!
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            if (confirm("Bạn có chắc muốn xóa tất cả nhật ký cũ hơn 30 ngày?")) {
                                toast.success("Tính năng sẽ được thêm sau");
                            }
                        }}
                        className="text-xs px-3 py-1.5 bg-white dark:bg-white/10 border border-red-300 dark:border-red-800/50 text-red-700 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                    >
                        Dọn dẹp nhật ký cũ
                    </button>
                </div>
            </div>
        </div>
    );
}

