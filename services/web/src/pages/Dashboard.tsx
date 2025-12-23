import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api, PAGE_SIZE } from "../utils/api";
import { parseSearchQuery } from "../utils/searchParser";
import { Loading } from "../components/Loading";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { AppShell } from "../layouts/AppShell";
import { extractOTP } from "../utils/otpExtractor";
import { Sidebar } from "../components/Sidebar";
import { QuickGenerateCard } from "../components/QuickGenerateCard";
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
                // Prefer owned domains if available, else first public one
                const myDomains = res.data.filter(d => d.ownerId === user?.id);
                if (myDomains.length > 0) {
                    setSelectedDomain(myDomains[0].id);
                } else {
                    setSelectedDomain(res.data[0].id);
                }
            }
        } catch (e) {
            console.error(e);
            toast.error("Lỗi tải danh sách domain");
        }
    }, [token, selectedDomain, user?.id]);

    const loadInboxes = useCallback(async (domainId: string) => {
        if (!token) return;
        setBusy(true);
        try {
            const domain = domains.find(d => d.id === domainId);
            if (!domain) return;
            // Get ALL inboxes for this domain that I can see
            // Note: API might filter for us. Assuming /inboxes returns my inboxes or all if I am admin?
            // Actually, usually /inboxes list returns inboxes I own or created.
            const params = new URLSearchParams({ domain: domain.name, limit: "100" });
            const res = await api<PaginatedResponse<Inbox>>(`/inboxes?${params.toString()}`, { token });
            setInboxes(res.data);

            // Clear message view if switching domains (unless inbox was kept)
            if (!res.data.find(i => i.id === selectedInbox)) {
                setMessages([]);
                setSelectedMessage(null);
                setSelectedInbox("");
            }
        } catch (e) {
            console.error("Load Inboxes Error:", e);
            toast.error("Lỗi tải danh sách inbox");
        } finally {
            setBusy(false);
        }
    }, [token, domains, selectedInbox]);

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

    // --- Domain Actions ---
    const createDomain = async (name: string) => {
        setBusy(true);
        try {
            await api("/domains", { method: "POST", token, body: { name } });
            toast.success("Đã thêm tên miền");
            await loadDomains();
        } catch (e) {
            toast.error("Lỗi thêm domain: " + (e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const verifyDomain = async (domainId: string, verifyToken: string) => {
        setBusy(true);
        try {
            await api(`/domains/${domainId}/verify`, { method: "POST", token, body: { token: verifyToken } });
            toast.success("Đã xác thực tên miền!");
            await loadDomains();
        } catch (error) {
            toast.error("Lỗi xác thực: " + (error as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const deleteDomain = async (domainId: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa domain này? Tất cả các hộp thư sẽ bị xóa.")) return;
        setBusy(true);
        try {
            await api(`/domains/${domainId}`, { method: "DELETE", token });
            toast.success("Đã xóa tên miền");
            if (selectedDomain === domainId) setSelectedDomain("");
            await loadDomains();
        } catch (error) {
            toast.error("Lỗi xóa domain: " + (error as Error).message);
        } finally {
            setBusy(false);
        }
    };

    // --- Inbox Actions ---
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

    // --- Message Actions ---
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

    const handleDeleteMessage = useCallback(async (msgId: string) => {
        try {
            setBusy(true);
            setMessages(prev => prev.filter(m => m.id !== msgId));
            setSelectedMessage(null);
            setShowDetail(false);
            toast.success("Đã xóa email");
        } catch (e) {
            console.error(e);
            toast.error("Không thể xóa email");
        } finally {
            setBusy(false);
        }
    }, [token]);

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
        onDeleteMessage: selectedMessage ? () => handleDeleteMessage(selectedMessage.id) : undefined,
        onMarkUnread: selectedMessage ? () => handleMarkUnread(selectedMessage.id) : undefined,
        onReply: canSendOutbound ? () => setShowCompose(true) : undefined,
        onRefresh: selectedInbox ? () => loadMessages(selectedInbox) : undefined,
        onFocusSearch: () => searchInputRef.current?.focus(),
        onShowHelp: () => setShowKeyboardHelp(true),
        onBack: () => { if (showDetail) setShowDetail(false); },
        enabled: !showCompose && !showKeyboardHelp,
    });

    const selectedInboxObj = inboxes.find(i => i.id === selectedInbox);
    const selectedDomainObj = domains.find(d => d.id === selectedDomain);

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
            <div className="modern-dashboard flex h-full overflow-hidden">
                {/* Replaced old sidebar with the Shared Sidebar Component */}
                <div className="w-[300px] flex-shrink-0 h-full">
                    <Sidebar
                        domains={domains}
                        inboxes={inboxes}
                        selectedDomainId={selectedDomain}
                        selectedInboxId={selectedInbox}
                        currentUserId={user?.id}
                        onSelectDomain={setSelectedDomain}
                        onSelectInbox={setSelectedInbox}
                        onCreateDomain={createDomain}
                        onCreateInbox={createInbox}
                        onVerifyDomain={verifyDomain}
                        onDeleteDomain={deleteDomain}
                        onDeleteInbox={deleteInbox}
                        onExtendInbox={handleExtendInbox}
                        onLogout={_logout}
                        isAdmin={isAdmin}
                        busy={busy}
                    />
                </div>

                {/* Main Panel - Email List (Keep existing or upgrade?) 
                    Keeping existing logic for now but wrapped in a flex container 
                */}
                <main className="flex-1 flex flex-col h-full bg-bg relative overflow-hidden">
                    {/* Search & Filter Bar */}
                    <div className="email-toolbar border-b border-border p-3 flex items-center justify-between bg-surface">
                        <div className="email-search flex items-center gap-2 bg-bg px-3 py-2 rounded-lg border border-border flex-1 max-w-xl">
                            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="bg-transparent border-none outline-none text-sm w-full"
                                placeholder="Tìm kiếm email... (from:, is:unread, before:)"
                                value={messageSearch}
                                onChange={(e) => setMessageSearch(e.target.value)}
                            />
                        </div>
                        <div className="email-toolbar-actions flex items-center gap-2">
                            {canSendOutbound && (
                                <button
                                    onClick={() => setShowCompose(true)}
                                    className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                                    title="Soạn thảo Email mới (N)"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                    </svg>
                                    <span>Soạn thư</span>
                                </button>
                            )}
                            <button
                                onClick={() => setMessageHasAttachments(!messageHasAttachments)}
                                className={`p-2 rounded hover:bg-bg ${messageHasAttachments ? 'text-primary bg-primary/10' : 'text-muted'}`}
                                title="Lọc có đính kèm"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                            </button>
                            <button
                                onClick={() => selectedInbox && loadMessages(selectedInbox)}
                                className="p-2 rounded hover:bg-bg text-muted hover:text-primary"
                                title="Làm mới (R)"
                            >
                                <svg className={`w-5 h-5 ${busy ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Email List */}
                    <div className="email-list flex-1 overflow-y-auto p-4 space-y-3">
                        {!selectedInbox && (
                            <div className="flex flex-col items-center justify-center h-full text-muted max-w-md mx-auto">
                                <div className="p-4 bg-surface rounded-full mb-6 ring-8 ring-primary/5">
                                    <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-text-main mb-2">Chào mừng bạn trở lại!</h3>
                                <p className="text-sm text-center mb-8">
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
                        )}

                        {selectedInbox && messages.length === 0 && !busy && (
                            <div className="flex flex-col items-center justify-center h-full text-muted">
                                <div className="p-4 bg-surface rounded-full mb-4">
                                    <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium">Chưa có email nào</h3>
                                <p className="text-sm">Email gửi đến {selectedInboxObj?.localPart}@{selectedDomainObj?.name} sẽ xuất hiện ở đây</p>
                            </div>
                        )}

                        {messages.map((msg, index) => {
                            const otp = extractOTP(msg.textBody || msg.htmlBody || "");
                            return (
                                <div
                                    key={msg.id}
                                    onClick={() => handleSelectMessage(msg)}
                                    className={`email-card cursor-pointer p-4 rounded-xl border border-border bg-surface hover:shadow-lg hover:border-primary/50 transition-all ${selectedMessage?.id === msg.id ? 'ring-2 ring-primary/50' : ''} ${!msg.isRead ? 'bg-primary/5 border-primary/20' : ''}`}
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            {!msg.isRead && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                                            <div className="font-semibold text-text-main">{msg.fromAddress?.split("@")[0] || "Unknown"}</div>
                                            <div className="text-xs text-muted">({msg.fromAddress})</div>
                                        </div>
                                        <div className="text-xs text-muted font-medium">{formatTime(msg.receivedAt)}</div>
                                    </div>

                                    <div className="font-medium text-text-main mb-1 line-clamp-1">{msg.subject || "(Không có tiêu đề)"}</div>
                                    <div className="text-sm text-text-muted line-clamp-2 mb-2">
                                        {msg.textBody?.slice(0, 150) || "Không có nội dung..."}
                                    </div>

                                    <div className="flex items-center gap-2 mt-2">
                                        {otp && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); copyOTP(typeof otp === 'string' ? otp : otp.code); }}
                                                className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-bold hover:bg-primary/20 transition-colors"
                                                title="Click để copy OTP"
                                            >
                                                <span>🔢 OTP: {typeof otp === 'string' ? otp : otp.code}</span>
                                            </button>
                                        )}
                                        {msg.attachments && msg.attachments.length > 0 && (
                                            <div className="flex items-center gap-1 text-xs text-muted bg-surface-elevated px-2 py-1 rounded-md">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                {msg.attachments.length} tệp
                                            </div>
                                        )}
                                        {msg.isPinned && (
                                            <div className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-md">📌 Đã ghim</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Load More */}
                        {messages.length < messageTotal && (
                            <div className="flex justify-center pt-4 pb-8">
                                <button
                                    onClick={() => selectedInbox && loadMessages(selectedInbox, { offset: messageOffset + PAGE_SIZE.messages, append: true })}
                                    className="px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors"
                                >
                                    Tải thêm ({messages.length}/{messageTotal})
                                </button>
                            </div>
                        )}
                    </div>
                </main>

                {/* Slide-over Detail Panel */}
                {showDetail && selectedMessage && (
                    <>
                        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-10" onClick={() => setShowDetail(false)} />
                        <aside className="absolute right-0 top-0 bottom-0 w-[500px] bg-surface border-l border-border shadow-2xl z-20 flex flex-col animate-slide-in-right">
                            <div className="p-4 border-b border-border flex items-center justify-between bg-bg/50 backdrop-blur">
                                <div className="flex gap-2">
                                    <button onClick={() => setShowDetail(false)} className="p-2 hover:bg-surface rounded-full text-muted hover:text-text-main">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleMarkUnread(selectedMessage.id)} className="p-2 hover:bg-surface rounded-full text-muted hover:text-primary" title="Đánh dấu chưa đọc">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                    <button onClick={() => handleTogglePin(selectedMessage.id, !selectedMessage.isPinned)} className={`p-2 hover:bg-surface rounded-full ${selectedMessage.isPinned ? 'text-yellow-500' : 'text-muted hover:text-yellow-500'}`} title={selectedMessage.isPinned ? "Bỏ ghim" : "Ghim"}>
                                        <svg className="w-5 h-5" fill={selectedMessage.isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                        </svg>
                                    </button>
                                    <button onClick={() => selectedMessage && handleDeleteMessage(selectedMessage.id)} className="p-2 hover:bg-red-50 rounded-full text-muted hover:text-red-500" title="Xóa">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {/* OTP Highlight */}
                                {(() => {
                                    const otpResult = extractOTP(selectedMessage.textBody || selectedMessage.htmlBody || "");
                                    const otp = typeof otpResult === 'string' ? otpResult : otpResult?.code;
                                    if (otp) return (
                                        <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-primary text-white rounded-lg font-bold">🔢</div>
                                                <div>
                                                    <div className="text-xs text-primary font-semibold uppercase tracking-wider">Mã xác minh</div>
                                                    <div className="text-xl font-bold font-mono tracking-widest">{otp}</div>
                                                </div>
                                            </div>
                                            <button onClick={() => copyOTP(otp)} className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </button>
                                        </div>
                                    );
                                    return null;
                                })()}

                                {/* Email Meta */}
                                <div className="space-y-4 mb-6">
                                    <h2 className="text-xl font-bold leading-tight">{selectedMessage.subject || "(Không có tiêu đề)"}</h2>

                                    <div className="flex flex-col gap-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted">Từ:</span>
                                            <span className="font-medium">{selectedMessage.fromAddress}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted">Đến:</span>
                                            <span className="font-medium">{selectedMessage.toAddress}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted">Thời gian:</span>
                                            <span>{new Date(selectedMessage.receivedAt).toLocaleString("vi-VN")}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-border my-6" />

                                {/* Body */}
                                <div className="min-h-[200px]">
                                    {selectedMessage.htmlBody ? (
                                        <div className="prose dark:prose-invert max-w-none">
                                            <iframe
                                                srcDoc={selectedMessage.htmlBody}
                                                sandbox="allow-same-origin"
                                                title="Email content"
                                                className="w-full min-h-[400px] border-none bg-white rounded-lg"
                                            />
                                        </div>
                                    ) : (
                                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text-main">
                                            {selectedMessage.textBody || "Không có nội dung"}
                                        </pre>
                                    )}
                                </div>

                                {/* Attachments */}
                                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                                    <div className="mt-8 pt-6 border-t border-border">
                                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                            Đính kèm ({selectedMessage.attachments.length})
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {selectedMessage.attachments.map((att, idx) => (
                                                <a
                                                    key={idx}
                                                    href={`/api/attachments/${att.storageKey}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-3 bg-surface border border-border rounded-lg hover:border-primary/50 transition-colors group"
                                                >
                                                    <div className="p-2 bg-bg rounded group-hover:bg-white transition-colors">
                                                        <svg className="w-5 h-5 text-muted group-hover:text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium truncate">{att.filename || `Tệp ${idx + 1}`}</div>
                                                        <div className="text-xs text-muted">Click để tải xuống</div>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </aside>
                    </>
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
