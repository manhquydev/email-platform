/**
 * SearchSuggestions - Dropdown with recent searches and quick suggestions
 */

import { cn } from '../../utils/cn';

interface SearchSuggestionsProps {
    /** Recent search queries */
    recentSearches: string[];
    /** Remove a search from history */
    onRemoveSearch: (query: string) => void;
    /** Clear all search history */
    onClearHistory: () => void;
    /** Apply a suggestion as search */
    onSelectSuggestion: (query: string) => void;
    /** Whether the dropdown is visible */
    isOpen: boolean;
    /** Additional class names */
    className?: string;
}

// Quick search suggestions (predefined)
const QUICK_SUGGESTIONS = [
    { label: 'Từ Amazon', query: 'from:amazon' },
    { label: 'Từ Google', query: 'from:google' },
    { label: 'Từ Facebook', query: 'from:facebook' },
    { label: 'Mã xác thực', query: 'verification code' },
];

export function SearchSuggestions({
    recentSearches,
    onRemoveSearch,
    onClearHistory,
    onSelectSuggestion,
    isOpen,
    className,
}: SearchSuggestionsProps) {
    if (!isOpen) return null;

    const hasRecent = recentSearches.length > 0;

    return (
        <div
            className={cn(
                'absolute top-full left-0 right-0 mt-1 z-50',
                'bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl',
                'overflow-hidden',
                className
            )}
        >
            {/* Recent Searches */}
            {hasRecent && (
                <div className="p-2 border-b border-white/5">
                    <div className="flex items-center justify-between px-2 mb-1">
                        <span className="text-xs font-medium text-text-secondary">Tìm kiếm gần đây</span>
                        <button
                            onClick={onClearHistory}
                            className="text-xs text-text-secondary hover:text-primary transition-colors"
                        >
                            Xóa tất cả
                        </button>
                    </div>
                    <div className="space-y-0.5">
                        {recentSearches.slice(0, 5).map((query) => (
                            <div
                                key={query}
                                className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                                onClick={() => onSelectSuggestion(query)}
                            >
                                <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="flex-1 text-sm text-text-main truncate">{query}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveSearch(query);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-text-secondary hover:text-red-400 transition-all"
                                    aria-label="Xóa"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Suggestions */}
            <div className="p-2">
                <span className="text-xs font-medium text-text-secondary px-2 mb-1 block">Gợi ý tìm kiếm</span>
                <div className="flex flex-wrap gap-1.5 mt-2 px-2">
                    {QUICK_SUGGESTIONS.map((suggestion) => (
                        <button
                            key={suggestion.query}
                            onClick={() => onSelectSuggestion(suggestion.query)}
                            className="px-2.5 py-1 text-xs font-medium rounded-full bg-white/5 text-text-secondary hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                            {suggestion.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
