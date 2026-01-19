/**
 * Empty state components for mobile inbox layout
 * Extracted from mobile-inbox-layout.tsx for modularity
 */

interface EmptyInboxStateProps {
    onCreateInbox: () => void;
}

export function EmptyInboxState({ onCreateInbox }: EmptyInboxStateProps) {
    return (
        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center opacity-60">
            <div className="w-20 h-20 rounded-full bg-surface/50 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
                </svg>
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent mb-2">No inboxes found</h3>
            <p className="text-text-secondary max-w-sm mx-auto mb-6">Start by creating your first temporary email inbox to receive messages.</p>
            <button
                onClick={onCreateInbox}
                className="px-6 py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 transition-colors font-medium"
            >
                Create your first inbox
            </button>
        </div>
    );
}

interface EmptySearchStateProps {
    onClearSearch: () => void;
}

export function EmptySearchState({ onClearSearch }: EmptySearchStateProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center opacity-60 py-20">
            <div className="w-20 h-20 rounded-full bg-surface/50 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
            </div>
            <h3 className="text-xl font-bold text-text-main mb-2">Không tìm thấy kết quả</h3>
            <p className="text-text-secondary max-w-sm mb-6">Thử tìm kiếm với từ khóa khác</p>
            <button
                onClick={onClearSearch}
                className="px-6 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
            >
                Quay lại
            </button>
        </div>
    );
}

interface NoInboxSelectedStateProps {
    onTabChange: (tab: 'inboxes' | 'messages') => void;
}

export function NoInboxSelectedState({ onTabChange }: NoInboxSelectedStateProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
            <div className="w-20 h-20 rounded-full bg-surface/50 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
            </div>
            <h3 className="text-xl font-bold text-text-main mb-2">Select an inbox</h3>
            <p className="text-text-secondary max-w-sm mb-6">Choose an inbox from the list to view its messages.</p>
            <button
                onClick={() => onTabChange('inboxes')}
                className="px-6 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
            >
                Go to Inboxes
            </button>
        </div>
    );
}
