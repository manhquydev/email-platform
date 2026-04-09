/**
 * Desktop layout for InboxManager - 2-pane management view
 * Left: inbox list + filters
 * Right: manager workspace summary and actions
 */
import { LeftPane, ManagerWorkspacePane } from "./desktop-layout-modules";
import type { Inbox, ShareMode } from "../../types";
import type { FilterOption, SortOption } from "./hooks/use-inbox-filters";

export interface DesktopInboxLayoutProps {
    filteredInboxes: Inbox[];
    inboxes: Inbox[];
    activeInbox: Inbox | null;
    busy: boolean;
    filterBy: FilterOption;
    sortBy: SortOption;
    inboxSearch: string;
    onSelectInbox: (inbox: Inbox) => void;
    onDeleteInbox: (inbox: Inbox) => void;
    onTransferInbox: (inbox: Inbox) => void;
    onExtendInbox: (inbox: Inbox) => void;
    onTogglePermanent: (inbox: Inbox) => void;
    onShareModeChange: (inboxId: string, mode: ShareMode) => void;
    onVisibilityRules: (inbox: Inbox) => void;
    onCopyPublicLink: (email: string) => void;
    onCreateInbox: () => void;
    onFilterChange: (filter: FilterOption) => void;
    onSortChange: (sort: SortOption) => void;
    onInboxSearchChange: (value: string) => void;
}

export function DesktopInboxLayout({
    filteredInboxes,
    inboxes,
    activeInbox,
    busy,
    filterBy,
    sortBy,
    inboxSearch,
    onSelectInbox,
    onDeleteInbox,
    onTransferInbox,
    onExtendInbox,
    onTogglePermanent,
    onShareModeChange,
    onVisibilityRules,
    onCopyPublicLink,
    onCreateInbox,
    onFilterChange,
    onSortChange,
    onInboxSearchChange,
}: DesktopInboxLayoutProps) {
    return (
        <div className="h-[calc(100vh-64px)] grid grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="border-r border-white/5 bg-[var(--nebula-void)]/50 overflow-hidden">
                <LeftPane
                    filteredInboxes={filteredInboxes}
                    inboxes={inboxes}
                    activeInbox={activeInbox}
                    busy={busy}
                    filterBy={filterBy}
                    sortBy={sortBy}
                    inboxSearch={inboxSearch}
                    onSelectInbox={onSelectInbox}
                    onDeleteInbox={onDeleteInbox}
                    onTransferInbox={onTransferInbox}
                    onExtendInbox={onExtendInbox}
                    onTogglePermanent={onTogglePermanent}
                    onShareModeChange={onShareModeChange}
                    onVisibilityRules={onVisibilityRules}
                    onCopyPublicLink={onCopyPublicLink}
                    onCreateInbox={onCreateInbox}
                    onFilterChange={onFilterChange}
                    onSortChange={onSortChange}
                    onInboxSearchChange={onInboxSearchChange}
                />
            </div>

            <div className="bg-gradient-to-br from-[var(--nebula-void)] to-[var(--nebula-surface)]/20">
                <ManagerWorkspacePane
                    activeInbox={activeInbox}
                    filteredCount={filteredInboxes.length}
                    onCreateInbox={onCreateInbox}
                />
            </div>
        </div>
    );
}
