/**
 * Inboxes Tab component for mobile inbox layout
 * Displays inbox list with compact toolbar, action sheet, and virtualized list
 */
import { useState } from "react";
import { InboxCardSkeleton } from "../../Skeleton";
import {
    PullToRefresh,
    CompactToolbar,
    InboxActionsSheet,
    VirtualizedInboxList
} from "../../mobile";
import { EmptyInboxState } from "./mobile-empty-states";
import type { Inbox, ShareMode } from "../../../types";
import type { FilterOption, SortOption } from "../hooks/use-inbox-filters";

export interface MobileInboxesTabProps {
    filteredInboxes: Inbox[];
    inboxes: Inbox[];
    busy: boolean;
    filterBy: FilterOption;
    sortBy: SortOption;
    inboxSearch: string;
    focusedIndex: number;
    selectedInboxIds: Set<string>;
    isRefreshing: boolean;
    onViewMessages: (inbox: Inbox) => void;
    onDeleteInbox: (inbox: Inbox) => void;
    onTransferInbox: (inbox: Inbox) => void;
    onExtendInbox: (inbox: Inbox) => void;
    onTogglePermanent: (inbox: Inbox) => void;
    onShareModeChange: (inboxId: string, mode: ShareMode) => void;
    onVisibilityRules: (inbox: Inbox) => void;
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
}

export function MobileInboxesTab({
    filteredInboxes, inboxes, busy, filterBy, sortBy, inboxSearch, focusedIndex,
    selectedInboxIds, isRefreshing, onViewMessages, onDeleteInbox,
    onTransferInbox, onExtendInbox, onTogglePermanent, onShareModeChange,
    onVisibilityRules, onCreateInbox, onFilterChange, onSortChange,
    onInboxSearchChange, onToggleSelect, onSelectAll, onBatchDelete, onCopyAll, onLongPress,
    onPullRefresh, onSetFocusedIndex
}: MobileInboxesTabProps) {
    const [isActionsOpen, setIsActionsOpen] = useState(false);
    const hasActiveFilter = filteredInboxes.length !== inboxes.length;
    const inboxCountLabel = hasActiveFilter
        ? `${filteredInboxes.length}/${inboxes.length} inboxes`
        : `${inboxes.length} inboxes`;

    return (
        <div className="flex flex-col h-full">
            <div className="px-4 pt-3 pb-2 bg-v3-bg-elevated border-b border-v3-border-default">
                <input
                    type="text"
                    value={inboxSearch}
                    onChange={(event) => onInboxSearchChange(event.target.value)}
                    placeholder="Tìm email hoặc domain..."
                    className="w-full min-h-[40px] rounded-lg border border-v3-border-default bg-v3-bg-surface px-3 py-2 text-sm text-text-main placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-v3-accent-primary"
                />
            </div>
            {/* Compact Toolbar */}
            <CompactToolbar
                selectedCount={selectedInboxIds.size}
                filterLabel={filterBy}
                onMenuOpen={() => setIsActionsOpen(true)}
                onFilterChange={onFilterChange}
            />

            {/* Actions Sheet */}
            <InboxActionsSheet
                isOpen={isActionsOpen}
                onClose={() => setIsActionsOpen(false)}
                selectedCount={selectedInboxIds.size}
                filterBy={filterBy}
                sortBy={sortBy}
                onSelectAll={onSelectAll}
                onCopyAll={onCopyAll}
                onBatchDelete={onBatchDelete}
                onFilterChange={onFilterChange}
                onSortChange={onSortChange}
                onCreateInbox={onCreateInbox}
            />

            {/* Inbox List with Pull-to-Refresh */}
            <PullToRefresh
                onRefresh={onPullRefresh}
                isRefreshing={isRefreshing}
                disabled={false}
                className="flex-1 min-h-0"
            >
                {busy && inboxes.length === 0 ? (
                    <div className="grid grid-cols-1 gap-4 p-4">
                        {Array(6).fill(0).map((_, i) => <InboxCardSkeleton key={i} />)}
                    </div>
                ) : filteredInboxes.length === 0 ? (
                    <EmptyInboxState onCreateInbox={onCreateInbox} />
                ) : (
                    <VirtualizedInboxList
                        inboxes={filteredInboxes}
                        selectedInboxIds={selectedInboxIds}
                        focusedIndex={focusedIndex}
                        onViewMessages={onViewMessages}
                        onDeleteInbox={onDeleteInbox}
                        onTransferInbox={onTransferInbox}
                        onExtendInbox={onExtendInbox}
                        onTogglePermanent={onTogglePermanent}
                        onShareModeChange={onShareModeChange}
                        onVisibilityRules={onVisibilityRules}
                        onToggleSelect={onToggleSelect}
                        onLongPress={onLongPress}
                        onSetFocusedIndex={onSetFocusedIndex}
                    />
                )}
            </PullToRefresh>

            {/* Footer stats */}
            {filteredInboxes.length > 0 && (
                <div className="flex items-center justify-center text-xs text-text-secondary py-3 border-t border-white/5">
                    <span>{inboxCountLabel}</span>
                    {selectedInboxIds.size > 0 && (
                        <span className="ml-1">• {selectedInboxIds.size} selected</span>
                    )}
                </div>
            )}
        </div>
    );
}
