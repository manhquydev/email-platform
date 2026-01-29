/**
 * LeftPane component for desktop inbox layout
 * Inbox list with filters and header actions
 */
import { InboxSidebar } from "../../split-pane/InboxSidebar";
import type { Inbox, ShareMode } from "../../../types";
import type { FilterOption, SortOption } from "../hooks/use-inbox-filters";

export interface LeftPaneProps {
    filteredInboxes: Inbox[];
    inboxes: Inbox[];
    activeInbox: Inbox | null;
    busy: boolean;
    filterBy: FilterOption;
    sortBy: SortOption;
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
    loadMessages: (inboxId: string) => void;
    navigate: (path: string) => void;
}

export function LeftPane({
    filteredInboxes, inboxes, activeInbox, busy, filterBy, sortBy,
    onSelectInbox, onDeleteInbox, onTransferInbox, onExtendInbox,
    onTogglePermanent, onShareModeChange, onVisibilityRules, onCopyPublicLink,
    onCreateInbox, onFilterChange, onSortChange, loadMessages, navigate
}: LeftPaneProps) {
    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-3 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-sm font-semibold text-text-main flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.5)]" />
                            <span className="text-cyan-400">Quản lý</span>
                        </h2>
                        <p className="text-[11px] text-text-secondary mt-0.5">{filteredInboxes.length} inboxes</p>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            className="p-2 hover:bg-white/5 rounded-xl text-text-secondary hover:text-primary transition-all"
                            onClick={() => navigate('/app')}
                            title="Đọc email"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </button>
                        <button
                            className="p-2 hover:bg-white/5 rounded-xl text-text-secondary hover:text-cyan-400 transition-all"
                            onClick={() => navigate('/my-domains')}
                            title="Quản lý tên miền"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <button
                            className="p-2 bg-primary/10 hover:bg-primary/20 rounded-xl text-primary transition-all hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] active:scale-95"
                            onClick={onCreateInbox}
                            title="Tạo inbox mới (n)"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                </div>
                {/* Filters */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <select
                        value={filterBy}
                        onChange={(e) => onFilterChange(e.target.value as FilterOption)}
                        className="text-[10px] px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-text-secondary hover:text-text-main hover:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer transition-all"
                    >
                        <option value="all">Tất cả</option>
                        <option value="active">Đang hoạt động</option>
                        <option value="expiring">Sắp hết hạn</option>
                        <option value="expired">Đã hết hạn</option>
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => onSortChange(e.target.value as SortOption)}
                        className="text-[10px] px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-text-secondary hover:text-text-main hover:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer transition-all"
                    >
                        <option value="created">Mới nhất</option>
                        <option value="name">Tên A-Z</option>
                        <option value="ttl">Thời gian</option>
                    </select>
                </div>
            </div>
            {/* Inbox list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <InboxSidebar
                    inboxes={filteredInboxes}
                    activeInboxId={activeInbox?.id || null}
                    onSelectInbox={(id) => {
                        const inbox = inboxes.find(i => i.id === id);
                        if (inbox) {
                            onSelectInbox(inbox);
                            loadMessages(inbox.id);
                        }
                    }}
                    onCopyPublicLink={onCopyPublicLink}
                    onDeleteInbox={onDeleteInbox}
                    onTransferInbox={onTransferInbox}
                    onExtendInbox={onExtendInbox}
                    onTogglePermanent={onTogglePermanent}
                    onShareModeChange={onShareModeChange}
                    onVisibilityRules={onVisibilityRules}
                    isLoading={busy && inboxes.length === 0}
                />
            </div>
        </div>
    );
}
