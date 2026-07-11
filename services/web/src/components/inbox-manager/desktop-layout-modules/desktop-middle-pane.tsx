/**
 * MiddlePane component for desktop inbox layout
 * Message list with search functionality
 */
import { cn } from "../../../utils/cn";
import { EmailStream } from "../../EmailStream";
import { EnhancedSearchBar } from "../../search";
import { MessageItemSkeleton } from "../../Skeleton";
import toast from "react-hot-toast";
import type { Inbox, Message } from "../../../types";

export interface MiddlePaneProps {
    activeInbox: Inbox | null;
    messages: Message[];
    searchResults: Message[];
    selectedMessage: Message | null;
    busy: boolean;
    isSearchMode: boolean;
    isSearching: boolean;
    searchQuery: string;
    onSelectMessage: (msg: Message) => void;
    onSearch: (query: string) => void;
    onClearSearch: () => void;
    onDeleteInbox: (inbox: Inbox) => void;
    loadMessages: (inboxId: string) => void;
    disableInboxDelete?: boolean;
}

export function MiddlePane({
    activeInbox, messages, searchResults, selectedMessage, busy,
    isSearchMode, isSearching, searchQuery,
    onSelectMessage, onSearch, onClearSearch, onDeleteInbox, loadMessages,
    disableInboxDelete = false
}: MiddlePaneProps) {
    const handleCopyEmail = () => {
        if (!activeInbox) return;
        const email = `${activeInbox.localPart}@${activeInbox.domain?.name ?? ""}`;
        navigator.clipboard.writeText(email);
        toast.success("Đã sao chép địa chỉ email");
    };

    return (
        <div className="h-full flex flex-col bg-semantic-bg-primary">
            {/* Header */}
            <div className="p-3 border-b border-semantic-border">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                        {activeInbox && (
                            <>
                                {activeInbox.shareMode === 'PUBLIC' && (
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-semantic-success" title="Công khai" />
                                )}
                                <button
                                    type="button"
                                    onClick={handleCopyEmail}
                                    className="group inline-flex min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-sm font-semibold text-semantic-text-main hover:bg-semantic-bg-hover"
                                    title="Bấm để sao chép địa chỉ email"
                                >
                                    <span className="truncate">{`${activeInbox.localPart}@${activeInbox.domain?.name}`}</span>
                                    <svg className="w-3.5 h-3.5 shrink-0 text-semantic-text-secondary transition group-hover:text-semantic-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <rect x="9" y="9" width="11" height="11" rx="2" />
                                        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                                    </svg>
                                </button>
                            </>
                        )}
                        {!activeInbox && !isSearchMode && (
                            <h2 className="text-sm font-semibold text-semantic-text-main flex items-center gap-2">
                                Tin nhắn
                            </h2>
                        )}
                        {isSearchMode && (
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-semantic-warning-subtle flex items-center justify-center">
                                    <svg className="w-3.5 h-3.5 text-semantic-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                    </svg>
                                </span>
                                <h2 className="text-sm font-semibold text-semantic-text-main">Kết quả tìm kiếm</h2>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {activeInbox && !isSearchMode && (
                            <>
                                <button
                                    className="p-1.5 hover:bg-semantic-bg-hover rounded-lg text-semantic-text-secondary hover:text-semantic-accent transition-colors"
                                    onClick={() => loadMessages(activeInbox.id)}
                                    title="Làm mới (r)"
                                >
                                    <svg className={cn("w-4 h-4", busy && "animate-spin")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                                {!disableInboxDelete && (
                                    <button
                                        className="p-1.5 hover:bg-semantic-danger-subtle rounded-lg text-semantic-text-secondary hover:text-semantic-danger transition-colors"
                                        onClick={() => onDeleteInbox(activeInbox)}
                                        title="Xóa inbox"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </>
                        )}
                        {isSearchMode && (
                            <button
                                className="p-1.5 hover:bg-semantic-bg-hover rounded-lg text-semantic-text-secondary hover:text-semantic-text-main transition-colors"
                                onClick={onClearSearch}
                                title="Xóa tìm kiếm"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
                <p className="text-[11px] text-semantic-text-muted mb-2.5">
                    {isSearchMode
                        ? `${searchResults.length} kết quả cho "${searchQuery}"`
                        : activeInbox
                            ? `${messages.length} tin nhắn${messages.filter(m => !m.isRead).length > 0 ? ` • ${messages.filter(m => !m.isRead).length} chưa đọc` : ''}`
                            : 'Chọn inbox từ danh sách bên trái'}
                </p>
                <EnhancedSearchBar
                    onSearch={onSearch}
                    onClear={onClearSearch}
                    isSearching={isSearching}
                    placeholder="Tìm kiếm email..."
                    showFilters={true}
                />
            </div>
            {/* Message list */}
            <div className="flex-1 overflow-y-auto">
                {isSearchMode ? (
                    isSearching ? (
                        <div className="p-4 space-y-3">
                            {Array(5).fill(0).map((_, i) => <MessageItemSkeleton key={i} />)}
                        </div>
                    ) : searchResults.length === 0 ? (
                        <EmptySearchState />
                    ) : (
                        <EmailStream
                            messages={searchResults}
                            selectedMessageId={selectedMessage?.id || null}
                            onSelectMessage={onSelectMessage}
                        />
                    )
                ) : activeInbox ? (
                    busy && messages.length === 0 ? (
                        <div className="p-4 space-y-3">
                            {Array(5).fill(0).map((_, i) => <MessageItemSkeleton key={i} />)}
                        </div>
                    ) : (
                        <EmailStream
                            messages={messages}
                            selectedMessageId={selectedMessage?.id || null}
                            onSelectMessage={onSelectMessage}
                        />
                    )
                ) : (
                    <div className="flex items-center justify-center h-full text-semantic-text-muted">
                        <p className="text-sm">← Chọn inbox từ danh sách</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Empty search state component
export function EmptySearchState() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="w-16 h-16 rounded-full bg-semantic-bg-secondary flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-semantic-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
            </div>
            <h3 className="text-lg font-bold text-semantic-text-main mb-1">Không tìm thấy kết quả</h3>
            <p className="text-sm text-semantic-text-secondary">Thử tìm kiếm với từ khóa khác</p>
        </div>
    );
}
