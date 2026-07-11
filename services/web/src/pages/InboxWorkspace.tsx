import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { CreateInboxModal } from "../components/CreateInboxModal";
import { MessageViewer } from "../components/email-viewer/MessageViewer";
import { MiddlePane } from "../components/inbox-manager/desktop-layout-modules";
import { useInboxManagerData } from "../components/inbox-manager/hooks/use-inbox-manager-data";
import { useInboxSearch } from "../components/inbox-manager/hooks/use-inbox-search";
import { Loading } from "../components/Loading";
import { useAuth } from "../context/AuthContext";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useMessageActions } from "../hooks/useMessageActions";
import { AppShell } from "../layouts/AppShell";
import type { Domain, Inbox, PaginatedResponse } from "../types";
import { api } from "../utils/api";

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
    const [domains, setDomains] = useState<Domain[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);

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
        if (!token) return;
        const loadDomains = async () => {
            try {
                const response = await api<PaginatedResponse<Domain>>("/domains?limit=200", { token });
                setDomains(response?.data ?? []);
            } catch (error) {
                console.error("[InboxWorkspace] Failed to load domains", error);
                toast.error("Không thể tải danh sách domain");
            }
        };

        void loadDomains();
    }, [token]);

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

    const handleCreateInbox = () => {
        if (domains.length === 0) {
            toast.error("Chưa có domain khả dụng để tạo inbox");
            return;
        }
        setShowCreateModal(true);
    };

    const handleInboxCreated = (inbox: Inbox) => {
        setShowCreateModal(false);
        navigate(`/app/inbox/${inbox.id}`);
        toast.success(`Đã tạo ${inbox.localPart}@${inbox.domain?.name}`);
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
                    <div className="w-full rounded-xl border border-semantic-border bg-semantic-bg-secondary p-8 text-center">
                        <p className="text-xs uppercase tracking-[0.2em] text-semantic-text-secondary">Inbox Workspace</p>
                        <h1 className="mt-3 text-2xl font-semibold text-semantic-text-main">Không tìm thấy inbox</h1>
                        <p className="mt-2 text-sm text-semantic-text-secondary">
                            Inbox này không còn tồn tại hoặc bạn không có quyền truy cập.
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-3">
                            <Link
                                to="/app/manager"
                                className="rounded-xl border border-semantic-border bg-semantic-bg-secondary px-4 py-2 text-sm text-semantic-text-main transition-colors hover:border-semantic-accent/40 hover:bg-semantic-accent-subtle"
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
        <div className="flex flex-col gap-3 border-b border-semantic-border px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.2em] text-semantic-text-secondary">Inbox Workspace</p>
                    <p className="text-xs text-semantic-text-secondary">
                        {messages.length} email • {unreadCount} chưa đọc
                    </p>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-1 lg:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => navigate("/app/manager")}
                        className="rounded-xl border border-semantic-border bg-semantic-bg-secondary px-3 py-2 text-sm text-semantic-text-main transition-colors hover:border-semantic-accent/40 hover:bg-semantic-accent-subtle"
                    >
                        Manager
                    </button>
                    <button
                        type="button"
                        onClick={handleCreateInbox}
                        className="rounded-xl border border-semantic-accent/30 bg-semantic-accent-subtle px-3 py-2 text-sm font-semibold text-semantic-accent-text transition-colors hover:border-semantic-accent/50 hover:bg-semantic-accent/20"
                    >
                        Tạo email mới
                    </button>
                </div>
            </div>

            <button
                type="button"
                onClick={handleCopyResolvedEmail}
                className="truncate rounded-xl border border-semantic-border bg-semantic-bg-secondary px-3 py-2 text-left text-sm text-semantic-text-main transition-colors hover:border-semantic-accent/40 hover:bg-semantic-accent-subtle"
                title="Sao chép địa chỉ email hiện tại"
            >
                {inboxResolved.localPart}@{inboxResolved.domain?.name}
            </button>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
                    className="flex-1 rounded-xl border border-semantic-border bg-semantic-bg-secondary px-3 py-2 text-sm text-semantic-text-main placeholder:text-semantic-text-muted focus:outline-none focus:ring-2 focus:ring-semantic-accent/50 focus:border-semantic-accent/50"
                />
                <datalist id="workspace-inbox-options">
                    {inboxOptions.map((option) => (
                        <option key={option.id} value={option.email} />
                    ))}
                </datalist>
                <button
                    type="button"
                    onClick={handleQuickSwitchInbox}
                    className="rounded-xl border border-semantic-border bg-semantic-bg-secondary px-3 py-2 text-sm text-semantic-text-main transition-colors hover:border-semantic-accent/40 hover:bg-semantic-accent-subtle"
                >
                    Mở
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.15em] text-semantic-text-secondary">Chọn nhanh</span>
                <select
                    value={inboxId}
                    onChange={(event) => {
                        const nextInboxId = event.target.value;
                        if (!nextInboxId || nextInboxId === inboxId) return;
                        navigate(`/app/inbox/${nextInboxId}`);
                    }}
                    className="min-w-[220px] max-w-full rounded-xl border border-semantic-border bg-semantic-bg-elevated px-3 py-2 text-sm text-semantic-text-main focus:outline-none focus:ring-2 focus:ring-semantic-accent/50 focus:border-semantic-accent/50"
                >
                    <option value={inboxId}>
                        {inboxResolved.localPart}@{inboxResolved.domain?.name}
                    </option>
                    {inboxOptions
                        .filter((option) => option.id !== inboxId)
                        .map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.email}
                            </option>
                        ))}
                </select>
            </div>
        </div>
    );

    const messageStreamPane = (
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
    );

    return (
        <AppShell>
            <div className="flex-1 p-2 sm:p-4 lg:p-6">
                {isDesktop ? (
                    <div className="grid h-full min-h-[calc(100vh-6rem)] grid-cols-[360px_minmax(0,1fr)] gap-4">
                        <div className="min-h-0 rounded-xl border border-semantic-border bg-semantic-bg-secondary overflow-hidden flex flex-col">
                            {shellHeader}
                            <div className="flex flex-1 items-center justify-center px-5 text-center text-semantic-text-secondary">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-semantic-text-muted">Workspace Controls</p>
                                    <h2 className="mt-3 text-lg font-semibold text-semantic-text-main">Tập trung điều hướng inbox</h2>
                                    <p className="mt-2 text-sm">
                                        Danh sách email đã được chuyển sang pane bên phải để đọc và triage liền mạch.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="min-h-0 rounded-xl border border-semantic-border bg-semantic-bg-primary overflow-hidden">
                            {selectedMessage ? (
                                <>
                                    <div className="flex items-center justify-between border-b border-semantic-border px-4 py-3">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedMessage(null)}
                                            className="rounded-xl border border-semantic-border bg-semantic-bg-secondary px-3 py-2 text-sm text-semantic-text-main transition-colors hover:border-semantic-accent/40 hover:bg-semantic-accent-subtle"
                                        >
                                            Danh sách email
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCopyResolvedEmail}
                                            className="max-w-[320px] truncate rounded-lg px-2 py-1 text-sm text-semantic-text-secondary transition-colors hover:bg-semantic-bg-hover hover:text-semantic-text-main"
                                            title="Sao chép địa chỉ email"
                                        >
                                            {inboxResolved.localPart}@{inboxResolved.domain?.name}
                                        </button>
                                    </div>
                                    <MessageViewer
                                        message={selectedMessage}
                                        onDelete={() => handleDeleteMessage(selectedMessage.id)}
                                        onPin={(isPinned) => handleTogglePin(selectedMessage.id, isPinned)}
                                        variant="pane"
                                    />
                                </>
                            ) : (
                                messageStreamPane
                            )}
                        </div>
                    </div>
                ) : selectedMessage ? (
                    <div className="min-h-[calc(100vh-6rem)] rounded-xl border border-semantic-border bg-semantic-bg-primary overflow-hidden">
                        <div className="flex flex-col gap-2 border-b border-semantic-border px-4 py-4">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedMessage(null)}
                                    className="rounded-xl border border-semantic-border bg-semantic-bg-secondary px-3 py-2 text-sm text-semantic-text-main transition-colors hover:border-semantic-accent/40 hover:bg-semantic-accent-subtle"
                                >
                                    Danh sách email
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateInbox}
                                    className="rounded-xl border border-semantic-accent/30 bg-semantic-accent-subtle px-3 py-2 text-sm font-semibold text-semantic-accent-text transition-colors hover:border-semantic-accent/50 hover:bg-semantic-accent/20"
                                >
                                    Tạo email mới
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={handleCopyResolvedEmail}
                                className="truncate rounded-lg px-2 py-1 text-left text-sm text-semantic-text-secondary transition-colors hover:bg-semantic-bg-hover hover:text-semantic-text-main"
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
                    <div className="min-h-[calc(100vh-6rem)] rounded-xl border border-semantic-border bg-semantic-bg-primary overflow-hidden">
                        {shellHeader}
                        {messageStreamPane}
                    </div>
                )}
            </div>
            {showCreateModal && (
                <CreateInboxModal
                    domains={domains}
                    token={token}
                    onClose={() => setShowCreateModal(false)}
                    onInboxCreated={handleInboxCreated}
                />
            )}
        </AppShell>
    );
}
