import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api, PAGE_SIZE } from "../utils/api";
import { InboxCard } from "../components/InboxCard";
import { TabNavigation, InboxTabIcon, MessagesTabIcon } from "../components/TabNavigation";
import { EmailStream } from "../components/EmailStream";
import { FocusStreamLayout } from "../layouts/FocusStreamLayout";
import { usePullToRefresh, PullToRefreshIndicator } from "../components/MobileNavigation";
import { InboxCardSkeleton, MessageItemSkeleton } from "../components/Skeleton";
import type { Domain, Inbox, Message, PaginatedResponse } from "../types";
import { lazy, Suspense } from "react";

const CreateInboxModal = lazy(() => import("../components/CreateInboxModal").then(m => ({ default: m.CreateInboxModal })));

type SortOption = 'created' | 'name' | 'ttl' | 'messages';
type FilterOption = 'all' | 'active' | 'expired' | 'expiring';

export function InboxManager() {
    const { token } = useAuth();
    const [busy, setBusy] = useState(false);

    // Data
    const [domains, setDomains] = useState<Domain[]>([]);
    const [inboxes, setInboxes] = useState<Inbox[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    // Selection
    const [selectedDomain, setSelectedDomain] = useState<string>("");
    const [activeInbox, setActiveInbox] = useState<Inbox | null>(null);
    const [selectedInboxIds, setSelectedInboxIds] = useState<Set<string>>(new Set());

    // UI States
    const [activeTab, setActiveTab] = useState<'inboxes' | 'messages'>('inboxes');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>('created');
    const [filterBy, setFilterBy] = useState<FilterOption>('all');
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(0);

    // Tabs config
    const tabs = [
        { id: 'inboxes', label: 'Hộp thư', icon: <InboxTabIcon /> },
        { id: 'messages', label: 'Tin nhắn', icon: <MessagesTabIcon />, badge: messages.filter(m => !m.isRead).length }
    ];

    // --- Loaders ---
    const loadDomains = useCallback(async () => {
        if (!token) return;
        try {
            const res = await api<PaginatedResponse<Domain>>("/domains?limit=100", { token });
            setDomains(res.data);
            if (res.data.length > 0 && !selectedDomain) {
                setSelectedDomain(res.data[0].id);
            }
        } catch (e) {
            console.error(e);
            toast.error("Lỗi tải danh sách domain");
        }
    }, [token, selectedDomain]);

    const loadInboxes = useCallback(async () => {
        if (!token || !selectedDomain) return;
        setBusy(true);
        try {
            const domain = domains.find(d => d.id === selectedDomain);
            if (!domain) return;
            const params = new URLSearchParams({
                domain: domain.name,
                limit: "100",
                personal: "true" // Always fetch my own inboxes in App view
            });
            const res = await api<PaginatedResponse<Inbox>>(`/inboxes?${params.toString()}`, { token });
            setInboxes(res.data);
        } catch (e) {
            console.error("Load Inboxes Error:", e);
            toast.error("Lỗi tải danh sách inbox");
        } finally {
            setBusy(false);
        }
    }, [token, domains, selectedDomain]);

    const loadMessages = useCallback(async (inboxId: string) => {
        if (!token) return;
        setBusy(true);
        try {
            const queryParams = new URLSearchParams({
                inboxId,
                limit: String(PAGE_SIZE.messages),
                offset: "0"
            });
            const res = await api<PaginatedResponse<Message>>(`/messages?${queryParams.toString()}`, { token });
            setMessages(res.data);
        } catch (e) {
            console.error(e);
            toast.error("Lỗi tải email");
        } finally {
            setBusy(false);
        }
    }, [token]);

    // --- Effects ---
    useEffect(() => { loadDomains(); }, [token]);
    useEffect(() => { if (selectedDomain) loadInboxes(); }, [selectedDomain, loadInboxes]);
    useEffect(() => {
        if (activeInbox) {
            loadMessages(activeInbox.id);
        } else {
            setMessages([]);
        }
    }, [activeInbox, loadMessages]);

    // --- Sorting & Filtering ---
    const getFilteredInboxes = useCallback(() => {
        let filtered = [...inboxes];

        // Filter
        const now = new Date();
        if (filterBy === 'active') {
            filtered = filtered.filter(i => !i.expiresAt || new Date(i.expiresAt) > now);
        } else if (filterBy === 'expired') {
            filtered = filtered.filter(i => i.expiresAt && new Date(i.expiresAt) <= now);
        } else if (filterBy === 'expiring') {
            const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            filtered = filtered.filter(i => i.expiresAt && new Date(i.expiresAt) > now && new Date(i.expiresAt) <= in24h);
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.localPart.localeCompare(b.localPart);
                case 'ttl':
                    if (!a.expiresAt && !b.expiresAt) return 0;
                    if (!a.expiresAt) return 1;
                    if (!b.expiresAt) return -1;
                    return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
                case 'created':
                default:
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
        });

        return filtered;
    }, [inboxes, sortBy, filterBy]);

    const filteredInboxes = getFilteredInboxes();

    // --- Actions ---
    const handleSelectInbox = (inbox: Inbox) => {
        setActiveInbox(inbox);
    };

    const handleViewMessages = (inbox: Inbox) => {
        setActiveInbox(inbox);
        setActiveTab('messages');
    };

    const handleToggleSelect = (inboxId: string) => {
        setSelectedInboxIds(prev => {
            const next = new Set(prev);
            if (next.has(inboxId)) {
                next.delete(inboxId);
            } else {
                next.add(inboxId);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedInboxIds.size === filteredInboxes.length) {
            setSelectedInboxIds(new Set());
        } else {
            setSelectedInboxIds(new Set(filteredInboxes.map(i => i.id)));
        }
    };

    const handleDeleteInbox = async (inbox: Inbox) => {
        if (!confirm(`Xóa hộp thư ${inbox.localPart}@${inbox.domain?.name}?`)) return;
        try {
            await api(`/inboxes/${inbox.id}`, { method: "DELETE", token });
            setInboxes(prev => prev.filter(i => i.id !== inbox.id));
            if (activeInbox?.id === inbox.id) {
                setActiveInbox(null);
                setMessages([]);
            }
            toast.success("Đã xóa hộp thư");
        } catch (e) {
            console.error(e);
            toast.error("Không thể xóa hộp thư");
        }
    };

    const handleBatchDelete = async () => {
        if (selectedInboxIds.size === 0) return;
        if (!confirm(`Xóa ${selectedInboxIds.size} hộp thư đã chọn?`)) return;

        setBusy(true);
        let deleted = 0;
        for (const id of selectedInboxIds) {
            try {
                await api(`/inboxes/${id}`, { method: "DELETE", token });
                deleted++;
            } catch (e) {
                console.error(`Failed to delete inbox ${id}`, e);
            }
        }
        setInboxes(prev => prev.filter(i => !selectedInboxIds.has(i.id)));
        setSelectedInboxIds(new Set());
        if (activeInbox && selectedInboxIds.has(activeInbox.id)) {
            setActiveInbox(null);
            setMessages([]);
        }
        setBusy(false);
        toast.success(`Đã xóa ${deleted} hộp thư`);
    };

    const handleCopyAll = () => {
        if (selectedInboxIds.size === 0) return;
        const emails = filteredInboxes
            .filter(i => selectedInboxIds.has(i.id))
            .map(i => `${i.localPart}@${i.domain?.name}`)
            .join('\n');
        navigator.clipboard.writeText(emails);
        toast.success(`Đã sao chép ${selectedInboxIds.size} địa chỉ`);
    };

    // Keyboard navigation
    useEffect(() => {
        if (activeTab !== 'inboxes') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT') return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setFocusedIndex(prev => Math.min(prev + 1, filteredInboxes.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setFocusedIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (filteredInboxes[focusedIndex]) {
                        handleViewMessages(filteredInboxes[focusedIndex]);
                    }
                    break;
                case ' ':
                    e.preventDefault();
                    if (filteredInboxes[focusedIndex]) {
                        handleToggleSelect(filteredInboxes[focusedIndex].id);
                    }
                    break;
                case 'Delete':
                case 'Backspace':
                    if (selectedInboxIds.size > 0) {
                        e.preventDefault();
                        handleBatchDelete();
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [activeTab, filteredInboxes, focusedIndex, selectedInboxIds]);

    const handleSelectMessage = async (msg: Message) => {
        setSelectedMessage(msg);
        setShowDetail(true);
        // Mark as read
        if (!msg.isRead) {
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
            try {
                await api(`/messages/${msg.id}/read`, { method: "PATCH", token, body: { isRead: true } });
            } catch (e) { console.error(e); }
        }
    };

    const handleSearch = (query: string) => {
        console.log("Search:", query);
        // TODO: Implement search
    };

    const unreadCount = messages.filter(m => !m.isRead).length;

    // Pull to Refresh logic
    const { pullDistance, isRefreshing, threshold } = usePullToRefresh(async () => {
        if (activeTab === 'inboxes') {
            await loadInboxes();
        } else if (activeInbox) {
            await loadMessages(activeInbox.id);
        }
    });



    return (
        <FocusStreamLayout
            domains={domains}
            inboxes={inboxes}
            onSelectInbox={handleSelectInbox}
            onCreateInbox={() => setShowCreateModal(true)}
            onSearch={handleSearch}
            unreadCount={unreadCount}
        >
            <PullToRefreshIndicator
                pullDistance={pullDistance}
                threshold={threshold}
                isRefreshing={isRefreshing}
            />
            {/* Tab Navigation */}
            <div className="inbox-manager-header">
                <TabNavigation
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={(id) => setActiveTab(id as 'inboxes' | 'messages')}
                />
            </div>

            {/* Tab Content */}
            <div className="inbox-manager-content">
                {activeTab === 'inboxes' ? (
                    <div className="inbox-manager-list-container">
                        {/* Toolbar */}
                        <div className="inbox-manager-toolbar">
                            <div className="inbox-manager-toolbar-left">
                                <label className="inbox-manager-select-all">
                                    <input
                                        type="checkbox"
                                        checked={selectedInboxIds.size === filteredInboxes.length && filteredInboxes.length > 0}
                                        onChange={handleSelectAll}
                                    />
                                    <span>Chọn tất cả</span>
                                </label>

                                {selectedInboxIds.size > 0 && (
                                    <div className="inbox-manager-batch-actions">
                                        <button onClick={handleCopyAll} className="inbox-manager-batch-btn">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                            </svg>
                                            Sao chép ({selectedInboxIds.size})
                                        </button>
                                        <button onClick={handleBatchDelete} className="inbox-manager-batch-btn inbox-manager-batch-btn--danger">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                            </svg>
                                            Xóa ({selectedInboxIds.size})
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="inbox-manager-toolbar-right">
                                <select
                                    value={filterBy}
                                    onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                                    className="inbox-manager-filter"
                                >
                                    <option value="all">Tất cả</option>
                                    <option value="active">Đang hoạt động</option>
                                    <option value="expiring">Sắp hết hạn</option>
                                    <option value="expired">Đã hết hạn</option>
                                </select>

                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                                    className="inbox-manager-sort"
                                >
                                    <option value="created">Mới nhất</option>
                                    <option value="name">Tên A-Z</option>
                                    <option value="ttl">Thời hạn</option>
                                </select>

                                <button
                                    className="inbox-manager-create-btn"
                                    onClick={() => setShowCreateModal(true)}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    Tạo mới
                                </button>
                            </div>
                        </div>

                        {/* Inbox List */}
                        <div className="inbox-manager-list">
                            {busy && inboxes.length === 0 ? (
                                Array(5).fill(0).map((_, i) => <InboxCardSkeleton key={i} />)
                            ) : filteredInboxes.length === 0 ? (
                                <div className="inbox-manager-empty">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
                                    </svg>
                                    <h3>Chưa có hộp thư nào</h3>
                                    <p>Tạo email tạm thời đầu tiên của bạn</p>
                                    <button onClick={() => setShowCreateModal(true)}>
                                        Tạo email mới
                                    </button>
                                </div>
                            ) : (
                                filteredInboxes.map((inbox, index) => (
                                    <InboxCard
                                        key={inbox.id}
                                        inbox={inbox}
                                        isSelected={selectedInboxIds.has(inbox.id)}
                                        isActive={index === focusedIndex}
                                        onSelect={() => setFocusedIndex(index)}
                                        onToggleSelect={() => handleToggleSelect(inbox.id)}
                                        onCopy={() => { }}
                                        onDelete={() => handleDeleteInbox(inbox)}
                                        onViewMessages={() => handleViewMessages(inbox)}
                                    />
                                ))
                            )}
                        </div>

                        {/* Footer stats */}
                        {filteredInboxes.length > 0 && (
                            <div className="inbox-manager-footer">
                                <span>{filteredInboxes.length} hộp thư</span>
                                {selectedInboxIds.size > 0 && (
                                    <span> • {selectedInboxIds.size} đã chọn</span>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Messages Tab */
                    <div className="inbox-manager-messages">
                        {activeInbox ? (
                            <>
                                <div className="inbox-manager-messages-header">
                                    <h2>{activeInbox.localPart}@{activeInbox.domain?.name}</h2>
                                    <span className="inbox-manager-messages-count">{messages.length} emails</span>
                                </div>
                                {busy && messages.length === 0 ? (
                                    <div className="space-y-0">
                                        {Array(5).fill(0).map((_, i) => <MessageItemSkeleton key={i} />)}
                                    </div>
                                ) : (
                                    <EmailStream
                                        messages={messages}
                                        selectedMessageId={selectedMessage?.id || null}
                                        onSelectMessage={handleSelectMessage}
                                    />
                                )}
                            </>
                        ) : (
                            <div className="inbox-manager-no-inbox">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                                <h3>Chọn một hộp thư</h3>
                                <p>Chọn hộp thư từ tab "Hộp thư" để xem tin nhắn</p>
                                <button onClick={() => setActiveTab('inboxes')}>
                                    Đi đến Hộp thư
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Message Detail Overlay */}
            {showDetail && selectedMessage && (
                <div className="stream-detail-overlay" onClick={() => setShowDetail(false)}>
                    <div className="stream-detail-panel" onClick={e => e.stopPropagation()}>
                        <div className="stream-detail-header">
                            <button onClick={() => setShowDetail(false)} className="stream-detail-close">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <h2>{selectedMessage.subject || '(Không có tiêu đề)'}</h2>
                        </div>
                        <div className="stream-detail-meta">
                            <strong>Từ:</strong> {selectedMessage.fromAddress}<br />
                            <strong>Ngày:</strong> {new Date(selectedMessage.receivedAt).toLocaleString('vi-VN')}
                        </div>
                        <div className="stream-detail-body">
                            {selectedMessage.htmlBody ? (
                                <iframe
                                    srcDoc={selectedMessage.htmlBody}
                                    title="Email content"
                                    sandbox="allow-same-origin"
                                    style={{ width: '100%', height: '400px', border: 'none' }}
                                />
                            ) : (
                                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                                    {selectedMessage.textBody || 'Không có nội dung'}
                                </pre>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Inbox Modal */}
            <Suspense fallback={null}>
                {showCreateModal && (
                    <CreateInboxModal
                        domains={domains}
                        token={token}
                        onClose={() => setShowCreateModal(false)}
                        onInboxCreated={(_id, email, domainId) => {
                            if (domainId && domainId !== selectedDomain) {
                                setSelectedDomain(domainId);
                            } else {
                                loadInboxes();
                            }
                            setShowCreateModal(false);
                            toast.success(`Đã tạo: ${email}`);
                        }}
                    />
                )}
            </Suspense>
        </FocusStreamLayout>
    );
}
