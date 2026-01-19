/**
 * Types, constants and utilities for ForwardingConditionBuilder
 */
import type { ForwardCondition, ForwardConditionField, ForwardConditionOperator } from "../../../types";

export interface ForwardingConditionBuilderProps {
    conditions: ForwardCondition[];
    matchType: 'ALL' | 'ANY';
    onChange: (conditions: ForwardCondition[]) => void;
    onMatchTypeChange: (matchType: 'ALL' | 'ANY') => void;
}

/** Available field options for conditions */
export const FIELD_OPTIONS: { value: ForwardConditionField; label: string }[] = [
    { value: 'FROM', label: 'Người gửi' },
    { value: 'TO', label: 'Người nhận' },
    { value: 'SUBJECT', label: 'Tiêu đề' },
    { value: 'BODY', label: 'Nội dung' },
    { value: 'HEADER', label: 'Header tùy chỉnh' },
    { value: 'HAS_ATTACHMENT', label: 'Có đính kèm' },
];

/** Available operator options with field compatibility */
export const OPERATOR_OPTIONS: { value: ForwardConditionOperator; label: string; forFields: ForwardConditionField[] }[] = [
    { value: 'CONTAINS', label: 'Chứa', forFields: ['FROM', 'TO', 'SUBJECT', 'BODY', 'HEADER'] },
    { value: 'NOT_CONTAINS', label: 'Không chứa', forFields: ['FROM', 'TO', 'SUBJECT', 'BODY', 'HEADER'] },
    { value: 'EQUALS', label: 'Bằng', forFields: ['FROM', 'TO', 'SUBJECT', 'HEADER'] },
    { value: 'STARTS_WITH', label: 'Bắt đầu với', forFields: ['FROM', 'TO', 'SUBJECT'] },
    { value: 'ENDS_WITH', label: 'Kết thúc với', forFields: ['FROM', 'TO', 'SUBJECT'] },
    { value: 'REGEX', label: 'Regex', forFields: ['FROM', 'TO', 'SUBJECT', 'BODY'] },
    { value: 'CONTAINS_OTP', label: 'Chứa mã OTP', forFields: ['BODY', 'SUBJECT'] },
    { value: 'EXISTS', label: 'Tồn tại', forFields: ['HAS_ATTACHMENT', 'HEADER'] },
];

/** Get valid operators for a specific field */
export const getOperatorsForField = (field: ForwardConditionField) => {
    return OPERATOR_OPTIONS.filter(op => op.forFields.includes(field));
};

/** Create a new default condition */
export const createDefaultCondition = (): ForwardCondition => ({
    field: 'FROM',
    operator: 'CONTAINS',
    value: '',
    caseSensitive: false,
});

/** Update condition with field change logic */
export const updateConditionWithFieldLogic = (
    condition: ForwardCondition,
    updates: Partial<ForwardCondition>
): ForwardCondition => {
    const updated = { ...condition, ...updates };

    // Reset operator if field changes
    if (updates.field) {
        const validOps = getOperatorsForField(updates.field);
        if (!validOps.find(op => op.value === updated.operator)) {
            updated.operator = validOps[0]?.value || 'CONTAINS';
        }
        // Reset value for special fields
        if (updates.field === 'HAS_ATTACHMENT') {
            updated.value = 'true';
            updated.operator = 'EXISTS';
        }
    }

    return updated;
};
