
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useRealtimeContext } from "../hooks/useRealtimeContext";
import { api, PAGE_SIZE } from "../utils/api";
import { parseSearchQuery } from "../utils/searchParser";
import { Loading } from "../components/Loading";
import { FocusStreamLayout } from "../layouts/FocusStreamLayout";
import { EmailStream } from "../components/EmailStream";
import { QuickGenerateCard } from "../components/QuickGenerateCard";
import { InboxToolbar } from "../components/InboxToolbar";
import { Button } from "../components/ui/Button";
import { AnimatePresence, motion } from "framer-motion";
import type { Domain, Inbox, Message, PaginatedResponse } from "../types";
import type { RealtimeEvent, EmailNewPayload } from "../types/realtime";

// Lazy load modals
const ComposeModal = lazy(() => import("../components/ComposeModal").then(m => ({ default: m.ComposeModal })));
const CreateInboxModal = lazy(() => import("../components/CreateInboxModal").then(m => ({ default: m.CreateInboxModal })));

export function FocusDashboard() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { token, user: _user } = useAuth();
    const { subscribe, unsubscribe, isConnected } = useRealtimeContext();
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
    const [searchQuery, setSearchQuery] = useState("");

    // --- Loaders ---
    const loadDomains = useCallback(async () => {
        if (!token) return;
        try {
            const res = await api<PaginatedResponse<Domain>>("/domains?limit=100", { token });
            setDomains(res?.data || []);
        } catch {
            toast.error("Lỗi tải danh sách domain");
        }
    }, [token]);

    // Auto-select domain
    useEffect(() => {
        if (domains.length > 0 && !selectedDomain) {
            setSelectedDomain(domains[0].id);
        }
    }, [domains, selectedDomain]);

    const loadInboxes = useCallback(async () => {
        if (!token) return;
        setBusy(true);
        try {
            const params = new URLSearchParams({
                limit: "100",
                personal: "true" // Fetch all personal inboxes across all domains
            });
            const res = await api<PaginatedResponse<Inbox>>(`/inboxes?${params.toString()}`, { token });
            setInboxes(res?.data || []);
        } catch {
            toast.error("Lỗi tải danh sách inbox");
        } finally {
            setBusy(false);
        }
    }, [token]);

    // Auto-select first inbox
    useEffect(() => {
        if (inboxes.length > 0 && !selectedInbox) {
            setSelectedInbox(inboxes[0].id);
        }
    }, [inboxes, selectedInbox]);

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
            setMessages(res?.data || []);
        } catch {
            if (!background) toast.error("Lỗi tải email");
        } finally {
            if (!background) setBusy(false);
        }
    }, [token, searchQuery]);

    // --- Effects ---
    useEffect(() => { loadDomains(); }, [loadDomains]);
    useEffect(() => { loadInboxes(); }, [loadInboxes]);
    useEffect(() => {
        if (selectedInbox) {
            loadMessages(selectedInbox);
            setSelectedMessage(null);
        } else {
            setMessages([]);
        }
    }, [selectedInbox, loadMessages]);

    // Auto-refresh via realtime (replaces polling)
    useEffect(() => {
        const handleRealtimeEvent = (event: RealtimeEvent) => {
            if (event.type === 'email.new') {
                const payload = event.payload as unknown as EmailNewPayload;
                if (payload.inboxId === selectedInbox) {
                    loadMessages(selectedInbox, true);
                }
            }
        };

        subscribe('focus-dashboard', handleRealtimeEvent);
        return () => unsubscribe('focus-dashboard');
    }, [selectedInbox, loadMessages, subscribe, unsubscribe]);

    // Fallback polling only when realtime is disconnected
    useEffect(() => {
        if (isConnected || !selectedInbox) return;
        const interval = setInterval(() => loadMessages(selectedInbox, true), 30000);
        return () => clearInterval(interval);
    }, [selectedInbox, loadMessages, isConnected]);

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
            } catch {
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
        } catch {
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
        } catch {
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
        } catch {
            toast.error("Không thể cập nhật trạng thái");
        }
    };

    const unreadCount = messages.filter(m => !m.isRead).length;
    const currentInbox = inboxes.find(i => i.id === selectedInbox);

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
        } catch {
            toast.error("Không thể xóa hộp thư");
        } finally {
            setBusy(false);
        }
    };

    const handleCopyEmail = useCallback(() => {
        if (currentInbox) {
            const email = `${currentInbox.localPart}@${currentInbox.domain?.name}`;
            navigator.clipboard.writeText(email);
            toast.success("Đã sao chép địa chỉ email!", { icon: "📋", duration: 2000 });
        }
    }, [currentInbox]);

    // Handler to create inbox from InboxSelector
    const handleCreateInboxFromSelector = async (domainId: string, localPart: string, expiresAt?: number) => {
        try {
            const body: { domainId: string; localPart: string; expiresAt?: number } = { domainId, localPart };
            if (expiresAt) body.expiresAt = expiresAt;
            const newInbox = await api<Inbox>("/inboxes", { method: "POST", token, body });
            if (newInbox) {
                setInboxes(prev => [newInbox, ...prev]);
                setSelectedInbox(newInbox.id);
                toast.success("Đã tạo hộp thư mới");
            }
        } catch {
            toast.error("Không thể tạo hộp thư");
        }
    };

    // Keyboard shortcut for copy
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
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

    return (
        <FocusStreamLayout
            domains={domains}
            inboxes={inboxes}
            selectedDomainId={selectedDomain}
            selectedInboxId={selectedInbox}
            onSelectDomain={setSelectedDomain}
            onSelectInbox={(id) => {
                const inbox = inboxes.find(i => i.id === id);
                if (inbox) handleSelectInbox(inbox);
            }}
            onCreateInbox={handleCreateInboxFromSelector}
            onDeleteInbox={handleDeleteInbox}
            onSearch={handleSearch}
            unreadCount={unreadCount}
        >
            <div className="flex flex-col h-screen max-h-screen overflow-hidden">
                {/* Header with InboxToolbar */}
                <div className="flex-shrink-0 px-4 py-3 border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto w-full">
                        <div className="flex-1 min-w-0">
                            <InboxToolbar
                                inboxes={inboxes}
                                currentInbox={currentInbox || null}
                                onSelectInbox={handleSelectInbox}
                                onCreateInbox={handleCreateInbox}
                                onDeleteInbox={handleDeleteInbox}
                            />
                        </div>
                        <div className="flex items-center">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => selectedInbox && loadMessages(selectedInbox)}
                                title="Làm mới (R)"
                                className={busy ? "animate-spin" : ""}
                                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>}
                            />
                        </div>
                    </div>
                </div>

                {/* Email Stream or Welcome State */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
                    <div className="max-w-5xl mx-auto w-full p-4 pb-20">
                        {busy && messages.length === 0 ? (
                            <div className="flex justify-center p-12">
                                <Loading />
                            </div>
                        ) : !selectedInbox ? (
                            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-fade-in-up">
                                <div className="p-6 bg-surface-elevated rounded-full mb-6 ring-4 ring-primary/10 shadow-lg shadow-black/20">
                                    <svg className="w-16 h-16 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">Chào mừng bạn trở lại!</h3>
                                <p className="text-text-secondary mb-8 max-w-md">
                                    Chọn hộp thư từ menu trên cùng để xem email hoặc tạo một địa chỉ mới ngay lập tức bên dưới.
                                </p>

                                <div className="w-full max-w-md">
                                    <QuickGenerateCard
                                        domains={domains}
                                        token={token}
                                        onInboxCreated={(id, email) => {
                                            loadInboxes();
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
                </div>
            </div>

            {/* Detail Modal Overlay */}
            <AnimatePresence>
                {showDetail && selectedMessage && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={() => setShowDetail(false)}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-surface-elevated border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col relative z-10 overflow-hidden"
                        >
                            {/* Detail Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-surface-glass backdrop-blur-md sticky top-0 z-10">
                                <h2 className="text-lg font-bold text-white truncate max-w-md pr-4">
                                    {selectedMessage.subject || '(Không có tiêu đề)'}
                                </h2>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleTogglePin}
                                        title={selectedMessage.isPinned ? "Bỏ ghim" : "Ghim"}
                                        className={selectedMessage.isPinned ? "text-primary bg-primary/10" : "text-text-secondary"}
                                        icon={<svg viewBox="0 0 24 24" fill={selectedMessage.isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleMarkUnread}
                                        title="Đánh dấu chưa đọc"
                                        className="text-text-secondary hover:text-white"
                                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" /></svg>}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleDeleteMessage}
                                        title="Xóa"
                                        className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>}
                                    />
                                    <div className="w-px h-6 bg-white/10 mx-1" />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowDetail(false)}
                                        title="Đóng (Esc)"
                                        className="text-text-secondary hover:text-white"
                                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                                    />
                                </div>
                            </div>

                            {/* Meta Info */}
                            <div className="p-4 bg-surface/50 border-b border-white/5 space-y-2">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1">
                                        <div className="text-sm">
                                            <span className="text-text-secondary w-12 inline-block">Từ:</span>
                                            <span className="text-white font-medium select-all">{selectedMessage.fromAddress}</span>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-text-secondary w-12 inline-block">Đến:</span>
                                            <span className="text-white font-medium select-all">{selectedMessage.toAddress}</span>
                                        </div>
                                    </div>
                                    <div className="text-xs text-text-tertiary whitespace-nowrap">
                                        {new Date(selectedMessage.receivedAt).toLocaleString('vi-VN')}
                                    </div>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-0 bg-white min-h-[300px]">
                                {selectedMessage.htmlBody ? (
                                    <iframe
                                        srcDoc={selectedMessage.htmlBody}
                                        title="Email content"
                                        sandbox="allow-same-origin allow-scripts"
                                        className="w-full h-full min-h-[400px] border-none block"
                                    />
                                ) : (
                                    <div className="p-6 whitespace-pre-wrap font-sans text-[var(--nebula-text)] leading-relaxed">
                                        {selectedMessage.textBody || 'Không có nội dung'}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Compose Modal */}
            <Suspense fallback={null}>
                {showCompose && (
                    <ComposeModal
                        token={token}
                        inboxes={inboxes}
                        onClose={() => {
                            setShowCompose(false);
                            loadInboxes();
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
                            loadInboxes();
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
