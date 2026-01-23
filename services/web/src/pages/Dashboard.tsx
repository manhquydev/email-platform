/**
 * Dashboard Page - Email reading interface
 * Refactored to use modular hooks and components
 */
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { PAGE_SIZE } from "../utils/api";
import { InboxSelector } from "../components/InboxSelector";
import { Loading } from "../components/Loading";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { AppShell } from "../layouts/AppShell";
import { OnboardingHints } from "../components/OnboardingHints";
import { Button } from "../components/ui/Button";
import { EmailStream } from "../components/EmailStream";
import { cn } from "../utils/cn";
import { useRealtimeSubscription, useRealtimeContext } from "../hooks/useRealtimeContext";
import { ListeningIndicator } from "../components/copy-first/ListeningIndicator";
import type { Message } from "../types";
import type { RealtimeEvent } from "../types/realtime";
import type { EmailNewPayload, EmailReadPayload, EmailDeletedPayload } from "../types/realtime";

// Import modular components
import { useDashboardData, useMessageActions, MessageDetailPane, TOAST_DURATION, TOAST_POSITION } from "./dashboard-modules";

// Lazy load heavy modal components
const ComposeModal = lazy(() => import("../components/ComposeModal").then(m => ({ default: m.ComposeModal })));
const KeyboardShortcutsHelp = lazy(() => import("../components/KeyboardShortcutsHelp").then(m => ({ default: m.KeyboardShortcutsHelp })));

export function Dashboard() {
    const { token, user } = useAuth();
    const { status: realtimeStatus } = useRealtimeContext();
    const location = useLocation();
    const navigate = useNavigate();

    // Search state (needed for data hook)
    const [messageSearch, setMessageSearch] = useState("");

    // Use modular hooks
    const {
        domains, teams, inboxes, messages,
        selectedDomain, selectedTeam, selectedInbox,
        messageOffset, messageTotal, busy,
        setSelectedDomain, setSelectedTeam, setSelectedInbox,
        setMessages, loadMessages, refreshMessages
    } = useDashboardData(messageSearch);

    // Selected message state
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

    // Message actions
    const { handleSelectMessage, handleMarkUnread, handleDeleteMessage, handleTogglePin, copyOTP } = useMessageActions({
        messages, selectedMessage, setMessages, setSelectedMessage
    });

    // UI States
    const [showCompose, setShowCompose] = useState(false);
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
    const [composeInitialValues, setComposeInitialValues] = useState<{
        initialSubject?: string;
        initialBody?: string;
        initialTo?: string;
        initialFrom?: string;
    }>({});
    const searchInputRef = useRef<HTMLInputElement>(null);

    const isAdmin = user?.role === "ADMIN";
    const outboundEnabled = String(window.env?.OUTBOUND_ENABLED ?? import.meta.env.VITE_OUTBOUND_ENABLED ?? "false").toLowerCase() === "true";
    const canSendOutbound = outboundEnabled && isAdmin;

    // Sync state with URL params
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const inboxId = params.get("inboxId");
        const q = params.get("q");
        const action = params.get("action");
        const payment = params.get("payment");

        if (payment === "success") {
            toast.success("Thanh toán thành công! Gói dịch vụ của bạn đã được kích hoạt.", { duration: TOAST_DURATION.LONG });
            navigate(location.pathname, { replace: true });
        }

        if (inboxId && inboxId !== selectedInbox) {
            setSelectedInbox(inboxId);
        }

        if (q !== null && q !== messageSearch) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setMessageSearch(q);
        }

        if (action === "compose") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setShowCompose(true);
        }
    }, [location.search, location.pathname, navigate, selectedInbox, messageSearch, setSelectedInbox]);

    // Realtime subscription
    useRealtimeSubscription("dashboard-email-events", (event: RealtimeEvent) => {
        if (!selectedInbox) return;

        if (event.type === "email.new") {
            const payload = event.payload as unknown as EmailNewPayload;
            if (payload.inboxId === selectedInbox) {
                toast.success(`Có email mới từ ${payload.from || "Unknown"}: ${payload.subject || "(No Subject)"}`, {
                    position: TOAST_POSITION.BOTTOM_RIGHT, duration: TOAST_DURATION.SHORT
                });
                loadMessages(selectedInbox, { background: true });
            }
        } else if (event.type === "email.read") {
            const payload = event.payload as unknown as EmailReadPayload;
            setMessages(prev => prev.map(m => m.id === payload.messageId ? { ...m, isRead: payload.isRead } : m));
            if (selectedMessage?.id === payload.messageId) {
                setSelectedMessage(prev => prev ? { ...prev, isRead: payload.isRead } : null);
            }
        } else if (event.type === "email.deleted") {
            const payload = event.payload as unknown as EmailDeletedPayload;
            if (payload.inboxId === selectedInbox) {
                setMessages(prev => prev.filter(m => m.id !== payload.messageId));
                if (selectedMessage?.id === payload.messageId) {
            setSelectedMessage(null);
                }
            }
        }
    }, [selectedInbox, selectedMessage, loadMessages, setMessages]);

    // Load messages on inbox change
    useEffect(() => {
        if (selectedInbox) {
            loadMessages(selectedInbox, { offset: 0 });
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedMessage(null);
        } else {
            // eslint-disable-next-line react-hooks/set-state-in-effect
        }
    }, [selectedInbox, loadMessages, setMessages]);

    // Debounced search
    useEffect(() => {
        const t = setTimeout(() => { if (selectedInbox) loadMessages(selectedInbox); }, 800);
        return () => clearTimeout(t);
    }, [messageSearch, selectedInbox, loadMessages]);

    // Keyboard Shortcuts
    useKeyboardShortcuts({
        messages,
        selectedMessageId: selectedMessage?.id,
        onSelectMessage: (idx) => messages[idx] && handleSelectMessage(messages[idx]),
        onDeleteMessage: selectedMessage ? () => handleDeleteMessage(selectedMessage.id) : undefined,
        onMarkUnread: selectedMessage ? () => handleMarkUnread(selectedMessage.id) : undefined,
        onReply: canSendOutbound ? () => setShowCompose(true) : undefined,
        onRefresh: selectedInbox ? refreshMessages : undefined,
        onFocusSearch: () => searchInputRef.current?.focus(),
        onShowHelp: () => setShowKeyboardHelp(true),
        onBack: () => setSelectedMessage(null),
        enabled: !showCompose && !showKeyboardHelp,
    });

    return (
        <AppShell>
            <div className="flex-1 flex h-full w-full">
                {/* Message List Pane */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className={cn(
                        "flex flex-col h-full bg-nebula-elevated/50 border-r border-nebula-border",
                        selectedMessage ? "hidden md:flex md:w-[360px] lg:w-[400px]" : "w-full md:w-[360px] lg:w-[400px] flex-shrink-0"
                    )}
                >
                    {/* Toolbar */}
                    <div className="h-16 px-4 border-b border-nebula-border flex items-center justify-between shrink-0 bg-nebula-surface/90 backdrop-blur-md relative z-20">
                        <div className="flex items-center gap-3 w-full">
                            <div className="w-full max-w-[280px]">
                                <ListeningIndicator
                                    status={realtimeStatus === 'error' ? 'disconnected' : realtimeStatus}
                                    size="sm"
                                    showLabel={true}
                                    className="mr-4"
                                />
                                <InboxSelector
                                    domains={domains}
                                    teams={teams}
                                    inboxes={inboxes}
                                    selectedDomainId={selectedDomain}
                                    selectedTeamId={selectedTeam}
                                    selectedInboxId={selectedInbox}
                                    onSelectDomain={setSelectedDomain}
                                    onSelectTeam={setSelectedTeam}
                                    onSelectInbox={(id) => navigate(`?inboxId=${id}`)}
                                    user={user}
                                    token={token}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={refreshMessages}
                                disabled={busy}
                                className="text-nebula-text-muted hover:text-nebula-violet"
                                icon={<svg className={cn("w-5 h-5", busy && "animate-spin")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                            />
                            {canSendOutbound && (
                                <Button variant="primary" size="sm" onClick={() => setShowCompose(true)} className="ml-2">
                                    Soạn thư
                                </Button>
                            )}
                            <div className="group relative ml-1">
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => navigate('/app/manager')}
                                    className="shadow-lg shadow-primary/20 hover:shadow-primary/30 shrink-0 bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90"
                                    title="Quản lý inbox và tên miền"
                                >
                                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="hidden sm:inline font-semibold">Quản lý</span>
                                </Button>
                                <div className="absolute right-0 top-full mt-2 w-48 p-2 bg-nebula-elevated border border-nebula-border rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-xs text-nebula-text-muted">
                                    Đi tới trang quản lý hộp thư và tên miền
                                </div>
                            </div>
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
                                onChange={(e) => setMessageSearch(e.target.value)}
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
                                        onSelectMessage={handleSelectMessage}
                                        onCopyOTP={copyOTP}
                                        className="pb-24 md:pb-0"
                                    />
                                    {messages.length < messageTotal && (
                                        <div className="p-4 flex justify-center border-t border-nebula-border">
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

                {/* Message Detail Pane */}
                <MessageDetailPane
                    selectedMessage={selectedMessage}
                    onBack={() => setSelectedMessage(null)}
                    onReply={() => setShowCompose(true)}
                    onMarkUnread={handleMarkUnread}
                    onTogglePin={handleTogglePin}
                    onDelete={handleDeleteMessage}
                    onCopyOTP={copyOTP}
                />

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

                <OnboardingHints />
            </div>
        </AppShell>
    );
}
