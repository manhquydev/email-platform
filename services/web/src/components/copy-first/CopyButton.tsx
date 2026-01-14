/**
 * CopyButton - Animated copy button with checkmark feedback
 * Shows clipboard icon, transforms to checkmark on successful copy
 */

import { cn } from '../../utils/cn';
import { useCopyToClipboard, type CopyStatus } from '../../hooks/useCopyToClipboard';

interface CopyButtonProps {
    /** Text to copy */
    text: string;
    /** Optional custom label */
    label?: string;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Visual variant */
    variant?: 'default' | 'primary' | 'ghost';
    /** Additional class names */
    className?: string;
    /** Show toast notification */
    showToast?: boolean;
    /** Custom success message */
    successMessage?: string;
    /** Callback on copy */
    onCopy?: () => void;
    /** Accessible label */
    ariaLabel?: string;
}

const sizeClasses = {
    sm: 'p-1 text-xs',
    md: 'p-1.5 text-sm',
    lg: 'p-2 text-base',
};

const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
};

const variantClasses = {
    default: 'text-text-secondary hover:text-primary hover:bg-primary/10',
    primary: 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20',
    ghost: 'text-text-secondary hover:text-text-main hover:bg-white/5',
};

export function CopyButton({
    text,
    label,
    size = 'md',
    variant = 'default',
    className,
    showToast = true,
    successMessage,
    onCopy,
    ariaLabel = 'Copy to clipboard',
}: CopyButtonProps) {
    const { copy, status } = useCopyToClipboard({
        showToast,
        successMessage,
    });

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const success = await copy(text, successMessage);
        if (success) {
            onCopy?.();
        }
    };

    return (
        <button
            onClick={handleClick}
            className={cn(
                'inline-flex items-center gap-1.5 rounded-lg transition-all duration-200',
                sizeClasses[size],
                variantClasses[variant],
                status === 'copied' && 'text-green-400 bg-green-500/10',
                status === 'error' && 'text-red-400 bg-red-500/10',
                className
            )}
            title={status === 'copied' ? 'Đã copy!' : ariaLabel}
            aria-label={ariaLabel}
        >
            <CopyIcon status={status} className={iconSizes[size]} />
            {label && <span>{status === 'copied' ? 'Đã copy!' : label}</span>}
        </button>
    );
}

/** Animated icon that morphs between clipboard and checkmark */
function CopyIcon({ status, className }: { status: CopyStatus; className?: string }) {
    if (status === 'copied') {
        return (
            <svg
                className={cn(className, 'animate-[scale_0.2s_ease-out]')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                />
            </svg>
        );
    }

    if (status === 'error') {
        return (
            <svg
                className={className}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                />
            </svg>
        );
    }

    // Default clipboard icon
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
        >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
    );
}
