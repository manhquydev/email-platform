import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { MessageViewer } from "../components/email-viewer/MessageViewer";
import { MiddlePane } from "../components/inbox-manager/desktop-layout-modules";
import { useInboxManagerData } from "../components/inbox-manager/hooks/use-inbox-manager-data";
import { useInboxSearch } from "../components/inbox-manager/hooks/use-inbox-search";
import { Loading } from "../components/Loading";
import { useAuth } from "../context/AuthContext";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useMessageActions } from "../hooks/useMessageActions";
import { AppShell } from "../layouts/AppShell";

const RECENT_INBOXES_KEY = "inbox_workspace_recent_v1";
const MAX_RECENT_INBOXES = 5;

function readRecentInboxIds() {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(RECENT_INBOXES_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((id): id is string => typeof id === "string");
    } catch {
        return [];
    }
}

function writeRecentInboxIds(ids: string[]) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(RECENT_INBOXES_KEY, JSON.stringify(ids));
    } catch {
        // Ignore storage failures.
    }
}

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
    const [quickSwitchValue, setQuickSwitchValue] = useState("");
    const [recentInboxIds, setRecentInboxIds] = useState<string[]>(() => readRecentInboxIds());

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
    const inboxOptions = useMemo(
        () => inboxes.map((inbox) => ({
                id: inbox.id,
                email: `${inbox.localPart}@${inbox.domain?.name}`,
            })),
        [inboxes]
    );
    const recentInboxOptions = useMemo(() => {
        const byId = new Map(inboxes.map((inbox) => [inbox.id, inbox]));
        return recentInboxIds
            .map((id) => byId.get(id))
            .filter((inbox): inbox is NonNullable<typeof inbox> => Boolean(inbox))
            .filter((inbox) => inbox.id !== inboxId)
            .slice(0, MAX_RECENT_INBOXES)
            .map((inbox) => ({
                id: inbox.id,
                email: `${inbox.localPart}@${inbox.domain?.name}`,
            }));
    }, [inboxes, recentInboxIds, inboxId]);

    useEffect(() => {
        if (!inboxId || inboxes.length === 0) return;
        if (!inboxResolved) return;
        setActiveInbox((current) => (current?.id === inboxResolved.id ? current : inboxResolved));
    }, [inboxId, inboxResolved, inboxes.length, setActiveInbox]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedMessage(null);
    }, [inboxId, setSelectedMessage]);

    useEffect(() => {
        if (!selectedMessage) return;
        const messageStillVisible = visibleMessages.some((message) => message.id === selectedMessage.id);
        if (!messageStillVisible) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedMessage(null);
        }
    }, [selectedMessage, setSelectedMessage, visibleMessages]);

    useEffect(() => {
        if (!inboxResolved?.id) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRecentInboxIds((previous) => {
            const next = [inboxResolved.id, ...previous.filter((id) => id !== inboxResolved.id)]
                .slice(0, MAX_RECENT_INBOXES);
            writeRecentInboxIds(next);
            return next;
        });
    }, [inboxResolved?.id]);

    const handleQuickSwitchInbox = () => {
        const value = quickSwitchValue.trim();
        if (!value) return;

        const normalized = value.toLowerCase();
        const matchedInbox = inboxOptions.find((option) =>
            option.id === value || option.email.toLowerCase() === normalized
        ) ?? inboxOptions.find((option) => option.email.toLowerCase().includes(normalized));

        if (!matchedInbox) {
            toast.error("Không tìm thấy inbox phù hợp");
            return;
        }
        if (matchedInbox.id === inboxId) {
            setQuickSwitchValue("");
            return;
        }
        navigate(`/app/inbox/${matchedInbox.id}`);
        setQuickSwitchValue("");
    };

    const handleCopyResolvedEmail = () => {
        if (!inboxResolved) return;
        const inboxEmail = `${inboxResolved.localPart}@${inboxResolved.domain?.name}`;
        navigator.clipboard.writeText(inboxEmail);
        toast.success("Đã sao chép địa chỉ email");
    };

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
        <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Inbox Workspace</p>
                    <p className="text-xs text-text-secondary">
                        {messages.length} email • {unreadCount} chưa đọc
                    </p>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={handleCopyResolvedEmail}
                        className="max-w-[260px] truncate rounded-xl border border-white/20 bg-white/[0.08] px-3 py-2 text-sm text-text-main transition hover:border-primary/40 hover:bg-primary/10"
                        title="Sao chép địa chỉ email hiện tại"
                    >
                        {inboxResolved.localPart}@{inboxResolved.domain?.name}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate("/app/manager")}
                        className="rounded-xl border border-white/20 bg-white/[0.08] px-3 py-2 text-sm text-text-main transition hover:border-primary/40 hover:bg-primary/10"
                    >
                        Manager
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="text"
                    list="workspace-inbox-options"
                    value={quickSwitchValue}
                    onChange={(event) => setQuickSwitchValue(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            handleQuickSwitchInbox();
                        }
                    }}
                    placeholder="Tìm inbox để chuyển nhanh..."
                    className="flex-1 rounded-xl border border-white/20 bg-white/[0.08] px-3 py-2 text-sm text-text-main placeholder:text-text-secondary/80 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/30"
                />
                <datalist id="workspace-inbox-options">
                    {inboxOptions.map((option) => (
                        <option key={option.id} value={option.email} />
                    ))}
                </datalist>
                <button
                    type="button"
                    onClick={handleQuickSwitchInbox}
                    className="rounded-xl border border-white/20 bg-white/[0.08] px-3 py-2 text-sm text-text-main transition hover:border-primary/40 hover:bg-primary/10"
                >
                    Mở
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.15em] text-text-secondary">Chọn nhanh</span>
                <select
                    value={inboxId}
                    onChange={(event) => {
                        const nextInboxId = event.target.value;
                        if (!nextInboxId || nextInboxId === inboxId) return;
                        navigate(`/app/inbox/${nextInboxId}`);
                    }}
                    className="min-w-[240px] max-w-full rounded-xl border border-white/20 bg-white/[0.08] px-3 py-2 text-sm text-text-main focus:border-primary/40 focus:outline-none"
                >
                    <option value={inboxId}>{inboxResolved.localPart}@{inboxResolved.domain?.name}</option>
                    {inboxOptions
                        .filter((option) => option.id !== inboxId)
                        .map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.email}
                            </option>
                        ))}
                </select>
            </div>

            {recentInboxOptions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] uppercase tracking-[0.15em] text-text-secondary">Gần đây</span>
                    {recentInboxOptions.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => navigate(`/app/inbox/${option.id}`)}
                            className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-xs text-text-secondary transition hover:border-primary/30 hover:bg-primary/10 hover:text-text-main"
                        >
                            {option.email}
                        </button>
                    ))}
                </div>
            )}
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
                            <button
                                type="button"
                                onClick={handleCopyResolvedEmail}
                                className="truncate rounded-lg px-2 py-1 text-sm text-text-secondary transition hover:bg-white/[0.05] hover:text-text-main"
                                title="Sao chép địa chỉ email"
                            >
                                {inboxResolved.localPart}@{inboxResolved.domain?.name}
                            </button>
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
