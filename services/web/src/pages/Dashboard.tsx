import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api, PAGE_SIZE } from "../utils/api";
import { DomainPanel } from "../components/DomainPanel";
import { InboxPanel } from "../components/InboxPanel";
import { MessagePanel } from "../components/MessagePanel";
import { ComposeModal } from "../components/ComposeModal";
import { Loading } from "../components/Loading";
import type { Domain, Inbox, Message, PaginatedResponse } from "../types";

export function Dashboard() {
    const { token, user } = useAuth();
    const [busy, setBusy] = useState(false);

    // Data
    const [domains, setDomains] = useState<Domain[]>([]);
    const [inboxes, setInboxes] = useState<Inbox[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    // Selection
    const [selectedDomain, setSelectedDomain] = useState<string>("");
    const [selectedInbox, setSelectedInbox] = useState<string>("");
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

    // Pagination & Search
    const [domainOffset, setDomainOffset] = useState(0);
    const [domainTotal, setDomainTotal] = useState(0);
    const [domainSearch, setDomainSearch] = useState("");

    const [inboxOffset, setInboxOffset] = useState(0);
    const [inboxTotal, setInboxTotal] = useState(0);
    const [inboxSearch, setInboxSearch] = useState("");

    const [messageOffset, setMessageOffset] = useState(0);
    const [messageTotal, setMessageTotal] = useState(0);
    const [messageSearch, setMessageSearch] = useState("");
    const [messageHasAttachments, setMessageHasAttachments] = useState(false);

    // UI State
    const [viewMode, setViewMode] = useState<"html" | "text">("html");
    const [showCompose, setShowCompose] = useState(false);

    const isAdmin = user?.role === "ADMIN";
    const outboundEnabled =
        String(window.env?.OUTBOUND_ENABLED ?? import.meta.env.VITE_OUTBOUND_ENABLED ?? "false").toLowerCase() === "true";
    const canSendOutbound = outboundEnabled && isAdmin;

    const loadDomains = useCallback(
        async (params: { offset?: number; search?: string } = {}) => {
            if (!token) return;
            setBusy(true);
            try {
                const off = params.offset ?? domainOffset;
                const q = params.search ?? domainSearch;
                const res = await api<PaginatedResponse<Domain>>(
                    `/domains?limit=${PAGE_SIZE.domains}&offset=${off}&search=${encodeURIComponent(
                        q
                    )}`,
                    { token }
                );
                setDomains(res.data);
                if (res.meta?.total !== undefined) setDomainTotal(res.meta.total);
                if (params.offset !== undefined) setDomainOffset(params.offset);
            } catch (e) {
                toast.error("Không thể tải danh sách domain");
                console.error(e);
            } finally {
                setBusy(false);
            }
        },
        [token, domainOffset, domainSearch]
    );

    const loadInboxes = useCallback(
        async (
            domainName: string | undefined,
            params: { offset?: number; search?: string } = {}
        ) => {
            if (!token) return;
            setBusy(true);
            try {
                const off = params.offset ?? inboxOffset;
                const q = params.search ?? inboxSearch;
                let url = `/inboxes?limit=${PAGE_SIZE.inboxes
                    }&offset=${off}&search=${encodeURIComponent(q)}`;
                if (domainName) url += `&domain=${domainName}`;

                const res = await api<PaginatedResponse<Inbox>>(url, { token });
                setInboxes(res.data);
                if (res.meta?.total !== undefined) setInboxTotal(res.meta.total);
                if (params.offset !== undefined) setInboxOffset(params.offset);
            } catch (e) {
                toast.error("Không thể tải danh sách hộp thư");
                console.error(e);
            } finally {
                setBusy(false);
            }
        },
        [token, inboxOffset, inboxSearch]
    );

    const loadMessages = useCallback(
        async (
            inboxId: string,
            params: { offset?: number; search?: string } = {}
        ) => {
            if (!token) return;
            setBusy(true);
            try {
                const off = params.offset ?? messageOffset;
                const q = params.search ?? messageSearch;
                let url = `/messages?inboxId=${inboxId}&limit=${PAGE_SIZE.messages
                    }&offset=${off}&q=${encodeURIComponent(q)}`;
                if (messageHasAttachments) url += "&hasAttachments=true";

                const res = await api<PaginatedResponse<Message>>(url, { token });
                setMessages(res.data);
                if (res.meta?.total !== undefined) setMessageTotal(res.meta.total);
                if (params.offset !== undefined) setMessageOffset(params.offset);
            } catch (e) {
                toast.error("Không thể tải danh sách email");
                console.error(e);
            } finally {
                setBusy(false);
            }
        },
        [token, messageOffset, messageSearch, messageHasAttachments]
    );

    // Initial load
    useEffect(() => {
        loadDomains({ offset: 0 });
    }, [token]);

    // Effects for selection changes
    useEffect(() => {
        if (selectedDomain && selectedDomain !== "__admin__") {
            const d = domains.find((x) => x.id === selectedDomain);
            loadInboxes(d?.name, { offset: 0 });
            setSelectedInbox("");
            setMessages([]);
            setSelectedMessage(null);
        }
    }, [selectedDomain, domains]);

    useEffect(() => {
        if (selectedInbox) {
            loadMessages(selectedInbox, { offset: 0 });
            setSelectedMessage(null);
        } else {
            setMessages([]);
        }
    }, [selectedInbox, messageHasAttachments]);

    // Handlers
    const createDomain = async (name: string) => {
        if (!name) return;
        setBusy(true);
        try {
            await api("/domains", { method: "POST", token, body: { name } });
            toast.success("Đã thêm domain mới");
            await loadDomains();
        } catch (e) {
            toast.error("Không thể tạo domain: " + (e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const verifyDomain = async (id: string, code: string) => {
        if (!code) return;
        setBusy(true);
        try {
            await api(`/domains/${id}/verify`, {
                method: "POST",
                token,
                body: { token: code },
            });
            toast.success("Domain đã được xác minh!");
            await loadDomains();
        } catch (e) {
            toast.error("Xác minh thất bại: " + (e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const createInbox = async (
        domainId: string,
        localPart: string,
        expiresAt?: string
    ) => {
        setBusy(true);
        try {
            await api("/inboxes", {
                method: "POST",
                token,
                body: { domainId, localPart, expiresAt: expiresAt || null },
            });
            toast.success("Đã tạo hộp thư mới");
            const d = domains.find((x) => x.id === selectedDomain);
            await loadInboxes(d?.name);
        } catch (e) {
            toast.error("Không thể tạo hộp thư: " + (e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const currentDomain = domains.find((d) => d.id === selectedDomain);
    const currentInbox = inboxes.find((i) => i.id === selectedInbox);

    return (
        <>
            {busy && <Loading fullScreen message="Đang xử lý..." />}

            <div className="stack">
                <DomainPanel
                    domains={domains}
                    onCreate={createDomain}
                    onVerify={verifyDomain}
                    busy={busy}
                    selectedDomain={selectedDomain}
                    onSelect={setSelectedDomain}
                    search={domainSearch}
                    onSearchChange={setDomainSearch}
                    onSearch={() => loadDomains({ offset: 0, search: domainSearch })}
                    onPaginate={(next) => loadDomains({ offset: next })}
                    offset={domainOffset}
                    total={domainTotal}
                    isAdmin={isAdmin}
                />

                <InboxPanel
                    domain={currentDomain}
                    inboxes={inboxes}
                    selectedInbox={selectedInbox}
                    onSelectInbox={setSelectedInbox}
                    onCreate={createInbox}
                    busy={busy}
                    search={inboxSearch}
                    onSearchChange={setInboxSearch}
                    onSearch={() =>
                        loadInboxes(currentDomain?.name, { offset: 0, search: inboxSearch })
                    }
                    onPaginate={(next) =>
                        loadInboxes(currentDomain?.name, { offset: next })
                    }
                    offset={inboxOffset}
                    total={inboxTotal}
                    isAdmin={isAdmin}
                />
            </div>

            <MessagePanel
                inbox={currentInbox}
                messages={messages}
                selected={selectedMessage}
                onSelect={setSelectedMessage}
                reload={() => {
                    if (selectedInbox)
                        loadMessages(selectedInbox, { offset: messageOffset });
                }}
                offset={messageOffset}
                total={messageTotal}
                onPaginate={(nextOffset) => {
                    if (selectedInbox) loadMessages(selectedInbox, { offset: nextOffset });
                }}
                search={messageSearch}
                onSearchChange={setMessageSearch}
                hasAttachments={messageHasAttachments}
                onToggleAttachments={() => setMessageHasAttachments((v) => !v)}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onCompose={() => canSendOutbound && setShowCompose(true)}
                outboundEnabled={canSendOutbound}
            />

            {showCompose && canSendOutbound && (
                <ComposeModal
                    token={token}
                    inboxes={inboxes}
                    onClose={() => setShowCompose(false)}
                />
            )}
        </>
    );
}
