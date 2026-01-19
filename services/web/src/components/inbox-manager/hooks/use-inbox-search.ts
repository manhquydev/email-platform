/**
 * Custom hook for inbox search functionality
 * Extracted from InboxManager.tsx for modularity
 */
import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../utils/api";
import type { Message, PaginatedResponse } from "../../../types";

export interface UseInboxSearchReturn {
    searchQuery: string;
    searchResults: Message[];
    isSearching: boolean;
    isSearchMode: boolean;
    handleSearch: (query: string) => Promise<void>;
    clearSearch: () => void;
}

export function useInboxSearch(): UseInboxSearchReturn {
    const { token } = useAuth();
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [searchResults, setSearchResults] = useState<Message[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchMode, setIsSearchMode] = useState(false);

    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setIsSearchMode(false);
            setSearchQuery("");
            setSearchResults([]);
            return;
        }

        setSearchQuery(query);
        setIsSearchMode(true);
        setIsSearching(true);

        try {
            const params = new URLSearchParams();
            let textQuery = query;

            // Parse has:attachment filter
            if (textQuery.includes('has:attachment')) {
                params.set('hasAttachment', 'true');
                textQuery = textQuery.replace(/has:attachment/g, '').trim();
            }

            // Parse is:unread filter
            if (textQuery.includes('is:unread')) {
                params.set('isRead', 'false');
                textQuery = textQuery.replace(/is:unread/g, '').trim();
            }

            // Parse after:Xd filter
            const afterMatch = textQuery.match(/after:(\d+)d/);
            if (afterMatch) {
                const days = parseInt(afterMatch[1], 10);
                const afterDate = new Date();
                afterDate.setDate(afterDate.getDate() - days);
                params.set('after', afterDate.toISOString());
                textQuery = textQuery.replace(/after:\d+d/g, '').trim();
            }

            // Parse from: filter
            const fromMatch = textQuery.match(/from:(\S+)/);
            if (fromMatch) {
                params.set('from', fromMatch[1]);
                textQuery = textQuery.replace(/from:\S+/g, '').trim();
            }

            // Remaining text becomes general query
            if (textQuery.trim()) {
                params.set('q', textQuery.trim());
            }

            const searchUrl = `/messages/search?${params.toString()}`;
            const res = await api<PaginatedResponse<Message>>(searchUrl, { token });
            setSearchResults(res?.data || []);

            if ((res?.data || []).length === 0) {
                toast("Không tìm thấy kết quả nào", { icon: "🔍" });
            } else {
                toast.success(`Tìm thấy ${res?.data?.length || 0} kết quả`);
            }
        } catch {
            toast.error("Lỗi khi tìm kiếm");
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [token]);

    const clearSearch = useCallback(() => {
        setIsSearchMode(false);
        setSearchQuery("");
        setSearchResults([]);
    }, []);

    return {
        searchQuery,
        searchResults,
        isSearching,
        isSearchMode,
        handleSearch,
        clearSearch
    };
}
