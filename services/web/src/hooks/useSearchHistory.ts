/**
 * useSearchHistory - Persist recent searches in localStorage
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'email-search-history';
const MAX_ITEMS = 10;

interface UseSearchHistoryReturn {
    /** Recent search queries */
    history: string[];
    /** Add a new search query to history */
    addSearch: (query: string) => void;
    /** Remove a specific query from history */
    removeSearch: (query: string) => void;
    /** Clear all search history */
    clearHistory: () => void;
}

export function useSearchHistory(): UseSearchHistoryReturn {
    const [history, setHistory] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    return parsed.slice(0, MAX_ITEMS);
                }
            }
        } catch {
            // localStorage might be unavailable
        }
        return [];
    });

    // Persist to localStorage whenever history changes
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        } catch {
            // localStorage might be unavailable
        }
    }, [history]);

    const addSearch = useCallback((query: string) => {
        const trimmed = query.trim();
        if (!trimmed) return;

        setHistory((prev) => {
            // Remove duplicate if exists
            const filtered = prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
            // Add to front, limit to MAX_ITEMS
            return [trimmed, ...filtered].slice(0, MAX_ITEMS);
        });
    }, []);

    const removeSearch = useCallback((query: string) => {
        setHistory((prev) => prev.filter((q) => q !== query));
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
    }, []);

    return {
        history,
        addSearch,
        removeSearch,
        clearHistory,
    };
}
