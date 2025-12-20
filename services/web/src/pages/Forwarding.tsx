import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { getFriendlyErrorMessage } from "../utils/errorMapping";
import toast from "react-hot-toast";
import { ThemeToggle } from "../components/ThemeToggle";

interface ForwardingRule {
    id: string;
    name: string;
    inboxId: string | null;
    conditions: {
        senderDomains?: string[];
        containsOTP?: boolean;
        subjectContains?: string;
    };
    forwardTo: string;
    isActive: boolean;
    forwardCount: number;
    lastForwardAt: string | null;
    inbox?: {
        localPart: string;
        domain: { name: string };
    };
}

export function Forwarding() {
    const { token } = useAuth();
    const [verifiedEmails, setVerifiedEmails] = useState<string[]>([]);
    const [rules, setRules] = useState<ForwardingRule[]>([]);
    const [loading, setLoading] = useState(true);

    // Verification form
    const [verifyEmail, setVerifyEmail] = useState("");
    const [verifyCode, setVerifyCode] = useState("");
    const [verifyStep, setVerifyStep] = useState<"idle" | "pending" | "code">("idle");
    const [verifyBusy, setVerifyBusy] = useState(false);

    // Rule form
    const [showRuleModal, setShowRuleModal] = useState(false);
    const [editingRule, setEditingRule] = useState<ForwardingRule | null>(null);
    const [ruleForm, setRuleForm] = useState({
        name: "",
        forwardTo: "",
        senderDomains: "",
        containsOTP: false,
        subjectContains: "",
    });
    const [ruleBusy, setRuleBusy] = useState(false);

    const loadData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [emailsRes, rulesRes] = await Promise.all([
                api<{ emails: string[] }>("/forwarding/emails", { token }),
                api<{ rules: ForwardingRule[] }>("/forwarding/rules", { token }),
            ]);
            setVerifiedEmails(emailsRes.emails);
            setRules(rulesRes.rules);
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Email Verification
    const sendVerification = async () => {
        if (!verifyEmail) return;
        setVerifyBusy(true);
        try {
            await api("/forwarding/verify-email", {
                method: "POST",
                token,
                body: { email: verifyEmail }
            });
            setVerifyStep("code");
            toast.success("Mã xác minh đã được gửi tới email của bạn");
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setVerifyBusy(false);
        }
    };

    const confirmVerification = async () => {
        if (!verifyCode || verifyCode.length !== 6) return;
        setVerifyBusy(true);
        try {
            await api("/forwarding/confirm-email", {
                method: "POST",
                token,
                body: { email: verifyEmail, code: verifyCode }
            });
            toast.success("Email đã được xác minh!");
            setVerifyStep("idle");
            setVerifyEmail("");
            setVerifyCode("");
            loadData();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setVerifyBusy(false);
        }
    };

    const removeEmail = async (email: string) => {
        if (!confirm(`Xóa ${email} khỏi danh sách đích chuyển tiếp? Các quy tắc sử dụng email này cũng sẽ bị xóa.`)) return;
        try {
            await api(`/forwarding/emails/${encodeURIComponent(email)}`, {
                method: "DELETE",
                token
            });
            toast.success("Đã xóa email");
            loadData();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        }
    };

    // Rules Management
    const openRuleModal = (rule?: ForwardingRule) => {
        if (rule) {
            setEditingRule(rule);
            setRuleForm({
                name: rule.name,
                forwardTo: rule.forwardTo,
                senderDomains: rule.conditions.senderDomains?.join(", ") || "",
                containsOTP: rule.conditions.containsOTP || false,
                subjectContains: rule.conditions.subjectContains || "",
            });
        } else {
            setEditingRule(null);
            setRuleForm({
                name: "",
                forwardTo: verifiedEmails[0] || "",
                senderDomains: "",
                containsOTP: false,
                subjectContains: "",
            });
        }
        setShowRuleModal(true);
    };

    const saveRule = async () => {
        if (!ruleForm.name || !ruleForm.forwardTo) {
            toast.error("Vui lòng nhập tên quy tắc và email đích");
            return;
        }
        setRuleBusy(true);
        try {
            const conditions = {
                senderDomains: ruleForm.senderDomains
                    ? ruleForm.senderDomains.split(",").map(s => s.trim()).filter(Boolean)
                    : undefined,
                containsOTP: ruleForm.containsOTP || undefined,
                subjectContains: ruleForm.subjectContains || undefined,
            };

            if (editingRule) {
                await api(`/forwarding/rules/${editingRule.id}`, {
                    method: "PATCH",
                    token,
                    body: { name: ruleForm.name, forwardTo: ruleForm.forwardTo, conditions }
                });
                toast.success("Đã cập nhật quy tắc");
            } else {
                await api("/forwarding/rules", {
                    method: "POST",
                    token,
                    body: { name: ruleForm.name, forwardTo: ruleForm.forwardTo, conditions }
                });
                toast.success("Đã tạo quy tắc mới");
            }
            setShowRuleModal(false);
            loadData();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setRuleBusy(false);
        }
    };

    const toggleRule = async (rule: ForwardingRule) => {
        try {
            await api(`/forwarding/rules/${rule.id}`, {
                method: "PATCH",
                token,
                body: { isActive: !rule.isActive }
            });
            loadData();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        }
    };

    const deleteRule = async (rule: ForwardingRule) => {
        if (!confirm(`Xóa quy tắc "${rule.name}"?`)) return;
        try {
            await api(`/forwarding/rules/${rule.id}`, { method: "DELETE", token });
            toast.success("Đã xóa quy tắc");
            loadData();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        }
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
            <header className="bg-surface border-b border-border px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/app" className="text-muted hover:text-text-main transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <h1 className="text-xl font-semibold flex items-center gap-2">
                            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                            </svg>
                            Chuyển tiếp Email
                        </h1>
                    </div>
                    <ThemeToggle />
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-6 space-y-6">
                {/* Verified Emails Section */}
                <div className="bg-surface border border-border rounded-xl p-6">
                    <h2 className="font-semibold mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Email đích đã xác minh
                    </h2>

                    <p className="text-sm text-muted mb-4">
                        Bạn chỉ có thể chuyển tiếp email đến các địa chỉ đã được xác minh.
                    </p>

                    {/* Verified emails list */}
                    {verifiedEmails.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {verifiedEmails.map((email) => (
                                <div key={email} className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm">
                                    <span>{email}</span>
                                    <button
                                        onClick={() => removeEmail(email)}
                                        className="hover:text-red-600 transition-colors"
                                        title="Xóa email này"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add email form */}
                    {verifyStep === "idle" && (
                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={verifyEmail}
                                onChange={(e) => setVerifyEmail(e.target.value)}
                                placeholder="Nhập email cá nhân của bạn"
                                className="flex-1 max-w-sm"
                            />
                            <button onClick={sendVerification} disabled={verifyBusy || !verifyEmail} className="btn btn-primary">
                                {verifyBusy ? "Đang gửi..." : "Thêm email"}
                            </button>
                        </div>
                    )}

                    {verifyStep === "code" && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                            <p className="text-sm text-blue-800">
                                Mã xác minh đã được gửi tới <strong>{verifyEmail}</strong>
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={verifyCode}
                                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    placeholder="Nhập mã 6 số"
                                    className="w-32 text-center tracking-widest font-mono"
                                    maxLength={6}
                                />
                                <button onClick={confirmVerification} disabled={verifyBusy || verifyCode.length !== 6} className="btn btn-primary">
                                    {verifyBusy ? "Đang xác minh..." : "Xác nhận"}
                                </button>
                                <button onClick={() => { setVerifyStep("idle"); setVerifyCode(""); }} className="btn btn-secondary">
                                    Hủy
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Forwarding Rules Section */}
                <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold flex items-center gap-2">
                            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                            </svg>
                            Quy tắc chuyển tiếp
                        </h2>
                        <button
                            onClick={() => openRuleModal()}
                            disabled={verifiedEmails.length === 0}
                            className="btn btn-primary text-sm"
                        >
                            + Thêm quy tắc
                        </button>
                    </div>

                    {verifiedEmails.length === 0 && (
                        <p className="text-sm text-muted py-4 text-center">
                            Vui lòng thêm và xác minh ít nhất một email đích trước khi tạo quy tắc.
                        </p>
                    )}

                    {rules.length === 0 && verifiedEmails.length > 0 && (
                        <p className="text-sm text-muted py-4 text-center">
                            Chưa có quy tắc chuyển tiếp nào. Nhấn "Thêm quy tắc" để bắt đầu.
                        </p>
                    )}

                    {rules.length > 0 && (
                        <div className="space-y-3">
                            {rules.map((rule) => (
                                <div
                                    key={rule.id}
                                    className={`border rounded-lg p-4 transition-colors ${rule.isActive ? 'border-green-200 bg-green-50/50' : 'border-border bg-bg opacity-60'}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{rule.name}</span>
                                                {rule.isActive && (
                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Hoạt động</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted mt-1">
                                                → {rule.forwardTo}
                                            </p>
                                            {/* Conditions */}
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {rule.conditions.senderDomains && rule.conditions.senderDomains.length > 0 && (
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                        Domain: {rule.conditions.senderDomains.join(", ")}
                                                    </span>
                                                )}
                                                {rule.conditions.containsOTP && (
                                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                                        Chứa OTP
                                                    </span>
                                                )}
                                                {rule.conditions.subjectContains && (
                                                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                                                        Tiêu đề: "{rule.conditions.subjectContains}"
                                                    </span>
                                                )}
                                            </div>
                                            {/* Stats */}
                                            <p className="text-xs text-muted mt-2">
                                                Đã chuyển tiếp: {rule.forwardCount} lần
                                                {rule.lastForwardAt && ` • Lần cuối: ${new Date(rule.lastForwardAt).toLocaleDateString("vi-VN")}`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleRule(rule)}
                                                className={`w-10 h-5 rounded-full transition-colors ${rule.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                                            >
                                                <span className={`block w-4 h-4 bg-white rounded-full shadow transform transition-transform ${rule.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                            </button>
                                            <button onClick={() => openRuleModal(rule)} className="p-1 text-muted hover:text-primary">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                                </svg>
                                            </button>
                                            <button onClick={() => deleteRule(rule)} className="p-1 text-muted hover:text-red-600">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Card */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                    <h3 className="font-medium mb-2">💡 Cách hoạt động</h3>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                        <li>Khi có email đến hộp thư tạm thời, hệ thống sẽ kiểm tra các quy tắc</li>
                        <li>Nếu email khớp với điều kiện, nó sẽ được chuyển tiếp đến email đích</li>
                        <li>Mã OTP sẽ được tự động trích xuất và hiển thị nổi bật</li>
                    </ul>
                </div>
            </main>

            {/* Rule Modal */}
            {showRuleModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface rounded-xl w-full max-w-md p-6">
                        <h3 className="font-semibold mb-4">
                            {editingRule ? "Sửa quy tắc" : "Tạo quy tắc mới"}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Tên quy tắc</label>
                                <input
                                    type="text"
                                    value={ruleForm.name}
                                    onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                                    placeholder="VD: Chuyển tiếp OTP"
                                    className="w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Email đích</label>
                                <select
                                    value={ruleForm.forwardTo}
                                    onChange={(e) => setRuleForm({ ...ruleForm, forwardTo: e.target.value })}
                                    className="w-full"
                                >
                                    {verifiedEmails.map((email) => (
                                        <option key={email} value={email}>{email}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="border-t border-border pt-4">
                                <p className="text-sm font-medium mb-3">Điều kiện (tùy chọn)</p>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm text-muted mb-1">Domain người gửi (phân cách bằng dấu phẩy)</label>
                                        <input
                                            type="text"
                                            value={ruleForm.senderDomains}
                                            onChange={(e) => setRuleForm({ ...ruleForm, senderDomains: e.target.value })}
                                            placeholder="VD: google.com, facebook.com"
                                            className="w-full text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-muted mb-1">Tiêu đề chứa</label>
                                        <input
                                            type="text"
                                            value={ruleForm.subjectContains}
                                            onChange={(e) => setRuleForm({ ...ruleForm, subjectContains: e.target.value })}
                                            placeholder="VD: verification, OTP"
                                            className="w-full text-sm"
                                        />
                                    </div>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={ruleForm.containsOTP}
                                            onChange={(e) => setRuleForm({ ...ruleForm, containsOTP: e.target.checked })}
                                            className="rounded"
                                        />
                                        <span className="text-sm">Chỉ chuyển tiếp email chứa mã OTP</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setShowRuleModal(false)} className="btn btn-secondary">
                                Hủy
                            </button>
                            <button onClick={saveRule} disabled={ruleBusy} className="btn btn-primary">
                                {ruleBusy ? "Đang lưu..." : (editingRule ? "Cập nhật" : "Tạo quy tắc")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
