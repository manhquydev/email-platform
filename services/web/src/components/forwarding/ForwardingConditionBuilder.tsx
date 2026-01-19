/**
 * ForwardingConditionBuilder - Build conditions for forwarding rules
 * Modules extracted to forwarding-condition-builder-modules/
 */
import type { ForwardCondition } from "../../types";
import {
    type ForwardingConditionBuilderProps,
    createDefaultCondition,
    updateConditionWithFieldLogic,
    MatchTypeSelector,
    ConditionRow,
    AddConditionButton,
    EmptyConditionsHint
} from "./forwarding-condition-builder-modules";

export function ForwardingConditionBuilder({
    conditions,
    matchType,
    onChange,
    onMatchTypeChange,
}: ForwardingConditionBuilderProps) {
    const addCondition = () => {
        onChange([...conditions, createDefaultCondition()]);
    };

    const removeCondition = (index: number) => {
        const updated = [...conditions];
        updated.splice(index, 1);
        onChange(updated);
    };

    const updateCondition = (index: number, updates: Partial<ForwardCondition>) => {
        const updated = [...conditions];
        updated[index] = updateConditionWithFieldLogic(updated[index], updates);
        onChange(updated);
    };

    return (
        <div className="space-y-4">
            {/* Match Type Selector */}
            {conditions.length > 1 && (
                <MatchTypeSelector matchType={matchType} onMatchTypeChange={onMatchTypeChange} />
            )}

            {/* Conditions List */}
            <div className="space-y-2">
                {conditions.map((condition, index) => (
                    <ConditionRow
                        key={index}
                        condition={condition}
                        onUpdate={(updates) => updateCondition(index, updates)}
                        onRemove={() => removeCondition(index)}
                    />
                ))}
            </div>

            {/* Add Condition Button */}
            <AddConditionButton onClick={addCondition} />

            {/* No conditions hint */}
            {conditions.length === 0 && <EmptyConditionsHint />}
        </div>
    );
}
