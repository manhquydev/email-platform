/**
 * FilterChips - Predefined filter chips for quick search filtering
 */

import { cn } from '../../utils/cn';
import { DEFAULT_FILTERS, type SearchFilter } from './filterUtils';

interface FilterChipsProps {
    /** Currently active filter IDs */
    activeFilters: Set<string>;
    /** Toggle a filter on/off */
    onToggleFilter: (filterId: string) => void;
    /** Custom filters to show */
    filters?: SearchFilter[];
    /** Additional class names */
    className?: string;
}

// Filter icons - defined separately to keep filterUtils.ts framework-agnostic
const FILTER_ICONS: Record<string, React.ReactNode> = {
    'has-attachment': (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
    ),
    'unread': (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
    ),
    'this-week': (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    ),
    'has-otp': (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
    ),
};

export function FilterChips({
    activeFilters,
    onToggleFilter,
    filters = DEFAULT_FILTERS,
    className,
}: FilterChipsProps) {
    return (
        <div className={cn('flex flex-wrap gap-2', className)}>
            {filters.map((filter) => {
                const isActive = activeFilters.has(filter.id);
                const icon = FILTER_ICONS[filter.id];

                return (
                    <button
                        key={filter.id}
                        onClick={() => onToggleFilter(filter.id)}
                        className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                            'border',
                            isActive
                                ? 'bg-primary/20 border-primary/40 text-primary'
                                : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20 hover:text-text-main'
                        )}
                        aria-pressed={isActive}
                    >
                        {icon}
                        <span>{filter.label}</span>
                        {isActive && (
                            <svg className="w-3 h-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
