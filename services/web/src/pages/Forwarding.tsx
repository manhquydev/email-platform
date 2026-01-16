import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { getFriendlyErrorMessage } from "../utils/errorMapping";
import toast from "react-hot-toast";

import { ConfirmationModal } from "../components/ConfirmationModal";
import { DestinationSelector } from "../components/forwarding/DestinationSelector";
import { ForwardingConditionBuilder } from "../components/forwarding/ForwardingConditionBuilder";
import type { ForwardingRule, ForwardCondition, ForwardDestinationType } from "../types";

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

    // Rule form - enhanced with multi-destination support
    const [showRuleModal, setShowRuleModal] = useState(false);
    const [editingRule, setEditingRule] = useState<ForwardingRule | null>(null);
    const [ruleForm, setRuleForm] = useState<{
        name: string;
        destinationType: ForwardDestinationType;
        forwardTo: string;
        telegramChatId: string;
        discordWebhookUrl: string;
        webhookUrl: string;
        webhookSecret: string;
        conditions: ForwardCondition[];
        matchType: 'ALL' | 'ANY';
        priority: number;
    }>({
        name: "",
        destinationType: "EMAIL",
        forwardTo: "",
        telegramChatId: "",
        discordWebhookUrl: "",
        webhookUrl: "",
        webhookSecret: "",
        conditions: [],
        matchType: "ALL",
        priority: 50,
    });
    const [ruleBusy, setRuleBusy] = useState(false);
    const [telegramLinked, setTelegramLinked] = useState(false);

    const [emailToDelete, setEmailToDelete] = useState<string | null>(null);
    const [ruleToDelete, setRuleToDelete] = useState<ForwardingRule | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [emailsRes, rulesRes, telegramRes] = await Promise.all([
                api<{ emails: string[] }>("/forwarding/emails", { token }),
                api<{ rules: ForwardingRule[] }>("/forwarding/rules", { token }),
                api<{ linked: boolean }>("/telegram/status", { token }).catch(() => ({ linked: false })),
            ]);
            setVerifiedEmails(emailsRes.emails);
            setRules(rulesRes.rules);
            setTelegramLinked(telegramRes.linked);
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

    const removeEmail = (email: string) => {
        setEmailToDelete(email);
    };

    const confirmRemoveEmail = async () => {
        if (!emailToDelete) return;
        setIsDeleting(true);
        try {
            await api(`/forwarding/emails/${encodeURIComponent(emailToDelete)}`, {
                method: "DELETE",
                token
            });
            toast.success("Đã xóa email");
            setEmailToDelete(null);
            loadData();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setIsDeleting(false);
        }
    };

    // Rules Management - Enhanced for multi-destination
    const openRuleModal = (rule?: ForwardingRule) => {
        if (rule) {
            setEditingRule(rule);
            setRuleForm({
                name: rule.name,
                destinationType: rule.destinationType || "EMAIL",
                forwardTo: rule.forwardTo || "",
                telegramChatId: rule.telegramChatId || "",
                discordWebhookUrl: rule.discordWebhookUrl || "",
                webhookUrl: rule.webhookUrl || "",
                webhookSecret: rule.webhookSecret || "",
                conditions: Array.isArray(rule.conditions) ? rule.conditions : [],
                matchType: rule.matchType || "ALL",
                priority: rule.priority || 50,
            });
        } else {
            setEditingRule(null);
            setRuleForm({
                name: "",
                destinationType: "EMAIL",
                forwardTo: verifiedEmails[0] || "",
                telegramChatId: "",
                discordWebhookUrl: "",
                webhookUrl: "",
                webhookSecret: "",
                conditions: [],
                matchType: "ALL",
                priority: 50,
            });
        }
        setShowRuleModal(true);
    };

    const saveRule = async () => {
        if (!ruleForm.name) {
            toast.error("Vui lòng nhập tên quy tắc");
            return;
        }
        // Validate destination based on type
        if (ruleForm.destinationType === "EMAIL" && !ruleForm.forwardTo) {
            toast.error("Vui lòng chọn email đích");
            return;
        }
        if (ruleForm.destinationType === "DISCORD" && !ruleForm.discordWebhookUrl) {
            toast.error("Vui lòng nhập Discord webhook URL");
            return;
        }
        if (ruleForm.destinationType === "WEBHOOK" && !ruleForm.webhookUrl) {
            toast.error("Vui lòng nhập webhook URL");
            return;
        }

        setRuleBusy(true);
        try {
            const payload = {
                name: ruleForm.name,
                destinationType: ruleForm.destinationType,
                forwardTo: ruleForm.destinationType === "EMAIL" ? ruleForm.forwardTo : null,
                telegramChatId: ruleForm.destinationType === "TELEGRAM" ? ruleForm.telegramChatId || "linked" : null,
                discordWebhookUrl: ruleForm.destinationType === "DISCORD" ? ruleForm.discordWebhookUrl : null,
                webhookUrl: ruleForm.destinationType === "WEBHOOK" ? ruleForm.webhookUrl : null,
                webhookSecret: ruleForm.destinationType === "WEBHOOK" ? ruleForm.webhookSecret : null,
                conditions: ruleForm.conditions,
                matchType: ruleForm.matchType,
                priority: ruleForm.priority,
            };

            if (editingRule) {
                await api(`/forwarding/rules/${editingRule.id}`, {
                    method: "PATCH",
                    token,
                    body: payload
                });
                toast.success("Đã cập nhật quy tắc");
            } else {
                await api("/forwarding/rules", {
                    method: "POST",
                    token,
                    body: payload
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

    const deleteRule = (rule: ForwardingRule) => {
        setRuleToDelete(rule);
    };

    const confirmDeleteRule = async () => {
        if (!ruleToDelete) return;
        setIsDeleting(true);
        try {
            await api(`/forwarding/rules/${ruleToDelete.id}`, { method: "DELETE", token });
            toast.success("Đã xóa quy tắc");
            setRuleToDelete(null);
            loadData();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 h-full">
                <div className="flex items-center justify-center h-full" style={{ background: 'var(--nebula-void)' }}>
                    <div className="spinner" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 h-full flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto" style={{ background: 'var(--nebula-void)' }}>
                {/* Page Header */}
                <div className="page-header">
                    <div className="page-header-content">
                        <div className="flex items-center">
                            <div className="page-header-icon">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="page-header-title">Email Forwarding</h1>
                                <p className="page-header-subtitle">Tự động chuyển tiếp email đến địa chỉ cá nhân</p>
                            </div>
                        </div>
                        <button
                            onClick={() => openRuleModal()}
                            disabled={verifiedEmails.length === 0}
                            className="btn-nebula btn-nebula-primary"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Thêm quy tắc
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
                    {/* Verified Emails Section */}
                    <div className="glass-card">
                        <div className="glass-card-header">
                            <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--nebula-text)' }}>
                                <svg className="w-5 h-5" style={{ color: 'var(--nebula-success)' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Email đích đã xác minh
                            </h2>
                        </div>
                        <div className="glass-card-body">
                            <p className="text-sm mb-4" style={{ color: 'var(--nebula-text-muted)' }}>
                                Bạn chỉ có thể chuyển tiếp email đến các địa chỉ đã được xác minh.
                            </p>

                            {/* Verified emails list */}
                            {verifiedEmails.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {verifiedEmails.map((email) => (
                                        <div key={email} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--nebula-success)' }}>
                                            <span className="font-medium">{email}</span>
                                            <button
                                                onClick={() => removeEmail(email)}
                                                className="hover:text-[var(--nebula-error)] transition-colors"
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
                                        className="input-nebula flex-1 max-w-sm"
                                    />
                                    <button onClick={sendVerification} disabled={verifyBusy || !verifyEmail} className="btn-nebula btn-nebula-primary">
                                        {verifyBusy ? "Đang gửi..." : "Thêm email"}
                                    </button>
                                </div>
                            )}

                            {verifyStep === "code" && (
                                <div className="p-4 rounded-xl" style={{ background: 'var(--nebula-glow-cyan)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                                    <p className="text-sm mb-3" style={{ color: 'var(--nebula-cyan)' }}>
                                        Mã xác minh đã được gửi tới <strong>{verifyEmail}</strong>
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={verifyCode}
                                            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                            placeholder="Nhập mã 6 số"
                                            className="input-nebula w-32 text-center tracking-widest font-mono"
                                            maxLength={6}
                                        />
                                        <button onClick={confirmVerification} disabled={verifyBusy || verifyCode.length !== 6} className="btn-nebula btn-nebula-primary">
                                            {verifyBusy ? "Đang xác minh..." : "Xác nhận"}
                                        </button>
                                        <button onClick={() => { setVerifyStep("idle"); setVerifyCode(""); }} className="btn-nebula btn-nebula-secondary">
                                            Hủy
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Forwarding Rules Section */}
                    <div className="glass-card">
                        <div className="glass-card-header">
                            <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--nebula-text)' }}>
                                <svg className="w-5 h-5" style={{ color: 'var(--nebula-violet)' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                                </svg>
                                Quy tắc chuyển tiếp
                            </h2>
                            <span className="text-sm" style={{ color: 'var(--nebula-text-muted)' }}>{rules.length} quy tắc</span>
                        </div>
                        <div className="glass-card-body">
                            {verifiedEmails.length === 0 && (
                                <div className="empty-state-nebula py-8">
                                    <div className="empty-state-nebula-icon">
                                        <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                        </svg>
                                    </div>
                                    <p className="empty-state-nebula-description">
                                        Vui lòng thêm và xác minh ít nhất một email đích trước khi tạo quy tắc.
                                    </p>
                                </div>
                            )}

                            {rules.length === 0 && verifiedEmails.length > 0 && (
                                <div className="empty-state-nebula py-8">
                                    <div className="empty-state-nebula-icon">
                                        <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                                        </svg>
                                    </div>
                                    <h3 className="empty-state-nebula-title">Chưa có quy tắc nào</h3>
                                    <p className="empty-state-nebula-description">
                                        Tạo quy tắc để tự động chuyển tiếp email đến địa chỉ của bạn.
                                    </p>
                                    <button onClick={() => openRuleModal()} className="btn-nebula btn-nebula-primary">
                                        Thêm quy tắc đầu tiên
                                    </button>
                                </div>
                            )}

                            {rules.length > 0 && (
                                <div className="space-y-3">
                                    {rules.map((rule) => (
                                        <div
                                            key={rule.id}
                                            className="p-4 rounded-xl transition-all animate-nebula-fade-in"
                                            style={{
                                                background: rule.isActive ? 'rgba(16, 185, 129, 0.05)' : 'var(--nebula-elevated)',
                                                border: `1px solid ${rule.isActive ? 'rgba(16, 185, 129, 0.2)' : 'var(--nebula-border)'}`,
                                                opacity: rule.isActive ? 1 : 0.7
                                            }}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-3 flex-1">
                                                    {/* Visual Flow Indicator */}
                                                    <div className="flex flex-col items-center gap-1 pt-1">
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: rule.isActive ? 'rgba(139, 92, 246, 0.1)' : 'var(--nebula-border)' }}>
                                                            <svg className="w-4 h-4" style={{ color: rule.isActive ? 'var(--nebula-violet)' : 'var(--nebula-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                            </svg>
                                                        </div>
                                                        <div className="w-px h-4" style={{ background: 'var(--nebula-border)' }}></div>
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: rule.isActive ? 'var(--nebula-glow-cyan)' : 'var(--nebula-border)' }}>
                                                            <svg className="w-4 h-4" style={{ color: rule.isActive ? 'var(--nebula-cyan)' : 'var(--nebula-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                                            </svg>
                                                        </div>
                                                    </div>

                                                    {/* Rule Details */}
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-semibold" style={{ color: 'var(--nebula-text)' }}>{rule.name}</span>
                                                            {rule.isActive && (
                                                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--nebula-success)' }}>
                                                                    ● Hoạt động
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm mb-2" style={{ color: 'var(--nebula-text-muted)' }}>
                                                            {rule.destinationType === 'EMAIL' && `📧 → ${rule.forwardTo}`}
                                                            {rule.destinationType === 'TELEGRAM' && '✈️ → Telegram'}
                                                            {rule.destinationType === 'DISCORD' && '💬 → Discord'}
                                                            {rule.destinationType === 'WEBHOOK' && `🔗 → ${rule.webhookUrl?.substring(0, 30)}...`}
                                                        </p>

                                                        {/* Conditions */}
                                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                                            {Array.isArray(rule.conditions) && rule.conditions.length > 0 ? (
                                                                <>
                                                                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--nebula-glow-cyan)', color: 'var(--nebula-cyan)' }}>
                                                                        {rule.conditions.length} điều kiện ({rule.matchType === 'ALL' ? 'AND' : 'OR'})
                                                                    </span>
                                                                    {rule.conditions.some(c => c.operator === 'CONTAINS_OTP') && (
                                                                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--nebula-glow-violet)', color: 'var(--nebula-violet)' }}>
                                                                            🔢 OTP
                                                                        </span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--nebula-elevated)', color: 'var(--nebula-text-muted)' }}>
                                                                    Tất cả email
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Stats */}
                                                        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--nebula-text-muted)' }}>
                                                            <span className="flex items-center gap-1">
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                </svg>
                                                                {rule.forwardCount} lần chuyển tiếp
                                                            </span>
                                                            {rule.lastForwardAt && (
                                                                <span>• Lần cuối: {new Date(rule.lastForwardAt).toLocaleDateString("vi-VN")}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => toggleRule(rule)}
                                                        className="relative w-11 h-6 rounded-full transition-colors"
                                                        style={{ background: rule.isActive ? 'var(--nebula-success)' : 'var(--nebula-border)' }}
                                                    >
                                                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${rule.isActive ? 'translate-x-5' : ''}`} />
                                                    </button>
                                                    <button onClick={() => openRuleModal(rule)} className="btn-nebula btn-nebula-ghost btn-nebula-icon">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                                        </svg>
                                                    </button>
                                                    <button onClick={() => deleteRule(rule)} className="btn-nebula btn-nebula-ghost btn-nebula-icon" style={{ color: 'var(--nebula-error)' }}>
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
                    </div>

                    {/* Info Card */}
                    <div className="glass-card">
                        <div className="glass-card-body">
                            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--nebula-text)' }}>
                                <span>💡</span> Cách hoạt động
                            </h3>
                            <ul className="space-y-2 text-sm" style={{ color: 'var(--nebula-text-muted)' }}>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full mt-2" style={{ background: 'var(--nebula-violet)' }}></span>
                                    <span>Khi có email đến hộp thư tạm thời, hệ thống sẽ kiểm tra các quy tắc</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full mt-2" style={{ background: 'var(--nebula-cyan)' }}></span>
                                    <span>Nếu email khớp với điều kiện, nó sẽ được chuyển tiếp đến email đích</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full mt-2" style={{ background: 'var(--nebula-pink)' }}></span>
                                    <span>Mã OTP sẽ được tự động trích xuất và hiển thị nổi bật</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Rule Modal - Enhanced with multi-destination */}
                {showRuleModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-nebula-fade-in overflow-y-auto">
                        <div className="glass-card-elevated w-full max-w-2xl animate-nebula-scale-in my-4">
                            <div className="glass-card-header">
                                <h3 className="font-semibold" style={{ color: 'var(--nebula-text)' }}>
                                    {editingRule ? "Sửa quy tắc" : "Tạo quy tắc mới"}
                                </h3>
                                <button onClick={() => setShowRuleModal(false)} className="btn-nebula btn-nebula-ghost btn-nebula-icon">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="glass-card-body space-y-6 max-h-[70vh] overflow-y-auto">
                                {/* Rule Name */}
                                <div>
                                    <label className="label-nebula">Tên quy tắc *</label>
                                    <input
                                        type="text"
                                        value={ruleForm.name}
                                        onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                                        placeholder="VD: Chuyển tiếp OTP từ Google"
                                        className="input-nebula"
                                    />
                                </div>

                                {/* Destination Selector */}
                                <div className="pt-4" style={{ borderTop: '1px solid var(--nebula-border)' }}>
                                    <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--nebula-text)' }}>
                                        Đích chuyển tiếp
                                    </h4>
                                    <DestinationSelector
                                        value={{
                                            type: ruleForm.destinationType,
                                            forwardTo: ruleForm.forwardTo,
                                            telegramChatId: ruleForm.telegramChatId,
                                            discordWebhookUrl: ruleForm.discordWebhookUrl,
                                            webhookUrl: ruleForm.webhookUrl,
                                            webhookSecret: ruleForm.webhookSecret,
                                        }}
                                        onChange={(config) => setRuleForm({
                                            ...ruleForm,
                                            destinationType: config.type,
                                            forwardTo: config.forwardTo || "",
                                            telegramChatId: config.telegramChatId || "",
                                            discordWebhookUrl: config.discordWebhookUrl || "",
                                            webhookUrl: config.webhookUrl || "",
                                            webhookSecret: config.webhookSecret || "",
                                        })}
                                        verifiedEmails={verifiedEmails}
                                        telegramLinked={telegramLinked}
                                    />
                                </div>

                                {/* Conditions Builder */}
                                <div className="pt-4" style={{ borderTop: '1px solid var(--nebula-border)' }}>
                                    <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--nebula-text)' }}>
                                        Điều kiện lọc (tùy chọn)
                                    </h4>
                                    <ForwardingConditionBuilder
                                        conditions={ruleForm.conditions}
                                        matchType={ruleForm.matchType}
                                        onChange={(conditions) => setRuleForm({ ...ruleForm, conditions })}
                                        onMatchTypeChange={(matchType) => setRuleForm({ ...ruleForm, matchType })}
                                    />
                                </div>

                                {/* Priority */}
                                <div className="pt-4" style={{ borderTop: '1px solid var(--nebula-border)' }}>
                                    <div className="flex items-center justify-between">
                                        <label className="label-nebula">Độ ưu tiên</label>
                                        <span className="text-sm font-mono" style={{ color: 'var(--nebula-violet)' }}>{ruleForm.priority}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={ruleForm.priority}
                                        onChange={(e) => setRuleForm({ ...ruleForm, priority: parseInt(e.target.value) })}
                                        className="w-full"
                                        style={{ accentColor: 'var(--nebula-violet)' }}
                                    />
                                    <p className="text-xs mt-1" style={{ color: 'var(--nebula-text-muted)' }}>
                                        Quy tắc có độ ưu tiên cao sẽ được kiểm tra trước
                                    </p>
                                </div>
                            </div>

                            <div className="glass-card-footer flex justify-end gap-2">
                                <button onClick={() => setShowRuleModal(false)} className="btn-nebula btn-nebula-secondary">
                                    Hủy
                                </button>
                                <button onClick={saveRule} disabled={ruleBusy} className="btn-nebula btn-nebula-primary">
                                    {ruleBusy ? "Đang lưu..." : (editingRule ? "Cập nhật" : "Tạo quy tắc")}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <ConfirmationModal
                    isOpen={!!emailToDelete}
                    title="Xác nhận xóa email"
                    message={`Xóa ${emailToDelete} khỏi danh sách đích chuyển tiếp?`}
                    confirmLabel="Xóa"
                    isDestructive
                    isLoading={isDeleting}
                    onConfirm={confirmRemoveEmail}
                    onCancel={() => setEmailToDelete(null)}
                />

                <ConfirmationModal
                    isOpen={!!ruleToDelete}
                    title="Xác nhận xóa quy tắc"
                    message={`Bạn có chắc chắn muốn xóa quy tắc "${ruleToDelete?.name}"?`}
                    confirmLabel="Xóa"
                    isDestructive
                    isLoading={isDeleting}
                    onConfirm={confirmDeleteRule}
                    onCancel={() => setRuleToDelete(null)}
                />
            </div>
        </div>
    );
}
