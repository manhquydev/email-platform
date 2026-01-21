/**
 * BottomTabItem - Individual tab item for bottom navigation
 * Touch-friendly with 48px minimum target, badge support
 */

import { cn } from '../../utils/cn';
import { haptic } from '../../hooks/useHaptic';

export interface BottomTabItemProps {
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    isActive: boolean;
    onClick: () => void;
}

export function BottomTabItem({
    label,
    icon,
    badge,
    isActive,
    onClick
}: BottomTabItemProps) {
    const handleClick = () => {
        haptic('selection');
        onClick();
    };

    return (
        <button
            onClick={handleClick}
            className={cn(
                "flex flex-col items-center justify-center",
                "min-w-[64px] min-h-[48px] px-3 py-2",
                "transition-colors duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-v3-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-v3-bg-elevated",
                isActive
                    ? "text-v3-accent-primary"
                    : "text-v3-text-muted hover:text-v3-text-secondary"
            )}
            aria-current={isActive ? 'page' : undefined}
        >
            <div className="relative">
                {icon}
                {badge !== undefined && badge > 0 && (
                    <span
                        className={cn(
                            "absolute -top-1.5 -right-2",
                            "bg-v3-accent-error text-white",
                            "text-[10px] font-medium",
                            "rounded-full min-w-[16px] h-4",
                            "flex items-center justify-center px-1"
                        )}
                        aria-label={`${badge} unread`}
                    >
                        {badge > 99 ? '99+' : badge}
                    </span>
                )}
            </div>
            <span className="text-[10px] mt-1 font-medium leading-tight">
                {label}
            </span>
        </button>
    );
}
