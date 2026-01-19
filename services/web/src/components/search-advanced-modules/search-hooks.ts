/**
 * Custom hooks for SearchAdvanced component
 */
import { useState, useEffect, useRef, useCallback } from "react";
import type { SearchFilter } from "./search-types";
import { RECENT_SEARCHES_KEY, MAX_RECENT_SEARCHES } from "./search-types";

/**
 * Hook for managing recent searches in localStorage
 */
export function useRecentSearches() {
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved).slice(0, MAX_RECENT_SEARCHES));
            } catch {
                // Ignore parse errors
            }
        }
    }, []);

    const addRecentSearch = useCallback((searchValue: string) => {
        if (!searchValue.trim()) return;
        const updated = [searchValue, ...recentSearches.filter(s => s !== searchValue)].slice(0, MAX_RECENT_SEARCHES);
        setRecentSearches(updated);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    }, [recentSearches]);

    return { recentSearches, addRecentSearch };
}

/**
 * Hook for click outside detection
 */
export function useClickOutside(
    containerRef: React.RefObject<HTMLDivElement | null>,
    onClickOutside: () => void
) {
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onClickOutside();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [containerRef, onClickOutside]);
}

/**
 * Hook for managing search filters state
 */
export function useSearchFilters(onFilterChange?: (filters: SearchFilter) => void) {
    const [filters, setFilters] = useState<SearchFilter>({});

    const updateFilter = useCallback((key: keyof SearchFilter, value: string | boolean) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onFilterChange?.(newFilters);
    }, [filters, onFilterChange]);

    const clearFilters = useCallback(() => {
        setFilters({});
        onFilterChange?.({});
    }, [onFilterChange]);

    const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '' && v !== false);

    return { filters, updateFilter, clearFilters, hasActiveFilters };
}

/**
 * Hook for search input refs
 */
export function useSearchRefs() {
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    return { inputRef, containerRef };
}
