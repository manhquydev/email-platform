import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

export function AdminRulesPage() {
    const { token } = useAuth();
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
                        <select value={newType} onChange={(e) => setNewType(e.target.value)} className="text-sm input-nebula w-full">
                            <option value="BLOCK">Chặn</option>
                            <option value="ALLOW">Cho phép</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-muted mb-1.5">Phạm vi</label>
                        <select value={newScope} onChange={(e) => setNewScope(e.target.value)} className="text-sm input-nebula w-full">
                            <option value="SENDER_DOMAIN">Tên miền gửi</option>
                            <option value="SENDER_EMAIL">Email gửi</option>
                            <option value="RECIPIENT_DOMAIN">Tên miền nhận</option>
                            <option value="SOURCE_IP">Địa chỉ IP</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-muted mb-1.5">Giá trị</label>
                        <input
                            className="text-sm input-nebula w-full"
                            placeholder="example.com"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addRule()}
                        />
                    </div>
                    <button onClick={addRule} disabled={loading || !newValue} className="btn-primary h-10 w-full">
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
