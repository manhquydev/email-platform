/**
 * Mobile/Tablet layout for InboxManager - Tab-based view
 * Refactored to use modular components for maintainability
 */
import { TabNavigation, InboxTabIcon, MessagesTabIcon } from "../TabNavigation";
import { MobileInboxesTab, MobileMessagesTab } from "./mobile-layout-modules";
import type { Inbox, Message, ShareMode } from "../../types";
import type { FilterOption, SortOption } from "./hooks/use-inbox-filters";

export interface MobileInboxLayoutProps {
    // Data
    filteredInboxes: Inbox[];
    inboxes: Inbox[];
    messages: Message[];
    searchResults: Message[];
    activeInbox: Inbox | null;
    selectedMessage: Message | null;

    // State
    busy: boolean;
    isSearchMode: boolean;
    isSearching: boolean;
    searchQuery: string;
    filterBy: FilterOption;
    sortBy: SortOption;
    inboxSearch: string;
    activeTab: 'inboxes' | 'messages';
    focusedIndex: number;
    selectedInboxIds: Set<string>;
    isRefreshing: boolean;

    // Handlers
    onTabChange: (tab: 'inboxes' | 'messages') => void;
    onSelectInbox: (inbox: Inbox) => void;
    onViewMessages: (inbox: Inbox) => void;
    onDeleteInbox: (inbox: Inbox) => void;
    onTransferInbox: (inbox: Inbox) => void;
    onExtendInbox: (inbox: Inbox) => void;
    onTogglePermanent: (inbox: Inbox) => void;
    onShareModeChange: (inboxId: string, mode: ShareMode) => void;
    onVisibilityRules: (inbox: Inbox) => void;
    onSelectMessage: (msg: Message) => void;
    onClearSearch: () => void;
    onCreateInbox: () => void;
    onFilterChange: (filter: FilterOption) => void;
    onSortChange: (sort: SortOption) => void;
    onInboxSearchChange: (value: string) => void;
    onToggleSelect: (inboxId: string) => void;
    onSelectAll: () => void;
    onBatchDelete: () => void;
    onCopyAll: () => void;
    onLongPress: (inbox: Inbox) => void;
    onPullRefresh: () => Promise<void>;
    onSetFocusedIndex: (index: number) => void;
    loadMessages: (inboxId: string) => void;
}

export function MobileInboxLayout({
    filteredInboxes,
    inboxes,
    messages,
    searchResults,
    activeInbox,
    selectedMessage,
    busy,
    isSearchMode,
    isSearching,
    searchQuery,
    filterBy,
    sortBy,
    inboxSearch,
    activeTab,
    focusedIndex,
    selectedInboxIds,
    isRefreshing,
    onTabChange,
    onViewMessages,
    onDeleteInbox,
    onTransferInbox,
    onExtendInbox,
    onTogglePermanent,
    onShareModeChange,
    onVisibilityRules,
    onSelectMessage,
    onClearSearch,
    onCreateInbox,
    onFilterChange,
    onSortChange,
    onInboxSearchChange,
    onToggleSelect,
    onSelectAll,
    onBatchDelete,
    onCopyAll,
    onLongPress,
    onPullRefresh,
    onSetFocusedIndex,
    loadMessages
}: MobileInboxLayoutProps) {
    // Tabs config
    const tabs = [
        { id: 'inboxes', label: 'Hộp thư', icon: <InboxTabIcon /> },
        { id: 'messages', label: 'Tin nhắn', icon: <MessagesTabIcon />, badge: messages.filter(m => !m.isRead).length }
    ];

    return (
        <div className="flex flex-col min-h-[calc(100vh-11rem)] md:min-h-[calc(100vh-10rem)]">
            {/* Tab Navigation */}
            <div className="sticky top-0 z-30">
                <TabNavigation
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={(id) => onTabChange(id as 'inboxes' | 'messages')}
                />
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-h-0 p-3 sm:p-4 pb-28 md:p-6 w-full max-w-7xl mx-auto">
                {activeTab === 'inboxes' ? (
                    <MobileInboxesTab
                        filteredInboxes={filteredInboxes}
                        inboxes={inboxes}
                        busy={busy}
                        filterBy={filterBy}
                        sortBy={sortBy}
                        inboxSearch={inboxSearch}
                        focusedIndex={focusedIndex}
                        selectedInboxIds={selectedInboxIds}
                        isRefreshing={isRefreshing}
                        onViewMessages={onViewMessages}
                        onDeleteInbox={onDeleteInbox}
                        onTransferInbox={onTransferInbox}
                        onExtendInbox={onExtendInbox}
                        onTogglePermanent={onTogglePermanent}
                        onShareModeChange={onShareModeChange}
                        onVisibilityRules={onVisibilityRules}
                        onCreateInbox={onCreateInbox}
                        onFilterChange={onFilterChange}
                        onSortChange={onSortChange}
                        onInboxSearchChange={onInboxSearchChange}
                        onToggleSelect={onToggleSelect}
                        onSelectAll={onSelectAll}
                        onBatchDelete={onBatchDelete}
                        onCopyAll={onCopyAll}
                        onLongPress={onLongPress}
                        onPullRefresh={onPullRefresh}
                        onSetFocusedIndex={onSetFocusedIndex}
                    />
                ) : (
                    <MobileMessagesTab
                        activeInbox={activeInbox}
                        messages={messages}
                        searchResults={searchResults}
                        selectedMessage={selectedMessage}
                        busy={busy}
                        isSearchMode={isSearchMode}
                        isSearching={isSearching}
                        searchQuery={searchQuery}
                        onSelectMessage={onSelectMessage}
                        onClearSearch={onClearSearch}
                        onTabChange={onTabChange}
                        loadMessages={loadMessages}
                    />
                )}
            </div>
        </div>
    );
}
