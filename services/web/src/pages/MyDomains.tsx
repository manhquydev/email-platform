import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { getFriendlyErrorMessage } from "../utils/errorMapping";
import toast from "react-hot-toast";
import type { Domain } from "../types";

export function MyDomains() {
    const { token, user } = useAuth();
    const [domains, setDomains] = useState<Domain[]>([]);
    const [loading, setLoading] = useState(true);
    const [newDomainName, setNewDomainName] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [busy, setBusy] = useState(false);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadDomains = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await api<{ data: Domain[] }>("/domains?limit=100", { token });
            // Filter to show only user's owned domains
            const ownedDomains = res.data.filter(d => d.ownerId === user?.id);
            setDomains(ownedDomains);
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token, user?.id]);

    useEffect(() => {
        loadDomains();
    }, [loadDomains]);

    const handleAddDomain = async () => {
        if (!newDomainName.trim()) {
            toast.error("Vui lòng nhập tên miền");
            return;
        }
        setBusy(true);
        try {
            await api("/domains", { method: "POST", token, body: { name: newDomainName.trim() } });
            toast.success("Đã thêm tên miền!");
            setNewDomainName("");
            setShowAddForm(false);
            await loadDomains();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setBusy(false);
        }
    };

    const handleVerify = async (domainId: string, tokenVal: string) => {
        setVerifyingId(domainId);
        try {
            await api(`/domains/${domainId}/verify`, { method: "POST", token, body: { token: tokenVal } });
            toast.success("Đã xác thực tên miền!");
            await loadDomains();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setVerifyingId(null);
        }
    };

    const handleTogglePublic = async (domainId: string, currentPublic: boolean) => {
        setTogglingId(domainId);
        try {
            await api(`/domains/${domainId}`, {
                method: "PATCH",
                token,
                body: { isPublic: !currentPublic }
            });
            toast.success(currentPublic ? "Đã chuyển sang riêng tư" : "Đã chia sẻ công khai");
            await loadDomains();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = async (domainId: string, domainName: string) => {
        if (!confirm(`Xóa tên miền "${domainName}"? Tất cả inbox trên domain này cũng sẽ bị xóa.`)) return;
        setDeletingId(domainId);
        try {
            await api(`/domains/${domainId}`, { method: "DELETE", token });
            toast.success("Đã xóa tên miền");
            await loadDomains();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setDeletingId(null);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Đã sao chép!");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-bg">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg">
            {/* Header */}
            <header className="bg-surface border-b border-border px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/app" className="text-muted hover:text-text-main transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <h1 className="text-xl font-semibold">Tên miền của tôi</h1>
                    </div>
                    <button onClick={() => setShowAddForm(true)} className="btn-primary flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Thêm tên miền
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-5xl mx-auto p-6">
                {/* Add Domain Form */}
                {showAddForm && (
                    <div className="bg-surface border border-border rounded-xl p-6 mb-6">
                        <h3 className="font-medium mb-4">Thêm tên miền mới</h3>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newDomainName}
                                onChange={(e) => setNewDomainName(e.target.value)}
                                placeholder="example.com"
                                className="flex-1 max-w-sm"
                                onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                            />
                            <button onClick={handleAddDomain} disabled={busy} className="btn-primary">
                                {busy ? "Đang thêm..." : "Thêm"}
                            </button>
                            <button onClick={() => setShowAddForm(false)} className="btn btn-secondary">
                                Hủy
                            </button>
                        </div>
                    </div>
                )}

                {/* DNS Configuration Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
                    <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Cấu hình DNS
                    </h3>
                    <p className="text-sm text-blue-700 mb-3">
                        Để nhận được email, thêm các bản ghi DNS sau vào domain của bạn:
                    </p>
                    <div className="bg-white rounded-lg border border-blue-200 overflow-hidden">
                        <table className="w-full text-xs">
                            <thead className="bg-blue-100">
                                <tr>
                                    <th className="px-3 py-2 text-left font-semibold text-blue-800">Type</th>
                                    <th className="px-3 py-2 text-left font-semibold text-blue-800">Host</th>
                                    <th className="px-3 py-2 text-left font-semibold text-blue-800">Value</th>
                                </tr>
                            </thead>
                            <tbody className="text-blue-700">
                                <tr className="border-t border-blue-200">
                                    <td className="px-3 py-2 font-mono font-bold text-red-600">MX</td>
                                    <td className="px-3 py-2 font-mono">@</td>
                                    <td className="px-3 py-2 font-mono">mail.[your-server] (priority 10)</td>
                                </tr>
                                <tr className="border-t border-blue-200">
                                    <td className="px-3 py-2 font-mono font-bold text-green-600">TXT</td>
                                    <td className="px-3 py-2 font-mono">@</td>
                                    <td className="px-3 py-2 font-mono">[verification token]</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Domain List */}
                {domains.length === 0 ? (
                    <div className="bg-surface border border-border rounded-xl p-12 text-center">
                        <svg className="w-16 h-16 mx-auto text-muted mb-4" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                        <h3 className="font-medium text-lg mb-2">Chưa có tên miền nào</h3>
                        <p className="text-muted mb-4">Thêm tên miền đầu tiên để bắt đầu nhận email.</p>
                        <button onClick={() => setShowAddForm(true)} className="btn-primary">
                            Thêm tên miền
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {domains.map((domain) => (
                            <div key={domain.id} className="bg-surface border border-border rounded-xl p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-lg">{domain.name}</h3>
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${domain.status === "VERIFIED"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-amber-100 text-amber-700"
                                                }`}>
                                                {domain.status === "VERIFIED" ? "Đã xác thực" : "Chờ xác thực"}
                                            </span>
                                            {domain.isPublic && (
                                                <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                                                    Công khai
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted">
                                            Ngày tạo: {new Date(domain.createdAt).toLocaleDateString("vi-VN")}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {domain.status !== "VERIFIED" && (
                                            <>
                                                <button
                                                    onClick={() => copyToClipboard(domain.verificationToken)}
                                                    className="btn btn-secondary text-xs"
                                                    title="Sao chép token xác thực"
                                                >
                                                    Token
                                                </button>
                                                <button
                                                    onClick={() => handleVerify(domain.id, domain.verificationToken)}
                                                    disabled={verifyingId === domain.id}
                                                    className="btn-primary text-xs"
                                                >
                                                    {verifyingId === domain.id ? "Đang xác thực..." : "Xác thực"}
                                                </button>
                                            </>
                                        )}

                                        {domain.status === "VERIFIED" && (
                                            <button
                                                onClick={() => handleTogglePublic(domain.id, domain.isPublic)}
                                                disabled={togglingId === domain.id}
                                                className={`btn text-xs ${domain.isPublic ? "btn-secondary" : "btn-primary"}`}
                                            >
                                                {togglingId === domain.id
                                                    ? "..."
                                                    : domain.isPublic
                                                        ? "Chuyển riêng tư"
                                                        : "Chia sẻ công khai"
                                                }
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleDelete(domain.id, domain.name)}
                                            disabled={deletingId === domain.id}
                                            className="btn btn-secondary text-xs text-red-600 hover:bg-red-50"
                                        >
                                            {deletingId === domain.id ? "..." : "Xóa"}
                                        </button>
                                    </div>
                                </div>

                                {/* Verification Instructions */}
                                {domain.status !== "VERIFIED" && (
                                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                        <p className="text-sm text-amber-800 font-medium mb-2">
                                            Để xác thực, thêm TXT record sau vào DNS:
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 bg-white px-3 py-2 rounded border text-xs font-mono break-all">
                                                {domain.verificationToken}
                                            </code>
                                            <button
                                                onClick={() => copyToClipboard(domain.verificationToken)}
                                                className="btn btn-secondary text-xs flex-shrink-0"
                                            >
                                                Sao chép
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Public sharing info */}
                                {domain.isPublic && domain.status === "VERIFIED" && (
                                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-sm text-blue-800">
                                            <strong>Domain đang được chia sẻ công khai.</strong> Người dùng khác có thể tạo email trên domain này.
                                            Email của họ sẽ thuộc về họ, bạn không thể truy cập.
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
