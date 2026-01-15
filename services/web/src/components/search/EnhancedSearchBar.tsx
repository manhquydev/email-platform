/**
 * EnhancedSearchBar - Search bar with filters, suggestions, and history
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { useDebounce } from '../../hooks/useDebounce';
import { useSearchHistory } from '../../hooks/useSearchHistory';
import { FilterChips } from './FilterChips';
import { buildFilterQuery, DEFAULT_FILTERS } from './filterUtils';
import { SearchSuggestions } from './SearchSuggestions';

interface EnhancedSearchBarProps {
    /** Callback when search is submitted */
    onSearch: (query: string) => void;
    /** Callback when search is cleared */
    onClear?: () => void;
    /** Whether search is in progress */
    isSearching?: boolean;
    /** Placeholder text */
    placeholder?: string;
    /** Show filter chips */
    showFilters?: boolean;
    /** Additional class names */
    className?: string;
}

export function EnhancedSearchBar({
    onSearch,
    onClear,
    isSearching = false,
    placeholder = 'Tìm kiếm email...',
    showFilters = true,
    className,
}: EnhancedSearchBarProps) {
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const { history, addSearch, removeSearch, clearHistory } = useSearchHistory();
    const debouncedQuery = useDebounce(query, 300);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsFocused(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Build and execute search
    const executeSearch = (searchQuery: string) => {
        const filterQuery = buildFilterQuery(activeFilters, DEFAULT_FILTERS);
        const combinedQuery = [searchQuery, filterQuery].filter(Boolean).join(' ').trim();

        if (combinedQuery) {
            addSearch(searchQuery || filterQuery);
            onSearch(combinedQuery);
        }
        setIsFocused(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        executeSearch(query);
    };

    const handleClear = () => {
        setQuery('');
        setActiveFilters(new Set());
        inputRef.current?.focus();
        onClear?.();
    };

    const handleToggleFilter = (filterId: string) => {
        setActiveFilters((prev) => {
            const next = new Set(prev);
            if (next.has(filterId)) {
                next.delete(filterId);
            } else {
                next.add(filterId);
            }

            // Auto-execute search with updated filters
            const filterQuery = buildFilterQuery(next, DEFAULT_FILTERS);
            const combinedQuery = [query, filterQuery].filter(Boolean).join(' ').trim();

            if (combinedQuery) {
                onSearch(combinedQuery);
            } else if (next.size === 0 && !query) {
                // All filters cleared and no query - trigger clear
                onClear?.();
            }

            return next;
        });
    };

    const handleSelectSuggestion = (suggestion: string) => {
        setQuery(suggestion);
        executeSearch(suggestion);
    };

    // Auto-search on debounced query change (optional - can be removed if prefer explicit submit)
    useEffect(() => {
        if (debouncedQuery && debouncedQuery.length >= 2) {
            // Could auto-search here, but we'll wait for explicit submit
        }
    }, [debouncedQuery]);

    const hasValue = query.length > 0 || activeFilters.size > 0;
    const showSuggestions = isFocused && !query;

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            {/* Search Input */}
            <form onSubmit={handleSubmit}>
                <div className="relative">
                    {/* Search Icon */}
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                        {isSearching ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                        )}
                    </div>

                    {/* Input */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        placeholder={placeholder}
                        className={cn(
                            'w-full pl-10 pr-10 py-2.5 rounded-xl',
                            'bg-white/5 border border-white/10',
                            'text-text-main placeholder:text-text-secondary',
                            'focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20',
                            'transition-all'
                        )}
                        aria-label="Tìm kiếm"
                    />

                    {/* Clear Button */}
                    {hasValue && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-text-secondary hover:text-text-main hover:bg-white/10 transition-colors"
                            aria-label="Xóa tìm kiếm"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </form>

            {/* Filter Chips */}
            {showFilters && (
                <FilterChips
                    activeFilters={activeFilters}
                    onToggleFilter={handleToggleFilter}
                    className="mt-3"
                />
            )}

            {/* Suggestions Dropdown */}
            <SearchSuggestions
                recentSearches={history}
                onRemoveSearch={removeSearch}
                onClearHistory={clearHistory}
                onSelectSuggestion={handleSelectSuggestion}
                isOpen={showSuggestions}
            />
        </div>
    );
}

export default EnhancedSearchBar;
