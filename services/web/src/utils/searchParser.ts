/**
 * Parse search query with operators like Gmail
 * Supported operators:
 * - from:email@example.com - Search by sender
 * - has:attachment - Has attachments
 * - before:2024-01-01 - Before date
 * - after:2024-01-01 - After date
 * - is:unread - Unread emails
 * - is:pinned - Pinned emails
 */

export interface ParsedSearch {
    q: string;  // Remaining text after extracting operators
    from?: string;
    hasAttachments?: boolean;
    before?: string;
    after?: string;
    isRead?: boolean;
    isPinned?: boolean;
}

export function parseSearchQuery(query: string): ParsedSearch {
    const result: ParsedSearch = { q: '' };

    // Regular expressions for operators
    const operators: { pattern: RegExp; handler: (match: string) => void }[] = [
        {
            pattern: /from:["']?([^\s"']+)["']?/gi,
            handler: (match) => {
                const value = match.replace(/from:["']?/, '').replace(/["']?$/, '');
                result.from = value;
            }
        },
        {
            pattern: /has:attachment/gi,
            handler: () => {
                result.hasAttachments = true;
            }
        },
        {
            pattern: /before:(\d{4}-\d{2}-\d{2})/gi,
            handler: (match) => {
                const date = match.replace('before:', '');
                result.before = new Date(date).toISOString();
            }
        },
        {
            pattern: /after:(\d{4}-\d{2}-\d{2})/gi,
            handler: (match) => {
                const date = match.replace('after:', '');
                result.after = new Date(date).toISOString();
            }
        },
        {
            pattern: /is:unread/gi,
            handler: () => {
                result.isRead = false;
            }
        },
        {
            pattern: /is:read/gi,
            handler: () => {
                result.isRead = true;
            }
        },
        {
            pattern: /is:pinned/gi,
            handler: () => {
                result.isPinned = true;
            }
        },
    ];

    let remainingQuery = query;

    for (const { pattern, handler } of operators) {
        const matches = remainingQuery.match(pattern);
        if (matches) {
            for (const match of matches) {
                handler(match);
                remainingQuery = remainingQuery.replace(match, '');
            }
        }
    }

    // Clean up remaining text
    result.q = remainingQuery.trim().replace(/\s+/g, ' ');

    return result;
}

// Format search hints for UI
export const SEARCH_HINTS = [
    { operator: 'from:', example: 'from:example@gmail.com', description: 'Tìm theo người gửi' },
    { operator: 'has:attachment', example: 'has:attachment', description: 'Email có đính kèm' },
    { operator: 'is:unread', example: 'is:unread', description: 'Email chưa đọc' },
    { operator: 'is:pinned', example: 'is:pinned', description: 'Email đã ghim' },
    { operator: 'before:', example: 'before:2024-12-01', description: 'Trước ngày' },
    { operator: 'after:', example: 'after:2024-12-01', description: 'Sau ngày' },
];
