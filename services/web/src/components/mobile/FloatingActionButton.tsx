/**
 * FloatingActionButton (FAB) - Primary action button for mobile
 * Positioned above bottom tab bar, touch-friendly
 */

import { cn } from '../../utils/cn';
import { haptic } from '../../hooks/useHaptic';

interface FloatingActionButtonProps {
    onClick: () => void;
    icon?: React.ReactNode;
    label?: string;
    className?: string;
    /** Hide FAB (e.g., during scroll) */
    hidden?: boolean;
}

/** Default plus icon for create actions */
function PlusIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
            />
        </svg>
    );
}

export function FloatingActionButton({
    onClick,
    icon,
    label = "Create",
    className,
    hidden = false
}: FloatingActionButtonProps) {
    const handleClick = () => {
        haptic('medium');
        onClick();
    };

    return (
        <button
            onClick={handleClick}
            className={cn(
                "fixed right-4 z-40",
                "bottom-20", // Above bottom tab bar (64px + 16px)
                "w-14 h-14 rounded-full",
                "bg-v3-accent-primary text-black",
                "shadow-lg shadow-v3-accent-primary/25",
                "flex items-center justify-center",
                "active:scale-95 transition-all duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-v3-accent-primary focus-visible:ring-offset-2",
                hidden && "translate-y-24 opacity-0 pointer-events-none",
                className
            )}
            aria-label={label}
        >
            {icon || <PlusIcon className="w-6 h-6" />}
        </button>
    );
}
