import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api, PAGE_SIZE } from "../utils/api";
import { parseSearchQuery } from "../utils/searchParser";
import { Loading } from "../components/Loading";
import { FocusStreamLayout } from "../layouts/FocusStreamLayout";
import { EmailStream } from "../components/EmailStream";
import { QuickGenerateCard } from "../components/QuickGenerateCard";
import { InboxToolbar } from "../components/InboxToolbar";
import type { Domain, Inbox, Message, PaginatedResponse } from "../types";

// Lazy load modals
const ComposeModal = lazy(() => import("../components/ComposeModal").then(m => ({ default: m.ComposeModal })));
const CreateInboxModal = lazy(() => import("../components/CreateInboxModal").then(m => ({ default: m.CreateInboxModal })));

export function FocusDashboard() {
    const { token, user: _user } = useAuth();
    const [busy, setBusy] = useState(false);

    // Data
    const [domains, setDomains] = useState<Domain[]>([]);
    const [inboxes, setInboxes] = useState<Inbox[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    // Selection
    const [selectedDomain, setSelectedDomain] = useState<string>("");
    const [selectedInbox, setSelectedInbox] = useState<string>("");
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

    // UI States
    const [showDetail, setShowDetail] = useState(false);
    const [showCompose, setShowCompose] = useState(false);
    const [showCreateInbox, setShowCreateInbox] = useState(false);
    const [_showInboxPicker, _setShowInboxPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

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
            toast.error("Lỗi tải danh sách domain");
        }
    }, [token, selectedDomain]);

    const loadInboxes = useCallback(async (domainId: string) => {
        if (!token) return;
        setBusy(true);
        try {
            const domain = domains.find(d => d.id === domainId);
            if (!domain) return;
            const params = new URLSearchParams({ domain: domain.name, limit: "100", personal: "true" });
            const res = await api<PaginatedResponse<Inbox>>(`/inboxes?${params.toString()}`, { token });
            setInboxes(res.data);
            // Auto-select first inbox
            if (res.data.length > 0 && !selectedInbox) {
                setSelectedInbox(res.data[0].id);
            }
        } catch (e) {
            toast.error("Lỗi tải danh sách inbox");
        } finally {
            setBusy(false);
        }
    }, [token, domains, selectedInbox]);

    const loadMessages = useCallback(async (inboxId: string, background = false) => {
        if (!token) return;
        if (!background) setBusy(true);
        try {
            const parsed = parseSearchQuery(searchQuery);
            const queryParams = new URLSearchParams({
                inboxId,
                limit: String(PAGE_SIZE.messages),
                offset: "0"
            });
            if (parsed.q) queryParams.append("q", parsed.q);
            if (parsed.from) queryParams.append("from", parsed.from);
            if (parsed.hasAttachments) queryParams.append("hasAttachments", "true");

            const res = await api<PaginatedResponse<Message>>(`/messages?${queryParams.toString()}`, { token });
            setMessages(res.data);
        } catch (e) {
            if (!background) toast.error("Lỗi tải email");
        } finally {
            if (!background) setBusy(false);
        }
    }, [token, searchQuery]);

    // --- Effects ---
    useEffect(() => { loadDomains(); }, [token]);
    useEffect(() => { if (selectedDomain) loadInboxes(selectedDomain); }, [selectedDomain, loadInboxes]);
    useEffect(() => {
        if (selectedInbox) {
            loadMessages(selectedInbox);
            setSelectedMessage(null);
        } else {
            setMessages([]);
        }
    }, [selectedInbox, loadMessages]);

    // Auto-refresh
    useEffect(() => {
        if (!selectedInbox) return;
        const interval = setInterval(() => loadMessages(selectedInbox, true), 10000);
        return () => clearInterval(interval);
    }, [selectedInbox, loadMessages]);

    // Update title with unread count
    useEffect(() => {
        const unreadCount = messages.filter(m => !m.isRead).length;
        document.title = unreadCount > 0 ? `(${unreadCount}) Ephemera` : "Ephemera";
        return () => { document.title = "Ephemera"; };
    }, [messages]);

    // --- Actions ---
    const handleSelectInbox = (inbox: Inbox) => {
        setSelectedInbox(inbox.id);
    };

    const handleCreateInbox = () => {
        setShowCreateInbox(true);
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    const handleSelectMessage = async (msg: Message) => {
        setSelectedMessage(msg);
        setShowDetail(true);

        // Mark as read
        if (!msg.isRead) {
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
            try {
                await api(`/messages/${msg.id}/read`, {
                    method: "PATCH",
                    token,
                    body: { isRead: true }
                });
            } catch (e) {
                // background update failed
            }
        }
    };

    const handleDeleteMessage = async () => {
        if (!selectedMessage) return;
        try {
            setBusy(true);
            await api(`/messages/${selectedMessage.id}`, { method: "DELETE", token });
            setMessages(prev => prev.filter(m => m.id !== selectedMessage.id));
            setSelectedMessage(null);
            setShowDetail(false);
            toast.success("Đã xóa email");
        } catch (e) {
            toast.error("Không thể xóa email");
        } finally {
            setBusy(false);
        }
    };

    const handleTogglePin = async () => {
        if (!selectedMessage) return;
        const newPinned = !selectedMessage.isPinned;
        setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, isPinned: newPinned } : m));
        setSelectedMessage(prev => prev ? { ...prev, isPinned: newPinned } : null);
        try {
            await api(`/messages/${selectedMessage.id}/pin`, { method: "PATCH", token, body: { isPinned: newPinned } });
            toast.success(newPinned ? "Đã ghim email" : "Đã bỏ ghim");
        } catch (e) {
            setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, isPinned: !newPinned } : m));
            toast.error("Không thể cập nhật");
        }
    };

    const handleMarkUnread = async () => {
        if (!selectedMessage) return;
        setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, isRead: false } : m));
        setSelectedMessage(prev => prev ? { ...prev, isRead: false } : null);
        try {
            await api(`/messages/${selectedMessage.id}/read`, { method: "PATCH", token, body: { isRead: false } });
            toast.success("Đã đánh dấu chưa đọc");
        } catch (e) {
            toast.error("Không thể cập nhật trạng thái");
        }
    };

    const unreadCount = messages.filter(m => !m.isRead).length;
    const currentInbox = inboxes.find(i => i.id === selectedInbox);

    // Copy email to clipboard
    const handleCopyEmail = useCallback(() => {
        if (currentInbox) {
            const email = `${currentInbox.localPart}@${currentInbox.domain?.name}`;
            navigator.clipboard.writeText(email);
            toast.success("Đã sao chép địa chỉ email!", { icon: "📋", duration: 2000 });
        }
    }, [currentInbox]);

    // Delete inbox
    const handleDeleteInbox = async (inbox: Inbox) => {
        try {
            setBusy(true);
            await api(`/inboxes/${inbox.id}`, { method: "DELETE", token });
            setInboxes(prev => prev.filter(i => i.id !== inbox.id));
            if (selectedInbox === inbox.id) {
                setSelectedInbox("");
                setMessages([]);
            }
            toast.success("Đã xóa hộp thư");
        } catch (e) {
            toast.error("Không thể xóa hộp thư");
        } finally {
            setBusy(false);
        }
    };

    // Keyboard shortcut for copy
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // C for copy email (only when not in input)
            if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey &&
                document.activeElement?.tagName !== 'INPUT' &&
                document.activeElement?.tagName !== 'TEXTAREA' &&
                currentInbox) {
                e.preventDefault();
                handleCopyEmail();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleCopyEmail, currentInbox]);

    if (busy && messages.length === 0) {
        return (
            <FocusStreamLayout
                domains={domains}
                inboxes={inboxes}
                onSelectInbox={handleSelectInbox}
                onCreateInbox={handleCreateInbox}
                onSearch={handleSearch}
                unreadCount={unreadCount}
            >
                <div className="focus-stream-header">
                    <div className="focus-stream-title">
                        <h1>Đang tải...</h1>
                    </div>
                </div>
                <div className="focus-stream-content">
                    <Loading />
                </div>
            </FocusStreamLayout>
        );
    }

    return (
        <FocusStreamLayout
            domains={domains}
            inboxes={inboxes}
            onSelectInbox={handleSelectInbox}
            onCreateInbox={handleCreateInbox}
            onSearch={handleSearch}
            unreadCount={unreadCount}
        >
            {/* Header with InboxToolbar */}
            <div className="focus-stream-header">
                <InboxToolbar
                    inboxes={inboxes}
                    currentInbox={currentInbox || null}
                    onSelectInbox={handleSelectInbox}
                    onCreateInbox={handleCreateInbox}
                    onDeleteInbox={handleDeleteInbox}
                />
                <div className="focus-stream-actions">
                    <button
                        className="icon-rail-item"
                        onClick={() => selectedInbox && loadMessages(selectedInbox)}
                        title="Làm mới (R)"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 20, height: 20 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Email Stream or Welcome State */}
            <div className="focus-stream-content">
                {!selectedInbox ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted max-w-md mx-auto p-8 text-center">
                        <div className="p-4 bg-surface rounded-full mb-6 ring-8 ring-primary/5">
                            <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-text-main mb-2">Chào mừng bạn trở lại!</h3>
                        <p className="text-sm mb-8">
                            Chọn hộp thư từ sidebar bên trái để xem email hoặc tạo một địa chỉ mới ngay lập tức bên dưới.
                        </p>

                        <div className="w-full">
                            <QuickGenerateCard
                                domains={domains}
                                token={token}
                                onInboxCreated={(id, email) => {
                                    loadInboxes(selectedDomain);
                                    setSelectedInbox(id);
                                    toast.success(`Đã tạo: ${email}`);
                                }}
                            />
                        </div>
                    </div>
                ) : (
                    <EmailStream
                        messages={messages}
                        selectedMessageId={selectedMessage?.id || null}
                        onSelectMessage={handleSelectMessage}
                    />
                )}
            </div>

            {/* Detail Overlay */}
            {showDetail && selectedMessage && (
                <div className="stream-detail-overlay" onClick={() => setShowDetail(false)}>
                    <div className="stream-detail-panel" onClick={e => e.stopPropagation()}>
                        <div className="stream-detail-header">
                            <button onClick={() => setShowDetail(false)} className="stream-detail-close" title="Đóng">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <h2>{selectedMessage.subject || '(Không có tiêu đề)'}</h2>
                            <div className="stream-detail-actions">
                                <button onClick={handleTogglePin} className="stream-detail-action" title={selectedMessage.isPinned ? "Bỏ ghim" : "Ghim"}>
                                    <svg viewBox="0 0 24 24" fill={selectedMessage.isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" style={{ width: 18, height: 18 }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                                    </svg>
                                </button>
                                <button onClick={handleMarkUnread} className="stream-detail-action" title="Đánh dấu chưa đọc">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 18, height: 18 }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
                                    </svg>
                                </button>
                                <button onClick={handleDeleteMessage} className="stream-detail-action stream-detail-action--danger" title="Xóa">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 18, height: 18 }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="stream-detail-meta">
                            <strong>Từ:</strong> {selectedMessage.fromAddress}
                            <br />
                            <strong>Đến:</strong> {selectedMessage.toAddress}
                            <br />
                            <strong>Ngày:</strong> {new Date(selectedMessage.receivedAt).toLocaleString('vi-VN')}
                        </div>
                        <div className="stream-detail-body">
                            {selectedMessage.htmlBody ? (
                                <iframe
                                    srcDoc={selectedMessage.htmlBody}
                                    title="Email content"
                                    sandbox="allow-same-origin allow-scripts"
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

            {/* Compose Modal */}
            <Suspense fallback={null}>
                {showCompose && (
                    <ComposeModal
                        token={token}
                        inboxes={inboxes}
                        onClose={() => {
                            setShowCompose(false);
                            if (selectedDomain) loadInboxes(selectedDomain);
                        }}
                    />
                )}
            </Suspense>

            {/* Create Inbox Modal */}
            <Suspense fallback={null}>
                {showCreateInbox && (
                    <CreateInboxModal
                        domains={domains}
                        token={token}
                        onClose={() => setShowCreateInbox(false)}
                        onInboxCreated={(inbox) => {
                            if (selectedDomain) loadInboxes(selectedDomain);
                            setSelectedInbox(inbox.id);
                            setShowCreateInbox(false);
                            toast.success(`Đã tạo: ${inbox.localPart}@${inbox.domain?.name}`);
                        }}
                    />
                )}
            </Suspense>
        </FocusStreamLayout>
    );
}
