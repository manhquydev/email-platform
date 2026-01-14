import React from 'react';
import {
  FIELD_LABELS,
  OPERATOR_LABELS,
  getOperatorsForField,
} from '../../utils/visibility-rules-api';
import type {
  VisibilityCondition,
  VisibilityConditionOperator
} from '../../utils/visibility-rules-api';

interface RuleConditionBuilderProps {
  conditions: VisibilityCondition[];
  onChange: (conditions: VisibilityCondition[]) => void;
}

export const RuleConditionBuilder: React.FC<RuleConditionBuilderProps> = ({
  conditions,
  onChange,
}) => {
  const handleAddCondition = () => {
    onChange([
      ...conditions,
      {
        field: 'FROM',
        operator: 'CONTAINS',
        value: '',
        negate: false,
        caseSensitive: false,
      },
    ]);
  };

  const handleRemoveCondition = (index: number) => {
    const newConditions = [...conditions];
    newConditions.splice(index, 1);
    onChange(newConditions);
  };

  const handleConditionChange = (
    index: number,
    field: keyof VisibilityCondition,
    value: string | boolean
  ) => {
    const newConditions = [...conditions];
    const condition = { ...newConditions[index], [field]: value };

    // Reset operator if field changes
    if (field === 'field') {
        const validOperators = getOperatorsForField(value as string);
        condition.operator = validOperators[0] as VisibilityConditionOperator;

        // Reset value type for special fields
        if (value === 'HAS_ATTACHMENT') {
            condition.value = 'true';
        } else if (value === 'SIZE' || value === 'SPAM_SCORE') {
            // keep value if number, else reset
            if (isNaN(parseFloat(condition.value))) condition.value = '0';
        }
    }

    newConditions[index] = condition;
    onChange(newConditions);
  };

  return (
    <div className="space-y-4">
      {conditions.map((condition, index) => (
        <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-gray-50 p-3 rounded border border-gray-200">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 w-full">
            {/* Field */}
            <div className="sm:col-span-3">
              <select
                value={condition.field}
                onChange={(e) => handleConditionChange(index, 'field', e.target.value)}
                className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                {Object.entries(FIELD_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Operator */}
            <div className="sm:col-span-3">
              <select
                value={condition.operator}
                onChange={(e) => handleConditionChange(index, 'operator', e.target.value)}
                className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                {getOperatorsForField(condition.field).map((op) => (
                  <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
                ))}
              </select>
            </div>

            {/* Value */}
            <div className="sm:col-span-4">
              {condition.field === 'HAS_ATTACHMENT' ? (
                 <select
                    value={condition.value}
                    onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                 >
                    <option value="true">Có</option>
                    <option value="false">Không</option>
                 </select>
              ) : (
                  <input
                    type={condition.field === 'SIZE' || condition.field === 'SPAM_SCORE' ? 'number' : 'text'}
                    value={condition.value}
                    onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                    placeholder={condition.field === 'HEADER' ? 'Header Value' : 'Value'}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
              )}
            </div>

            {/* Header Name (only if field is HEADER) */}
             {condition.field === 'HEADER' && (
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={condition.headerName || ''}
                    onChange={(e) => handleConditionChange(index, 'headerName', e.target.value)}
                    placeholder="Header Name"
                    className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
             )}
          </div>

          {/* Options */}
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
             <label className="flex items-center space-x-1 cursor-pointer" title="Đảo ngược điều kiện">
                <input
                    type="checkbox"
                    checked={condition.negate || false}
                    onChange={(e) => handleConditionChange(index, 'negate', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600">NOT</span>
             </label>

             {condition.field !== 'SIZE' && condition.field !== 'SPAM_SCORE' && condition.field !== 'HAS_ATTACHMENT' && (
                 <label className="flex items-center space-x-1 cursor-pointer" title="Phân biệt hoa thường">
                    <input
                        type="checkbox"
                        checked={condition.caseSensitive || false}
                        onChange={(e) => handleConditionChange(index, 'caseSensitive', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-600">Aa</span>
                 </label>
             )}

            <button
              onClick={() => handleRemoveCondition(index)}
              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
              title="Xóa điều kiện"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAddCondition}
        className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        Thêm điều kiện
      </button>
    </div>
  );
};
