/**
 * Visibility Rules Panel component
 * Modal for managing inbox visibility rules
 * Refactored to use modular hooks and components
 */
import { useState } from 'react';
import { GlassCard } from './ui/GlassCard';
import type { VisibilityRule } from '../utils/visibility-rules-api';

// Import modular components
import {
    useVisibilityRules,
    VisibilityRulesList,
    RuleEditorModal,
    TestResultsModal,
    TemplatesQuickApply,
} from './visibility-rules-modules';

interface VisibilityRulesPanelProps {
    inboxId: string;
    inboxEmail: string;
    onClose: () => void;
}

export function VisibilityRulesPanel({ inboxId, inboxEmail, onClose }: VisibilityRulesPanelProps) {
    const [showEditor, setShowEditor] = useState(false);
    const [editingRule, setEditingRule] = useState<VisibilityRule | null>(null);

    // Use modular hook
    const {
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
    } = useVisibilityRules(inboxId);

    const onSaveRule = async (data: Parameters<typeof handleSaveRule>[0]) => {
        const success = await handleSaveRule(data, editingRule);
        if (success) {
            setShowEditor(false);
            setEditingRule(null);
        }
        return success;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <GlassCard className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div>
                        <h2 className="text-lg font-bold text-text-main">Quy tắc hiển thị</h2>
                        <p className="text-xs text-text-secondary">{inboxEmail}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleTest}
                            disabled={testing || rules.length === 0}
                            className="px-3 py-1.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                        >
                            {testing ? 'Đang kiểm tra...' : 'Kiểm tra quy tắc'}
                        </button>
                        <button
                            onClick={() => { setEditingRule(null); setShowEditor(true); }}
                            className="px-3 py-1.5 text-xs font-medium bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
                        >
                            + Thêm quy tắc
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg text-text-secondary"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Templates Quick Apply */}
                <TemplatesQuickApply templates={templates} onApply={handleApplyTemplate} />

                {/* Rules List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <VisibilityRulesList
                        rules={rules}
                        loading={loading}
                        onToggle={handleToggleEnabled}
                        onEdit={(rule) => { setEditingRule(rule); setShowEditor(true); }}
                        onDelete={handleDelete}
                    />
                </div>

                {/* Rule Editor Modal */}
                {showEditor && (
                    <RuleEditorModal
                        rule={editingRule}
                        onSave={onSaveRule}
                        onClose={() => { setShowEditor(false); setEditingRule(null); }}
                    />
                )}

                {/* Test Results Modal */}
                {testResults && (
                    <TestResultsModal
                        results={testResults}
                        onClose={clearTestResults}
                    />
                )}
            </GlassCard>
        </div>
    );
}
