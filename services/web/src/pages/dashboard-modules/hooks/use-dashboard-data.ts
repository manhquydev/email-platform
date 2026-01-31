/**
 * Hook for loading dashboard data (domains, teams, inboxes, messages)
 * Extracted from Dashboard.tsx for modularity
 */
import { useState, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { api, PAGE_SIZE } from "../../../utils/api";
import { parseSearchQuery } from "../../../utils/searchParser";
import type { Domain, Inbox, Message, OutboundMessage, PaginatedResponse, Team } from "../../../types";

export type ViewMode = 'inbox' | 'sent';

export interface UseDashboardDataReturn {
    // Data
    domains: Domain[];
    teams: Team[];
    inboxes: Inbox[];
    messages: Message[];
    outboundMessages: OutboundMessage[];

    // Selection
    selectedDomain: string;
    selectedTeam: string;
    selectedInbox: string;

    // Pagination
    messageOffset: number;
    messageTotal: number;

    // State
    busy: boolean;
    viewMode: ViewMode;

    // Setters
    setSelectedDomain: (id: string) => void;
    setSelectedTeam: (id: string) => void;
    setSelectedInbox: (id: string) => void;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;

    // Loaders
    loadMessages: (inboxId: string, params?: { offset?: number; append?: boolean; background?: boolean }) => Promise<void>;
    refreshMessages: () => void;
}

function mapOutboundToMessage(outbound: OutboundMessage): Message {
    return {
        id: outbound.id,
        inboxId: outbound.inboxId || '',
        subject: outbound.subject,
        fromAddress: outbound.fromAddress,
        toAddress: outbound.toAddress,
        receivedAt: outbound.createdAt,
        textBody: null,
        htmlBody: null,
        isRead: true,
        isPinned: false,
        attachments: [],
    };
}

export function useDashboardData(messageSearch: string, viewMode: ViewMode = 'inbox'): UseDashboardDataReturn {
    const { token, user } = useAuth();
    const [busy, setBusy] = useState(false);

    // Data
    const [domains, setDomains] = useState<Domain[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [inboxes, setInboxes] = useState<Inbox[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [outboundMessages, setOutboundMessages] = useState<OutboundMessage[]>([]);

    // Selection
    const [selectedDomain, setSelectedDomain] = useState<string>("");
    const [selectedTeam, setSelectedTeam] = useState<string>("");
    const [selectedInbox, setSelectedInbox] = useState<string>("");

    // Pagination
    const [messageOffset, setMessageOffset] = useState(0);
    const [messageTotal, setMessageTotal] = useState(0);

    // Load domains
    const loadDomains = useCallback(async () => {
        if (!token) return;
        try {
            const res = await api<PaginatedResponse<Domain>>("/domains?limit=100", { token });
            setDomains(res?.data || []);
        } catch (e) {
            console.error("Failed to load domains", e);
            toast.error("Lỗi tải danh sách tên miền");
        }
    }, [token]);

    // Load teams
    const loadTeams = useCallback(async () => {
        if (!token) return;
        try {
            const res = await api<{ teams: Team[] }>("/teams", { token });
            setTeams(res.teams || []);
        } catch (e) {
            console.error("Failed to load teams", e);
        }
    }, [token]);

    // Load inboxes
    const loadInboxes = useCallback(async () => {
        if (!token) return;
        setBusy(true);
        try {
            const params = new URLSearchParams({ limit: "100" });
            if (selectedTeam) params.append("teamId", selectedTeam);
            const res = await api<PaginatedResponse<Inbox>>(`/inboxes?${params.toString()}`, { token });
            setInboxes(res?.data || []);
        } catch (e) {
            console.error("Failed to load inboxes", e);
            toast.error("Lỗi tải danh sách hộp thư");
        } finally {
            setBusy(false);
        }
    }, [token, selectedTeam]);

    // Load messages
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

    // Load outbound messages (sent emails)
    const loadOutboundMessages = useCallback(async (params: { offset?: number; append?: boolean; background?: boolean } = {}) => {
        if (!token) return;
        if (!params.background) setBusy(true);
        try {
            const off = params.offset ?? 0;
            const queryParams = new URLSearchParams({
                limit: String(PAGE_SIZE.messages),
                offset: String(off)
            });

            const res = await api<{ data: OutboundMessage[]; meta: { total: number; limit: number; offset: number } }>(
                `/messages/outbound?${queryParams.toString()}`,
                { token }
            );

            // Map outbound messages to Message format for UI compatibility
            const mappedMessages = res.data.map(mapOutboundToMessage);

            setMessages(prev => params.append ? [...prev, ...mappedMessages] : mappedMessages);
            setOutboundMessages(prev => params.append ? [...prev, ...res.data] : res.data);
            if (res.meta?.total !== undefined) setMessageTotal(res.meta.total);
            if (params.offset !== undefined) setMessageOffset(params.offset);
        } catch {
            if (!params.background) toast.error("Lỗi tải thư đã gửi");
        } finally {
            if (!params.background) setBusy(false);
        }
    }, [token]);

    // Auto-select domain
    useEffect(() => {
        if (domains.length > 0 && !selectedDomain) {
            const myDomains = domains.filter(d => d.ownerId === user?.id);
            setSelectedDomain(myDomains.length > 0 ? myDomains[0].id : domains[0].id);
        }
    }, [domains, selectedDomain, user?.id]);

    // Auto-select inbox
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

    // Initial load effects - skip for sent mode
    useEffect(() => { loadDomains(); }, [loadDomains]);
    useEffect(() => { loadTeams(); }, [loadTeams]);
    useEffect(() => {
        if (viewMode === 'inbox') loadInboxes();
    }, [loadInboxes, viewMode]);

    // Load outbound messages on mount for sent mode
    useEffect(() => {
        if (viewMode === 'sent') {
            loadOutboundMessages();
        }
    }, [viewMode, loadOutboundMessages]);

    const refreshMessages = useCallback(() => {
        if (viewMode === 'sent') {
            loadOutboundMessages();
        } else if (selectedInbox) {
            loadMessages(selectedInbox);
        }
    }, [selectedInbox, loadMessages, loadOutboundMessages, viewMode]);

    // Unified load function that switches based on view mode
    const unifiedLoadMessages = useCallback(async (inboxId: string, params?: { offset?: number; append?: boolean; background?: boolean }) => {
        if (viewMode === 'sent') {
            await loadOutboundMessages(params);
        } else {
            await loadMessages(inboxId, params);
        }
    }, [viewMode, loadMessages, loadOutboundMessages]);

    return {
        domains,
        teams,
        inboxes,
        messages,
        outboundMessages,
        selectedDomain,
        selectedTeam,
        selectedInbox,
        messageOffset,
        messageTotal,
        busy,
        viewMode,
        setSelectedDomain,
        setSelectedTeam,
        setSelectedInbox,
        setMessages,
        loadMessages: unifiedLoadMessages,
        refreshMessages
    };
}
