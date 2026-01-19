/**
 * Rule Editor Modal component
 * Form for creating/editing visibility rules
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { GlassCard } from '../ui/GlassCard';
import {
    FIELD_LABELS,
    OPERATOR_LABELS,
    getOperatorsForField,
    type VisibilityRule,
    type VisibilityCondition,
    type VisibilityRuleType,
    type VisibilityMatchType,
} from '../../utils/visibility-rules-api';
import type { RuleFormData } from './hooks';

interface RuleEditorModalProps {
    rule: VisibilityRule | null;
    onSave: (data: RuleFormData) => Promise<boolean>;
    onClose: () => void;
}

export function RuleEditorModal({ rule, onSave, onClose }: RuleEditorModalProps) {
    const [name, setName] = useState(rule?.name || '');
    const [description, setDescription] = useState(rule?.description || '');
    const [ruleType, setRuleType] = useState<VisibilityRuleType>(rule?.ruleType || 'HIDE');
    const [matchType, setMatchType] = useState<VisibilityMatchType>(rule?.matchType || 'ALL');
    const [conditions, setConditions] = useState<VisibilityCondition[]>(
        rule?.conditions || [{ field: 'FROM', operator: 'CONTAINS', value: '' }]
    );
    const [priority, setPriority] = useState(rule?.priority ?? 50);
    const [isEnabled, setIsEnabled] = useState(rule?.isEnabled ?? true);
    const [saving, setSaving] = useState(false);

    const addCondition = () => {
        setConditions([...conditions, { field: 'FROM', operator: 'CONTAINS', value: '' }]);
    };

    const removeCondition = (index: number) => {
        setConditions(conditions.filter((_, i) => i !== index));
    };

    const updateCondition = (index: number, updates: Partial<VisibilityCondition>) => {
        setConditions(conditions.map((c, i) => i === index ? { ...c, ...updates } : c));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || conditions.length === 0) {
            toast.error('Cần có tên và ít nhất một điều kiện');
            return;
        }
        if (conditions.some(c => !c.value.trim())) {
            toast.error('Tất cả điều kiện phải có giá trị');
            return;
        }
        setSaving(true);
        try {
            const success = await onSave({ name, description, ruleType, matchType, conditions, priority, isEnabled });
            if (success) onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
            <GlassCard className="w-full max-w-2xl my-4 flex flex-col rounded-2xl">
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
                    <div className="p-4 border-b border-white/10 shrink-0">
                        <h3 className="font-bold text-text-main">{rule ? 'Sửa quy tắc' : 'Quy tắc mới'}</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                        {/* Name */}
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">Tên quy tắc</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-3 py-2 bg-surface/50 border border-white/10 rounded-lg text-text-main placeholder-text-secondary focus:outline-none focus:border-primary"
                                placeholder="VD: Ẩn email xác minh"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">Mô tả (tùy chọn)</label>
                            <input
                                type="text"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full px-3 py-2 bg-surface/50 border border-white/10 rounded-lg text-text-main placeholder-text-secondary focus:outline-none focus:border-primary"
                                placeholder="Quy tắc này dùng để làm gì?"
                            />
                        </div>

                        {/* Rule Type & Match Type */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1">Hành động</label>
                                <select
                                    value={ruleType}
                                    onChange={e => setRuleType(e.target.value as VisibilityRuleType)}
                                    className="w-full px-3 py-2 bg-surface/50 border border-white/10 rounded-lg text-text-main focus:outline-none focus:border-primary"
                                >
                                    <option value="HIDE">🚫 Ẩn - Không hiển thị email khớp</option>
                                    <option value="SHOW_ONLY">✅ Chỉ hiển thị - Chỉ hiển thị email khớp</option>
                                    <option value="WARN">⚠️ Cảnh báo - Hiển thị kèm cảnh báo</option>
                                    <option value="REDACT">🔒 Che giấu - Ẩn nội dung</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1">Điều kiện</label>
                                <select
                                    value={matchType}
                                    onChange={e => setMatchType(e.target.value as VisibilityMatchType)}
                                    className="w-full px-3 py-2 bg-surface/50 border border-white/10 rounded-lg text-text-main focus:outline-none focus:border-primary"
                                >
                                    <option value="ALL">TẤT CẢ điều kiện phải khớp</option>
                                    <option value="ANY">BẤT KỲ điều kiện nào khớp</option>
                                </select>
                            </div>
                        </div>

                        {/* Conditions */}
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-2">Điều kiện</label>
                            <div className="space-y-3">
                                {conditions.map((condition, index) => (
                                    <div key={index} className="p-3 bg-surface/30 rounded-lg space-y-2">
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={condition.field}
                                                onChange={e => {
                                                    const newField = e.target.value as VisibilityCondition['field'];
                                                    const validOps = getOperatorsForField(newField);
                                                    updateCondition(index, {
                                                        field: newField,
                                                        operator: validOps.includes(condition.operator) ? condition.operator : validOps[0] as VisibilityCondition['operator'],
                                                    });
                                                }}
                                                className="flex-1 px-2 py-1.5 bg-surface/50 border border-white/10 rounded text-sm text-text-main"
                                            >
                                                {Object.entries(FIELD_LABELS).map(([k, v]) => (
                                                    <option key={k} value={k}>{v}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={condition.operator}
                                                onChange={e => updateCondition(index, { operator: e.target.value as VisibilityCondition['operator'] })}
                                                className="flex-1 px-2 py-1.5 bg-surface/50 border border-white/10 rounded text-sm text-text-main"
                                            >
                                                {getOperatorsForField(condition.field).map(op => (
                                                    <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={condition.value}
                                                onChange={e => updateCondition(index, { value: e.target.value })}
                                                placeholder={condition.field === 'HAS_ATTACHMENT' ? 'true hoặc false' : 'Nhập giá trị để so khớp...'}
                                                className="flex-1 px-3 py-2 bg-surface/50 border border-white/10 rounded text-sm text-text-main min-w-0"
                                            />
                                            <label className="flex items-center gap-1.5 text-xs text-text-secondary whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={condition.negate || false}
                                                    onChange={e => updateCondition(index, { negate: e.target.checked })}
                                                    className="w-4 h-4"
                                                />
                                                Phủ định
                                            </label>
                                            {conditions.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeCondition(index)}
                                                    className="p-1.5 hover:bg-red-500/20 rounded text-red-400"
                                                    title="Xóa điều kiện"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={addCondition} className="mt-2 text-xs text-primary hover:underline">
                                + Thêm điều kiện
                            </button>
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">
                                Độ ưu tiên: {priority} (cao hơn = chạy trước)
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={priority}
                                onChange={e => setPriority(Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        {/* Enabled */}
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={e => setIsEnabled(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm text-text-main">Bật quy tắc này</span>
                        </label>
                    </div>

                    <div className="p-4 border-t border-white/10 flex justify-end gap-2 shrink-0">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-main">
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                        >
                            {saving ? 'Đang lưu...' : 'Lưu quy tắc'}
                        </button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
}
