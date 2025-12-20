import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api, PAGE_SIZE } from "../utils/api";
import { parseSearchQuery } from "../utils/searchParser";
import { Loading } from "../components/Loading";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { AppShell } from "../layouts/AppShell";
import { extractOTP } from "../utils/otpExtractor";
import type { Domain, Inbox, Message, PaginatedResponse } from "../types";

// Lazy load heavy modal components
const ComposeModal = lazy(() => import("../components/ComposeModal").then(m => ({ default: m.ComposeModal })));
const KeyboardShortcutsHelp = lazy(() => import("../components/KeyboardShortcutsHelp").then(m => ({ default: m.KeyboardShortcutsHelp })));

export function Dashboard() {
    const { token, user, logout: _logout } = useAuth();
    const [busy, setBusy] = useState(false);

    // Data
    const [domains, setDomains] = useState<Domain[]>([]);
    const [inboxes, setInboxes] = useState<Inbox[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    // Selection
    const [selectedDomain, setSelectedDomain] = useState<string>("");
    const [selectedInbox, setSelectedInbox] = useState<string>("");
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

    // Filter/Pagination States
    const [messageSearch, setMessageSearch] = useState("");
    const [messageHasAttachments, setMessageHasAttachments] = useState(false);
    const [messageOffset, setMessageOffset] = useState(0);
    const [messageTotal, setMessageTotal] = useState(0);

    // UI States
    const [showDetail, setShowDetail] = useState(false);
    const [showCompose, setShowCompose] = useState(false);
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
    const [showInboxPicker, setShowInboxPicker] = useState(false);
    const [composeInitialValues, setComposeInitialValues] = useState<{
        initialSubject?: string;
        initialBody?: string;
        initialTo?: string;
        initialFrom?: string;
    }>({});
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Bulk selection state
    const [_selectedIds, _setSelectedIds] = useState<Set<string>>(new Set());

    const isAdmin = user?.role === "ADMIN";
    const outboundEnabled = String(window.env?.OUTBOUND_ENABLED ?? import.meta.env.VITE_OUTBOUND_ENABLED ?? "false").toLowerCase() === "true";
    const canSendOutbound = outboundEnabled && isAdmin;

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

    const loadInboxes = useCallback(async (domainId: string) => {
        if (!token) return;
        setBusy(true);
        try {
            const domain = domains.find(d => d.id === domainId);
            if (!domain) return;
            const params = new URLSearchParams({ domain: domain.name, limit: "100" });
            const res = await api<PaginatedResponse<Inbox>>(`/inboxes?${params.toString()}`, { token });
            setInboxes(res.data);
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
            const parsed = parseSearchQuery(messageSearch);

            if (parsed.q && parsed.q.length >= 2 && !parsed.from && !parsed.before && !parsed.after && parsed.isRead === undefined) {
                const fuzzyParams = new URLSearchParams({
                    q: parsed.q, inboxId, limit: String(PAGE_SIZE.messages), threshold: "0.3",
                });
                if (parsed.hasAttachments || messageHasAttachments) fuzzyParams.append("hasAttachments", "true");
                const res = await api<PaginatedResponse<Message>>(`/messages/search/fuzzy?${fuzzyParams.toString()}`, { token });
                if (params.append) setMessages(prev => [...prev, ...res.data]);
                else setMessages(res.data);
                if (res.meta?.total !== undefined) setMessageTotal(res.meta.total);
                if (params.offset !== undefined) setMessageOffset(params.offset);
            } else {
                const queryParams = new URLSearchParams({ inboxId, limit: String(PAGE_SIZE.messages), offset: String(off) });
                if (parsed.q) queryParams.append("q", parsed.q);
                if (parsed.from) queryParams.append("from", parsed.from);
                if (parsed.hasAttachments || messageHasAttachments) queryParams.append("hasAttachments", "true");
                if (parsed.before) queryParams.append("end", parsed.before);
                if (parsed.after) queryParams.append("start", parsed.after);
                if (parsed.isRead !== undefined) queryParams.append("isRead", String(parsed.isRead));
                const res = await api<PaginatedResponse<Message>>(`/messages?${queryParams.toString()}`, { token });
                if (params.append) setMessages(prev => [...prev, ...res.data]);
                else setMessages(res.data);
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
    useEffect(() => { loadDomains(); }, [token]);
    useEffect(() => { if (selectedDomain) loadInboxes(selectedDomain); }, [selectedDomain]);
    useEffect(() => {
        if (selectedInbox) {
            loadMessages(selectedInbox, { offset: 0 });
            setSelectedMessage(null);
        } else {
            setMessages([]);
        }
    }, [selectedInbox, messageHasAttachments, loadMessages]);

    useEffect(() => {
        const t = setTimeout(() => { if (selectedInbox) loadMessages(selectedInbox); }, 500);
        return () => clearTimeout(t);
    }, [messageSearch, selectedInbox, loadMessages]);

    useEffect(() => {
        if (!selectedInbox) return;
        const interval = setInterval(() => { loadMessages(selectedInbox, { background: true }); }, 10000);
        return () => clearInterval(interval);
    }, [selectedInbox, loadMessages]);

    useEffect(() => {
        const unreadCount = messages.filter(m => !m.isRead).length;
        document.title = unreadCount > 0 ? `(${unreadCount}) Email Platform` : "Email Platform";
        return () => { document.title = "Email Platform"; };
    }, [messages]);

    // --- Actions ---
    const createInbox = async (domainId: string, localPart: string, expiresAt?: number) => {
        setBusy(true);
        try {
            const domain = domains.find(d => d.id === domainId);
            if (!domain) return;
            await api("/inboxes", {
                method: "POST", token,
                body: { domainId, localPart, expiresAt: expiresAt ? new Date(Date.now() + expiresAt).toISOString() : null }
            });
            toast.success("Đã tạo hộp thư mới");
            await loadInboxes(domain.id);
        } catch (e) {
            toast.error("Lỗi: " + (e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const deleteInbox = async (inboxId: string) => {
        setBusy(true);
        try {
            await api(`/inboxes/${inboxId}`, { method: "DELETE", token });
            toast.success("Đã xóa hộp thư");
            setInboxes(prev => prev.filter(i => i.id !== inboxId));
            if (selectedInbox === inboxId) {
                setSelectedInbox("");
                setMessages([]);
                setSelectedMessage(null);
            }
        } catch (e) {
            toast.error("Lỗi xóa hộp thư: " + (e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const handleSelectMessage = async (msg: Message) => {
        setSelectedMessage(msg);
        setShowDetail(true);
        if (!msg.isRead) {
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
            try { await api(`/messages/${msg.id}/read`, { method: "PATCH", token, body: { isRead: true } }); }
            catch (e) { console.error(e); }
        }
    };

    const handleMarkUnread = async (msgId: string) => {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isRead: false } : m));
        if (selectedMessage?.id === msgId) setSelectedMessage(prev => prev ? { ...prev, isRead: false } : null);
        try {
            await api(`/messages/${msgId}/read`, { method: "PATCH", token, body: { isRead: false } });
            toast.success("Đã đánh dấu chưa đọc");
        } catch (e) {
            console.error(e);
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isRead: true } : m));
            toast.error("Không thể cập nhật trạng thái");
        }
    };

    const handleDeleteMessage = useCallback(async () => {
        if (!selectedMessage) return;
        try {
            setBusy(true);
            await api(`/messages/${selectedMessage.id}`, { method: "DELETE", token });
            setMessages(prev => prev.filter(m => m.id !== selectedMessage.id));
            setSelectedMessage(null);
            setShowDetail(false);
            toast.success("Đã xóa email");
        } catch (e) {
            console.error(e);
            toast.error("Không thể xóa email");
        } finally {
            setBusy(false);
        }
    }, [selectedMessage, token]);

    const handleTogglePin = async (msgId: string, isPinned: boolean) => {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isPinned } : m));
        if (selectedMessage?.id === msgId) setSelectedMessage(prev => prev ? { ...prev, isPinned } : null);
        try {
            await api(`/messages/${msgId}/pin`, { method: "PATCH", token, body: { isPinned } });
            toast.success(isPinned ? "Đã ghim email" : "Đã bỏ ghim");
        } catch (e) {
            console.error(e);
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isPinned: !isPinned } : m));
            toast.error("Không thể cập nhật");
        }
    };

    const handleExtendInbox = async (inboxId: string) => {
        if (!token) return;
        setBusy(true);
        try {
            const inbox = inboxes.find(i => i.id === inboxId);
            if (!inbox) return;
            const currentExpiresAt = inbox.expiresAt ? new Date(inbox.expiresAt).getTime() : Date.now();
            const newExpiresAt = new Date(currentExpiresAt + 10 * 60 * 1000).toISOString();
            await api(`/inboxes/${inboxId}`, { method: "PATCH", body: JSON.stringify({ expiresAt: newExpiresAt }), token });
            toast.success("Đã gia hạn thêm 10 phút!");
            if (selectedDomain) loadInboxes(selectedDomain);
        } catch (e) {
            console.error(e);
            toast.error("Lỗi gia hạn inbox");
        } finally {
            setBusy(false);
        }
    };

    const handleKeyboardSelect = useCallback((index: number) => {
        if (messages[index]) handleSelectMessage(messages[index]);
    }, [messages]);

    const handleForwardEmail = useCallback(() => {
        if (!selectedMessage) return;
        const body = `\n\n\n-------- Forwarded Message --------\nFrom: ${selectedMessage.fromAddress}\nDate: ${selectedMessage.receivedAt}\nSubject: ${selectedMessage.subject}\nTo: ${selectedMessage.toAddress}\n\n${selectedMessage.textBody || ""}`;
        setComposeInitialValues({ initialSubject: `Fwd: ${selectedMessage.subject}`, initialBody: body });
        setShowCompose(true);
    }, [selectedMessage]);
    void handleForwardEmail; // suppress unused warning

    const copyOTP = (otp: string) => {
        navigator.clipboard.writeText(otp);
        toast.success(`Đã copy OTP: ${otp}`);
    };

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
        onBack: () => { if (showDetail) setShowDetail(false); },
        enabled: !showCompose && !showKeyboardHelp,
    });

    // Helper functions
    const selectedDomainObj = domains.find(d => d.id === selectedDomain);
    const selectedInboxObj = inboxes.find(i => i.id === selectedInbox);
    const formatTime = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        if (diff < 60000) return "Vừa xong";
        if (diff < 3600000) return `${Math.floor(diff / 60000)} phút`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ`;
        return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
    };

    return (
        <AppShell>
            <div className="modern-dashboard">
                {/* Left Panel - Inbox Selector */}
                <aside className="dashboard-sidebar">
                    <div className="sidebar-header">
                        <h2>Hộp thư</h2>
                        <button
                            className="btn-nebula btn-nebula-icon btn-nebula-ghost"
                            onClick={() => setShowKeyboardHelp(true)}
                            title="Phím tắt (?)"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                    </div>

                    {/* Domain Tabs */}
                    <div className="domain-tabs">
                        {domains.map(domain => (
                            <button
                                key={domain.id}
                                onClick={() => setSelectedDomain(domain.id)}
                                className={`domain-tab ${selectedDomain === domain.id ? 'active' : ''}`}
                            >
                                <span className="domain-tab-dot" style={{ background: domain.status === 'VERIFIED' ? 'var(--nebula-success)' : 'var(--nebula-warning)' }} />
                                <span className="domain-tab-name">{domain.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Inboxes List */}
                    <div className="inbox-list">
                        {inboxes.length === 0 && !busy && (
                            <div className="inbox-empty">
                                <p>Chưa có hộp thư nào</p>
                                <button
                                    onClick={() => setShowInboxPicker(true)}
                                    className="btn-nebula btn-nebula-primary btn-nebula-sm"
                                >
                                    + Tạo hộp thư
                                </button>
                            </div>
                        )}
                        {inboxes.map(inbox => (
                            <div
                                key={inbox.id}
                                onClick={() => setSelectedInbox(inbox.id)}
                                className={`inbox-item ${selectedInbox === inbox.id ? 'active' : ''}`}
                            >
                                <div className="inbox-item-main">
                                    <span className="inbox-item-email">{inbox.localPart}@</span>
                                    {inbox.expiresAt && (
                                        <span className="inbox-item-expires">
                                            {Math.max(0, Math.floor((new Date(inbox.expiresAt).getTime() - Date.now()) / 60000))}m
                                        </span>
                                    )}
                                </div>
                                <div className="inbox-item-actions">
                                    {inbox.expiresAt && (
                                        <button onClick={(e) => { e.stopPropagation(); handleExtendInbox(inbox.id); }} title="Gia hạn">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                                                <circle cx="12" cy="12" r="10" />
                                            </svg>
                                        </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); deleteInbox(inbox.id); }} title="Xóa">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Create Inbox Button */}
                    {selectedDomainObj && (
                        <div className="sidebar-footer">
                            <button
                                onClick={() => setShowInboxPicker(true)}
                                className="btn-nebula btn-nebula-secondary w-full"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                Tạo hộp thư mới
                            </button>
                        </div>
                    )}
                </aside>

                {/* Main Panel - Email List */}
                <main className="dashboard-main">
                    {/* Search & Filter Bar */}
                    <div className="email-toolbar">
                        <div className="email-search">
                            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Tìm kiếm email... (from:, is:unread, before:)"
                                value={messageSearch}
                                onChange={(e) => setMessageSearch(e.target.value)}
                            />
                        </div>
                        <div className="email-toolbar-actions">
                            <button
                                onClick={() => setMessageHasAttachments(!messageHasAttachments)}
                                className={`toolbar-btn ${messageHasAttachments ? 'active' : ''}`}
                                title="Lọc có đính kèm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                            </button>
                            <button
                                onClick={() => selectedInbox && loadMessages(selectedInbox)}
                                className="toolbar-btn"
                                title="Làm mới (R)"
                            >
                                <svg className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Email List */}
                    <div className="email-list">
                        {!selectedInbox && (
                            <div className="email-list-empty">
                                <div className="empty-icon">
                                    <svg fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                </div>
                                <h3>Chọn một hộp thư</h3>
                                <p>Chọn hộp thư từ sidebar bên trái để xem email</p>
                            </div>
                        )}

                        {selectedInbox && messages.length === 0 && !busy && (
                            <div className="email-list-empty">
                                <div className="empty-icon">
                                    <svg fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                                    </svg>
                                </div>
                                <h3>Chưa có email nào</h3>
                                <p>Email gửi đến {selectedInboxObj?.localPart}@{selectedDomainObj?.name} sẽ xuất hiện ở đây</p>
                            </div>
                        )}

                        {messages.map((msg, index) => {
                            const otp = extractOTP(msg.textBody || msg.htmlBody || "");
                            return (
                                <div
                                    key={msg.id}
                                    onClick={() => handleSelectMessage(msg)}
                                    className={`email-card neo-hover-lift ${selectedMessage?.id === msg.id ? 'active neo-animate-glow-pulse' : ''} ${!msg.isRead ? 'unread' : ''}`}
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    {/* Unread indicator */}
                                    {!msg.isRead && <div className="email-card-unread-dot neo-animate-glow-pulse" />}

                                    {/* Avatar */}
                                    <div className="email-card-avatar">
                                        {msg.fromAddress?.charAt(0).toUpperCase() || "?"}
                                    </div>

                                    {/* Content */}
                                    <div className="email-card-content">
                                        <div className="email-card-header">
                                            <span className="email-card-sender">{msg.fromAddress?.split("@")[0] || "Unknown"}</span>
                                            <span className="email-card-time">{formatTime(msg.receivedAt)}</span>
                                        </div>
                                        <div className="email-card-subject">{msg.subject || "(Không có tiêu đề)"}</div>
                                        <div className="email-card-preview">
                                            {msg.textBody?.slice(0, 100) || "Không có nội dung..."}
                                        </div>
                                    </div>

                                    {/* OTP Badge */}
                                    {otp && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); copyOTP(typeof otp === 'string' ? otp : otp.code); }}
                                            className="email-card-otp neo-hover-scale neo-animate-glow-pulse"
                                            title="Click để copy OTP"
                                        >
                                            <span className="otp-label">OTP</span>
                                            <span className="otp-value">{typeof otp === 'string' ? otp : otp.code}</span>
                                        </button>
                                    )}

                                    {/* Pin indicator */}
                                    {msg.isPinned && (
                                        <div className="email-card-pin neo-animate-float">📌</div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Load More */}
                        {messages.length < messageTotal && (
                            <button
                                onClick={() => selectedInbox && loadMessages(selectedInbox, { offset: messageOffset + PAGE_SIZE.messages, append: true })}
                                className="load-more-btn"
                            >
                                Tải thêm ({messages.length}/{messageTotal})
                            </button>
                        )}
                    </div>
                </main>

                {/* Slide-over Detail Panel */}
                {showDetail && selectedMessage && (
                    <>
                        <div className="detail-overlay neo-glass-light" onClick={() => setShowDetail(false)} />
                        <aside className="detail-panel neo-glass-heavy neo-animate-slide-in-right">
                            <div className="detail-header">
                                <button onClick={() => setShowDetail(false)} className="btn-nebula btn-nebula-ghost btn-nebula-icon">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                <div className="detail-header-actions">
                                    <button onClick={() => handleMarkUnread(selectedMessage.id)} className="btn-nebula btn-nebula-ghost btn-nebula-icon" title="Đánh dấu chưa đọc">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                    <button onClick={() => handleTogglePin(selectedMessage.id, !selectedMessage.isPinned)} className="btn-nebula btn-nebula-ghost btn-nebula-icon" title={selectedMessage.isPinned ? "Bỏ ghim" : "Ghim"}>
                                        <svg className="w-4 h-4" fill={selectedMessage.isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                        </svg>
                                    </button>
                                    <button onClick={handleDeleteMessage} className="btn-nebula btn-nebula-ghost btn-nebula-icon text-[var(--nebula-error)]" title="Xóa">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="detail-content">
                                {/* OTP Highlight */}
                                {(() => {
                                    const otpResult = extractOTP(selectedMessage.textBody || selectedMessage.htmlBody || "");
                                    const otp = typeof otpResult === 'string' ? otpResult : otpResult?.code;
                                    if (otp) return (
                                        <button onClick={() => copyOTP(otp)} className="detail-otp-card">
                                            <div className="detail-otp-icon">🔢</div>
                                            <div className="detail-otp-info">
                                                <span className="detail-otp-label">Mã xác minh</span>
                                                <span className="detail-otp-value">{otp}</span>
                                            </div>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                    );
                                    return null;
                                })()}

                                {/* Email Meta */}
                                <div className="detail-meta">
                                    <div className="detail-meta-row">
                                        <span className="detail-meta-label">Từ</span>
                                        <span className="detail-meta-value">{selectedMessage.fromAddress}</span>
                                    </div>
                                    <div className="detail-meta-row">
                                        <span className="detail-meta-label">Đến</span>
                                        <span className="detail-meta-value">{selectedMessage.toAddress}</span>
                                    </div>
                                    <div className="detail-meta-row">
                                        <span className="detail-meta-label">Ngày</span>
                                        <span className="detail-meta-value">
                                            {new Date(selectedMessage.receivedAt).toLocaleString("vi-VN")}
                                        </span>
                                    </div>
                                </div>

                                {/* Subject */}
                                <h2 className="detail-subject">{selectedMessage.subject || "(Không có tiêu đề)"}</h2>

                                {/* Body */}
                                <div className="detail-body">
                                    {selectedMessage.htmlBody ? (
                                        <iframe
                                            srcDoc={selectedMessage.htmlBody}
                                            sandbox="allow-same-origin"
                                            title="Email content"
                                            className="detail-iframe"
                                        />
                                    ) : (
                                        <pre className="detail-text">{selectedMessage.textBody || "Không có nội dung"}</pre>
                                    )}
                                </div>

                                {/* Attachments */}
                                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                                    <div className="detail-attachments">
                                        <h4>📎 Đính kèm ({selectedMessage.attachments.length})</h4>
                                        <div className="detail-attachments-list">
                                            {selectedMessage.attachments.map((att, idx) => (
                                                <a key={idx} href={`/api/attachments/${att.storageKey}`} target="_blank" rel="noopener noreferrer" className="detail-attachment">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <span>{att.filename || `Tệp ${idx + 1}`}</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </aside>
                    </>
                )}

                {/* Create Inbox Modal */}
                {showInboxPicker && selectedDomainObj && (
                    <div className="modal-overlay" onClick={() => setShowInboxPicker(false)}>
                        <div className="modal-content animate-nebula-scale-in" onClick={e => e.stopPropagation()}>
                            <h3>Tạo hộp thư mới</h3>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const form = e.target as HTMLFormElement;
                                const localPart = (form.elements.namedItem("localPart") as HTMLInputElement).value;
                                const expires = (form.elements.namedItem("expires") as HTMLSelectElement).value;
                                createInbox(selectedDomainObj.id, localPart, expires ? parseInt(expires) : undefined);
                                setShowInboxPicker(false);
                            }}>
                                <div className="modal-field">
                                    <label className="label-nebula">Địa chỉ email</label>
                                    <div className="input-email-combo">
                                        <input
                                            name="localPart"
                                            type="text"
                                            placeholder="username"
                                            className="input-nebula"
                                            required
                                            autoFocus
                                        />
                                        <span>@{selectedDomainObj.name}</span>
                                    </div>
                                </div>
                                <div className="modal-field">
                                    <label className="label-nebula">Thời gian hết hạn</label>
                                    <select name="expires" className="input-nebula">
                                        <option value="">Không hết hạn</option>
                                        <option value="300000">5 phút</option>
                                        <option value="600000">10 phút</option>
                                        <option value="1800000">30 phút</option>
                                        <option value="3600000">1 giờ</option>
                                    </select>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" onClick={() => setShowInboxPicker(false)} className="btn-nebula btn-nebula-secondary">Hủy</button>
                                    <button type="submit" className="btn-nebula btn-nebula-primary">Tạo hộp thư</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Compose Modal */}
                {showCompose && (
                    <Suspense fallback={<Loading />}>
                        <ComposeModal
                            token={token}
                            inboxes={inboxes}
                            onClose={() => { setShowCompose(false); setComposeInitialValues({}); }}
                            {...composeInitialValues}
                        />
                    </Suspense>
                )}

                {/* Keyboard Help Modal */}
                {showKeyboardHelp && (
                    <Suspense fallback={null}>
                        <KeyboardShortcutsHelp onClose={() => setShowKeyboardHelp(false)} />
                    </Suspense>
                )}

                {busy && !messages.length && <Loading fullScreen />}
            </div>
        </AppShell>
    );
}
