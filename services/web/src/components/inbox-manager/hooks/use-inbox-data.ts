/**
 * Custom hook for inbox data loading and realtime subscriptions
 * Extracted from InboxManager.tsx for modularity
 */
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { api, PAGE_SIZE } from "../../../utils/api";
import { useRealtimeSubscription } from "../../../hooks/useRealtimeContext";
import type { Domain, Inbox, Message, PaginatedResponse } from "../../../types";
import type { RealtimeEvent } from "../../../types/realtime";

export interface UseInboxDataReturn {
    // Data
    domains: Domain[];
    inboxes: Inbox[];
    messages: Message[];
    setInboxes: React.Dispatch<React.SetStateAction<Inbox[]>>;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;

    // Selection
    selectedDomain: string;
    setSelectedDomain: React.Dispatch<React.SetStateAction<string>>;
    activeInbox: Inbox | null;
    setActiveInbox: React.Dispatch<React.SetStateAction<Inbox | null>>;

    // Loading state
    busy: boolean;
    setBusy: React.Dispatch<React.SetStateAction<boolean>>;

    // Loaders
    loadDomains: () => Promise<void>;
    loadInboxes: () => Promise<void>;
    loadMessages: (inboxId: string) => Promise<void>;
}

export function useInboxData(): UseInboxDataReturn {
    const { token } = useAuth();
    const [busy, setBusy] = useState(false);

    // Data state
    const [domains, setDomains] = useState<Domain[]>([]);
    const [inboxes, setInboxes] = useState<Inbox[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    // Selection state
    const [selectedDomain, setSelectedDomain] = useState<string>("");
    const [activeInbox, setActiveInbox] = useState<Inbox | null>(null);

    // Load domains
    const loadDomains = useCallback(async () => {
        if (!token) return;
        try {
            const res = await api<PaginatedResponse<Domain>>("/domains?limit=100", { token });
            setDomains(res?.data || []);
        } catch {
            toast.error("Lỗi tải danh sách domain");
        }
    }, [token]);

    // Auto-select first domain
    useEffect(() => {
        if (domains.length > 0 && !selectedDomain) {
            setSelectedDomain(domains[0].id);
        }
    }, [domains, selectedDomain]);

    // Load inboxes
    const loadInboxes = useCallback(async () => {
        if (!token) return;
        setBusy(true);
        try {
            const params = new URLSearchParams({ limit: "100" });
            const res = await api<PaginatedResponse<Inbox>>(`/inboxes?${params.toString()}`, { token });
            setInboxes(res?.data || []);
        } catch {
            toast.error("Lỗi tải danh sách inbox");
        } finally {
            setBusy(false);
        }
    }, [token]);

    // Load messages for an inbox
    const loadMessages = useCallback(async (inboxId: string) => {
        if (!token) return;
        setBusy(true);
        try {
            const queryParams = new URLSearchParams({
                inboxId,
                limit: String(PAGE_SIZE.messages),
                offset: "0"
            });
            const res = await api<PaginatedResponse<Message>>(`/messages?${queryParams.toString()}`, { token });
            setMessages(res?.data || []);
        } catch {
            toast.error("Lỗi tải email");
        } finally {
            setBusy(false);
        }
    }, [token]);

    // Initial data loading
    useEffect(() => { loadDomains(); }, [loadDomains]);
    useEffect(() => { loadInboxes(); }, [loadInboxes]);
    useEffect(() => {
        if (activeInbox) {
            loadMessages(activeInbox.id);
        } else {
            setMessages([]);
        }
    }, [activeInbox, loadMessages]);

    // Realtime subscription for new emails and updates
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

    // Handle payment success/cancellation from URL
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
        setInboxes,
        setMessages,
        selectedDomain,
        setSelectedDomain,
        activeInbox,
        setActiveInbox,
        busy,
        setBusy,
        loadDomains,
        loadInboxes,
        loadMessages
    };
}
