
import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api, PAGE_SIZE } from "../utils/api";
import { parseSearchQuery } from "../utils/searchParser";
import { InboxSelector } from "../components/InboxSelector";
import { Loading } from "../components/Loading";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { AppShell } from "../layouts/AppShell";
import { Sidebar } from "../components/Sidebar";
import { extractOTP } from "../utils/otpExtractor";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";
import { EmailStream } from "../components/EmailStream";
import { cn } from "../utils/cn";
import type { Domain, Inbox, Message, PaginatedResponse } from "../types";

// Lazy load heavy modal components
const ComposeModal = lazy(() => import("../components/ComposeModal").then(m => ({ default: m.ComposeModal })));
const KeyboardShortcutsHelp = lazy(() => import("../components/KeyboardShortcutsHelp").then(m => ({ default: m.KeyboardShortcutsHelp })));

export function Dashboard() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { token, user, logout: _logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);

    // Sync state with URL params
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const inboxId = params.get("inboxId");
        const q = params.get("q");
        const action = params.get("action");
        const payment = params.get("payment");

        if (payment === "success") {
            toast.success("Thanh toán thành công! Gói dịch vụ của bạn đã được kích hoạt.", { duration: 6000 });
            navigate(location.pathname, { replace: true });
        }

        if (inboxId && inboxId !== selectedInbox) {
            setSelectedInbox(inboxId);
        } else if (!inboxId && selectedInbox) {
            // Keep selected inbox state unless explicitly cleared?
        }

        if (q !== null && q !== messageSearch) {
            setMessageSearch(q);
        }

        if (action === "compose") setShowCompose(true);
    }, [location.search]);

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
    const [messageOffset, setMessageOffset] = useState(0);
    const [messageTotal, setMessageTotal] = useState(0);

    // UI States
    const [showCompose, setShowCompose] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const activeDomain = domains.find(d => d.id === selectedDomain);
    const activeInbox = inboxes.find(i => i.id === selectedInbox);
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
    const [composeInitialValues, setComposeInitialValues] = useState<{
        initialSubject?: string;
        initialBody?: string;
        initialTo?: string;
        initialFrom?: string;
    }>({});
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [domainToDelete, setDomainToDelete] = useState<Domain | null>(null);
    const [inboxToDelete, setInboxToDelete] = useState<Inbox | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const isAdmin = user?.role === "ADMIN";
    const outboundEnabled = String(window.env?.OUTBOUND_ENABLED ?? import.meta.env.VITE_OUTBOUND_ENABLED ?? "false").toLowerCase() === "true";
    const canSendOutbound = outboundEnabled && isAdmin;

    // --- Loaders ---
    const loadDomains = useCallback(async () => {
        if (!token) return;
        try {
            const res = await api<PaginatedResponse<Domain>>("/domains?limit=100", { token });
            const domainsData = res?.data || [];
            setDomains(domainsData);
        } catch (e) {
            console.error("Failed to load domains", e);
            toast.error("Lỗi tải danh sách tên miền");
        }
    }, [token]);

    // Auto-select domain effect
    useEffect(() => {
        if (domains.length > 0 && !selectedDomain) {
            const myDomains = domains.filter(d => d.ownerId === user?.id);
            if (myDomains.length > 0) {
                setSelectedDomain(myDomains[0].id);
            } else {
                setSelectedDomain(domains[0].id);
            }
        }
    }, [domains, selectedDomain, user?.id]);

    const loadInboxes = useCallback(async () => {
        if (!token) return;
        setBusy(true);
        try {
            const params = new URLSearchParams({ limit: "100" });
            // Fetch all inboxes accessible to user (personal view)
            // If we want to allow admins to see ALL system inboxes, check isAdmin.
            // But for the selector context, users usually want THEIR inboxes.
            // Aligning with FocusDashboard logic:
            params.append("personal", "true");

            const res = await api<PaginatedResponse<Inbox>>(`/inboxes?${params.toString()}`, { token });
            setInboxes(res?.data || []);
        } catch (e) {
            console.error("Failed to load inboxes", e);
            toast.error("Lỗi tải danh sách hộp thư");
        } finally {
            setBusy(false);
        }
    }, [token]);

    // Auto-select inbox effect
    useEffect(() => {
        if (inboxes.length > 0) {
            if (!selectedInbox || !inboxes.find(i => i.id === selectedInbox)) {
                setSelectedInbox(inboxes[0].id);
            }
        } else if (!busy) {
            setMessages([]);
            setSelectedMessage(null);
            setSelectedInbox("");
        }
    }, [inboxes, selectedInbox, busy]);

    const loadMessages = useCallback(async (inboxId: string, params: { offset?: number, append?: boolean, background?: boolean } = {}) => {
        if (!token) return;
        if (!params.background) setBusy(true);
        try {
            const off = params.offset ?? 0;
            const parsed = parseSearchQuery(messageSearch);

            if (parsed.q && parsed.q.length >= 2 && !parsed.from && !parsed.before && !parsed.after && parsed.isRead === undefined) {
                // Fuzzy search
                const fuzzyParams = new URLSearchParams({
                    q: parsed.q, inboxId, limit: String(PAGE_SIZE.messages), threshold: "0.3",
                });
                if (parsed.hasAttachments) fuzzyParams.append("hasAttachments", "true");
                const res = await api<PaginatedResponse<Message>>(`/messages/search/fuzzy?${fuzzyParams.toString()}`, { token });
                setMessages(prev => params.append ? [...prev, ...res.data] : res.data);
                if (res.meta?.total !== undefined) setMessageTotal(res.meta.total);
                if (params.offset !== undefined) setMessageOffset(params.offset);
            } else {
                // Regular search
                const queryParams = new URLSearchParams({ inboxId, limit: String(PAGE_SIZE.messages), offset: String(off) });
                if (parsed.q) queryParams.append("q", parsed.q);
                if (parsed.from) queryParams.append("from", parsed.from);
                if (parsed.hasAttachments) queryParams.append("hasAttachments", "true");
                if (parsed.before) queryParams.append("end", parsed.before);
                if (parsed.after) queryParams.append("start", parsed.after);
                if (parsed.isRead !== undefined) queryParams.append("isRead", String(parsed.isRead));

                const res = await api<PaginatedResponse<Message>>(`/messages?${queryParams.toString()}`, { token });
                setMessages(prev => params.append ? [...prev, ...res.data] : res.data);
                if (res.meta?.total !== undefined) setMessageTotal(res.meta.total);
                if (params.offset !== undefined) setMessageOffset(params.offset);
            }
        } catch {
            if (!params.background) toast.error("Lỗi tải email");
        } finally {
            if (!params.background) setBusy(false);
        }
    }, [token, messageSearch]);

    // --- Effects ---
    useEffect(() => { loadDomains(); }, [loadDomains]);
    useEffect(() => { loadInboxes(); }, [loadInboxes]);
    useEffect(() => {
        if (selectedInbox) {
            loadMessages(selectedInbox, { offset: 0 });
            setSelectedMessage(null);
        } else {
            setMessages([]);
        }
    }, [selectedInbox, loadMessages]);

    useEffect(() => {
        const t = setTimeout(() => { if (selectedInbox) loadMessages(selectedInbox); }, 500);
        return () => clearTimeout(t);
    }, [messageSearch, selectedInbox, loadMessages]);

    useEffect(() => {
        if (!selectedInbox) return;
        const interval = setInterval(() => { loadMessages(selectedInbox, { background: true }); }, 10000);
        return () => clearInterval(interval);
    }, [selectedInbox, loadMessages]);

    // --- Actions ---
    const createDomain = async (name: string) => {
        setBusy(true);
        try {
            await api("/domains", { method: "POST", token, body: { name } });
            toast.success("Đã thêm tên miền");
            await loadDomains();
        } catch (e) {
            toast.error("Lỗi thêm tên miền: " + (e as Error).message);
        } finally { setBusy(false); }
    };

    const verifyDomain = async (domainId: string, verifyToken: string) => {
        setBusy(true);
        try {
            await api(`/domains/${domainId}/verify`, { method: "POST", token, body: { token: verifyToken } });
            toast.success("Đã xác thực tên miền!");
            await loadDomains();
        } catch (error) { toast.error("Lỗi xác thực: " + (error as Error).message); } finally { setBusy(false); }
    };

    const deleteDomain = async (domain: Domain) => setDomainToDelete(domain);
    const confirmDeleteDomain = async () => {
        if (!domainToDelete) return;
        setIsDeleting(true);
        try {
            await api(`/domains/${domainToDelete.id}`, { method: "DELETE", token });
            toast.success("Đã xóa tên miền");
            if (selectedDomain === domainToDelete.id) setSelectedDomain("");
            setDomainToDelete(null);
            await loadDomains();
        } catch (error) { toast.error("Lỗi xóa tên miền: " + (error as Error).message); } finally { setIsDeleting(false); }
    };

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
            await loadInboxes();
        } catch (e) { toast.error("Lỗi: " + (e as Error).message); } finally { setBusy(false); }
    };

    const deleteInbox = async (inbox: Inbox) => setInboxToDelete(inbox);
    const confirmDeleteInbox = async () => {
        if (!inboxToDelete) return;
        setIsDeleting(true);
        try {
            await api(`/inboxes/${inboxToDelete.id}`, { method: "DELETE", token });
            toast.success("Đã xóa hộp thư");
            setInboxes(prev => prev.filter(i => i.id !== inboxToDelete.id));
            if (selectedInbox === inboxToDelete.id) {
                setSelectedInbox("");
                setMessages([]);
                setSelectedMessage(null);
            }
            setInboxToDelete(null);
        } catch (e) { toast.error("Lỗi xóa hộp thư: " + (e as Error).message); } finally { setIsDeleting(false); }
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
            if (selectedDomain) loadInboxes();
        } catch { toast.error("Lỗi gia hạn inbox"); } finally { setBusy(false); }
    };

    const handleSelectMessage = async (msg: Message) => {
        setSelectedMessage(msg);
        if (!msg.isRead) {
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
            try { await api(`/messages/${msg.id}/read`, { method: "PATCH", token, body: { isRead: true } }); }
            catch { /* background */ }
        }
    };

    const handleMarkUnread = async (msgId: string) => {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isRead: false } : m));
        if (selectedMessage?.id === msgId) setSelectedMessage(prev => prev ? { ...prev, isRead: false } : null);
        try { await api(`/messages/${msgId}/read`, { method: "PATCH", token, body: { isRead: false } }); toast.success("Đã đánh dấu chưa đọc"); }
        catch { toast.error("Không thể cập nhật trạng thái"); }
    };

    const handleDeleteMessage = useCallback(async (msgId: string) => {
        try {
            setBusy(true);
            setMessages(prev => prev.filter(m => m.id !== msgId));
            if (selectedMessage?.id === msgId) setSelectedMessage(null);
            toast.success("Đã xóa email");
        } catch { toast.error("Không thể xóa email"); } finally { setBusy(false); }
    }, [token, selectedMessage]);

    const handleTogglePin = async (msgId: string, isPinned: boolean) => {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isPinned } : m));
        if (selectedMessage?.id === msgId) setSelectedMessage(prev => prev ? { ...prev, isPinned } : null);
        try { await api(`/messages/${msgId}/pin`, { method: "PATCH", token, body: { isPinned } }); toast.success(isPinned ? "Đã ghim email" : "Đã bỏ ghim"); }
        catch { toast.error("Không thể cập nhật"); }
    };



    const copyOTP = (otp: string) => {
        navigator.clipboard.writeText(otp);
        toast.success(`Đã copy OTP: ${otp}`);
    };

    // Keyboard Shortcuts
    useKeyboardShortcuts({
        messages,
        selectedMessageId: selectedMessage?.id,
        onSelectMessage: (idx) => messages[idx] && handleSelectMessage(messages[idx]),
        onDeleteMessage: selectedMessage ? () => handleDeleteMessage(selectedMessage.id) : undefined,
        onMarkUnread: selectedMessage ? () => handleMarkUnread(selectedMessage.id) : undefined,
        onReply: canSendOutbound ? () => setShowCompose(true) : undefined,
        onRefresh: selectedInbox ? () => loadMessages(selectedInbox) : undefined,
        onFocusSearch: () => searchInputRef.current?.focus(),
        onShowHelp: () => setShowKeyboardHelp(true),
        onBack: () => setSelectedMessage(null),
        enabled: !showCompose && !showKeyboardHelp,
    });




    return (
        <AppShell>
            {/* 2-Pane Layout (Gmail style): Sidebar (260px) | Main Content (flex) */}
            <div className="flex-1 flex h-full w-full">

                {/* Pane 1: Sidebar (Desktop only - hidden on tablet) */}
                <div className="hidden lg:flex w-[260px] h-full p-2 flex-shrink-0">
                    <Sidebar
                        domains={domains}
                        inboxes={inboxes}
                        selectedDomainId={selectedDomain}
                        selectedInboxId={selectedInbox}
                        currentUserId={user?.id}
                        onSelectDomain={setSelectedDomain}
                        onSelectInbox={(id) => navigate(`?inboxId=${id}`)}
                        onCreateDomain={createDomain}
                        onCreateInbox={createInbox}
                        onVerifyDomain={verifyDomain}
                        onDeleteDomain={deleteDomain}
                        onDeleteInbox={deleteInbox}
                        onExtendInbox={handleExtendInbox}
                        isAdmin={isAdmin}
                        busy={busy}
                    />
                </div>

                {/* Pane 2: Message List */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className={cn(
                        "flex flex-col h-full bg-slate-50/50 dark:bg-bg border-r border-slate-200 dark:border-white/15",
                        selectedMessage ? "hidden md:flex md:w-[320px] lg:w-[360px]" : "w-full md:w-[320px] lg:w-[360px] flex-shrink-0"
                    )}>
                    {/* Toolbar */}
                    <div className="h-16 px-4 border-b border-slate-200 dark:border-white/15 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-900/90 backdrop-blur-md">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="lg:hidden shrink-0 text-slate-700 dark:text-white"
                                onClick={() => setShowMobileSidebar(true)}
                                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>}
                            />

                            {/* Mobile/Tablet: Inbox Selector */}
                            <div className="lg:hidden w-full">
                                <InboxSelector
                                    domains={domains}
                                    inboxes={inboxes}
                                    selectedDomainId={selectedDomain}
                                    selectedInboxId={selectedInbox}
                                    onSelectDomain={setSelectedDomain}
                                    onSelectInbox={(id) => navigate(`?inboxId=${id}`)}
                                    onCreateInbox={createInbox}
                                    onDeleteInbox={deleteInbox}
                                    user={user}
                                    token={token}
                                />
                            </div>

                            {/* Desktop: Static Header */}
                            <div className="hidden lg:flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{activeDomain?.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                        {activeInbox ? `${activeInbox.localPart}@${activeDomain?.name}` : "Chọn hộp thư"}
                                    </span>
                                </div>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="hidden shrink-0 gap-2 ml-2"
                                onClick={async () => {
                                    if (!selectedDomain) return toast.error("Chưa chọn tên miền");
                                    const randomName = Math.random().toString(36).substring(2, 10);
                                    await createInbox(selectedDomain, randomName);
                                }}
                                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>}
                            >
                                Tạo Inbox
                            </Button>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => selectedInbox && loadMessages(selectedInbox)}
                                disabled={busy}
                                className="text-slate-500 dark:text-text-primary hover:text-primary"
                                icon={<svg className={cn("w-5 h-5", busy && "animate-spin")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                            />
                            {canSendOutbound && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setShowCompose(true)}
                                    className="ml-2"
                                >
                                    Soạn thư
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Search */}
                    <div className="p-3 border-b border-slate-200 dark:border-white/15 shrink-0">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="w-full bg-slate-100 dark:bg-surface-glass border border-slate-200 dark:border-white/15 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-text-primary placeholder:text-slate-500 dark:placeholder-text-tertiary focus:outline-none focus:border-primary/50 transition-colors"
                                placeholder="Tìm kiếm... (từ:, là:chưa đọc)"
                                value={messageSearch}
                                onChange={(e) => setMessageSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* List Content */}
                    <div className="flex-1 overflow-hidden relative">
                        {!selectedInbox ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-text-tertiary">
                                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">inbox</span>
                                <p className="text-sm">Chọn một hộp thư để xem tin nhắn</p>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col">
                                <div className="flex-1 overflow-hidden">
                                    <EmailStream
                                        messages={messages}
                                        selectedMessageId={selectedMessage?.id || null}
                                        onSelectMessage={handleSelectMessage}
                                        onCopyOTP={(otp) => copyOTP(otp)}
                                        className="pb-24 md:pb-0"
                                    />
                                    {/* Load More Button */}
                                    {messages.length < messageTotal && (
                                        <div className="p-4 flex justify-center border-t border-slate-200 dark:border-white/15">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => selectedInbox && loadMessages(selectedInbox, { offset: messageOffset + PAGE_SIZE.messages, append: true })}
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

                {/* Pane 3: Detail View */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className={cn(
                        "flex-1 bg-white dark:bg-bg flex flex-col h-full overflow-hidden border-l border-slate-200 dark:border-white/15",
                        // Mobile: show only if message selected
                        !selectedMessage ? "hidden md:flex" : "flex fixed inset-0 z-50 md:static bg-white md:bg-transparent dark:bg-bg"
                    )}>
                    {selectedMessage ? (
                        <>
                            {/* Detail Header */}
                            <div className="h-16 px-6 border-b border-slate-200 dark:border-white/15 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-900/90 backdrop-blur-md">
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="md:hidden text-slate-700 dark:text-white" // Back button only on mobile
                                        onClick={() => setSelectedMessage(null)}
                                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>}
                                    />
                                    <div className="flex flex-col">
                                        <h3 className="text-base font-semibold text-slate-900 dark:text-white max-w-[200px] md:max-w-md truncate">
                                            {selectedMessage.fromAddress}
                                        </h3>
                                        <span className="text-xs text-slate-500 dark:text-text-tertiary">
                                            {new Date(selectedMessage.receivedAt).toLocaleString("vi-VN")}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 bg-slate-100 dark:bg-surface-elevated/50 rounded-lg p-1 border border-slate-200 dark:border-white/15 shadow-lg backdrop-blur-md">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowCompose(true)}
                                        title="Trả lời"
                                        className="text-slate-500 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
                                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleMarkUnread(selectedMessage.id)}
                                        title="Đánh dấu chưa đọc"
                                        className="text-slate-500 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
                                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleTogglePin(selectedMessage.id, !selectedMessage.isPinned)}
                                        className={selectedMessage.isPinned ? "text-warning" : "text-slate-500 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"}
                                        title={selectedMessage.isPinned ? "Bỏ ghim" : "Ghim"}
                                        icon={<svg className="w-5 h-5" fill={selectedMessage.isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>}
                                    />

                                    <div className="w-px h-5 bg-slate-300 dark:bg-white/10 mx-1"></div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteMessage(selectedMessage.id)}
                                        className="text-slate-500 hover:text-red-500 dark:text-slate-200 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-danger/10"
                                        title="Xóa"
                                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => copyOTP(selectedMessage.textBody || selectedMessage.htmlBody || "")} // Re-using copyOTP for now as a functional placeholder for 'View Source' action
                                        className="text-slate-500 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
                                        title="Sao chép nội dung"
                                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
                                    />
                                </div>
                            </div>

                            {/* Detail Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-24 md:pb-6">
                                {/* Subject */}
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                                    {selectedMessage.subject || "(Không có chủ đề)"}
                                </h1>

                                {/* OTP Highlight */}
                                {(() => {
                                    const otpResult = extractOTP(selectedMessage.textBody || selectedMessage.htmlBody || "");
                                    const otp = typeof otpResult === 'string' ? otpResult : otpResult?.code;
                                    if (otp) return (
                                        <div className="mb-8 p-6 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white text-2xl shadow-lg shadow-primary/20">
                                                    🔢
                                                </div>
                                                <div>
                                                    <div className="text-sm text-primary font-bold uppercase tracking-wider mb-1">Mã xác thực</div>
                                                    <div className="text-3xl font-bold text-slate-800 dark:text-white font-mono tracking-widest">{otp}</div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="primary"
                                                onClick={() => copyOTP(otp)}
                                                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
                                            >
                                                Sao chép
                                            </Button>
                                        </div>
                                    );
                                    return null;
                                })()}

                                {/* Email Body */}
                                <GlassCard className="p-6 md:p-8 rounded-2xl dark:!bg-slate-800/80 border-2 border-slate-200 dark:border-slate-600 overflow-hidden shadow-sm">
                                    {selectedMessage.htmlBody ? (
                                        <div className="prose dark:prose-invert max-w-none">
                                            <iframe
                                                srcDoc={selectedMessage.htmlBody}
                                                sandbox="allow-same-origin allow-scripts"
                                                title="Email content"
                                                className="w-full min-h-[400px] border-none bg-white rounded-lg dark:invert dark:hue-rotate-180 dark:contrast-90"
                                            />
                                        </div>
                                    ) : (
                                        <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-slate-700 dark:text-slate-200">
                                            {selectedMessage.textBody || "Không có nội dung"}
                                        </pre>
                                    )}
                                </GlassCard>

                                {/* Attachments */}
                                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                                    <div className="mt-8">
                                        <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                            Tệp đính kèm ({selectedMessage.attachments.length})
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {selectedMessage.attachments.map((att, idx) => (
                                                <a
                                                    key={idx}
                                                    href={`/api/attachments/${att.storageKey}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-glass border border-white/10 hover:border-primary/50 hover:bg-white/10 transition-all group"
                                                >
                                                    <div className="p-2 bg-white/5 rounded-lg group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-white truncate">{att.filename || `Tệp ${idx + 1}`}</div>
                                                        <div className="text-xs text-text-tertiary">Nhấp để tải xuống</div>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-text-secondary">
                            <div className="w-20 h-20 rounded-3xl bg-surface-glass border border-white/5 flex items-center justify-center mb-6 shadow-xl">
                                <svg className="w-10 h-10 text-text-tertiary" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-text-primary mb-2">Chưa chọn tin nhắn</h3>
                            <p className="max-w-xs mx-auto">Chọn một email từ danh sách để xem nội dung.</p>
                        </div>
                    )}


                    {/* Quick Reply Footer - Wireframe Match */}
                    {selectedMessage && (
                        <div className="hidden md:flex p-4 border-t border-white/5 bg-background/50 backdrop-blur-md shrink-0 z-10">
                            <button
                                onClick={() => setShowCompose(true)}
                                className="flex-1 h-12 rounded-lg bg-[#0a0a14] border border-white/10 hover:border-primary/50 text-left px-4 text-text-tertiary text-sm flex items-center justify-between group transition-all"
                            >
                                <span>Soạn phản hồi nhanh...</span>
                                <div className="flex items-center gap-2">
                                    <span className="p-1 rounded bg-white/5 border border-white/10 text-xs text-text-tertiary">Ctrl + Enter</span>
                                    <span className="material-symbols-outlined text-[20px] group-hover:text-primary transition-colors">send</span>
                                </div>
                            </button>
                        </div>
                    )}
                </motion.div>

                {/* Mobile Sidebar Drawer - Also shown on tablet */}
                <AnimatePresence>
                    {showMobileSidebar && (
                        <div className="fixed inset-0 z-50 lg:hidden flex">
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                onClick={() => setShowMobileSidebar(false)}
                            />
                            {/* Sidebar Panel */}
                            <motion.div
                                initial={{ x: "-100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "-100%" }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="relative w-[300px] h-full bg-surface-elevated border-r border-white/10 shadow-2xl flex flex-col"
                            >
                                <div className="p-4 border-b border-white/5 flex justify-between items-center">
                                    <span className="font-bold text-lg">Menu</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowMobileSidebar(false)}
                                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>}
                                    />
                                </div>
                                <Sidebar
                                    domains={domains}
                                    inboxes={inboxes}
                                    selectedDomainId={selectedDomain}
                                    selectedInboxId={selectedInbox}
                                    currentUserId={user?.id}
                                    onSelectDomain={setSelectedDomain}
                                    onSelectInbox={(id) => {
                                        navigate(`?inboxId=${id}`);
                                        setShowMobileSidebar(false);
                                    }}
                                    onCreateDomain={createDomain}
                                    onCreateInbox={createInbox}
                                    onVerifyDomain={verifyDomain}
                                    onDeleteDomain={deleteDomain}
                                    onDeleteInbox={deleteInbox}
                                    onExtendInbox={handleExtendInbox}
                                    isAdmin={isAdmin}
                                    busy={busy}
                                />
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Modals */}
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

                {showKeyboardHelp && (
                    <Suspense fallback={null}>
                        <KeyboardShortcutsHelp onClose={() => setShowKeyboardHelp(false)} />
                    </Suspense>
                )}

                <ConfirmationModal
                    isOpen={!!domainToDelete}
                    title="Xóa tên miền"
                    message={`Tất cả hộp thư thuộc ${domainToDelete?.name} sẽ bị xóa.`}
                    confirmLabel="Xóa vĩnh viễn"
                    isDestructive
                    isLoading={isDeleting}
                    onConfirm={confirmDeleteDomain}
                    onCancel={() => setDomainToDelete(null)}
                />

                <ConfirmationModal
                    isOpen={!!inboxToDelete}
                    title="Xóa hộp thư"
                    message="Hành động này không thể hoàn tác."
                    confirmLabel="Xóa"
                    isDestructive
                    isLoading={isDeleting}
                    onConfirm={confirmDeleteInbox}
                    onCancel={() => setInboxToDelete(null)}
                />
            </div>
        </AppShell >
    );
}
