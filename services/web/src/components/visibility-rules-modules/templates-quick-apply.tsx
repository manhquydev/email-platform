/**
 * Templates Quick Apply component
 * Displays template buttons for quick rule creation
 */
import type { VisibilityRuleTemplate } from '../../utils/visibility-rules-api';

interface TemplatesQuickApplyProps {
    templates: VisibilityRuleTemplate[];
    onApply: (templateId: string) => void;
}

export function TemplatesQuickApply({ templates, onApply }: TemplatesQuickApplyProps) {
    if (templates.length === 0) return null;

    return (
        <div className="p-4 border-b border-white/5 bg-surface/30">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-text-secondary">Mẫu nhanh:</span>
                {templates.slice(0, 5).map(t => (
                    <button
                        key={t.id}
                        onClick={() => onApply(t.id)}
                        className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded border border-white/10 text-text-main transition-colors"
                    >
                        {t.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
