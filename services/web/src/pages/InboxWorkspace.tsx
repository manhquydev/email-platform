import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MessageViewer } from "../components/email-viewer/MessageViewer";
import { MiddlePane } from "../components/inbox-manager/desktop-layout-modules";
import { useInboxManagerData } from "../components/inbox-manager/hooks/use-inbox-manager-data";
import { useInboxSearch } from "../components/inbox-manager/hooks/use-inbox-search";
import { Loading } from "../components/Loading";
import { useAuth } from "../context/AuthContext";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useMessageActions } from "../hooks/useMessageActions";
import { AppShell } from "../layouts/AppShell";

export function InboxWorkspace() {
    const navigate = useNavigate();
    const { inboxId = "" } = useParams<{ inboxId: string }>();
    const { token } = useAuth();
    const breakpoint = useBreakpoint();
    const isDesktop = breakpoint === "desktop";

    const {
        inboxes,
        messages,
        busy,
        setBusy,
        activeInbox,
        setActiveInbox,
        setMessages,
        loadMessages,
    } = useInboxManagerData();
    const { searchQuery, searchResults, isSearching, isSearchMode, handleSearch, clearSearch } = useInboxSearch();
    const [selectedMessage, setSelectedMessage] = useState<typeof messages[number] | null>(null);

    const {
        handleSelectMessage,
        handleDeleteMessage,
        handleTogglePin,
    } = useMessageActions({
        token,
        selectedMessage,
        setSelectedMessage,
        setMessages,
        setBusy,
    });

    const inboxResolved = useMemo(
        () => inboxes.find((inbox) => inbox.id === inboxId) ?? null,
        [inboxId, inboxes]
    );
    const unreadCount = messages.filter((message) => !message.isRead).length;
    const visibleMessages = isSearchMode ? searchResults : messages;

    useEffect(() => {
        if (!inboxId || inboxes.length === 0) return;
        if (!inboxResolved) return;
        setActiveInbox((current) => (current?.id === inboxResolved.id ? current : inboxResolved));
    }, [inboxId, inboxResolved, inboxes.length, setActiveInbox]);

    useEffect(() => {
        setSelectedMessage(null);
    }, [inboxId, setSelectedMessage]);

    useEffect(() => {
        if (!selectedMessage) return;
        const messageStillVisible = visibleMessages.some((message) => message.id === selectedMessage.id);
        if (!messageStillVisible) {
            setSelectedMessage(null);
        }
    }, [selectedMessage, setSelectedMessage, visibleMessages]);

    if (busy && inboxes.length === 0) {
        return (
            <AppShell>
                <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
                    <Loading />
                </div>
            </AppShell>
        );
    }

    if (!inboxResolved) {
        return (
            <AppShell>
                <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center justify-center px-4 py-10">
                    <div className="w-full rounded-3xl border border-white/10 bg-surface/30 p-8 text-center">
                        <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Inbox Workspace</p>
                        <h1 className="mt-3 text-2xl font-semibold text-text-main">Không tìm thấy inbox</h1>
                        <p className="mt-2 text-sm text-text-secondary">
                            Inbox này không còn tồn tại hoặc bạn không có quyền truy cập.
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-3">
                            <Link
                                to="/app/manager"
                                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-text-main transition hover:border-primary/40 hover:bg-primary/10"
                            >
                                Quay lại manager
                            </Link>
                        </div>
                    </div>
                </div>
            </AppShell>
        );
    }

    const shellHeader = (
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
            <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Inbox Workspace</p>
                <h1 className="truncate text-lg font-semibold text-text-main">
                    {inboxResolved.localPart}@{inboxResolved.domain?.name}
                </h1>
                <p className="text-xs text-text-secondary">
                    {messages.length} email • {unreadCount} chưa đọc
                </p>
            </div>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => loadMessages(inboxResolved.id)}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text-main transition hover:border-primary/40 hover:bg-primary/10"
                >
                    Làm mới
                </button>
                <button
                    type="button"
                    onClick={() => navigate("/app/manager")}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text-main transition hover:border-primary/40 hover:bg-primary/10"
                >
                    Manager
                </button>
            </div>
        </div>
    );

    const messageListPane = (
        <div className="flex min-h-0 flex-col rounded-3xl border border-white/10 bg-surface/30 overflow-hidden">
            {shellHeader}
            <div className="min-h-0 flex-1">
                <MiddlePane
                    activeInbox={activeInbox}
                    messages={messages}
                    searchResults={searchResults}
                    selectedMessage={selectedMessage}
                    busy={busy}
                    isSearchMode={isSearchMode}
                    isSearching={isSearching}
                    searchQuery={searchQuery}
                    onSelectMessage={handleSelectMessage}
                    onSearch={handleSearch}
                    onClearSearch={clearSearch}
                    onDeleteInbox={() => navigate("/app/manager")}
                    loadMessages={loadMessages}
                    disableInboxDelete={true}
                />
            </div>
        </div>
    );

    return (
        <AppShell>
            <div className="flex-1 p-3 sm:p-4 lg:p-6">
                {isDesktop ? (
                    <div className="grid h-full min-h-[calc(100vh-6rem)] grid-cols-[420px_minmax(0,1fr)] gap-4">
                        {messageListPane}
                        <div className="min-h-0 rounded-3xl border border-white/10 bg-surface/30 overflow-hidden">
                            {selectedMessage ? (
                                <MessageViewer
                                    message={selectedMessage}
                                    onDelete={() => handleDeleteMessage(selectedMessage.id)}
                                    onPin={(isPinned) => handleTogglePin(selectedMessage.id, isPinned)}
                                    variant="pane"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center px-6 text-center text-text-secondary">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Reading Pane</p>
                                        <h2 className="mt-3 text-xl font-semibold text-text-main">Chọn email để xem</h2>
                                        <p className="mt-2 text-sm">
                                            Workspace này tách riêng khỏi manager để đọc và triage email tập trung hơn.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : selectedMessage ? (
                    <div className="min-h-[calc(100vh-6rem)] rounded-3xl border border-white/10 bg-surface/30 overflow-hidden">
                        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                            <button
                                type="button"
                                onClick={() => setSelectedMessage(null)}
                                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text-main transition hover:border-primary/40 hover:bg-primary/10"
                            >
                                Danh sách email
                            </button>
                            <span className="truncate text-sm text-text-secondary">{inboxResolved.localPart}@{inboxResolved.domain?.name}</span>
                        </div>
                        <MessageViewer
                            message={selectedMessage}
                            onClose={() => setSelectedMessage(null)}
                            onDelete={() => handleDeleteMessage(selectedMessage.id)}
                            onPin={(isPinned) => handleTogglePin(selectedMessage.id, isPinned)}
                            variant="modal"
                        />
                    </div>
                ) : (
                    <div className="min-h-[calc(100vh-6rem)]">
                        {messageListPane}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
