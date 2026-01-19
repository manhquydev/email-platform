/**
 * Hook for Focus Dashboard data loading
 * Handles domains, inboxes, messages, and realtime updates
 */
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { useRealtimeContext } from '../../../hooks/useRealtimeContext';
import { api, PAGE_SIZE } from '../../../utils/api';
import { parseSearchQuery } from '../../../utils/searchParser';
import type { Domain, Inbox, Message, PaginatedResponse } from '../../../types';
import type { RealtimeEvent, EmailNewPayload } from '../../../types/realtime';

export interface UseFocusDashboardDataReturn {
    domains: Domain[];
    inboxes: Inbox[];
    messages: Message[];
    selectedDomain: string;
    selectedInbox: string;
    busy: boolean;
    setSelectedDomain: (id: string) => void;
    setSelectedInbox: (id: string) => void;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    loadInboxes: () => Promise<void>;
    loadMessages: (inboxId: string, background?: boolean) => Promise<void>;
}

export function useFocusDashboardData(searchQuery: string): UseFocusDashboardDataReturn {
    const { token } = useAuth();
    const { subscribe, unsubscribe, isConnected } = useRealtimeContext();
    const [busy, setBusy] = useState(false);

    const [domains, setDomains] = useState<Domain[]>([]);
    const [inboxes, setInboxes] = useState<Inbox[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    const [selectedDomain, setSelectedDomain] = useState<string>("");
    const [selectedInbox, setSelectedInbox] = useState<string>("");

    // Load domains
    const loadDomains = useCallback(async () => {
        if (!token) return;
        try {
            const res = await api<PaginatedResponse<Domain>>("/domains?limit=100", { token });
            setDomains(res?.data || []);
        } catch (error) {
            console.error('[FocusDashboard] Load domains failed:', error);
            toast.error("Lỗi tải danh sách domain");
        }
    }, [token]);

    // Auto-select domain
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
            const params = new URLSearchParams({ limit: "100", personal: "true" });
            const res = await api<PaginatedResponse<Inbox>>(`/inboxes?${params.toString()}`, { token });
            setInboxes(res?.data || []);
        } catch (error) {
            console.error('[FocusDashboard] Load inboxes failed:', error);
            toast.error("Lỗi tải danh sách inbox");
        } finally {
            setBusy(false);
        }
    }, [token]);

    // Auto-select first inbox
    useEffect(() => {
        if (inboxes.length > 0 && !selectedInbox) {
            setSelectedInbox(inboxes[0].id);
        }
    }, [inboxes, selectedInbox]);

    // Load messages
    const loadMessages = useCallback(async (inboxId: string, background = false) => {
        if (!token) return;
        if (!background) setBusy(true);
        try {
            const parsed = parseSearchQuery(searchQuery);
            const queryParams = new URLSearchParams({
                inboxId,
                limit: String(PAGE_SIZE.messages),
                offset: "0"
            });
            if (parsed.q) queryParams.append("q", parsed.q);
            if (parsed.from) queryParams.append("from", parsed.from);
            if (parsed.hasAttachments) queryParams.append("hasAttachments", "true");

            const res = await api<PaginatedResponse<Message>>(`/messages?${queryParams.toString()}`, { token });
            setMessages(res?.data || []);
        } catch (error) {
            console.error('[FocusDashboard] Load messages failed:', error);
            if (!background) toast.error("Lỗi tải email");
        } finally {
            if (!background) setBusy(false);
        }
    }, [token, searchQuery]);

    // Initial data load
    useEffect(() => { loadDomains(); }, [loadDomains]);
    useEffect(() => { loadInboxes(); }, [loadInboxes]);

    // Load messages on inbox change
    useEffect(() => {
        if (selectedInbox) {
            loadMessages(selectedInbox);
        } else {
            setMessages([]);
        }
    }, [selectedInbox, loadMessages]);

    // Realtime subscription
    useEffect(() => {
        const handleRealtimeEvent = (event: RealtimeEvent) => {
            if (event.type === 'email.new') {
                const payload = event.payload as unknown as EmailNewPayload;
                if (payload.inboxId === selectedInbox) {
                    loadMessages(selectedInbox, true);
                }
            }
        };
        subscribe('focus-dashboard', handleRealtimeEvent);
        return () => unsubscribe('focus-dashboard');
    }, [selectedInbox, loadMessages, subscribe, unsubscribe]);

    // Fallback polling when realtime disconnected
    useEffect(() => {
        if (isConnected || !selectedInbox) return;
        const interval = setInterval(() => loadMessages(selectedInbox, true), 30000);
        return () => clearInterval(interval);
    }, [selectedInbox, loadMessages, isConnected]);

    // Update title with unread count
    useEffect(() => {
        const unreadCount = messages.filter(m => !m.isRead).length;
        document.title = unreadCount > 0 ? `(${unreadCount}) Ephemera` : "Ephemera";
        return () => { document.title = "Ephemera"; };
    }, [messages]);

    return {
        domains,
        inboxes,
        messages,
        selectedDomain,
        selectedInbox,
        busy,
        setSelectedDomain,
        setSelectedInbox,
        setMessages,
        loadInboxes,
        loadMessages,
    };
}
