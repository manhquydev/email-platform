/**
 * Messages Tab component for mobile inbox layout
 * Displays message list with search results and active inbox content
 */
import { cn } from "../../../utils/cn";
import { GlassCard } from "../../ui/GlassCard";
import { EmailStream } from "../../EmailStream";
import { MessageItemSkeleton } from "../../Skeleton";
import { EmptySearchState, NoInboxSelectedState } from "./mobile-empty-states";
import type { Inbox, Message } from "../../../types";

export interface MobileMessagesTabProps {
    activeInbox: Inbox | null;
    messages: Message[];
    searchResults: Message[];
    selectedMessage: Message | null;
    busy: boolean;
    isSearchMode: boolean;
    isSearching: boolean;
    searchQuery: string;
    onSelectMessage: (msg: Message) => void;
    onClearSearch: () => void;
    onTabChange: (tab: 'inboxes' | 'messages') => void;
    loadMessages: (inboxId: string) => void;
}

export function MobileMessagesTab({
    activeInbox, messages, searchResults, selectedMessage, busy,
    isSearchMode, isSearching, searchQuery, onSelectMessage,
    onClearSearch, onTabChange, loadMessages
}: MobileMessagesTabProps) {
    return (
        <div className="flex flex-col h-[calc(100vh-140px)]">
            {/* Search Mode Header */}
            {isSearchMode && (
                <SearchModeHeader
                    isSearching={isSearching}
                    searchQuery={searchQuery}
                    resultsCount={searchResults.length}
                    onClearSearch={onClearSearch}
                />
            )}

            {/* Content */}
            {isSearchMode ? (
                <SearchResultsContent
                    isSearching={isSearching}
                    searchResults={searchResults}
                    selectedMessage={selectedMessage}
                    onSelectMessage={onSelectMessage}
                    onClearSearch={onClearSearch}
                />
            ) : activeInbox ? (
                <ActiveInboxContent
                    activeInbox={activeInbox}
                    messages={messages}
                    selectedMessage={selectedMessage}
                    busy={busy}
                    onSelectMessage={onSelectMessage}
                    loadMessages={loadMessages}
                />
            ) : (
                <NoInboxSelectedState onTabChange={onTabChange} />
            )}
        </div>
    );
}

// Search mode header
interface SearchModeHeaderProps {
    isSearching: boolean;
    searchQuery: string;
    resultsCount: number;
    onClearSearch: () => void;
}

function SearchModeHeader({ isSearching, searchQuery, resultsCount, onClearSearch }: SearchModeHeaderProps) {
    return (
        <GlassCard className="mb-4 p-4 flex items-center justify-between rounded-xl">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                </div>
                <div>
                    <h2 className="font-bold text-lg text-text-main">Kết quả tìm kiếm</h2>
                    <p className="text-xs text-text-secondary">
                        {isSearching ? "Đang tìm kiếm..." : `"${searchQuery}" - ${resultsCount} kết quả`}
                    </p>
                </div>
            </div>
            <button
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-main transition-colors text-sm font-medium flex items-center gap-2"
                onClick={onClearSearch}
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Xóa tìm kiếm
            </button>
        </GlassCard>
    );
}

// Search results content
interface SearchResultsContentProps {
    isSearching: boolean;
    searchResults: Message[];
    selectedMessage: Message | null;
    onSelectMessage: (msg: Message) => void;
    onClearSearch: () => void;
}

function SearchResultsContent({ isSearching, searchResults, selectedMessage, onSelectMessage, onClearSearch }: SearchResultsContentProps) {
    return (
        <div className="flex-1 overflow-y-auto min-h-0 rounded-2xl bg-surface/20 border border-white/5 backdrop-blur-sm">
            {isSearching ? (
                <div className="p-4 space-y-3">
                    {Array(5).fill(0).map((_, i) => <MessageItemSkeleton key={i} />)}
                </div>
            ) : searchResults.length === 0 ? (
                <EmptySearchState onClearSearch={onClearSearch} />
            ) : (
                <EmailStream
                    messages={searchResults}
                    selectedMessageId={selectedMessage?.id || null}
                    onSelectMessage={onSelectMessage}
                />
            )}
        </div>
    );
}

// Active inbox content
interface ActiveInboxContentProps {
    activeInbox: Inbox;
    messages: Message[];
    selectedMessage: Message | null;
    busy: boolean;
    onSelectMessage: (msg: Message) => void;
    loadMessages: (inboxId: string) => void;
}

function ActiveInboxContent({ activeInbox, messages, selectedMessage, busy, onSelectMessage, loadMessages }: ActiveInboxContentProps) {
    return (
        <div className="flex flex-col h-full">
            <GlassCard className="mb-4 p-4 flex items-center justify-between rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-text-main">{activeInbox.localPart}@{activeInbox.domain?.name}</h2>
                        <p className="text-xs text-text-secondary">{messages.length} messages</p>
                    </div>
                </div>
                <button
                    className="p-2 hover:bg-white/5 rounded-lg text-text-secondary transition-colors"
                    onClick={() => loadMessages(activeInbox.id)}
                    title="Refresh"
                >
                    <svg className={cn("w-5 h-5", busy && "animate-spin")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </GlassCard>

            <div className="flex-1 overflow-y-auto min-h-0 rounded-2xl bg-surface/20 border border-white/5 backdrop-blur-sm">
                {busy && messages.length === 0 ? (
                    <div className="p-4 space-y-3">
                        {Array(5).fill(0).map((_, i) => <MessageItemSkeleton key={i} />)}
                    </div>
                ) : (
                    <EmailStream
                        messages={messages}
                        selectedMessageId={selectedMessage?.id || null}
                        onSelectMessage={onSelectMessage}
                    />
                )}
            </div>
        </div>
    );
}
