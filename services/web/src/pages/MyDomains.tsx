import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { getFriendlyErrorMessage } from "../utils/errorMapping";
import toast from "react-hot-toast";
import type { Domain } from "../types";
import { AppShell } from "../layouts/AppShell";

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
            <AppShell>
                <div className="flex items-center justify-center h-full" style={{ background: 'var(--nebula-void)' }}>
                    <div className="spinner" />
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="flex-1 overflow-y-auto" style={{ background: 'var(--nebula-void)' }}>
                {/* Page Header */}
                <div className="page-header">
                    <div className="page-header-content">
                        <div className="flex items-center">
                            <div className="page-header-icon">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="page-header-title">Quản lý Domain</h1>
                                <p className="page-header-subtitle">Thêm và cấu hình tên miền của bạn</p>
                            </div>
                        </div>
                        <button onClick={() => setShowAddForm(true)} className="btn-nebula btn-nebula-primary">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Thêm domain
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-5xl mx-auto px-6 py-8">
                    {/* Add Domain Modal */}
                    {showAddForm && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-nebula-fade-in">
                            <div className="glass-card-elevated w-full max-w-md animate-nebula-scale-in">
                                <div className="glass-card-header">
                                    <h2 className="text-lg font-semibold" style={{ color: 'var(--nebula-text)' }}>Thêm domain mới</h2>
                                    <button onClick={() => setShowAddForm(false)} className="btn-nebula btn-nebula-ghost btn-nebula-icon">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="glass-card-body space-y-4">
                                    <div>
                                        <label className="label-nebula">Tên miền</label>
                                        <input
                                            type="text"
                                            value={newDomainName}
                                            onChange={(e) => setNewDomainName(e.target.value)}
                                            placeholder="example.com"
                                            className="input-nebula"
                                            onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button onClick={() => setShowAddForm(false)} className="btn-nebula btn-nebula-secondary">Hủy</button>
                                        <button onClick={handleAddDomain} disabled={busy} className="btn-nebula btn-nebula-primary">
                                            {busy ? "Đang thêm..." : "Thêm domain"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DNS Configuration Card */}
                    <div className="glass-card mb-6">
                        <div className="glass-card-header">
                            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--nebula-text)' }}>
                                <svg className="w-5 h-5" style={{ color: 'var(--nebula-cyan)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Hướng dẫn cấu hình DNS
                            </h3>
                        </div>
                        <div className="glass-card-body">
                            <p className="text-sm mb-4" style={{ color: 'var(--nebula-text-muted)' }}>
                                Để nhận được email, thêm các bản ghi DNS sau vào domain của bạn:
                            </p>
                            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--nebula-border)' }}>
                                <table className="w-full text-sm">
                                    <thead style={{ background: 'var(--nebula-elevated)' }}>
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--nebula-text)' }}>Type</th>
                                            <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--nebula-text)' }}>Host</th>
                                            <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--nebula-text)' }}>Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ borderTop: '1px solid var(--nebula-border)' }}>
                                            <td className="px-4 py-3 font-mono font-bold" style={{ color: 'var(--nebula-error)' }}>MX</td>
                                            <td className="px-4 py-3 font-mono" style={{ color: 'var(--nebula-text-secondary)' }}>@</td>
                                            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--nebula-text-secondary)' }}>mail.[your-server] (priority 10)</td>
                                        </tr>
                                        <tr style={{ borderTop: '1px solid var(--nebula-border)' }}>
                                            <td className="px-4 py-3 font-mono font-bold" style={{ color: 'var(--nebula-success)' }}>TXT</td>
                                            <td className="px-4 py-3 font-mono" style={{ color: 'var(--nebula-text-secondary)' }}>@</td>
                                            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--nebula-text-secondary)' }}>[verification token]</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Domain List */}
                    {domains.length === 0 ? (
                        <div className="empty-state-nebula">
                            <div className="empty-state-nebula-icon">
                                <svg fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                </svg>
                            </div>
                            <h3 className="empty-state-nebula-title">Chưa có domain nào</h3>
                            <p className="empty-state-nebula-description">
                                Thêm tên miền đầu tiên để bắt đầu nhận email.
                            </p>
                            <button onClick={() => setShowAddForm(true)} className="btn-nebula btn-nebula-primary">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                Thêm domain đầu tiên
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {domains.map((domain) => (
                                <div key={domain.id} className="glass-card animate-nebula-fade-in">
                                    <div className="glass-card-body">
                                        <div className="flex items-start justify-between gap-4">
                                            {/* Domain Info */}
                                            <div className="flex items-start gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${domain.status === 'VERIFIED' ? 'bg-[var(--nebula-glow-cyan)]' : 'bg-[var(--nebula-glow-pink)]'}`}>
                                                    {domain.status === 'VERIFIED' ? (
                                                        <svg className="w-6 h-6" style={{ color: 'var(--nebula-cyan)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-6 h-6" style={{ color: 'var(--nebula-pink)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold text-lg" style={{ color: 'var(--nebula-text)' }}>{domain.name}</h3>
                                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${domain.status === "VERIFIED"
                                                                ? "bg-[rgba(16,185,129,0.1)] text-[var(--nebula-success)]"
                                                                : "bg-[rgba(245,158,11,0.1)] text-[var(--nebula-warning)]"
                                                            }`}>
                                                            {domain.status === "VERIFIED" ? "✓ Verified" : "⏳ Pending"}
                                                        </span>
                                                        {domain.isPublic && (
                                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--nebula-glow-violet)] text-[var(--nebula-violet)]">
                                                                🌐 Public
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm" style={{ color: 'var(--nebula-text-muted)' }}>
                                                        Thêm ngày: {new Date(domain.createdAt).toLocaleDateString("vi-VN")}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2">
                                                {domain.status !== "VERIFIED" && (
                                                    <button
                                                        onClick={() => handleVerify(domain.id, domain.verificationToken)}
                                                        disabled={verifyingId === domain.id}
                                                        className="btn-nebula btn-nebula-primary text-sm"
                                                    >
                                                        {verifyingId === domain.id ? "..." : "Xác thực"}
                                                    </button>
                                                )}

                                                {domain.status === "VERIFIED" && (
                                                    <button
                                                        onClick={() => handleTogglePublic(domain.id, domain.isPublic)}
                                                        disabled={togglingId === domain.id}
                                                        className="btn-nebula btn-nebula-secondary text-sm"
                                                    >
                                                        {togglingId === domain.id ? "..." : domain.isPublic ? "Riêng tư" : "Công khai"}
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleDelete(domain.id, domain.name)}
                                                    disabled={deletingId === domain.id}
                                                    className="btn-nebula btn-nebula-ghost text-sm"
                                                    style={{ color: 'var(--nebula-error)' }}
                                                >
                                                    {deletingId === domain.id ? "..." : "Xóa"}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Verification Instructions */}
                                        {domain.status !== "VERIFIED" && (
                                            <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                                <p className="text-sm font-medium mb-2" style={{ color: 'var(--nebula-warning)' }}>
                                                    Thêm TXT record sau vào DNS để xác thực:
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <code className="flex-1 px-3 py-2 rounded-lg text-xs font-mono break-all" style={{ background: 'var(--nebula-surface)', color: 'var(--nebula-text)' }}>
                                                        {domain.verificationToken}
                                                    </code>
                                                    <button
                                                        onClick={() => copyToClipboard(domain.verificationToken)}
                                                        className="btn-nebula btn-nebula-secondary text-xs flex-shrink-0"
                                                    >
                                                        Sao chép
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Public sharing info */}
                                        {domain.isPublic && domain.status === "VERIFIED" && (
                                            <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--nebula-glow-violet)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                                                <p className="text-sm" style={{ color: 'var(--nebula-violet)' }}>
                                                    <strong>Domain công khai.</strong> Người dùng khác có thể tạo email trên domain này.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
