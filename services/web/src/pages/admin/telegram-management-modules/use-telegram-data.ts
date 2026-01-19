/**
 * Hook for Telegram Management data loading
 * Handles overview, user links, and inbox links with pagination/search
 */
import { useState, useEffect, useCallback } from "react";
import { api } from "../../../utils/api";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import type {
    TelegramOverview,
    UserLink,
    InboxLink,
    TabType,
    StatusFilterType
} from "./types";
import { PAGE_SIZE } from "./types";

export interface UseTelegramDataReturn {
    // Loading state
    loading: boolean;
    // Overview data
    overview: TelegramOverview | null;
    // User links
    userLinks: UserLink[];
    userLinksTotal: number;
    userLinksPage: number;
    userSearch: string;
    setUserLinksPage: (page: number) => void;
    setUserSearch: (search: string) => void;
    // Inbox links
    inboxLinks: InboxLink[];
    inboxLinksTotal: number;
    inboxLinksPage: number;
    inboxSearch: string;
    statusFilter: StatusFilterType;
    setInboxLinksPage: (page: number) => void;
    setInboxSearch: (search: string) => void;
    setStatusFilter: (filter: StatusFilterType) => void;
    // Loaders
    loadOverview: () => Promise<void>;
    loadUserLinks: () => Promise<void>;
    loadInboxLinks: () => Promise<void>;
}

export function useTelegramData(activeTab: TabType): UseTelegramDataReturn {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<TelegramOverview | null>(null);

    // User links state
    const [userLinks, setUserLinks] = useState<UserLink[]>([]);
    const [userLinksTotal, setUserLinksTotal] = useState(0);
    const [userLinksPage, setUserLinksPage] = useState(0);
    const [userSearch, setUserSearch] = useState("");

    // Inbox links state
    const [inboxLinks, setInboxLinks] = useState<InboxLink[]>([]);
    const [inboxLinksTotal, setInboxLinksTotal] = useState(0);
    const [inboxLinksPage, setInboxLinksPage] = useState(0);
    const [inboxSearch, setInboxSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilterType>("all");

    const loadOverview = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api<TelegramOverview>("/admin/telegram/overview", { token });
            setOverview(res);
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token]);

    const loadUserLinks = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            params.set("limit", String(PAGE_SIZE));
            params.set("offset", String(userLinksPage * PAGE_SIZE));
            if (userSearch) params.set("search", userSearch);

            const res = await api<{ data: UserLink[]; meta: { total: number } }>(
                `/admin/telegram/user-links?${params}`,
                { token }
            );
            setUserLinks(res.data);
            setUserLinksTotal(res.meta.total);
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        }
    }, [token, userLinksPage, userSearch]);

    const loadInboxLinks = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            params.set("limit", String(PAGE_SIZE));
            params.set("offset", String(inboxLinksPage * PAGE_SIZE));
            if (statusFilter !== "all") params.set("status", statusFilter);
            if (inboxSearch) params.set("search", inboxSearch);

            const res = await api<{ data: InboxLink[]; meta: { total: number } }>(
                `/admin/telegram/inbox-links?${params}`,
                { token }
            );
            setInboxLinks(res.data);
            setInboxLinksTotal(res.meta.total);
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        }
    }, [token, inboxLinksPage, statusFilter, inboxSearch]);

    // Effects
    useEffect(() => { loadOverview(); }, [loadOverview]);
    useEffect(() => { if (activeTab === "user-links") loadUserLinks(); }, [loadUserLinks, activeTab]);
    useEffect(() => { if (activeTab === "inbox-links") loadInboxLinks(); }, [loadInboxLinks, activeTab]);

    return {
        loading,
        overview,
        userLinks,
        userLinksTotal,
        userLinksPage,
        userSearch,
        setUserLinksPage,
        setUserSearch,
        inboxLinks,
        inboxLinksTotal,
        inboxLinksPage,
        inboxSearch,
        statusFilter,
        setInboxLinksPage,
        setInboxSearch,
        setStatusFilter,
        loadOverview,
        loadUserLinks,
        loadInboxLinks,
    };
}
