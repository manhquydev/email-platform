/**
 * Hook for forwarding rules CRUD operations
 * Extracted from Forwarding.tsx for modularity
 */
import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../utils/api";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import type { ForwardingRule, ForwardCondition, ForwardDestinationType } from "../../../types";

export interface RuleFormState {
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
}

const DEFAULT_RULE_FORM: RuleFormState = {
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
};

export interface UseForwardingRulesReturn {
    // Modal state
    showRuleModal: boolean;
    editingRule: ForwardingRule | null;
    ruleForm: RuleFormState;
    ruleBusy: boolean;

    // Delete state
    ruleToDelete: ForwardingRule | null;
    isDeleting: boolean;

    // Actions
    openRuleModal: (rule?: ForwardingRule, defaultEmail?: string) => void;
    closeRuleModal: () => void;
    setRuleForm: React.Dispatch<React.SetStateAction<RuleFormState>>;
    saveRule: (onSuccess: () => void) => Promise<void>;
    toggleRule: (rule: ForwardingRule, onSuccess: () => void) => Promise<void>;
    deleteRule: (rule: ForwardingRule) => void;
    confirmDeleteRule: (onSuccess: () => void) => Promise<void>;
    cancelDeleteRule: () => void;
}

export function useForwardingRules(): UseForwardingRulesReturn {
    const { token } = useAuth();

    // Modal state
    const [showRuleModal, setShowRuleModal] = useState(false);
    const [editingRule, setEditingRule] = useState<ForwardingRule | null>(null);
    const [ruleForm, setRuleForm] = useState<RuleFormState>(DEFAULT_RULE_FORM);
    const [ruleBusy, setRuleBusy] = useState(false);

    // Delete state
    const [ruleToDelete, setRuleToDelete] = useState<ForwardingRule | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const openRuleModal = useCallback((rule?: ForwardingRule, defaultEmail?: string) => {
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
                ...DEFAULT_RULE_FORM,
                forwardTo: defaultEmail || "",
            });
        }
        setShowRuleModal(true);
    }, []);

    const closeRuleModal = useCallback(() => {
        setShowRuleModal(false);
        setEditingRule(null);
    }, []);

    const saveRule = useCallback(async (onSuccess: () => void) => {
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
            onSuccess();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setRuleBusy(false);
        }
    }, [ruleForm, editingRule, token]);

    const toggleRule = useCallback(async (rule: ForwardingRule, onSuccess: () => void) => {
        try {
            await api(`/forwarding/rules/${rule.id}`, {
                method: "PATCH",
                token,
                body: { isActive: !rule.isActive }
            });
            onSuccess();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        }
    }, [token]);

    const deleteRule = useCallback((rule: ForwardingRule) => {
        setRuleToDelete(rule);
    }, []);

    const confirmDeleteRule = useCallback(async (onSuccess: () => void) => {
        if (!ruleToDelete) return;
        setIsDeleting(true);
        try {
            await api(`/forwarding/rules/${ruleToDelete.id}`, { method: "DELETE", token });
            toast.success("Đã xóa quy tắc");
            setRuleToDelete(null);
            onSuccess();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setIsDeleting(false);
        }
    }, [ruleToDelete, token]);

    const cancelDeleteRule = useCallback(() => {
        setRuleToDelete(null);
    }, []);

    return {
        showRuleModal,
        editingRule,
        ruleForm,
        ruleBusy,
        ruleToDelete,
        isDeleting,
        openRuleModal,
        closeRuleModal,
        setRuleForm,
        saveRule,
        toggleRule,
        deleteRule,
        confirmDeleteRule,
        cancelDeleteRule
    };
}
