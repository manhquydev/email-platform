import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api, PAGE_SIZE } from "../utils/api";
import { Sidebar } from "../components/Sidebar";
import { MessageList } from "../components/MessageList";
import { MessageDetail } from "../components/MessageDetail";
import { ComposeModal } from "../components/ComposeModal";
import { Loading } from "../components/Loading";
import type { Domain, Inbox, Message, PaginatedResponse } from "../types";

export function Dashboard() {
    const { token, user, logout } = useAuth();
    const [busy, setBusy] = useState(false);

    // Data
    const [domains, setDomains] = useState<Domain[]>([]);
    const [inboxes, setInboxes] = useState<Inbox[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    // Selection
    // Initialize from localStorage or first available
    const [selectedDomain, setSelectedDomain] = useState<string>("");
    const [selectedInbox, setSelectedInbox] = useState<string>("");
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

    // Filter/Pagination States
    const [messageSearch, setMessageSearch] = useState("");
    const [messageHasAttachments, setMessageHasAttachments] = useState(false);
    const [messageOffset, setMessageOffset] = useState(0);
    const [messageTotal, setMessageTotal] = useState(0);

    // Mobile View State
    const [mobileView, setMobileView] = useState<"sidebar" | "list" | "detail">("sidebar");

    const [showCompose, setShowCompose] = useState(false);

    const isAdmin = user?.role === "ADMIN";
    // Check outgoing support
    const outboundEnabled =
        String(window.env?.OUTBOUND_ENABLED ?? import.meta.env.VITE_OUTBOUND_ENABLED ?? "false").toLowerCase() === "true";
    const canSendOutbound = outboundEnabled && isAdmin;

    // --- Loaders ---

    const loadDomains = useCallback(async () => {
        if (!token) return;
        try {
            const res = await api<PaginatedResponse<Domain>>("/domains?limit=100", { token }); // Load all (up to 100) for sidebar
            setDomains(res.data);

            // Auto-select first domain if none selected
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

            const params = new URLSearchParams({
                domain: domain.name,
                limit: "100"
            });
            const res = await api<PaginatedResponse<Inbox>>(`/inboxes?${params.toString()}`, { token });
            setInboxes(res.data);

            // Reset message list when switching domains
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
            const queryParams = new URLSearchParams({
                inboxId,
                limit: String(PAGE_SIZE.messages),
                offset: String(off),
                q: messageSearch,
            });
            if (messageHasAttachments) queryParams.append("hasAttachments", "true");

            const res = await api<PaginatedResponse<Message>>(`/messages?${queryParams.toString()}`, { token });

            if (params.append) {
                setMessages(prev => [...prev, ...res.data]);
            } else {
                setMessages(res.data);
            }

            if (res.meta?.total !== undefined) setMessageTotal(res.meta.total);
            if (params.offset !== undefined) setMessageOffset(params.offset);

        } catch (e) {
            console.error(e);
            if (!params.background) toast.error("Lỗi tải email");
        } finally {
            if (!params.background) setBusy(false);
        }
    }, [token, messageSearch, messageHasAttachments]);

    // --- Effects ---

    // 1. Initial Domain Load
    useEffect(() => {
        loadDomains();
    }, [token]);

    // 2. Load Inboxes when Domain Changes
    useEffect(() => {
        if (selectedDomain) {
            loadInboxes(selectedDomain);
        }
    }, [selectedDomain]);

    // 3. Load Messages when Inbox or Filters Change
    useEffect(() => {
        if (selectedInbox) {
            loadMessages(selectedInbox, { offset: 0 });
            setSelectedMessage(null);
            // On mobile, go to list
            setMobileView("list");
        } else {
            setMessages([]);
        }
    }, [selectedInbox, messageHasAttachments, loadMessages]);

    // 4. Search Debounce (Simple effect)
    useEffect(() => {
        const t = setTimeout(() => {
            if (selectedInbox) loadMessages(selectedInbox);
        }, 500);
        return () => clearTimeout(t);
    }, [messageSearch, selectedInbox, loadMessages]);

    // 5. Auto-refresh
    useEffect(() => {
        if (!selectedInbox) return;
        const interval = setInterval(() => {
            loadMessages(selectedInbox, { background: true });
        }, 15000);
        return () => clearInterval(interval);
    }, [selectedInbox, loadMessages]);


    // --- Actions ---

    const createDomain = async (name: string) => {
        setBusy(true);
        try {
            await api("/domains", { method: "POST", token, body: { name } });
            toast.success("Đã thêm domain thành công");
            await loadDomains();
        } catch (e) {
            toast.error("Lỗi: " + (e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const createInbox = async (domainId: string, localPart: string, expiresAt?: number) => {
        setBusy(true);
        try {
            const domain = domains.find(d => d.id === domainId);
            if (!domain) return;

            await api("/inboxes", {
                method: "POST",
                token,
                body: {
                    domainId,
                    localPart,
                    expiresAt: expiresAt ? new Date(Date.now() + expiresAt).toISOString() : null
                }
            });
            toast.success("Đã tạo hộp thư mới");
            await loadInboxes(domain.id); // Use domain.id here, assuming loadInboxes expects ID (checked above)
        } catch (e) {
            toast.error("Lỗi: " + (e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const verifyDomain = async (domainId: string, tokenString: string) => {
        setBusy(true);
        try {
            await api(`/domains/${domainId}/verify`, { method: "POST", token, body: { token: tokenString } });
            toast.success("Xác thực domain thành công");
            await loadDomains();
        } catch (e) {
            toast.error("Lỗi xác thực: " + (e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const deleteDomain = async (domainId: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa domain này không?")) return;
        setBusy(true);
        try {
            await api(`/domains/${domainId}`, { method: "DELETE", token });
            toast.success("Đã xóa domain");
            setSelectedDomain(""); // Reset selection
            await loadDomains();
        } catch (e) {
            toast.error("Lỗi xóa domain: " + (e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const handleSelectMessage = async (msg: Message) => {
        setSelectedMessage(msg);
        setMobileView("detail"); // Go to detail on mobile

        // Mark read
        if (!msg.isRead) {
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
            try {
                await api(`/messages/${msg.id}/read`, { method: "PATCH", token, body: { isRead: true } });
            } catch (e) { console.error(e); }
        }
    };

    return (
        <div className="pane-layout">

            {/* Left Pane: Sidebar */}
            <div className={`h-full border-r border-border bg-surface ${mobileView === 'sidebar' ? 'block w-full' : 'hidden'} md:block md:w-auto overflow-hidden`}>
                <Sidebar
                    domains={domains}
                    inboxes={inboxes}
                    selectedDomainId={selectedDomain}
                    selectedInboxId={selectedInbox}
                    onSelectDomain={setSelectedDomain}
                    onSelectInbox={setSelectedInbox}
                    onCreateDomain={createDomain}
                    onCreateInbox={createInbox}
                    onVerifyDomain={verifyDomain}
                    onDeleteDomain={deleteDomain}
                    onLogout={logout}
                    isAdmin={isAdmin}
                    currentUserId={user?.id}
                    busy={busy}
                />
            </div>

            {/* Middle Pane: Message List */}
            <div className={`h-full border-r border-border bg-surface ${mobileView === 'list' ? 'block w-full' : 'hidden'} md:block md:w-auto overflow-hidden`}>
                <MessageList
                    inbox={inboxes.find(i => i.id === selectedInbox)}
                    messages={messages}
                    selectedMessageId={selectedMessage?.id}
                    onSelectMessage={handleSelectMessage}
                    search={messageSearch}
                    onSearchChange={setMessageSearch}
                    hasAttachments={messageHasAttachments}
                    onToggleAttachments={() => setMessageHasAttachments(prev => !prev)}
                    onRefresh={() => selectedInbox && loadMessages(selectedInbox)}
                    loading={busy}
                    canLoadMore={messages.length < messageTotal}
                    onLoadMore={() => selectedInbox && loadMessages(selectedInbox, { offset: messageOffset + PAGE_SIZE.messages, append: true })}
                    onBack={() => setMobileView("sidebar")}
                />
            </div>

            {/* Right Pane: Message Detail */}
            <div className={`h-full bg-surface ${mobileView === 'detail' ? 'block w-full' : 'hidden'} md:block overflow-hidden`}>
                <MessageDetail
                    message={selectedMessage}
                    onComposeReply={() => canSendOutbound && setShowCompose(true)}
                    onBack={() => setMobileView("list")}
                />
            </div>

            {/* Modals */}
            {showCompose && (
                <ComposeModal
                    token={token}
                    inboxes={inboxes}
                    onClose={() => setShowCompose(false)}
                />
            )}

            {busy && !messages.length && <Loading fullScreen />}
        </div>
    );
}
