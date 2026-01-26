/**
 * PhishingWarning - Display security warning for suspicious emails
 * Shows threat level with expandable details and report option
 */
import { useState } from 'react';
import { cn } from '../../utils/cn';

export interface PhishingWarningProps {
    /** Threat level */
    level: 'low' | 'medium' | 'high';
    /** Reasons for the warning */
    reasons: string[];
    /** Callback when dismissed */
    onDismiss?: () => void;
    /** Callback to report false positive */
    onReportFalsePositive?: () => void;
    /** Additional class names */
    className?: string;
}

const levelConfig = {
    low: {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400',
        icon: 'info',
        label: 'Cảnh báo nhẹ',
    },
    medium: {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        text: 'text-orange-400',
        icon: 'warning',
        label: 'Đáng ngờ',
    },
    high: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        icon: 'gpp_bad',
        label: 'Nguy hiểm cao',
    },
};

export function PhishingWarning({
    level,
    reasons,
    onDismiss,
    onReportFalsePositive,
    className,
}: PhishingWarningProps) {
    const [expanded, setExpanded] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const config = levelConfig[level];

    if (dismissed) return null;

    const handleDismiss = () => {
        setDismissed(true);
        onDismiss?.();
    };

    return (
        <div
            className={cn(
                'rounded-xl border-2 p-4 mb-4 transition-all',
                config.bg,
                config.border,
                className
            )}
            role="alert"
            aria-live="polite"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className={cn('material-symbols-outlined !text-[24px]', config.text)}>
                        {config.icon}
                    </span>
                    <div>
                        <span className={cn('font-semibold text-sm', config.text)}>
                            {config.label}
                        </span>
                        <p className="text-xs text-[var(--nebula-text-secondary)]">
                            Email này có dấu hiệu lừa đảo
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Expand/collapse button */}
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        aria-expanded={expanded}
                        aria-label={expanded ? 'Thu gọn chi tiết' : 'Xem chi tiết'}
                    >
                        <span className="material-symbols-outlined !text-[18px] text-[var(--nebula-text-secondary)]">
                            {expanded ? 'expand_less' : 'expand_more'}
                        </span>
                    </button>

                    {/* Dismiss button */}
                    {onDismiss && (
                        <button
                            onClick={handleDismiss}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Đóng cảnh báo"
                        >
                            <span className="material-symbols-outlined !text-[18px] text-[var(--nebula-text-secondary)]">
                                close
                            </span>
                        </button>
                    )}
                </div>
            </div>

            {/* Expandable details */}
            {expanded && reasons.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs font-medium text-[var(--nebula-text-secondary)] mb-2">
                        Lý do cảnh báo:
                    </p>
                    <ul className="space-y-1">
                        {reasons.map((reason, index) => (
                            <li
                                key={index}
                                className="flex items-start gap-2 text-sm text-[var(--nebula-text-secondary)]"
                            >
                                <span className="material-symbols-outlined !text-[14px] mt-0.5 text-[var(--nebula-text-muted)]">
                                    arrow_right
                                </span>
                                {reason}
                            </li>
                        ))}
                    </ul>

                    {/* Report false positive */}
                    {onReportFalsePositive && (
                        <button
                            onClick={onReportFalsePositive}
                            className="mt-4 text-xs text-[var(--nebula-text-secondary)] hover:text-white underline underline-offset-2 transition-colors"
                        >
                            Báo cáo nhầm lẫn
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default PhishingWarning;
