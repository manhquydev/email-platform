import { useState, useEffect, useCallback, type FormEvent } from "react";
import { api } from "../utils/api";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { AdminDashboard } from "./admin/AdminDashboard";
import { AdminUsers } from "./admin/AdminUsers";
import { AdminReports } from "./admin/AdminReports";
import { AdminLogs } from "./admin/AdminLogs";

type TabType = "dashboard" | "users" | "rules" | "domains" | "reports" | "logs" | "settings";

interface Tab {
    id: TabType;
    label: string;
    icon: React.ReactNode;
}

// SVG Icons - Clean and Professional
const icons = {
    dashboard: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
    ),
    users: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
    ),
    shield: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
    ),
    globe: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
    ),
    flag: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
        </svg>
    ),
    clock: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    cog: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    back: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
        </svg>
    ),
};

const tabs: Tab[] = [
    { id: "dashboard", label: "Tổng quan", icon: icons.dashboard },
    { id: "users", label: "Người dùng", icon: icons.users },
    { id: "rules", label: "Quy tắc bảo vệ", icon: icons.shield },
    { id: "domains", label: "Tên miền", icon: icons.globe },
    { id: "reports", label: "Báo cáo", icon: icons.flag },
    { id: "logs", label: "Nhật ký", icon: icons.clock },
    { id: "settings", label: "Cài đặt", icon: icons.cog },
];

export function AdminPanel({ token }: { token: string }) {
    const [activeTab, setActiveTab] = useState<TabType>("dashboard");

    return (
        <div className="h-screen flex bg-bg">
            {/* Sidebar */}
            <div className="w-60 bg-surface border-r border-border flex flex-col">
                {/* Header */}
                <div className="h-16 px-5 flex items-center border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <span className="font-semibold text-sm">Quản trị</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-3 overflow-y-auto">
                    <div className="space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 ${activeTab === tab.id
                                    ? "bg-primary text-white shadow-sm"
                                    : "text-text-main hover:bg-bg"
                                    }`}
                            >
                                <span className={activeTab === tab.id ? "text-white" : "text-muted"}>
                                    {tab.icon}
                                </span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-border">
                    <Link
                        to="/"
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted hover:text-text-main hover:bg-bg transition-colors"
                    >
                        {icons.back}
                        <span>Quay lại</span>
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === "dashboard" && <AdminDashboard token={token} />}
                {activeTab === "users" && <AdminUsers token={token} />}
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
            setError((err as Error).message);
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
            setError((err as Error).message);
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
            toast.error((err as Error).message);
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

    const loadDomains = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api<{ data: any[] }>("/domains?limit=100", { token });
            setDomains(res.data);
        } catch (err) {
            toast.error((err as Error).message);
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
            toast.error((err as Error).message);
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
            toast.error((err as Error).message);
        } finally {
            setDeletingId(null);
        }
    };

    const copyToken = (val: string) => {
        navigator.clipboard.writeText(val);
        toast.success("Đã sao chép");
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>;
    }

    return (
        <div className="p-6 max-w-5xl">
            <div className="mb-6">
                <h1 className="text-xl font-semibold">Tên miền</h1>
                <p className="text-sm text-muted mt-1">Quản lý các tên miền trong hệ thống</p>
            </div>

            {/* DNS Configuration Help */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-800 mb-2">📧 Cấu hình DNS để nhận email</h3>
                <p className="text-sm text-blue-700 mb-3">
                    Để nhận được email, người dùng cần thêm các bản ghi DNS sau vào domain của họ:
                </p>
                <div className="bg-white rounded border border-blue-200 overflow-hidden">
                    <table className="w-full text-xs">
                        <thead className="bg-blue-100">
                            <tr>
                                <th className="px-3 py-2 text-left font-semibold text-blue-800">Type</th>
                                <th className="px-3 py-2 text-left font-semibold text-blue-800">Host</th>
                                <th className="px-3 py-2 text-left font-semibold text-blue-800">Value</th>
                                <th className="px-3 py-2 text-left font-semibold text-blue-800">Mục đích</th>
                            </tr>
                        </thead>
                        <tbody className="text-blue-700">
                            <tr className="border-t border-blue-200">
                                <td className="px-3 py-2 font-mono font-bold text-red-600">MX</td>
                                <td className="px-3 py-2 font-mono">@</td>
                                <td className="px-3 py-2 font-mono">mail.[domain] (priority 10)</td>
                                <td className="px-3 py-2">⚠️ Bắt buộc để nhận email</td>
                            </tr>
                            <tr className="border-t border-blue-200">
                                <td className="px-3 py-2 font-mono font-bold text-blue-600">A</td>
                                <td className="px-3 py-2 font-mono">mail</td>
                                <td className="px-3 py-2 font-mono">IP của mail server</td>
                                <td className="px-3 py-2">Trỏ mail subdomain về IP</td>
                            </tr>
                            <tr className="border-t border-blue-200">
                                <td className="px-3 py-2 font-mono font-bold text-green-600">TXT</td>
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
                            <th className="px-4 py-3 font-medium text-muted">Tên miền</th>
                            <th className="px-4 py-3 font-medium text-muted">Trạng thái</th>
                            <th className="px-4 py-3 font-medium text-muted">Chủ sở hữu</th>
                            <th className="px-4 py-3 font-medium text-muted">Ngày tạo</th>
                            <th className="px-4 py-3 font-medium text-muted w-32"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {domains.map((d) => (
                            <tr key={d.id} className="hover:bg-bg/50">
                                <td className="px-4 py-3 font-medium">{d.name}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${d.status === "VERIFIED" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                                        }`}>
                                        {d.status === "VERIFIED" ? "Đã xác thực" : "Chờ xác thực"}
                                    </span>
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
        _count: { domains: number };
    } | null>(null);
    const [systemInfo, setSystemInfo] = useState<{
        userCount: number;
        domainCount: number;
        messageCount: number;
        recentLogins24h: number;
        serverTime: string;
    } | null>(null);

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
            setErr((error as Error).message);
        } finally {
            setBusy(false);
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

            {/* Danger Zone */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-5 mt-6">
                <h3 className="text-sm font-medium mb-2 text-red-800 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    Vùng nguy hiểm
                </h3>
                <p className="text-xs text-red-700 mb-3">
                    Các thao tác này có thể ảnh hưởng đến toàn bộ hệ thống. Hãy cẩn thận!
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            if (confirm("Bạn có chắc muốn xóa tất cả nhật ký cũ hơn 30 ngày?")) {
                                toast.success("Tính năng sẽ được thêm sau");
                            }
                        }}
                        className="text-xs px-3 py-1.5 bg-white border border-red-300 text-red-700 rounded hover:bg-red-100"
                    >
                        Dọn dẹp nhật ký cũ
                    </button>
                </div>
            </div>
        </div>
    );
}

