/**
 * Types and constants for SearchAdvanced component
 */

export interface SearchFilter {
    from?: string;
    to?: string;
    subject?: string;
    hasAttachment?: boolean;
    isUnread?: boolean;
    dateFrom?: string;
    dateTo?: string;
}

export interface SearchAdvancedProps {
    value: string;
    onChange: (value: string) => void;
    onFilterChange?: (filters: SearchFilter) => void;
    placeholder?: string;
    className?: string;
    onClose?: () => void;
}

export interface SearchOperator {
    label: string;
    description: string;
    example: string;
}

/** Search operators for query suggestions */
export const SEARCH_OPERATORS: SearchOperator[] = [
    { label: "from:", description: "Từ người gửi", example: "from:john@example.com" },
    { label: "to:", description: "Đến người nhận", example: "to:me@example.com" },
    { label: "subject:", description: "Tiêu đề chứa", example: "subject:meeting" },
    { label: "has:attachment", description: "Có file đính kèm", example: "has:attachment" },
    { label: "is:unread", description: "Chưa đọc", example: "is:unread" },
    { label: "is:pinned", description: "Đã ghim", example: "is:pinned" },
];

/** LocalStorage key for recent searches */
export const RECENT_SEARCHES_KEY = 'email-recent-searches';
export const MAX_RECENT_SEARCHES = 5;
