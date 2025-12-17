import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api, PAGE_SIZE } from "../utils/api";
import { parseSearchQuery } from "../utils/searchParser";
import { Sidebar } from "../components/Sidebar";
import { MessageList } from "../components/MessageList";
import { MessageDetail } from "../components/MessageDetail";
import { Loading } from "../components/Loading";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { CategoryTabs, useCategoryFilter } from "../components/CategoryTabs";
import { useConversationMode } from "../components/ConversationView";
import { MobileNavigation } from "../components/MobileNavigation";
import { AppHeader } from "../components/AppHeader";
import type { Domain, Inbox, Message, PaginatedResponse } from "../types";

// Lazy load heavy modal components
const ComposeModal = lazy(() => import("../components/ComposeModal").then(m => ({ default: m.ComposeModal })));
const KeyboardShortcutsHelp = lazy(() => import("../components/KeyboardShortcutsHelp").then(m => ({ default: m.KeyboardShortcutsHelp })));

export function Dashboard() {
    const { token, user, logout } = useAuth();
    const [busy, setBusy] = useState(false);

    // Data
    const [domains, setDomains] = useState<Domain[]>([]);
    const [inboxes, setInboxes] = useState<Inbox[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    // Selection
    // Initialize from localStorage or first available
    const [selectedDomain, setSelectedDomain] = useState<string>("");
    const [selectedInbox, setSelectedInbox] = useState<string>("");
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

    // Filter/Pagination States
    const [messageSearch, setMessageSearch] = useState("");
    const [messageHasAttachments, setMessageHasAttachments] = useState(false);
    const [messageOffset, setMessageOffset] = useState(0);
    const [messageTotal, setMessageTotal] = useState(0);

    // Mobile View State
    const [mobileView, setMobileView] = useState<"sidebar" | "list" | "detail">("sidebar");

    const [showCompose, setShowCompose] = useState(false);
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Bulk selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Category filtering
    const { activeCategory, setActiveCategory, filteredMessages } = useCategoryFilter(messages);

    // Conversation mode toggle
    const { isConversationMode, toggleMode: toggleConversationMode } = useConversationMode();

    // Mobile navigation tab
    const [mobileTab, setMobileTab] = useState<"inbox" | "compose" | "search" | "settings">("inbox");

    const isAdmin = user?.role === "ADMIN";
    // Check outgoing support
    const outboundEnabled =
        String(window.env?.OUTBOUND_ENABLED ?? import.meta.env.VITE_OUTBOUND_ENABLED ?? "false").toLowerCase() === "true";
    const canSendOutbound = outboundEnabled && isAdmin;

    // --- Loaders ---

    const loadDomains = useCallback(async () => {
        if (!token) return;
        try {
            const res = await api<PaginatedResponse<Domain>>("/domains?limit=100", { token }); // Load all (up to 100) for sidebar
            setDomains(res.data);

            // Auto-select first domain if none selected
            if (res.data.length > 0 && !selectedDomain) {
                setSelectedDomain(res.data[0].id);
            }
        } catch (e) {
            console.error(e);
            toast.error("Lỗi tải danh sách domain");
        }
    }, [token, selectedDomain]);

    const loadInboxes = useCallback(async (domainId: string) => {
        if (!token) return;
        setBusy(true);
        try {
            const domain = domains.find(d => d.id === domainId);
            if (!domain) return;

            const params = new URLSearchParams({
                domain: domain.name,
                limit: "100"
            });
            const res = await api<PaginatedResponse<Inbox>>(`/inboxes?${params.toString()}`, { token });
            setInboxes(res.data);

            // Reset message list when switching domains
            setMessages([]);
            setSelectedMessage(null);
            setSelectedInbox("");
        } catch (e) {
            console.error("Load Inboxes Error:", e);
            toast.error("Lỗi tải danh sách inbox");
        } finally {
            setBusy(false);
        }
    }, [token, domains]);

    const loadMessages = useCallback(async (inboxId: string, params: { offset?: number, append?: boolean, background?: boolean } = {}) => {
        if (!token) return;
        if (!params.background) setBusy(true);

        try {
            const off = params.offset ?? 0;

            // Parse search query for advanced operators
            const parsed = parseSearchQuery(messageSearch);

            // Use fuzzy search when there's a simple text query (better relevance)
            if (parsed.q && parsed.q.length >= 2 && !parsed.from && !parsed.before && !parsed.after && parsed.isRead === undefined) {
                const fuzzyParams = new URLSearchParams({
                    q: parsed.q,
                    inboxId,
                    limit: String(PAGE_SIZE.messages),
                    threshold: "0.3", // Default similarity threshold
                });
                if (parsed.hasAttachments || messageHasAttachments) fuzzyParams.append("hasAttachments", "true");

                const res = await api<PaginatedResponse<Message>>(`/messages/search/fuzzy?${fuzzyParams.toString()}`, { token });

                if (params.append) {
                    setMessages(prev => [...prev, ...res.data]);
                } else {
                    setMessages(res.data);
                }
                if (res.meta?.total !== undefined) setMessageTotal(res.meta.total);
                if (params.offset !== undefined) setMessageOffset(params.offset);
            } else {
                // Standard search with all operators
                const queryParams = new URLSearchParams({
                    inboxId,
                    limit: String(PAGE_SIZE.messages),
                    offset: String(off),
                });

                // Add parsed operators to query
                if (parsed.q) queryParams.append("q", parsed.q);
                if (parsed.from) queryParams.append("from", parsed.from);
                if (parsed.hasAttachments || messageHasAttachments) queryParams.append("hasAttachments", "true");
                if (parsed.before) queryParams.append("end", parsed.before);
                if (parsed.after) queryParams.append("start", parsed.after);
                if (parsed.isRead !== undefined) queryParams.append("isRead", String(parsed.isRead));

                const res = await api<PaginatedResponse<Message>>(`/messages?${queryParams.toString()}`, { token });

                if (params.append) {
                    setMessages(prev => [...prev, ...res.data]);
                } else {
                    setMessages(res.data);
                }

                if (res.meta?.total !== undefined) setMessageTotal(res.meta.total);
                if (params.offset !== undefined) setMessageOffset(params.offset);
            }

        } catch (e) {
            console.error(e);
            if (!params.background) toast.error("Lỗi tải email");
        } finally {
            if (!params.background) setBusy(false);
        }
    }, [token, messageSearch, messageHasAttachments]);

    // --- Effects ---

    // 1. Initial Domain Load
    useEffect(() => {
        loadDomains();
    }, [token]);

    // 2. Load Inboxes when Domain Changes
    useEffect(() => {
        if (selectedDomain) {
            loadInboxes(selectedDomain);
        }
    }, [selectedDomain]);

    // 3. Load Messages when Inbox or Filters Change
    useEffect(() => {
        if (selectedInbox) {
            loadMessages(selectedInbox, { offset: 0 });
            setSelectedMessage(null);
            // On mobile, go to list
            setMobileView("list");
        } else {
            setMessages([]);
        }
    }, [selectedInbox, messageHasAttachments, loadMessages]);

    // 4. Search Debounce (Simple effect)
    useEffect(() => {
        const t = setTimeout(() => {
            if (selectedInbox) loadMessages(selectedInbox);
        }, 500);
        return () => clearTimeout(t);
    }, [messageSearch, selectedInbox, loadMessages]);

    // 5. Auto-refresh (10 seconds for better responsiveness)
    useEffect(() => {
        if (!selectedInbox) return;
        const interval = setInterval(() => {
            loadMessages(selectedInbox, { background: true });
        }, 10000);
        return () => clearInterval(interval);
    }, [selectedInbox, loadMessages]);

    // 6. Document title badge for unread emails
    useEffect(() => {
        const unreadCount = messages.filter(m => !m.isRead).length;
        const baseTitle = "Email Platform";

        if (unreadCount > 0) {
            document.title = `(${unreadCount}) ${baseTitle}`;
        } else {
            document.title = baseTitle;
        }

        return () => {
            document.title = baseTitle;
        };
    }, [messages]);


    // --- Actions ---

    const createDomain = async (name: string) => {
        setBusy(true);
        try {
            await api("/domains", { method: "POST", token, body: { name } });
            toast.success("Đã thêm domain thành công");
            await loadDomains();
        } catch (e) {
            toast.error("Lỗi: " + (e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const createInbox = async (domainId: string, localPart: string, expiresAt?: number) => {
        setBusy(true);
        try {
            const domain = domains.find(d => d.id === domainId);
            if (!domain) return;

            await api("/inboxes", {
                method: "POST",
                token,
                body: {
                    domainId,
                    localPart,
                    expiresAt: expiresAt ? new Date(Date.now() + expiresAt).toISOString() : null
                }
            });
            toast.success("Đã tạo hộp thư mới");
            await loadInboxes(domain.id); // Use domain.id here, assuming loadInboxes expects ID (checked above)
        } catch (e) {
            toast.error("Lỗi: " + (e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const verifyDomain = async (domainId: string, tokenString: string) => {
        setBusy(true);
        try {
            await api(`/domains/${domainId}/verify`, { method: "POST", token, body: { token: tokenString } });
            toast.success("Xác thực domain thành công");
            await loadDomains();
        } catch (e) {
            toast.error("Lỗi xác thực: " + (e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const deleteDomain = async (domainId: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa domain này không?")) return;
        setBusy(true);
        try {
            await api(`/domains/${domainId}`, { method: "DELETE", token });
            toast.success("Đã xóa domain");
            setSelectedDomain(""); // Reset selection
            await loadDomains();
        } catch (e) {
            toast.error("Lỗi xóa domain: " + (e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const handleSelectMessage = async (msg: Message) => {
        setSelectedMessage(msg);
        setMobileView("detail"); // Go to detail on mobile

        // Mark read
        if (!msg.isRead) {
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
            try {
                await api(`/messages/${msg.id}/read`, { method: "PATCH", token, body: { isRead: true } });
            } catch (e) { console.error(e); }
        }
    };

    const handleMarkUnread = async (msgId: string) => {
        // Optimistic update
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isRead: false } : m));
        if (selectedMessage?.id === msgId) {
            setSelectedMessage(prev => prev ? { ...prev, isRead: false } : null);
        }
        try {
            await api(`/messages/${msgId}/read`, { method: "PATCH", token, body: { isRead: false } });
            toast.success("Đã đánh dấu chưa đọc");
        } catch (e) {
            console.error(e);
            // Revert on error
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isRead: true } : m));
            toast.error("Không thể cập nhật trạng thái");
        }
    };

    // Handle keyboard-based message selection by index
    const handleKeyboardSelect = useCallback((index: number) => {
        if (messages[index]) {
            handleSelectMessage(messages[index]);
        }
    }, [messages]);

    // Handle delete current message
    const handleDeleteMessage = useCallback(async () => {
        if (!selectedMessage) return;
        try {
            setBusy(true);
            await api(`/messages/${selectedMessage.id}`, { method: "DELETE", token });
            setMessages(prev => prev.filter(m => m.id !== selectedMessage.id));
            setSelectedMessage(null);
            toast.success("Đã xóa email");
        } catch (e) {
            console.error(e);
            toast.error("Không thể xóa email");
        } finally {
            setBusy(false);
        }
    }, [selectedMessage, token]);

    // Handle toggle pin
    const handleTogglePin = async (msgId: string, isPinned: boolean) => {
        // Optimistic update
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isPinned } : m));
        if (selectedMessage?.id === msgId) {
            setSelectedMessage(prev => prev ? { ...prev, isPinned } : null);
        }
        try {
            await api(`/messages/${msgId}/pin`, { method: "PATCH", token, body: { isPinned } });
            toast.success(isPinned ? "Đã ghim email" : "Đã bỏ ghim");
        } catch (e) {
            console.error(e);
            // Revert on error
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isPinned: !isPinned } : m));
            toast.error("Không thể cập nhật");
        }
    };

    // Handle snooze
    const handleSnooze = async (msgId: string, until: Date | null) => {
        const snoozedUntil = until?.toISOString() ?? null;
        // Optimistic update
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, snoozedUntil } : m));
        if (selectedMessage?.id === msgId) {
            setSelectedMessage(prev => prev ? { ...prev, snoozedUntil } : null);
        }
        try {
            await api(`/messages/${msgId}/snooze`, { method: "PATCH", token, body: { snoozedUntil } });
            toast.success(until ? "Email sẽ xuất hiện lại sau" : "Đã xóa snooze");
        } catch (e) {
            console.error(e);
            toast.error("Không thể cập nhật");
        }
    };

    // Bulk selection handlers
    const handleToggleSelect = (msgId: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(msgId)) {
                next.delete(msgId);
            } else {
                next.add(msgId);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        setSelectedIds(new Set(messages.map(m => m.id)));
    };

    const handleClearSelection = () => {
        setSelectedIds(new Set());
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);

        // Optimistic update
        setMessages(prev => prev.filter(m => !selectedIds.has(m.id)));
        setSelectedIds(new Set());

        try {
            setBusy(true);
            await Promise.all(ids.map(id =>
                api(`/messages/${id}`, { method: "DELETE", token })
            ));
            toast.success(`Đã xóa ${ids.length} email`);
        } catch (e) {
            console.error(e);
            toast.error("Lỗi khi xóa");
            // Reload on error
            if (selectedInbox) loadMessages(selectedInbox);
        } finally {
            setBusy(false);
        }
    };

    const handleBulkMarkRead = async () => {
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);

        // Optimistic update
        setMessages(prev => prev.map(m => selectedIds.has(m.id) ? { ...m, isRead: true } : m));
        setSelectedIds(new Set());

        try {
            await Promise.all(ids.map(id =>
                api(`/messages/${id}/read`, { method: "PATCH", token, body: { isRead: true } })
            ));
            toast.success(`Đã đánh dấu ${ids.length} email đã đọc`);
        } catch (e) {
            console.error(e);
            toast.error("Lỗi khi đánh dấu");
        }
    };

    // Keyboard shortcuts
    useKeyboardShortcuts({
        messages,
        selectedMessageId: selectedMessage?.id,
        onSelectMessage: handleKeyboardSelect,
        onDeleteMessage: handleDeleteMessage,
        onMarkUnread: selectedMessage ? () => handleMarkUnread(selectedMessage.id) : undefined,
        onReply: canSendOutbound ? () => setShowCompose(true) : undefined,
        onRefresh: selectedInbox ? () => loadMessages(selectedInbox) : undefined,
        onFocusSearch: () => searchInputRef.current?.focus(),
        onShowHelp: () => setShowKeyboardHelp(true),
        onBack: () => {
            if (mobileView === 'detail') setMobileView('list');
            else if (mobileView === 'list') setMobileView('sidebar');
            else setSelectedMessage(null);
        },
        enabled: !showCompose && !showKeyboardHelp,
    });

    return (
        <div className="dashboard-with-header">
            <AppHeader />
            <div className="pane-layout">

                {/* Left Pane: Sidebar */}
                <div className={`h-full border-r border-border bg-surface ${mobileView === 'sidebar' ? 'block w-full' : 'hidden'} md:block md:w-auto overflow-hidden`}>
                    <Sidebar
                        domains={domains}
                        inboxes={inboxes}
                        selectedDomainId={selectedDomain}
                        selectedInboxId={selectedInbox}
                        onSelectDomain={setSelectedDomain}
                        onSelectInbox={setSelectedInbox}
                        onCreateDomain={createDomain}
                        onCreateInbox={createInbox}
                        onVerifyDomain={verifyDomain}
                        onDeleteDomain={deleteDomain}
                        onLogout={logout}
                        isAdmin={isAdmin}
                        currentUserId={user?.id}
                        busy={busy}
                    />
                </div>

                {/* Middle Pane: Message List */}
                <div className={`h-full border-r border-border bg-surface ${mobileView === 'list' ? 'block w-full' : 'hidden'} md:block md:w-auto overflow-hidden flex flex-col`}>
                    {/* Category Tabs */}
                    {selectedInbox && messages.length > 0 && (
                        <div className="px-3 pt-2 pb-1 border-b border-border flex-shrink-0">
                            <CategoryTabs
                                messages={messages}
                                activeCategory={activeCategory}
                                onCategoryChange={setActiveCategory}
                            />
                        </div>
                    )}

                    {/* Conversation Mode Toggle */}
                    {selectedInbox && messages.length > 0 && (
                        <div className="px-3 py-1 border-b border-border flex items-center justify-between text-xs text-muted flex-shrink-0">
                            <span>{filteredMessages.length} email{filteredMessages.length !== 1 ? 's' : ''}</span>
                            <button
                                onClick={toggleConversationMode}
                                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${isConversationMode ? 'bg-primary-light text-primary' : 'hover:bg-bg'}`}
                                title={isConversationMode ? 'Chế độ danh sách' : 'Chế độ hội thoại'}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    {isConversationMode ? (
                                        <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                                    ) : (
                                        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
                                    )}
                                </svg>
                                <span>{isConversationMode ? 'Danh sách' : 'Hội thoại'}</span>
                            </button>
                        </div>
                    )}

                    <div className="flex-1 overflow-hidden">
                        <MessageList
                            inbox={inboxes.find(i => i.id === selectedInbox)}
                            messages={[...filteredMessages].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))}
                            selectedMessageId={selectedMessage?.id}
                            onSelectMessage={handleSelectMessage}
                            onMarkUnread={handleMarkUnread}
                            onTogglePin={handleTogglePin}
                            onSnooze={handleSnooze}
                            search={messageSearch}
                            onSearchChange={setMessageSearch}
                            searchInputRef={searchInputRef}
                            hasAttachments={messageHasAttachments}
                            onToggleAttachments={() => setMessageHasAttachments(prev => !prev)}
                            onRefresh={() => selectedInbox && loadMessages(selectedInbox)}
                            loading={busy}
                            canLoadMore={messages.length < messageTotal}
                            onLoadMore={() => selectedInbox && loadMessages(selectedInbox, { offset: messageOffset + PAGE_SIZE.messages, append: true })}
                            onBack={() => setMobileView("sidebar")}
                            selectedIds={selectedIds}
                            onToggleSelect={handleToggleSelect}
                            onSelectAll={handleSelectAll}
                            onClearSelection={handleClearSelection}
                            onBulkDelete={handleBulkDelete}
                            onBulkMarkRead={handleBulkMarkRead}
                            onDelete={handleDeleteMessage}
                        />
                    </div>
                </div>

                {/* Right Pane: Message Detail */}
                <div className={`h-full bg-surface ${mobileView === 'detail' ? 'block w-full' : 'hidden'} md:block overflow-hidden`}>
                    <MessageDetail
                        message={selectedMessage}
                        onComposeReply={() => canSendOutbound && setShowCompose(true)}
                        onBack={() => setMobileView("list")}
                    />
                </div>

                {/* Modals */}
                {showCompose && (
                    <Suspense fallback={<Loading />}>
                        <ComposeModal
                            token={token}
                            inboxes={inboxes}
                            onClose={() => setShowCompose(false)}
                        />
                    </Suspense>
                )}

                {showKeyboardHelp && (
                    <Suspense fallback={null}>
                        <KeyboardShortcutsHelp onClose={() => setShowKeyboardHelp(false)} />
                    </Suspense>
                )}

                {busy && !messages.length && <Loading fullScreen />}

                {/* Mobile Bottom Navigation */}
                <MobileNavigation
                    activeTab={mobileTab}
                    onTabChange={(tab) => {
                        setMobileTab(tab);
                        if (tab === 'inbox') setMobileView('list');
                        if (tab === 'settings') setMobileView('sidebar');
                    }}
                    unreadCount={messages.filter(m => !m.isRead).length}
                    onCompose={() => canSendOutbound && setShowCompose(true)}
                />
            </div>
        </div>
    );
}
