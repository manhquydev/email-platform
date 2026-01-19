/**
 * Hook for visibility rules data and actions
 * Handles CRUD operations, templates, and testing
 */
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import {
    getVisibilityRules,
    createVisibilityRule,
    updateVisibilityRule,
    deleteVisibilityRule,
    getVisibilityTemplates,
    applyVisibilityTemplate,
    testVisibilityRules,
    type VisibilityRule,
    type VisibilityRuleTemplate,
    type VisibilityCondition,
    type VisibilityRuleType,
    type VisibilityMatchType,
    type VisibilityTestResult,
    type VisibilityTestSummary,
} from '../../../utils/visibility-rules-api';

export interface RuleFormData {
    name: string;
    description?: string;
    ruleType: VisibilityRuleType;
    matchType: VisibilityMatchType;
    conditions: VisibilityCondition[];
    priority: number;
    isEnabled: boolean;
}

export interface UseVisibilityRulesReturn {
    rules: VisibilityRule[];
    templates: VisibilityRuleTemplate[];
    loading: boolean;
    testing: boolean;
    testResults: { results: VisibilityTestResult[]; summary: VisibilityTestSummary } | null;
    handleToggleEnabled: (rule: VisibilityRule) => Promise<void>;
    handleDelete: (rule: VisibilityRule) => Promise<void>;
    handleApplyTemplate: (templateId: string) => Promise<void>;
    handleTest: () => Promise<void>;
    handleSaveRule: (data: RuleFormData, editingRule: VisibilityRule | null) => Promise<boolean>;
    clearTestResults: () => void;
}

export function useVisibilityRules(inboxId: string): UseVisibilityRulesReturn {
    const { token } = useAuth();
    const [rules, setRules] = useState<VisibilityRule[]>([]);
    const [templates, setTemplates] = useState<VisibilityRuleTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [testing, setTesting] = useState(false);
    const [testResults, setTestResults] = useState<{ results: VisibilityTestResult[]; summary: VisibilityTestSummary } | null>(null);

    const loadRules = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [rulesData, templatesData] = await Promise.all([
                getVisibilityRules(inboxId, token),
                getVisibilityTemplates(token),
            ]);
            setRules(rulesData);
            setTemplates(templatesData);
        } catch (error) {
            console.error('[VisibilityRules] Load failed:', error);
            toast.error('Không thể tải quy tắc hiển thị');
        } finally {
            setLoading(false);
        }
    }, [inboxId, token]);

    useEffect(() => {
        loadRules();
    }, [loadRules]);

    const handleToggleEnabled = useCallback(async (rule: VisibilityRule) => {
        if (!token) return;
        try {
            await updateVisibilityRule(rule.id, { isEnabled: !rule.isEnabled }, token);
            setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isEnabled: !r.isEnabled } : r));
            toast.success(rule.isEnabled ? 'Đã tắt quy tắc' : 'Đã bật quy tắc');
        } catch (error) {
            console.error('[VisibilityRules] Toggle failed:', error);
            toast.error('Không thể cập nhật quy tắc');
        }
    }, [token]);

    const handleDelete = useCallback(async (rule: VisibilityRule) => {
        if (!token) return;
        if (!confirm(`Xóa quy tắc "${rule.name}"?`)) return;
        try {
            await deleteVisibilityRule(rule.id, token);
            setRules(prev => prev.filter(r => r.id !== rule.id));
            toast.success('Đã xóa quy tắc');
        } catch (error) {
            console.error('[VisibilityRules] Delete failed:', error);
            toast.error('Không thể xóa quy tắc');
        }
    }, [token]);

    const handleApplyTemplate = useCallback(async (templateId: string) => {
        if (!token) return;
        try {
            const newRule = await applyVisibilityTemplate(inboxId, templateId, undefined, token);
            setRules(prev => [...prev, newRule]);
            toast.success('Đã áp dụng mẫu');
        } catch (error) {
            console.error('[VisibilityRules] Apply template failed:', error);
            toast.error('Không thể áp dụng mẫu');
        }
    }, [inboxId, token]);

    const handleTest = useCallback(async () => {
        if (!token) return;
        setTesting(true);
        try {
            const results = await testVisibilityRules(inboxId, { limit: 20 }, token);
            setTestResults(results);
        } catch (error) {
            console.error('[VisibilityRules] Test failed:', error);
            toast.error('Không thể kiểm tra quy tắc');
        } finally {
            setTesting(false);
        }
    }, [inboxId, token]);

    const handleSaveRule = useCallback(async (data: RuleFormData, editingRule: VisibilityRule | null): Promise<boolean> => {
        if (!token) return false;
        try {
            if (editingRule) {
                const updated = await updateVisibilityRule(editingRule.id, data, token);
                setRules(prev => prev.map(r => r.id === editingRule.id ? updated : r));
                toast.success('Đã cập nhật quy tắc');
            } else {
                const created = await createVisibilityRule(inboxId, data, token);
                setRules(prev => [...prev, created]);
                toast.success('Đã tạo quy tắc');
            }
            return true;
        } catch (error) {
            console.error('[VisibilityRules] Save failed:', error);
            toast.error('Không thể lưu quy tắc');
            return false;
        }
    }, [inboxId, token]);

    const clearTestResults = useCallback(() => {
        setTestResults(null);
    }, []);

    return {
        rules,
        templates,
        loading,
        testing,
        testResults,
        handleToggleEnabled,
        handleDelete,
        handleApplyTemplate,
        handleTest,
        handleSaveRule,
        clearTestResults,
    };
}
