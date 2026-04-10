/**
 * Hook for InboxManager data loading
 * Handles domains, inboxes, messages, and realtime subscriptions
 */
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../utils/api";
import { useRealtimeSubscription } from "../../../hooks/useRealtimeContext";
import type { RealtimeEvent } from "../../../types/realtime";
import type { Domain, Inbox, Message, PaginatedResponse } from "../../../types";

const INBOX_PAGE_SIZE = 200;
const MAX_INBOX_PAGES = 50;

type InboxListResponse = PaginatedResponse<Inbox> & {
    total?: number;
    meta?: {
        total?: number;
    };
};

export interface UseInboxManagerDataReturn {
    // Data
    domains: Domain[];
    inboxes: Inbox[];
    messages: Message[];
    // State
    busy: boolean;
    setBusy: React.Dispatch<React.SetStateAction<boolean>>;
    // Selection
    selectedDomain: string;
    activeInbox: Inbox | null;
    setSelectedDomain: (id: string) => void;
    setActiveInbox: React.Dispatch<React.SetStateAction<Inbox | null>>;
    setInboxes: React.Dispatch<React.SetStateAction<Inbox[]>>;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    // Loaders
    loadInboxes: () => Promise<void>;
    loadMessages: (inboxId: string) => Promise<void>;
}

export function useInboxManagerData(): UseInboxManagerDataReturn {
    const { token } = useAuth();

    // Core state
    const [busy, setBusy] = useState(false);
    const [domains, setDomains] = useState<Domain[]>([]);
    const [inboxes, setInboxes] = useState<Inbox[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    // Selection state
    const [selectedDomain, setSelectedDomain] = useState<string>("");
    const [activeInbox, setActiveInbox] = useState<Inbox | null>(null);

    // --- Loaders ---
    const loadDomains = useCallback(async () => {
        if (!token) return;
        try {
            const res = await api<PaginatedResponse<Domain>>("/domains?limit=100", { token });
            setDomains(res?.data || []);
        } catch (err) {
            console.error('[InboxManager] Load domains failed:', err);
            toast.error("Lỗi tải danh sách domain");
        }
    }, [token]);

    const loadInboxes = useCallback(async () => {
        if (!token) return;
        setBusy(true);
        try {
            const allInboxes: Inbox[] = [];
            let offset = 0;
            let total: number | null = null;

            for (let page = 0; page < MAX_INBOX_PAGES; page += 1) {
                const res = await api<InboxListResponse>(`/inboxes?limit=${INBOX_PAGE_SIZE}&offset=${offset}`, { token });
                const pageData = Array.isArray(res?.data) ? res.data : [];
                allInboxes.push(...pageData);

                const metaTotal = res?.meta?.total;
                const directTotal = typeof res?.total === "number" ? res.total : undefined;
                if (typeof metaTotal === "number") {
                    total = metaTotal;
                } else if (typeof directTotal === "number") {
                    total = directTotal;
                }

                if (pageData.length === 0) break;
                offset += pageData.length;

                if (total !== null && offset >= total) break;
            }

            const uniqueInboxes = Array.from(
                allInboxes.reduce((map, inbox) => map.set(inbox.id, inbox), new Map<string, Inbox>()).values()
            );
            setInboxes(total !== null ? uniqueInboxes.slice(0, total) : uniqueInboxes);
        } catch (err) {
            console.error('[InboxManager] Load inboxes failed:', err);
            toast.error("Lỗi tải danh sách inbox");
        } finally {
            setBusy(false);
        }
    }, [token]);

    const loadMessages = useCallback(async (inboxId: string) => {
        if (!token) return;
        setBusy(true);
        try {
            const res = await api<PaginatedResponse<Message>>(`/messages?inboxId=${inboxId}&limit=50&offset=0`, { token });
            setMessages(res?.data || []);
        } catch (err) {
            console.error('[InboxManager] Load messages failed:', err);
            toast.error("Lỗi tải email");
        } finally {
            setBusy(false);
        }
    }, [token]);

    // --- Effects ---
    useEffect(() => { loadDomains(); }, [loadDomains]);
    useEffect(() => { loadInboxes(); }, [loadInboxes]);

    // Auto-select first domain
    useEffect(() => {
        if (domains.length > 0 && !selectedDomain) {
            setSelectedDomain(domains[0].id);
        }
    }, [domains, selectedDomain]);

    // Load messages when inbox changes
    useEffect(() => {
        if (activeInbox) {
            loadMessages(activeInbox.id);
        } else {
            setMessages([]);
        }
    }, [activeInbox, loadMessages]);

    // Realtime subscription
    useRealtimeSubscription("inbox-manager", (event: RealtimeEvent) => {
        if (event.type === 'email.new') {
            const payload = event.payload as { inboxId: string };
            if (activeInbox && payload.inboxId === activeInbox.id) {
                loadMessages(activeInbox.id);
            }
        } else if (event.type === 'email.deleted') {
            const payload = event.payload as { messageId: string; inboxId: string };
            if (activeInbox && payload.inboxId === activeInbox.id) {
                setMessages(prev => prev.filter(m => m.id !== payload.messageId));
            }
        } else if (event.type === 'email.read') {
            const payload = event.payload as { messageId: string; isRead: boolean };
            setMessages(prev => prev.map(m =>
                m.id === payload.messageId ? { ...m, isRead: payload.isRead } : m
            ));
        } else if (event.type === 'inbox.created') {
            loadInboxes();
        }
    }, [activeInbox?.id, loadMessages, loadInboxes]);

    // Payment success/cancellation handler
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("payment") === "success") {
            toast.success("Thanh toán thành công! Gói dịch vụ của bạn đã được cập nhật.");
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (urlParams.get("payment") === "cancelled") {
            toast.error("Thanh toán đã bị hủy.");
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    return {
        domains,
        inboxes,
        messages,
        busy,
        setBusy,
        selectedDomain,
        activeInbox,
        setSelectedDomain,
        setActiveInbox,
        setInboxes,
        setMessages,
        loadInboxes,
        loadMessages
    };
}
