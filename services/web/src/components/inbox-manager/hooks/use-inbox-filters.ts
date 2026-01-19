/**
 * Custom hook for inbox filtering and sorting logic
 * Extracted from InboxManager.tsx for modularity
 */
import { useState, useCallback, useMemo } from "react";
import type { Inbox } from "../../../types";

export type SortOption = 'created' | 'name' | 'ttl' | 'messages';
export type FilterOption = 'all' | 'active' | 'expired' | 'expiring';

export interface UseInboxFiltersReturn {
    sortBy: SortOption;
    setSortBy: React.Dispatch<React.SetStateAction<SortOption>>;
    filterBy: FilterOption;
    setFilterBy: React.Dispatch<React.SetStateAction<FilterOption>>;
    getFilteredInboxes: (inboxes: Inbox[]) => Inbox[];
}

export function useInboxFilters(): UseInboxFiltersReturn {
    const [sortBy, setSortBy] = useState<SortOption>('created');
    const [filterBy, setFilterBy] = useState<FilterOption>('all');

    const getFilteredInboxes = useCallback((inboxes: Inbox[]) => {
        let filtered = [...inboxes];
        const now = new Date();

        // Apply filter
        if (filterBy === 'active') {
            filtered = filtered.filter(i => !i.expiresAt || new Date(i.expiresAt) > now);
        } else if (filterBy === 'expired') {
            filtered = filtered.filter(i => i.expiresAt && new Date(i.expiresAt) <= now);
        } else if (filterBy === 'expiring') {
            const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            filtered = filtered.filter(i =>
                i.expiresAt && new Date(i.expiresAt) > now && new Date(i.expiresAt) <= in24h
            );
        }

        // Apply sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.localPart.localeCompare(b.localPart);
                case 'ttl':
                    if (!a.expiresAt && !b.expiresAt) return 0;
                    if (!a.expiresAt) return 1;
                    if (!b.expiresAt) return -1;
                    return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
                case 'created':
                default:
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
        });

        return filtered;
    }, [sortBy, filterBy]);

    return {
        sortBy,
        setSortBy,
        filterBy,
        setFilterBy,
        getFilteredInboxes
    };
}

/**
 * Hook that combines filter logic with inbox data
 */
export function useFilteredInboxes(inboxes: Inbox[]) {
    const { sortBy, setSortBy, filterBy, setFilterBy, getFilteredInboxes } = useInboxFilters();

    const filteredInboxes = useMemo(
        () => getFilteredInboxes(inboxes),
        [inboxes, getFilteredInboxes]
    );

    return {
        filteredInboxes,
        sortBy,
        setSortBy,
        filterBy,
        setFilterBy
    };
}
