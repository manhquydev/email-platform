/**
 * Visibility Rules List component
 * Displays rules with toggle, edit, and delete actions
 */
import { cn } from '../../utils/cn';
import {
    RULE_TYPE_INFO,
    FIELD_LABELS,
    OPERATOR_LABELS,
    type VisibilityRule,
} from '../../utils/visibility-rules-api';

interface VisibilityRulesListProps {
    rules: VisibilityRule[];
    loading: boolean;
    onToggle: (rule: VisibilityRule) => void;
    onEdit: (rule: VisibilityRule) => void;
    onDelete: (rule: VisibilityRule) => void;
}

export function VisibilityRulesList({ rules, loading, onToggle, onEdit, onDelete }: VisibilityRulesListProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (rules.length === 0) {
        return (
            <div className="text-center py-12 text-text-secondary">
                <p className="mb-4">Chưa có quy tắc hiển thị nào</p>
                <p className="text-xs">Thêm quy tắc để kiểm soát email nào được hiển thị công khai</p>
            </div>
        );
    }

    return (
        <>
            {rules.map(rule => (
                <div
                    key={rule.id}
                    className={cn(
                        "p-4 rounded-xl border transition-all",
                        rule.isEnabled
                            ? "bg-surface/50 border-white/10"
                            : "bg-surface/20 border-white/5 opacity-60"
                    )}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{RULE_TYPE_INFO[rule.ruleType].icon}</span>
                                <h3 className="font-semibold text-text-main truncate">{rule.name}</h3>
                                <span className={cn(
                                    "px-2 py-0.5 text-[10px] rounded-full font-medium",
                                    rule.ruleType === 'HIDE' && "bg-red-500/20 text-red-400",
                                    rule.ruleType === 'SHOW_ONLY' && "bg-green-500/20 text-green-400",
                                    rule.ruleType === 'WARN' && "bg-yellow-500/20 text-yellow-400",
                                    rule.ruleType === 'REDACT' && "bg-purple-500/20 text-purple-400",
                                )}>
                                    {RULE_TYPE_INFO[rule.ruleType].label}
                                </span>
                            </div>
                            {rule.description && (
                                <p className="text-xs text-text-secondary mb-2">{rule.description}</p>
                            )}
                            <div className="flex flex-wrap gap-1">
                                {rule.conditions.slice(0, 3).map((c, i) => (
                                    <span key={i} className="px-2 py-0.5 text-[10px] bg-white/5 rounded text-text-secondary">
                                        {FIELD_LABELS[c.field]} {OPERATOR_LABELS[c.operator].toLowerCase()} "{c.value.slice(0, 20)}"
                                    </span>
                                ))}
                                {rule.conditions.length > 3 && (
                                    <span className="px-2 py-0.5 text-[10px] bg-white/5 rounded text-text-secondary">
                                        +{rule.conditions.length - 3} more
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Toggle Switch */}
                            <button
                                onClick={() => onToggle(rule)}
                                className={cn(
                                    "w-10 h-5 rounded-full transition-colors relative",
                                    rule.isEnabled ? "bg-green-500" : "bg-gray-600"
                                )}
                            >
                                <span className={cn(
                                    "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform",
                                    rule.isEnabled ? "left-5" : "left-0.5"
                                )} />
                            </button>
                            {/* Edit */}
                            <button
                                onClick={() => onEdit(rule)}
                                className="p-1.5 hover:bg-white/10 rounded text-text-secondary"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                            {/* Delete */}
                            <button
                                onClick={() => onDelete(rule)}
                                className="p-1.5 hover:bg-red-500/20 rounded text-red-400"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}
