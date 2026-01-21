/**
 * CompactToolbar - Simplified mobile toolbar with menu trigger
 * Reduces cognitive load by moving actions to action sheet
 */

import { cn } from '../../utils/cn';
import type { FilterOption } from '../inbox-manager/hooks/use-inbox-filters';

/** Menu icon (3 vertical dots) */
function MoreVerticalIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
        </svg>
    );
}

export interface CompactToolbarProps {
    selectedCount: number;
    filterLabel: FilterOption;
    onMenuOpen: () => void;
    onFilterChange: (filter: FilterOption) => void;
}

export function CompactToolbar({
    selectedCount,
    filterLabel,
    onMenuOpen,
    onFilterChange
}: CompactToolbarProps) {
    return (
        <div className="flex items-center justify-between px-4 py-3 bg-v3-bg-elevated border-b border-v3-border-default">
            {/* Left: Menu + Selection count */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuOpen}
                    className={cn(
                        "p-2 -m-2 min-h-[48px] min-w-[48px]",
                        "flex items-center justify-center",
                        "rounded-lg transition-colors",
                        "hover:bg-v3-bg-hover active:bg-v3-bg-surface",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-v3-accent-primary"
                    )}
                    aria-label="Open actions menu"
                >
                    <MoreVerticalIcon className="w-5 h-5 text-v3-text-secondary" />
                </button>

                {selectedCount > 0 && (
                    <span className="text-sm text-v3-accent-primary font-medium animate-fade-in">
                        {selectedCount} selected
                    </span>
                )}
            </div>

            {/* Right: Quick filter */}
            <select
                value={filterLabel}
                onChange={(e) => onFilterChange(e.target.value as FilterOption)}
                className={cn(
                    "text-sm bg-v3-bg-surface text-v3-text-secondary",
                    "border border-v3-border-default rounded-lg",
                    "px-3 py-2 min-h-[40px]",
                    "focus:outline-none focus:ring-2 focus:ring-v3-accent-primary",
                    "cursor-pointer"
                )}
            >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="expiring">Expiring</option>
                <option value="expired">Expired</option>
            </select>
        </div>
    );
}
