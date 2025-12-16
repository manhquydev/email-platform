import { useState, useEffect, useCallback, type FormEvent } from "react";
import { api } from "../utils/api";

export function AdminPanel({ token }: { token: string }) {
    const [tab, setTab] = useState<"rules" | "password">("rules");

    return (
        <div className="panel" style={{ gridColumn: "1 / -1" }}>
            <h2>Admin Dashboard</h2>
            <div className="row" style={{ gap: "0.5rem", marginBottom: "1rem" }}>
                <button onClick={() => setTab("rules")} disabled={tab === "rules"}>
                    Spam Rules
                </button>
                <button onClick={() => setTab("password")} disabled={tab === "password"}>
                    Đổi mật khẩu
                </button>
            </div>

            {tab === "rules" && <RulesList token={token} />}
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
