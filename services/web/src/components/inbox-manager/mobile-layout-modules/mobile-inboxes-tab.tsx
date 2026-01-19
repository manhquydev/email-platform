/**
 * Inboxes Tab component for mobile inbox layout
 * Displays inbox list with toolbar, filtering, and batch actions
 */
import { GlassCard } from "../../ui/GlassCard";
import { InboxCard } from "../../InboxCard";
import { InboxCardSkeleton } from "../../Skeleton";
import { SwipeableInboxCard, PullToRefresh } from "../../mobile";
import { EmptyInboxState } from "./mobile-empty-states";
import type { Inbox, ShareMode } from "../../../types";
import type { FilterOption, SortOption } from "../hooks/use-inbox-filters";

export interface MobileInboxesTabProps {
    filteredInboxes: Inbox[];
    inboxes: Inbox[];
    busy: boolean;
    filterBy: FilterOption;
    sortBy: SortOption;
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
    onToggleSelect: (inboxId: string) => void;
    onSelectAll: () => void;
    onBatchDelete: () => void;
    onCopyAll: () => void;
    onLongPress: (inbox: Inbox) => void;
    onPullRefresh: () => Promise<void>;
    onSetFocusedIndex: (index: number) => void;
}

export function MobileInboxesTab({
    filteredInboxes, inboxes, busy, filterBy, sortBy, focusedIndex,
    selectedInboxIds, isRefreshing, onViewMessages, onDeleteInbox,
    onTransferInbox, onExtendInbox, onTogglePermanent, onShareModeChange,
    onVisibilityRules, onCreateInbox, onFilterChange, onSortChange,
    onToggleSelect, onSelectAll, onBatchDelete, onCopyAll, onLongPress,
    onPullRefresh, onSetFocusedIndex
}: MobileInboxesTabProps) {
    return (
        <div className="flex flex-col gap-4">
            {/* Toolbar */}
            <InboxesToolbar
                filteredInboxes={filteredInboxes}
                selectedInboxIds={selectedInboxIds}
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
                className="flex-1"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {busy && inboxes.length === 0 ? (
                        Array(6).fill(0).map((_, i) => <InboxCardSkeleton key={i} />)
                    ) : filteredInboxes.length === 0 ? (
                        <EmptyInboxState onCreateInbox={onCreateInbox} />
                    ) : (
                        filteredInboxes.map((inbox, index) => {
                            const email = `${inbox.localPart}@${inbox.domain?.name}`;
                            const card = (
                                <InboxCard
                                    key={inbox.id}
                                    inbox={inbox}
                                    isSelected={selectedInboxIds.has(inbox.id)}
                                    isActive={index === focusedIndex}
                                    onSelect={() => onSetFocusedIndex(index)}
                                    onToggleSelect={() => onToggleSelect(inbox.id)}
                                    onCopy={() => { }}
                                    onDelete={() => onDeleteInbox(inbox)}
                                    onViewMessages={() => onViewMessages(inbox)}
                                    onTransfer={() => onTransferInbox(inbox)}
                                    onExtend={() => onExtendInbox(inbox)}
                                    onTogglePermanent={() => onTogglePermanent(inbox)}
                                    onShareModeChange={(shareMode) => onShareModeChange(inbox.id, shareMode)}
                                    onVisibilityRules={() => onVisibilityRules(inbox)}
                                />
                            );

                            return (
                                <SwipeableInboxCard
                                    key={inbox.id}
                                    email={email}
                                    onDelete={() => onDeleteInbox(inbox)}
                                    onCopy={() => onLongPress(inbox)}
                                >
                                    <div onContextMenu={(e) => { e.preventDefault(); onLongPress(inbox); }}>
                                        {card}
                                    </div>
                                </SwipeableInboxCard>
                            );
                        })
                    )}
                </div>
            </PullToRefresh>

            {/* Footer stats */}
            {filteredInboxes.length > 0 && (
                <div className="flex items-center justify-center text-xs text-text-secondary py-4">
                    <span>{filteredInboxes.length} inboxes</span>
                    {selectedInboxIds.size > 0 && (
                        <span className="ml-1">• {selectedInboxIds.size} selected</span>
                    )}
                </div>
            )}
        </div>
    );
}

// Toolbar sub-component
interface InboxesToolbarProps {
    filteredInboxes: Inbox[];
    selectedInboxIds: Set<string>;
    filterBy: FilterOption;
    sortBy: SortOption;
    onSelectAll: () => void;
    onCopyAll: () => void;
    onBatchDelete: () => void;
    onFilterChange: (filter: FilterOption) => void;
    onSortChange: (sort: SortOption) => void;
    onCreateInbox: () => void;
}

function InboxesToolbar({
    filteredInboxes, selectedInboxIds, filterBy, sortBy,
    onSelectAll, onCopyAll, onBatchDelete, onFilterChange, onSortChange, onCreateInbox
}: InboxesToolbarProps) {
    return (
        <GlassCard className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between rounded-2xl">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                        <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={selectedInboxIds.size === filteredInboxes.length && filteredInboxes.length > 0}
                            onChange={onSelectAll}
                        />
                        <div className="w-5 h-5 rounded border border-white/40 bg-white/10 peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center group-hover:border-primary/50">
                            <svg className="w-3.5 h-3.5 text-white scale-0 peer-checked:scale-100 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <span className="text-sm font-medium text-text-secondary group-hover:text-text-main transition-colors">Select all</span>
                </label>

                {selectedInboxIds.size > 0 && (
                    <div className="flex items-center gap-2 animate-fade-in">
                        <button onClick={onCopyAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-text-main transition-colors border border-white/10">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                            </svg>
                            Copy ({selectedInboxIds.size})
                        </button>
                        <button onClick={onBatchDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-medium text-red-400 hover:text-red-300 transition-colors border border-red-500/20">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                            Delete ({selectedInboxIds.size})
                        </button>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg border border-white/5">
                    <select
                        value={filterBy}
                        onChange={(e) => onFilterChange(e.target.value as FilterOption)}
                        className="bg-transparent text-xs font-medium text-text-secondary hover:text-text-main focus:outline-none focus:text-primary cursor-pointer px-2 py-1 rounded"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="expiring">Expiring Soon</option>
                        <option value="expired">Expired</option>
                    </select>
                    <div className="w-px h-4 bg-white/10" />
                    <select
                        value={sortBy}
                        onChange={(e) => onSortChange(e.target.value as SortOption)}
                        className="bg-transparent text-xs font-medium text-text-secondary hover:text-text-main focus:outline-none focus:text-primary cursor-pointer px-2 py-1 rounded"
                    >
                        <option value="created">Newest</option>
                        <option value="name">Name A-Z</option>
                        <option value="ttl">Time Left</option>
                    </select>
                </div>

                <button
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 text-sm font-semibold whitespace-nowrap"
                    onClick={onCreateInbox}
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Create New
                </button>
            </div>
        </GlassCard>
    );
}
