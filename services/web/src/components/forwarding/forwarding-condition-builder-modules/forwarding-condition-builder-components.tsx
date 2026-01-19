/**
 * UI components for ForwardingConditionBuilder
 */
import type { ForwardCondition, ForwardConditionField, ForwardConditionOperator } from "../../../types";
import { FIELD_OPTIONS, getOperatorsForField } from "./forwarding-condition-builder-utils";

/** Match type selector (ALL/ANY) */
interface MatchTypeSelectorProps {
    matchType: 'ALL' | 'ANY';
    onMatchTypeChange: (type: 'ALL' | 'ANY') => void;
}

export function MatchTypeSelector({ matchType, onMatchTypeChange }: MatchTypeSelectorProps) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: 'var(--nebula-text-muted)' }}>Khớp:</span>
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--nebula-border)' }}>
                {(['ALL', 'ANY'] as const).map((type) => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => onMatchTypeChange(type)}
                        className={`px-3 py-1.5 text-sm transition-colors ${matchType === type ? 'font-medium' : ''}`}
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
    );
}

/** Single condition row */
interface ConditionRowProps {
    condition: ForwardCondition;
    onUpdate: (updates: Partial<ForwardCondition>) => void;
    onRemove: () => void;
}

export function ConditionRow({ condition, onUpdate, onRemove }: ConditionRowProps) {
    return (
        <div
            className="p-3 rounded-xl flex flex-wrap gap-2 items-center"
            style={{ background: 'var(--nebula-elevated)', border: '1px solid var(--nebula-border)' }}
        >
            {/* Field Selector */}
            <select
                value={condition.field}
                onChange={(e) => onUpdate({ field: e.target.value as ForwardConditionField })}
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
                    onChange={(e) => onUpdate({ headerName: e.target.value })}
                    placeholder="Header name"
                    className="input-nebula text-sm"
                    style={{ width: '120px' }}
                />
            )}

            {/* Operator Selector */}
            <select
                value={condition.operator}
                onChange={(e) => onUpdate({ operator: e.target.value as ForwardConditionOperator })}
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
                    onChange={(e) => onUpdate({ value: e.target.value })}
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
                        onChange={(e) => onUpdate({ caseSensitive: e.target.checked })}
                        className="rounded"
                        style={{ accentColor: 'var(--nebula-violet)' }}
                    />
                    <span className="text-xs" style={{ color: 'var(--nebula-text-muted)' }}>Aa</span>
                </label>
            )}

            {/* Remove Button */}
            <button
                type="button"
                onClick={onRemove}
                className="p-1.5 rounded-lg hover:bg-[var(--nebula-border)] transition-colors"
                style={{ color: 'var(--nebula-error)' }}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

/** Add condition button */
export function AddConditionButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: 'var(--nebula-violet)' }}
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Thêm điều kiện
        </button>
    );
}

/** Empty conditions hint */
export function EmptyConditionsHint() {
    return (
        <div className="text-sm p-3 rounded-lg" style={{ background: 'var(--nebula-glow-cyan)', color: 'var(--nebula-cyan)' }}>
            💡 Không có điều kiện = chuyển tiếp tất cả email đến inbox
        </div>
    );
}
