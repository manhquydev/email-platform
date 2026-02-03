/**
 * Dashboard Page - Email reading interface
 * Refactored to use modular hooks and components
 */
import { useState, useEffect, useRef, lazy, Suspense, useMemo } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { PAGE_SIZE } from "../utils/api";
import { Loading } from "../components/Loading";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { AppShell } from "../layouts/AppShell";
import { OnboardingHints } from "../components/OnboardingHints";
import { Button } from "../components/ui/Button";
import { CompactToolbar } from "../components/compact-toolbar";
import { EmptyStateWithActions } from "../components/empty-state-with-actions";
import { EmailStream } from "../components/EmailStream";
import { EmailSkeletonList } from "../components/email-stream-modules/email-stream-components";
import { FolderTabs, type FolderTab } from "../components/folder-tabs";
import { KeyboardBar } from "../components/keyboard-bar";
import { cn } from "../utils/cn";
import { useRealtimeSubscription, useRealtimeContext } from "../hooks/useRealtimeContext";
import type { Message } from "../types";
import type { RealtimeEvent } from "../types/realtime";
import type { EmailNewPayload, EmailReadPayload, EmailDeletedPayload } from "../types/realtime";

// Import modular components
import { useDashboardData, useMessageActions, MessageDetailPane, TOAST_DURATION, TOAST_POSITION, type ViewMode } from "./dashboard-modules";

// Lazy load heavy modal components
const ComposeModal = lazy(() => import("../components/ComposeModal").then(m => ({ default: m.ComposeModal })));
const KeyboardShortcutsHelp = lazy(() => import("../components/KeyboardShortcutsHelp").then(m => ({ default: m.KeyboardShortcutsHelp })));

export function Dashboard() {
    const { token, user } = useAuth();
    const { status: realtimeStatus } = useRealtimeContext();
    const location = useLocation();
    const navigate = useNavigate();

    // Determine view mode from route
    const viewMode: ViewMode = location.pathname === '/app/sent' ? 'sent' : 'inbox';

    // Search state (needed for data hook)
    const [messageSearch, setMessageSearch] = useState("");

    // Use modular hooks
    const {
        domains, teams, inboxes, messages,
        selectedDomain, selectedTeam, selectedInbox,
        messageOffset, messageTotal, busy,
        setSelectedDomain, setSelectedTeam, setSelectedInbox,
        setMessages, loadMessages, refreshMessages
    } = useDashboardData(messageSearch, viewMode);

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

    // Calculate unread count for stats bar
    const unreadCount = messages.filter(m => !m.isRead).length;

    // Folder tab state and filtering
    const [activeFolder, setActiveFolder] = useState<FolderTab>('all');

    const folderCounts = useMemo(() => ({
        all: messages.length,
        unread: messages.filter(m => !m.isRead).length,
        starred: messages.filter(m => m.isPinned).length,
        attachment: messages.filter(m => m.attachments && m.attachments.length > 0).length,
    }), [messages]);

    const filteredMessages = useMemo(() => {
        switch (activeFolder) {
            case 'unread': return messages.filter(m => !m.isRead);
            case 'starred': return messages.filter(m => m.isPinned);
            case 'attachment': return messages.filter(m => m.attachments && m.attachments.length > 0);
            default: return messages;
        }
    }, [messages, activeFolder]);

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

    // Load messages on inbox change (inbox mode only)
    useEffect(() => {
        if (viewMode === 'sent') {
            // Sent mode loads all sent messages, no inbox selection needed
            loadMessages('', { offset: 0 });
            setSelectedMessage(null);
        } else if (selectedInbox) {
            loadMessages(selectedInbox, { offset: 0 });
            setSelectedMessage(null);
        }
    }, [selectedInbox, loadMessages, setMessages, viewMode]);

    // Debounced search (inbox mode only)
    useEffect(() => {
        if (viewMode === 'inbox') {
            const t = setTimeout(() => { if (selectedInbox) loadMessages(selectedInbox); }, 800);
            return () => clearTimeout(t);
        }
    }, [messageSearch, selectedInbox, loadMessages, viewMode]);

    // Keyboard Shortcuts
    useKeyboardShortcuts({
        messages,
        selectedMessageId: selectedMessage?.id,
        onSelectMessage: (idx) => messages[idx] && handleSelectMessage(messages[idx]),
        onDeleteMessage: selectedMessage ? () => handleDeleteMessage(selectedMessage.id) : undefined,
        onMarkUnread: viewMode === 'inbox' && selectedMessage ? () => handleMarkUnread(selectedMessage.id) : undefined,
        onReply: canSendOutbound ? () => setShowCompose(true) : undefined,
        onRefresh: refreshMessages,
        onFocusSearch: () => searchInputRef.current?.focus(),
        onShowHelp: () => setShowKeyboardHelp(true),
        onBack: () => setSelectedMessage(null),
        enabled: !showCompose && !showKeyboardHelp,
    });

    // viewMode is used for route-based view switching

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
                    {/* Compact Toolbar - merged inbox selector, search, and actions */}
                    <CompactToolbar
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
                        searchValue={messageSearch}
                        onSearchChange={setMessageSearch}
                        searchPlaceholder="Tìm kiếm... (từ:, là:chưa đọc)"
                        searchInputRef={searchInputRef as React.RefObject<HTMLInputElement>}
                        onRefresh={refreshMessages}
                        onCompose={() => setShowCompose(true)}
                        onManage={() => navigate('/app/manager')}
                        busy={busy}
                        canSendOutbound={canSendOutbound}
                        realtimeStatus={realtimeStatus === 'error' ? 'disconnected' : realtimeStatus}
                        unreadCount={unreadCount}
                        totalCount={messageTotal}
                    />

                    {/* Folder Tabs - Gmail-style filtering */}
                    {selectedInbox && (
                        <FolderTabs
                            activeTab={activeFolder}
                            onTabChange={setActiveFolder}
                            counts={folderCounts}
                        />
                    )}

                    {/* List Content */}
                    <div className="flex-1 overflow-hidden relative">
                        {!selectedInbox ? (
                            <EmptyStateWithActions
                                variant="no-inbox"
                                onAction={(action) => {
                                    if (action === 'create-inbox') navigate('/app/manager');
                                }}
                            />
                        ) : messages.length === 0 && busy ? (
                            <EmailSkeletonList count={5} />
                        ) : messages.length === 0 && !busy ? (
                            <EmptyStateWithActions
                                variant={messageSearch ? 'no-results' : 'empty-inbox'}
                                onAction={(action) => {
                                    if (action === 'clear-search') setMessageSearch('');
                                    if (action === 'share-address') {
                                        const inbox = inboxes.find(i => i.id === selectedInbox);
                                        if (inbox) {
                                            const domain = domains.find(d => d.id === inbox.domainId);
                                            navigator.clipboard.writeText(`${inbox.localPart}@${domain?.name || ''}`);
                                        }
                                    }
                                }}
                            />
                        ) : (
                            <div className="h-full flex flex-col">
                                <div className="flex-1 overflow-hidden">
                                    <EmailStream
                                        messages={filteredMessages}
                                        selectedMessageId={selectedMessage?.id || null}
                                        onSelectMessage={handleSelectMessage}
                                        onCopyOTP={copyOTP}
                                        className="pb-24 md:pb-12"
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

                {/* Keyboard shortcuts bar - desktop only */}
                <KeyboardBar />
            </div>
        </AppShell>
    );
}
