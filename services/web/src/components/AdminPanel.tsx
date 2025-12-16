import { useState, useEffect, useCallback, type FormEvent } from "react";
import { api } from "../utils/api";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

export function AdminPanel({ token }: { token: string }) {
    const [tab, setTab] = useState<"rules" | "password" | "domains">("rules");

    return (
        <div className="panel" style={{ gridColumn: "1 / -1" }}>
            <div className="flex justify-between items-center mb-4">
                <h2>Admin Dashboard</h2>
                <Link to="/" className="text-sm text-primary hover:underline">← Quay lại Dashboard</Link>
            </div>
            <div className="row" style={{ gap: "0.5rem", marginBottom: "1rem" }}>
                <button onClick={() => setTab("rules")} disabled={tab === "rules"}>
                    Spam Rules
                </button>
                <button onClick={() => setTab("domains")} disabled={tab === "domains"}>
                    Quản lý tên miền
                </button>
                <button onClick={() => setTab("password")} disabled={tab === "password"}>
                    Đổi mật khẩu
                </button>
            </div>

            {tab === "rules" && <RulesList token={token} />}
            {tab === "domains" && <DomainsList token={token} />}
            {tab === "password" && <ChangePasswordForm token={token} />}
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
            await loadRules();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const deleteRule = async (id: string) => {
        if (!confirm("Delete this rule?")) return;
        setLoading(true);
        try {
            await api(`/abuse/rules/${id}`, { method: "DELETE", token });
            await loadRules();
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="stack">
            <div className="grid-two">
                <label className="label">
                    Rule Type
                    <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                        <option value="BLOCK">BLOCK</option>
                        <option value="ALLOW">ALLOW</option>
                    </select>
                </label>
                <label className="label">
                    Scope
                    <select value={newScope} onChange={(e) => setNewScope(e.target.value)}>
                        <option value="SENDER_DOMAIN">SENDER_DOMAIN</option>
                        <option value="SENDER_EMAIL">SENDER_EMAIL</option>
                        <option value="RECIPIENT_DOMAIN">RECIPIENT_DOMAIN</option>
                        <option value="SOURCE_IP">SOURCE_IP</option>
                    </select>
                </label>
                <label className="label" style={{ gridColumn: "1 / -1" }}>
                    Value
                    <div className="row" style={{ gap: "0.5rem" }}>
                        <input
                            placeholder="example.com, 1.2.3.4, ..."
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                        />
                        <button onClick={addRule} disabled={loading || !newValue}>
                            Add Rule
                        </button>
                    </div>
                </label>
            </div>
            {error && <div className="danger small">{error}</div>}

            <div className="list">
                {rules.map((r) => (
                    <div key={r.id} className="item" style={{ justifyContent: "space-between" }}>
                        <div>
                            <span
                                className={`badge`}
                                style={{ marginRight: "0.5rem", borderColor: r.type === "BLOCK" ? "red" : "green" }}
                            >
                                {r.type}
                            </span>
                            <strong>{r.scope}</strong>: {r.value}
                        </div>
                        <button onClick={() => deleteRule(r.id)} disabled={loading} className="small">
                            Del
                        </button>
                    </div>
                ))}
                {!rules.length && <div className="muted">No rules defined.</div>}
            </div>
        </div>
    );
}

function DomainsList({ token }: { token: string }) {
    const [domains, setDomains] = useState<any[]>([]);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadDomains = useCallback(async () => {
        try {
            const res = await api<{ data: any[] }>("/domains?limit=100", { token });
            setDomains(res.data);
        } catch (err) {
            toast.error((err as Error).message);
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
            toast.success("Đã xác thực thành công!");
            await loadDomains();
        } catch (err) {
            toast.error("Lỗi xác thực: " + (err as Error).message);
        } finally {
            setVerifyingId(null);
        }
    };

    const handleDelete = async (domainId: string) => {
        if (!confirm("Bạn có chắc muốn xóa tên miền này không? Hành động này không thể hoàn tác.")) return;
        setDeletingId(domainId);
        try {
            // Assuming DELETE /domains/:id is implemented or we use a generic delete if available.
            // Based on previous conversations, we might need to check if DELETE route exists.
            // If not, we will need to add it to backend. But for now assuming it exists essentially or we use standard conventions.
            // Wait, looking at routes/domains.ts in previous turn, there WAS NO DELETE ROUTE.
            // I need to add it to the backend too if I want it to work!
            // Wait, I shouldn't assume. I should check backend first or Add it.
            // I'll add the UI first, and then I'll fix the backend in the next step if I recall it's missing.
            // Re-checking Step 24 (file view of domains.ts): It has GET, POST list, POST verify. NO DELETE.
            // I MUST ADD DELETE ENDPOINT TO BACKEND.

            // For now, I will write the frontend code assuming endpoint `/domains/:id` method DELETE.
            await api(`/domains/${domainId}`, { method: "DELETE", token });
            toast.success("Đã xóa tên miền");
            await loadDomains();
        } catch (err) {
            toast.error("Lỗi xóa: " + (err as Error).message);
        } finally {
            setDeletingId(null);
        }
    }

    const copyToken = (val: string) => {
        navigator.clipboard.writeText(val);
        toast.success("Copied to clipboard");
    };

    return (
        <div className="stack">
            <div className="list">
                {domains.map(d => (
                    <div key={d.id} className="item bg-bg p-3 rounded border border-border">
                        <div className="flex justify-between items-start gap-4 w-full">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-sm">{d.name}</h4>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${d.status === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {d.status}
                                    </span>
                                </div>

                                {d.status !== 'VERIFIED' && (
                                    <div className="text-xs text-muted mt-2 p-2 bg-surface rounded">
                                        <div className="mb-1 font-medium">Cấu hình DNS (TXT Record):</div>
                                        <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1 items-center">
                                            <span className="text-muted">Host:</span>
                                            <code className="bg-bg px-1 rounded select-all">_amazin_verify</code>

                                            <span className="text-muted">Value:</span>
                                            <div className="flex items-center gap-2 min-w-0">
                                                <code className="bg-bg px-1 rounded select-all truncate max-w-[200px]">{d.verificationToken}</code>
                                                <button onClick={() => copyToken(d.verificationToken)} className="text-primary hover:underline text-[10px]">
                                                    Copy
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col items-end gap-2 shrink-0">
                                <div className="flex gap-2">
                                    {d.status !== 'VERIFIED' && (
                                        <button
                                            onClick={() => handleVerify(d.id, d.verificationToken)}
                                            disabled={verifyingId === d.id}
                                            className="btn-primary text-xs px-3 py-1"
                                        >
                                            {verifyingId === d.id ? "..." : "Xác thực"}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(d.id)}
                                        disabled={deletingId === d.id}
                                        className="text-danger hover:bg-danger-light p-1 rounded"
                                        title="Xóa tên miền"
                                    >
                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </button>
                                </div>
                                <div className="text-[10px] text-muted">
                                    {new Date(d.createdAt).toLocaleDateString("vi-VN")}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {/* Note: Create domain is in Sidebar */}
            <div className="text-xs text-muted mt-4 text-center">
                Để thêm tên miền mới, vui lòng sử dụng nút "+ Thêm tên miền mới" ở cột bên trái (Dashboard).
            </div>
        </div>
    );
}

function ChangePasswordForm({ token }: { token: string }) {
    const [password, setPassword] = useState("");
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!password) return;
        setBusy(true);
        setMsg("");
        setErr("");
        try {
            await api("/auth/change-password", { method: "POST", token, body: { newPassword: password } });
            setMsg("Password updated successfully.");
            setPassword("");
        } catch (error) {
            setErr((error as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="stack" style={{ maxWidth: "400px" }}>
            <label className="label">
                Mật khẩu mới (tối thiểu 6 ký tự)
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                />
            </label>
            <button type="submit" disabled={busy}>
                {busy ? "Updating..." : "Cập nhật mật khẩu"}
            </button>
            {msg && <div className="success small" style={{ color: "green" }}>{msg}</div>}
            {err && <div className="danger small">{err}</div>}
        </form>
    );
}
