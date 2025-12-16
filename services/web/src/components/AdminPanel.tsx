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
    icon: string;
}

const tabs: Tab[] = [
    { id: "dashboard", label: "Tổng quan", icon: "📊" },
    { id: "users", label: "Người dùng", icon: "👥" },
    { id: "rules", label: "Quy tắc spam", icon: "🛡️" },
    { id: "domains", label: "Tên miền", icon: "🌐" },
    { id: "reports", label: "Báo cáo vi phạm", icon: "🚨" },
    { id: "logs", label: "Nhật ký", icon: "📜" },
    { id: "settings", label: "Cài đặt", icon: "⚙️" },
];

export function AdminPanel({ token }: { token: string }) {
    const [activeTab, setActiveTab] = useState<TabType>("dashboard");

    return (
        <div className="h-screen flex bg-bg">
            {/* Sidebar */}
            <div className="w-64 bg-surface border-r border-border flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
                            A
                        </div>
                        <div>
                            <div className="font-bold text-sm">Quản trị hệ thống</div>
                            <div className="text-xs text-muted">Admin Panel</div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-3">
                    <div className="space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                        ? "bg-primary text-white"
                                        : "text-text-main hover:bg-bg"
                                    }`}
                            >
                                <span className="text-lg">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-border">
                    <Link
                        to="/"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:text-primary hover:bg-bg transition-colors"
                    >
                        <span>←</span>
                        Quay lại Dashboard
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
            toast.success("Đã thêm quy tắc mới");
            await loadRules();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const deleteRule = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa quy tắc này?")) return;
        setLoading(true);
        try {
            await api(`/abuse/rules/${id}`, { method: "DELETE", token });
            toast.success("Đã xóa quy tắc");
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
        <div className="p-6">
            <h2 className="text-xl font-bold mb-6">Quy tắc spam / Bảo vệ</h2>

            {/* Add Rule Form */}
            <div className="bg-surface border border-border rounded-xl p-4 mb-6">
                <h3 className="font-semibold mb-4">Thêm quy tắc mới</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Loại</label>
                        <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                            <option value="BLOCK">CHẶN (Block)</option>
                            <option value="ALLOW">CHO PHÉP (Allow)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Phạm vi</label>
                        <select value={newScope} onChange={(e) => setNewScope(e.target.value)}>
                            <option value="SENDER_DOMAIN">Tên miền gửi</option>
                            <option value="SENDER_EMAIL">Email gửi</option>
                            <option value="RECIPIENT_DOMAIN">Tên miền nhận</option>
                            <option value="SOURCE_IP">Địa chỉ IP</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Giá trị</label>
                        <div className="flex gap-2">
                            <input
                                placeholder="example.com, 1.2.3.4, ..."
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addRule()}
                            />
                            <button
                                onClick={addRule}
                                disabled={loading || !newValue}
                                className="btn-primary px-4 whitespace-nowrap"
                            >
                                Thêm
                            </button>
                        </div>
                    </div>
                </div>
                {error && <div className="mt-2 text-sm text-danger">{error}</div>}
            </div>

            {/* Rules List */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-bg border-b border-border">
                        <tr>
                            <th className="text-left px-4 py-3 font-semibold">Loại</th>
                            <th className="text-left px-4 py-3 font-semibold">Phạm vi</th>
                            <th className="text-left px-4 py-3 font-semibold">Giá trị</th>
                            <th className="text-left px-4 py-3 font-semibold">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rules.map((r) => (
                            <tr key={r.id} className="border-b border-border hover:bg-bg transition-colors">
                                <td className="px-4 py-3">
                                    <span
                                        className={`text-xs font-bold px-2 py-1 rounded ${r.type === "BLOCK"
                                                ? "bg-red-100 text-red-700"
                                                : "bg-green-100 text-green-700"
                                            }`}
                                    >
                                        {r.type === "BLOCK" ? "CHẶN" : "CHO PHÉP"}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-muted">{scopeLabels[r.scope] || r.scope}</td>
                                <td className="px-4 py-3 font-mono">{r.value}</td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => deleteRule(r.id)}
                                        disabled={loading}
                                        className="text-xs text-danger hover:underline"
                                    >
                                        Xóa
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {rules.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                                    Chưa có quy tắc nào. Thêm quy tắc để chặn spam hoặc cho phép các nguồn tin cậy.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
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
            await api(`/domains/${domainId}/verify`, {
                method: "POST",
                token,
                body: { token: tokenVal }
            });
            toast.success("Đã xác thực tên miền thành công!");
            await loadDomains();
        } catch (err) {
            toast.error("Lỗi xác thực: " + (err as Error).message);
        } finally {
            setVerifyingId(null);
        }
    };

    const handleDelete = async (domainId: string) => {
        if (!confirm("Bạn có chắc muốn xóa tên miền này? Tất cả hộp thư và email sẽ bị xóa.")) return;
        setDeletingId(domainId);
        try {
            await api(`/domains/${domainId}`, { method: "DELETE", token });
            toast.success("Đã xóa tên miền");
            await loadDomains();
        } catch (err) {
            toast.error("Lỗi: " + (err as Error).message);
        } finally {
            setDeletingId(null);
        }
    };

    const copyToken = (val: string) => {
        navigator.clipboard.writeText(val);
        toast.success("Đã sao chép!");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h2 className="text-xl font-bold mb-6">Quản lý tên miền</h2>

            <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-bg border-b border-border">
                        <tr>
                            <th className="text-left px-4 py-3 font-semibold">Tên miền</th>
                            <th className="text-left px-4 py-3 font-semibold">Trạng thái</th>
                            <th className="text-left px-4 py-3 font-semibold">Chủ sở hữu</th>
                            <th className="text-left px-4 py-3 font-semibold">Ngày tạo</th>
                            <th className="text-left px-4 py-3 font-semibold">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {domains.map((d) => (
                            <tr key={d.id} className="border-b border-border hover:bg-bg transition-colors">
                                <td className="px-4 py-3">
                                    <span className="font-medium">{d.name}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`text-xs font-bold px-2 py-1 rounded ${d.status === "VERIFIED"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-yellow-100 text-yellow-700"
                                            }`}
                                    >
                                        {d.status === "VERIFIED" ? "Đã xác thực" : "Chờ xác thực"}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-muted">
                                    {d.owner?.email || "—"}
                                </td>
                                <td className="px-4 py-3 text-muted">
                                    {new Date(d.createdAt).toLocaleDateString("vi-VN")}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {d.status !== "VERIFIED" && (
                                            <>
                                                <button
                                                    onClick={() => copyToken(d.verificationToken)}
                                                    className="text-xs text-primary hover:underline"
                                                    title="Sao chép token xác thực"
                                                >
                                                    Copy Token
                                                </button>
                                                <button
                                                    onClick={() => handleVerify(d.id, d.verificationToken)}
                                                    disabled={verifyingId === d.id}
                                                    className="text-xs text-green-600 hover:underline"
                                                >
                                                    {verifyingId === d.id ? "..." : "Xác thực"}
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => handleDelete(d.id)}
                                            disabled={deletingId === d.id}
                                            className="text-xs text-danger hover:underline"
                                        >
                                            {deletingId === d.id ? "..." : "Xóa"}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {domains.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                                    Chưa có tên miền nào. Thêm tên miền từ Dashboard chính.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function SettingsPanel({ token }: { token: string }) {
    const [password, setPassword] = useState("");
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

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
            setMsg("Đã cập nhật mật khẩu thành công!");
            setPassword("");
        } catch (error) {
            setErr((error as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-xl font-bold mb-6">Cài đặt tài khoản</h2>

            <div className="max-w-md">
                <div className="bg-surface border border-border rounded-xl p-6">
                    <h3 className="font-semibold mb-4">Đổi mật khẩu</h3>
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Mật khẩu mới
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                                minLength={6}
                                required
                            />
                        </div>
                        <button type="submit" disabled={busy} className="btn-primary w-full">
                            {busy ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                        </button>
                        {msg && <div className="text-sm text-green-600 text-center">{msg}</div>}
                        {err && <div className="text-sm text-danger text-center">{err}</div>}
                    </form>
                </div>
            </div>
        </div>
    );
}
