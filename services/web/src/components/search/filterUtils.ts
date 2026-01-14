/**
 * Filter utilities and constants for search functionality
 */

export interface SearchFilter {
    id: string;
    label: string;
    icon?: React.ReactNode;
    query: string; // The search query this filter applies
}

// Default filter chips
export const DEFAULT_FILTERS: SearchFilter[] = [
    {
        id: 'has-attachment',
        label: 'Có tệp đính kèm',
        query: 'has:attachment',
    },
    {
        id: 'unread',
        label: 'Chưa đọc',
        query: 'is:unread',
    },
    {
        id: 'this-week',
        label: 'Tuần này',
        query: 'after:7d',
    },
    {
        id: 'has-otp',
        label: 'Có mã OTP',
        query: 'verification OR code OR otp OR mã',
    },
];

/** Get the combined query string from active filters */
export function buildFilterQuery(activeFilters: Set<string>, filters: SearchFilter[] = DEFAULT_FILTERS): string {
    const queries: string[] = [];

    filters.forEach((filter) => {
        if (activeFilters.has(filter.id)) {
            queries.push(filter.query);
        }
    });

    return queries.join(' ');
}
