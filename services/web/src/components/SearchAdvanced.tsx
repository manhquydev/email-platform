/**
 * SearchAdvanced - Advanced search input with filters and suggestions
 * Modules extracted to search-advanced-modules/
 */
import { useState, useCallback } from "react";
import {
    type SearchAdvancedProps,
    useRecentSearches,
    useClickOutside,
    useSearchFilters,
    useSearchRefs,
    SearchIcon,
    ClearButton,
    FilterToggle,
    OperatorsPanel,
    RecentSearchesList,
    FiltersPanel
} from "./search-advanced-modules";

export function SearchAdvanced({
    value,
    onChange,
    onFilterChange,
    placeholder = "Tìm kiếm email...",
    className = "",
    onClose
}: SearchAdvancedProps) {
    const [showFilters, setShowFilters] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const { inputRef, containerRef } = useSearchRefs();
    const { recentSearches, addRecentSearch } = useRecentSearches();
    const { filters, updateFilter, clearFilters, hasActiveFilters } = useSearchFilters(onFilterChange);

    const closePanels = useCallback(() => {
        setShowSuggestions(false);
        setShowFilters(false);
    }, []);

    useClickOutside(containerRef, closePanels);

    const handleSearch = (searchValue: string) => {
        onChange(searchValue);
        addRecentSearch(searchValue);
        setShowSuggestions(false);
        onClose?.();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch(value);
        if (e.key === 'Escape') { closePanels(); onClose?.(); }
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Search Input */}
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="w-full pl-9 pr-20 py-2 text-sm transition-all"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {value && <ClearButton onClick={() => onChange('')} />}
                    <FilterToggle
                        isActive={showFilters}
                        hasFilters={hasActiveFilters}
                        onClick={() => setShowFilters(!showFilters)}
                    />
                </div>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && !showFilters && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 animate-fade-in-up overflow-hidden">
                    <OperatorsPanel value={value} onChange={onChange} inputRef={inputRef} />
                    <RecentSearchesList searches={recentSearches} onSelect={handleSearch} />
                </div>
            )}

            {/* Advanced Filters Panel */}
            {showFilters && (
                <FiltersPanel
                    filters={filters}
                    hasActiveFilters={hasActiveFilters}
                    updateFilter={updateFilter}
                    clearFilters={clearFilters}
                    onClose={() => setShowFilters(false)}
                />
            )}
        </div>
    );
}
