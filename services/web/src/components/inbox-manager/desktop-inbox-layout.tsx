/**
 * Desktop layout for InboxManager - 3-pane split view
 * Extracted from InboxManager.tsx for modularity
 */
import { useNavigate } from "react-router-dom";
import { SplitPaneLayout } from "../split-pane/SplitPaneLayout";
import { MessageViewer } from "../email-viewer/MessageViewer";
import { LeftPane, MiddlePane } from "./desktop-layout-modules";
import type { Inbox, Message, ShareMode } from "../../types";
import type { FilterOption, SortOption } from "./hooks/use-inbox-filters";

export interface DesktopInboxLayoutProps {
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

    // Handlers
    onSelectInbox: (inbox: Inbox) => void;
    onDeleteInbox: (inbox: Inbox) => void;
    onTransferInbox: (inbox: Inbox) => void;
    onExtendInbox: (inbox: Inbox) => void;
    onTogglePermanent: (inbox: Inbox) => void;
    onShareModeChange: (inboxId: string, mode: ShareMode) => void;
    onVisibilityRules: (inbox: Inbox) => void;
    onSelectMessage: (msg: Message) => void;
    onSearch: (query: string) => void;
    onClearSearch: () => void;
    onCreateInbox: () => void;
    onFilterChange: (filter: FilterOption) => void;
    onSortChange: (sort: SortOption) => void;
    loadMessages: (inboxId: string) => void;
    setSelectedMessage: (msg: Message | null) => void;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function DesktopInboxLayout({
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
    onSelectInbox,
    onDeleteInbox,
    onTransferInbox,
    onExtendInbox,
    onTogglePermanent,
    onShareModeChange,
    onVisibilityRules,
    onSelectMessage,
    onSearch,
    onClearSearch,
    onCreateInbox,
    onFilterChange,
    onSortChange,
    loadMessages,
    setSelectedMessage,
    setMessages
}: DesktopInboxLayoutProps) {
    const navigate = useNavigate();

    return (
        <div className="h-[calc(100vh-64px)]">
            <SplitPaneLayout
                breakpoint="desktop"
                leftPane={
                    <LeftPane
                        filteredInboxes={filteredInboxes}
                        inboxes={inboxes}
                        activeInbox={activeInbox}
                        busy={busy}
                        filterBy={filterBy}
                        sortBy={sortBy}
                        onSelectInbox={onSelectInbox}
                        onDeleteInbox={onDeleteInbox}
                        onTransferInbox={onTransferInbox}
                        onExtendInbox={onExtendInbox}
                        onTogglePermanent={onTogglePermanent}
                        onShareModeChange={onShareModeChange}
                        onVisibilityRules={onVisibilityRules}
                        onCreateInbox={onCreateInbox}
                        onFilterChange={onFilterChange}
                        onSortChange={onSortChange}
                        loadMessages={loadMessages}
                        navigate={navigate}
                    />
                }
                middlePane={
                    <MiddlePane
                        activeInbox={activeInbox}
                        messages={messages}
                        searchResults={searchResults}
                        selectedMessage={selectedMessage}
                        busy={busy}
                        isSearchMode={isSearchMode}
                        isSearching={isSearching}
                        searchQuery={searchQuery}
                        onSelectMessage={onSelectMessage}
                        onSearch={onSearch}
                        onClearSearch={onClearSearch}
                        onDeleteInbox={onDeleteInbox}
                        loadMessages={loadMessages}
                    />
                }
                rightPane={
                    selectedMessage ? (
                        <MessageViewer
                            message={selectedMessage}
                            onDelete={() => setSelectedMessage(null)}
                            onPin={(isPinned) => {
                                setMessages(prev => prev.map(m =>
                                    m.id === selectedMessage.id ? { ...m, isPinned } : m
                                ));
                            }}
                            variant="pane"
                        />
                    ) : undefined
                }
                showRightPane={!!selectedMessage}
            />
        </div>
    );
}
