/**
 * ForwardingConditionBuilder - Build conditions for forwarding rules
 * Supports multiple fields, operators, and OTP detection
 */

import type { ForwardCondition, ForwardConditionField, ForwardConditionOperator } from "../../types";

interface ForwardingConditionBuilderProps {
    conditions: ForwardCondition[];
    matchType: 'ALL' | 'ANY';
    onChange: (conditions: ForwardCondition[]) => void;
    onMatchTypeChange: (matchType: 'ALL' | 'ANY') => void;
}

const FIELD_OPTIONS: { value: ForwardConditionField; label: string }[] = [
    { value: 'FROM', label: 'Người gửi' },
    { value: 'TO', label: 'Người nhận' },
    { value: 'SUBJECT', label: 'Tiêu đề' },
    { value: 'BODY', label: 'Nội dung' },
    { value: 'HEADER', label: 'Header tùy chỉnh' },
    { value: 'HAS_ATTACHMENT', label: 'Có đính kèm' },
];

const OPERATOR_OPTIONS: { value: ForwardConditionOperator; label: string; forFields: ForwardConditionField[] }[] = [
    { value: 'CONTAINS', label: 'Chứa', forFields: ['FROM', 'TO', 'SUBJECT', 'BODY', 'HEADER'] },
    { value: 'NOT_CONTAINS', label: 'Không chứa', forFields: ['FROM', 'TO', 'SUBJECT', 'BODY', 'HEADER'] },
    { value: 'EQUALS', label: 'Bằng', forFields: ['FROM', 'TO', 'SUBJECT', 'HEADER'] },
    { value: 'STARTS_WITH', label: 'Bắt đầu với', forFields: ['FROM', 'TO', 'SUBJECT'] },
    { value: 'ENDS_WITH', label: 'Kết thúc với', forFields: ['FROM', 'TO', 'SUBJECT'] },
    { value: 'REGEX', label: 'Regex', forFields: ['FROM', 'TO', 'SUBJECT', 'BODY'] },
    { value: 'CONTAINS_OTP', label: 'Chứa mã OTP', forFields: ['BODY', 'SUBJECT'] },
    { value: 'EXISTS', label: 'Tồn tại', forFields: ['HAS_ATTACHMENT', 'HEADER'] },
];

const getOperatorsForField = (field: ForwardConditionField) => {
    return OPERATOR_OPTIONS.filter(op => op.forFields.includes(field));
};

export function ForwardingConditionBuilder({
    conditions,
    matchType,
    onChange,
    onMatchTypeChange,
}: ForwardingConditionBuilderProps) {
    const addCondition = () => {
        onChange([
            ...conditions,
            {
                field: 'FROM',
                operator: 'CONTAINS',
                value: '',
                caseSensitive: false,
            },
        ]);
    };

    const removeCondition = (index: number) => {
        const updated = [...conditions];
        updated.splice(index, 1);
        onChange(updated);
    };

    const updateCondition = (index: number, updates: Partial<ForwardCondition>) => {
        const updated = [...conditions];
        updated[index] = { ...updated[index], ...updates };

        // Reset operator if field changes
        if (updates.field) {
            const validOps = getOperatorsForField(updates.field);
            if (!validOps.find(op => op.value === updated[index].operator)) {
                updated[index].operator = validOps[0]?.value || 'CONTAINS';
            }
            // Reset value for special fields
            if (updates.field === 'HAS_ATTACHMENT') {
                updated[index].value = 'true';
                updated[index].operator = 'EXISTS';
            }
        }

        onChange(updated);
    };

    return (
        <div className="space-y-4">
            {/* Match Type Selector */}
            {conditions.length > 1 && (
                <div className="flex items-center gap-3">
                    <span className="text-sm" style={{ color: 'var(--nebula-text-muted)' }}>Khớp:</span>
                    <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--nebula-border)' }}>
                        {(['ALL', 'ANY'] as const).map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => onMatchTypeChange(type)}
                                className={`px-3 py-1.5 text-sm transition-colors ${
                                    matchType === type ? 'font-medium' : ''
                                }`}
                                style={{
                                    background: matchType === type ? 'var(--nebula-violet)' : 'transparent',
                                    color: matchType === type ? 'white' : 'var(--nebula-text)',
                                }}
                            >
                                {type === 'ALL' ? 'Tất cả' : 'Bất kỳ'}
                            </button>
                        ))}
                    </div>
                    <span className="text-xs" style={{ color: 'var(--nebula-text-muted)' }}>
                        ({matchType === 'ALL' ? 'AND - phải khớp tất cả' : 'OR - chỉ cần khớp 1'})
                    </span>
                </div>
            )}

            {/* Conditions List */}
            <div className="space-y-2">
                {conditions.map((condition, index) => (
                    <div
                        key={index}
                        className="p-3 rounded-xl flex flex-wrap gap-2 items-center"
                        style={{ background: 'var(--nebula-elevated)', border: '1px solid var(--nebula-border)' }}
                    >
                        {/* Field Selector */}
                        <select
                            value={condition.field}
                            onChange={(e) => updateCondition(index, { field: e.target.value as ForwardConditionField })}
                            className="input-nebula text-sm flex-shrink-0"
                            style={{ width: 'auto', minWidth: '120px' }}
                        >
                            {FIELD_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>

                        {/* Header Name Input (only for HEADER field) */}
                        {condition.field === 'HEADER' && (
                            <input
                                type="text"
                                value={condition.headerName || ''}
                                onChange={(e) => updateCondition(index, { headerName: e.target.value })}
                                placeholder="Header name"
                                className="input-nebula text-sm"
                                style={{ width: '120px' }}
                            />
                        )}

                        {/* Operator Selector */}
                        <select
                            value={condition.operator}
                            onChange={(e) => updateCondition(index, { operator: e.target.value as ForwardConditionOperator })}
                            className="input-nebula text-sm flex-shrink-0"
                            style={{ width: 'auto', minWidth: '130px' }}
                        >
                            {getOperatorsForField(condition.field).map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>

                        {/* Value Input (not for HAS_ATTACHMENT or CONTAINS_OTP) */}
                        {condition.field !== 'HAS_ATTACHMENT' && condition.operator !== 'CONTAINS_OTP' && (
                            <input
                                type="text"
                                value={condition.value || ''}
                                onChange={(e) => updateCondition(index, { value: e.target.value })}
                                placeholder={condition.operator === 'REGEX' ? 'Regex pattern...' : 'Giá trị...'}
                                className="input-nebula text-sm flex-1"
                                style={{ minWidth: '150px' }}
                            />
                        )}

                        {/* OTP indicator */}
                        {condition.operator === 'CONTAINS_OTP' && (
                            <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--nebula-glow-violet)', color: 'var(--nebula-violet)' }}>
                                🔢 Tự động phát hiện OTP
                            </span>
                        )}

                        {/* Case Sensitive Toggle */}
                        {condition.field !== 'HAS_ATTACHMENT' && condition.operator !== 'CONTAINS_OTP' && (
                            <label className="flex items-center gap-1 cursor-pointer" title="Phân biệt hoa thường">
                                <input
                                    type="checkbox"
                                    checked={condition.caseSensitive || false}
                                    onChange={(e) => updateCondition(index, { caseSensitive: e.target.checked })}
                                    className="rounded"
                                    style={{ accentColor: 'var(--nebula-violet)' }}
                                />
                                <span className="text-xs" style={{ color: 'var(--nebula-text-muted)' }}>Aa</span>
                            </label>
                        )}

                        {/* Remove Button */}
                        <button
                            type="button"
                            onClick={() => removeCondition(index)}
                            className="p-1.5 rounded-lg hover:bg-[var(--nebula-border)] transition-colors"
                            style={{ color: 'var(--nebula-error)' }}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>

            {/* Add Condition Button */}
            <button
                type="button"
                onClick={addCondition}
                className="flex items-center gap-1 text-sm font-medium"
                style={{ color: 'var(--nebula-violet)' }}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Thêm điều kiện
            </button>

            {/* No conditions hint */}
            {conditions.length === 0 && (
                <div className="text-sm p-3 rounded-lg" style={{ background: 'var(--nebula-glow-cyan)', color: 'var(--nebula-cyan)' }}>
                    💡 Không có điều kiện = chuyển tiếp tất cả email đến inbox
                </div>
            )}
        </div>
    );
}
