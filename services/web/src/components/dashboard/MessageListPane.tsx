/**
 * MessageListPane Component
 * Message list with toolbar, search, and email stream
 */

import type { RefObject } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { InboxSelector } from "../InboxSelector";
import { EmailStream } from "../EmailStream";
import { cn } from "../../utils/cn";
import type { Domain, Inbox, Message, User } from "../../types";

interface MessageListPaneProps {
    // Data
    domains: Domain[];
    inboxes: Inbox[];
    messages: Message[];
    activeDomain: Domain | undefined;
    activeInbox: Inbox | undefined;
    selectedMessage: Message | null;

    // Selection
    selectedDomain: string;
    selectedInbox: string;

    // Pagination
    messageTotal: number;
    messageOffset: number;

    // Search
    messageSearch: string;
    onSearchChange: (value: string) => void;
    searchInputRef: RefObject<HTMLInputElement>;

    // Actions
    onSelectDomain: (id: string) => void;
    onSelectMessage: (msg: Message) => void;
    onCreateInbox: (domainId: string, localPart: string, expiresAt?: number) => Promise<void>;
    onDeleteInbox: (inbox: Inbox) => Promise<void>;
    onRefresh: () => void;
    onLoadMore: () => void;
    onCopyOTP: (otp: string) => void;
    onOpenMobileSidebar: () => void;
    onOpenCompose: () => void;

    // State
    busy: boolean;
    canSendOutbound: boolean;
    user: User | null;
    token: string | null;
}

export function MessageListPane({
    domains,
    inboxes,
    messages,
    activeDomain,
    activeInbox,
    selectedMessage,
    selectedDomain,
    selectedInbox,
    messageTotal,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    messageOffset: _messageOffset,
    messageSearch,
    onSearchChange,
    searchInputRef,
    onSelectDomain,
    onSelectMessage,
    onCreateInbox,
    onDeleteInbox,
    onRefresh,
    onLoadMore,
    onCopyOTP,
    onOpenMobileSidebar,
    onOpenCompose,
    busy,
    canSendOutbound,
    user,
    token,
}: MessageListPaneProps) {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className={cn(
                "flex flex-col h-full bg-nebula-surface/50 border-r border-nebula-border",
                selectedMessage ? "hidden md:flex md:w-[360px]" : "w-full md:w-[360px] flex-shrink-0"
            )}
        >
            {/* Toolbar */}
            <div className="h-16 px-4 border-b border-nebula-border flex items-center justify-between shrink-0 bg-nebula-surface/80 backdrop-blur-md">
                <div className="flex items-center gap-3 overflow-hidden">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden shrink-0 text-nebula-text"
                        onClick={onOpenMobileSidebar}
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>}
                    />

                    {/* Mobile: Inbox Selector */}
                    <div className="md:hidden w-full">
                        <InboxSelector
                            domains={domains}
                            inboxes={inboxes}
                            selectedDomainId={selectedDomain}
                            selectedInboxId={selectedInbox}
                            onSelectDomain={onSelectDomain}
                            onSelectInbox={(id) => navigate(`?inboxId=${id}`)}
                            onCreateInbox={onCreateInbox}
                            onDeleteInbox={onDeleteInbox}
                            user={user}
                            token={token}
                        />
                    </div>

                    {/* Desktop: Static Header */}
                    <div className="hidden md:flex flex-col">
                        <span className="text-[10px] font-bold text-nebula-text-muted uppercase tracking-wider">{activeDomain?.name}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-nebula-text">
                                {activeInbox ? `${activeInbox.localPart}@${activeInbox.domain?.name || activeDomain?.name}` : "Chọn hộp thư"}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onRefresh}
                        disabled={busy}
                        className="text-nebula-text-muted hover:text-nebula-violet"
                        icon={<svg className={cn("w-5 h-5", busy && "animate-spin")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                    />
                    {canSendOutbound && (
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={onOpenCompose}
                            className="ml-2"
                        >
                            Soạn thư
                        </Button>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-nebula-border shrink-0">
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nebula-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        ref={searchInputRef}
                        type="text"
                        className="w-full bg-nebula-elevated border border-nebula-border rounded-lg pl-10 pr-4 py-2 text-sm text-nebula-text placeholder:text-nebula-text-muted focus:outline-none focus:border-nebula-violet/50 transition-colors"
                        placeholder="Tìm kiếm... (từ:, là:chưa đọc)"
                        value={messageSearch}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-hidden relative">
                {!selectedInbox ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-nebula-text-muted">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">inbox</span>
                        <p className="text-sm">Chọn một hộp thư để xem tin nhắn</p>
                    </div>
                ) : (
                    <div className="h-full flex flex-col">
                        <div className="flex-1 overflow-hidden">
                            <EmailStream
                                messages={messages}
                                selectedMessageId={selectedMessage?.id || null}
                                onSelectMessage={onSelectMessage}
                                onCopyOTP={onCopyOTP}
                                className="pb-24 md:pb-0"
                            />
                            {/* Load More Button */}
                            {messages.length < messageTotal && (
                                <div className="p-4 flex justify-center border-t border-nebula-border">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={onLoadMore}
                                    >
                                        Tải thêm ({messages.length}/{messageTotal})
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
