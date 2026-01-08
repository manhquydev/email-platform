/**
 * useDashboardData Hook
 * Manages dashboard data loading (domains, inboxes, messages)
 */

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { api, PAGE_SIZE } from "../utils/api";
import { parseSearchQuery } from "../utils/searchParser";
import type { Domain, Inbox, Message, PaginatedResponse } from "../types";

interface UseDashboardDataOptions {
    token: string | null;
    userId?: string;
}

interface UseDashboardDataReturn {
    // Data
    domains: Domain[];
    inboxes: Inbox[];
    messages: Message[];

    // Selection
    selectedDomain: string;
    selectedInbox: string;
    setSelectedDomain: (id: string) => void;
    setSelectedInbox: (id: string) => void;

    // Pagination
    messageOffset: number;
    messageTotal: number;
    messageSearch: string;
    setMessageSearch: (search: string) => void;

    // Computed
    activeDomain: Domain | undefined;
    activeInbox: Inbox | undefined;

    // Loading
    busy: boolean;

    // Actions
    loadDomains: () => Promise<void>;
    loadInboxes: () => Promise<void>;
    loadMessages: (inboxId: string, params?: { offset?: number; append?: boolean; background?: boolean }) => Promise<void>;
    setDomains: React.Dispatch<React.SetStateAction<Domain[]>>;
    setInboxes: React.Dispatch<React.SetStateAction<Inbox[]>>;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setBusy: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useDashboardData({ token, userId }: UseDashboardDataOptions): UseDashboardDataReturn {
    // Data
    const [domains, setDomains] = useState<Domain[]>([]);
    const [inboxes, setInboxes] = useState<Inbox[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    // Selection
    const [selectedDomain, setSelectedDomain] = useState<string>("");
    const [selectedInbox, setSelectedInbox] = useState<string>("");

    // Pagination
    const [messageSearch, setMessageSearch] = useState("");
    const [messageOffset, setMessageOffset] = useState(0);
    const [messageTotal, setMessageTotal] = useState(0);

    // Loading
    const [busy, setBusy] = useState(false);

    // Computed values
    const activeDomain = domains.find(d => d.id === selectedDomain);
    const activeInbox = inboxes.find(i => i.id === selectedInbox);

    // Loaders
    const loadDomains = useCallback(async () => {
        if (!token) return;
        try {
            const res = await api<PaginatedResponse<Domain>>("/domains?limit=100", { token });
            const domainsData = res?.data || [];
            setDomains(domainsData);
        } catch {
            console.error("Failed to load domains", e);
            toast.error("Lỗi tải danh sách tên miền");
        }
    }, [token]);

    const loadInboxes = useCallback(async () => {
        if (!token) return;
        setBusy(true);
        try {
            const params = new URLSearchParams({ limit: "100", personal: "true" });
            const res = await api<PaginatedResponse<Inbox>>(`/inboxes?${params.toString()}`, { token });
            setInboxes(res?.data || []);
        } catch {
            console.error("Failed to load inboxes", e);
            toast.error("Lỗi tải danh sách hộp thư");
        } finally {
            setBusy(false);
        }
    }, [token]);

    const loadMessages = useCallback(async (inboxId: string, params: { offset?: number; append?: boolean; background?: boolean } = {}) => {
        if (!token) return;
        if (!params.background) setBusy(true);
        try {
            const off = params.offset ?? 0;
            const parsed = parseSearchQuery(messageSearch);

            if (parsed.q && parsed.q.length >= 2 && !parsed.from && !parsed.before && !parsed.after && parsed.isRead === undefined) {
                // Fuzzy search
                const fuzzyParams = new URLSearchParams({
                    q: parsed.q, inboxId, limit: String(PAGE_SIZE.messages), threshold: "0.3",
                });
                if (parsed.hasAttachments) fuzzyParams.append("hasAttachments", "true");
                const res = await api<PaginatedResponse<Message>>(`/messages/search/fuzzy?${fuzzyParams.toString()}`, { token });
                setMessages(prev => params.append ? [...prev, ...res.data] : res.data);
                if (res.meta?.total !== undefined) setMessageTotal(res.meta.total);
                if (params.offset !== undefined) setMessageOffset(params.offset);
            } else {
                // Regular search
                const queryParams = new URLSearchParams({ inboxId, limit: String(PAGE_SIZE.messages), offset: String(off) });
                if (parsed.q) queryParams.append("q", parsed.q);
                if (parsed.from) queryParams.append("from", parsed.from);
                if (parsed.hasAttachments) queryParams.append("hasAttachments", "true");
                if (parsed.before) queryParams.append("end", parsed.before);
                if (parsed.after) queryParams.append("start", parsed.after);
                if (parsed.isRead !== undefined) queryParams.append("isRead", String(parsed.isRead));

                const res = await api<PaginatedResponse<Message>>(`/messages?${queryParams.toString()}`, { token });
                setMessages(prev => params.append ? [...prev, ...res.data] : res.data);
                if (res.meta?.total !== undefined) setMessageTotal(res.meta.total);
                if (params.offset !== undefined) setMessageOffset(params.offset);
            }
        } catch {
            if (!params.background) toast.error("Lỗi tải email");
        } finally {
            if (!params.background) setBusy(false);
        }
    }, [token, messageSearch]);

    // Auto-select domain effect
    useEffect(() => {
        if (domains.length > 0 && !selectedDomain) {
            const myDomains = domains.filter(d => d.ownerId === userId);
            if (myDomains.length > 0) {
                setSelectedDomain(myDomains[0].id);
            } else {
                setSelectedDomain(domains[0].id);
            }
        }
    }, [domains, selectedDomain, userId]);

    // Auto-select inbox effect
    useEffect(() => {
        if (inboxes.length > 0) {
            if (!selectedInbox || !inboxes.find(i => i.id === selectedInbox)) {
                setSelectedInbox(inboxes[0].id);
            }
        } else if (!busy) {
            setMessages([]);
            setSelectedInbox("");
        }
    }, [inboxes, selectedInbox, busy]);

    // Initial data loading
    useEffect(() => { loadDomains(); }, [loadDomains]);
    useEffect(() => { loadInboxes(); }, [loadInboxes]);

    // Load messages when inbox changes
    useEffect(() => {
        if (selectedInbox) {
            loadMessages(selectedInbox, { offset: 0 });
        } else {
            setMessages([]);
        }
    }, [selectedInbox, loadMessages]);

    // Debounced search
    useEffect(() => {
        const t = setTimeout(() => { if (selectedInbox) loadMessages(selectedInbox); }, 500);
        return () => clearTimeout(t);
    }, [messageSearch, selectedInbox, loadMessages]);

    // Polling for new messages
    useEffect(() => {
        if (!selectedInbox) return;
        const interval = setInterval(() => { loadMessages(selectedInbox, { background: true }); }, 10000);
        return () => clearInterval(interval);
    }, [selectedInbox, loadMessages]);

    return {
        domains,
        inboxes,
        messages,
        selectedDomain,
        selectedInbox,
        setSelectedDomain,
        setSelectedInbox,
        messageOffset,
        messageTotal,
        messageSearch,
        setMessageSearch,
        activeDomain,
        activeInbox,
        busy,
        loadDomains,
        loadInboxes,
        loadMessages,
        setDomains,
        setInboxes,
        setMessages,
        setBusy,
    };
}
