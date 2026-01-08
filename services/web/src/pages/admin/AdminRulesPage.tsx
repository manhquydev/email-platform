import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import {
    GlassCard, SectionHeader, PremiumTable, TableHeader, TableHeaderCell,
    TableBody, TableRow, TableCell, PremiumButton, ConfirmModal
} from "../../components/admin/AdminUIComponents";

export function AdminRulesPage() {
    const { token } = useAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [newValue, setNewValue] = useState("");
    const [newType, setNewType] = useState("BLOCK");
    const [newScope, setNewScope] = useState("SENDER_DOMAIN");
    const [error, setError] = useState("");

    const loadRules = useCallback(async () => {
        setLoading(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [deleteTarget, setDeleteTarget] = useState<any>(null);

    const handleDelete = async (ruleId: string) => {
        setLoading(true);
        try {
            await api(`/abuse/rules/${ruleId}`, { method: "DELETE", token });
            toast.success("Đã xóa quy tắc");
            setDeleteTarget(null);
            loadRules();
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
        <div className="p-6 max-w-5xl space-y-6">
            <SectionHeader
                title="Quy tắc bảo vệ"
                subtitle="Quản lý các quy tắc chặn hoặc cho phép email"
            />

            {/* Add Rule Form */}
            <GlassCard className="p-5">
                <h3 className="text-sm font-medium mb-4 text-slate-900 dark:text-white">Thêm quy tắc mới</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-xs text-slate-500 mb-1.5">Loại</label>
                        <select value={newType} onChange={(e) => setNewType(e.target.value)} className="w-full text-sm py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <option value="BLOCK">Chặn</option>
                            <option value="ALLOW">Cho phép</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1.5">Phạm vi</label>
                        <select value={newScope} onChange={(e) => setNewScope(e.target.value)} className="w-full text-sm py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <option value="SENDER_DOMAIN">Tên miền gửi</option>
                            <option value="SENDER_EMAIL">Email gửi</option>
                            <option value="RECIPIENT_DOMAIN">Tên miền nhận</option>
                            <option value="SOURCE_IP">Địa chỉ IP</option>
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-xs text-slate-500 mb-1.5">Giá trị</label>
                        <input
                            className="w-full text-sm py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                            placeholder="example.com"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addRule()}
                        />
                    </div>
                    <PremiumButton onClick={addRule} disabled={loading || !newValue} className="h-10 w-full">
                        Thêm
                    </PremiumButton>
                </div>
                {error && <div className="mt-3 text-sm text-red-500">{error}</div>}
            </GlassCard>

            {/* Rules Table */}
            <GlassCard padding="p-0">
                <PremiumTable>
                    <TableHeader>
                        <tr>
                            <TableHeaderCell>Loại</TableHeaderCell>
                            <TableHeaderCell>Phạm vi</TableHeaderCell>
                            <TableHeaderCell>Giá trị</TableHeaderCell>
                            <TableHeaderCell className="text-right">Hành động</TableHeaderCell>
                        </tr>
                    </TableHeader>
                    <TableBody>
                        {rules.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Chưa có quy tắc nào</td>
                            </tr>
                        ) : rules.map((r) => (
                            <TableRow key={r.id}>
                                <TableCell>
                                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${r.type === "BLOCK" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        }`}>
                                        {r.type === "BLOCK" ? "Chặn" : "Cho phép"}
                                    </span>
                                </TableCell>
                                <TableCell className="text-slate-600 dark:text-slate-400">{scopeLabels[r.scope] || r.scope}</TableCell>
                                <TableCell className="font-mono text-xs text-slate-700 dark:text-slate-300">{r.value}</TableCell>
                                <TableCell className="text-right">
                                    <PremiumButton
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        onClick={() => setDeleteTarget(r)}
                                        disabled={loading}
                                    >
                                        Xóa
                                    </PremiumButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </PremiumTable>
            </GlassCard>

            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
                title="Xóa quy tắc"
                message={`Bạn có chắc muốn xóa quy tắc cho "${deleteTarget?.value}"?`}
                variant="danger"
                isLoading={loading && !!deleteTarget}
            />
        </div>
    );
}
