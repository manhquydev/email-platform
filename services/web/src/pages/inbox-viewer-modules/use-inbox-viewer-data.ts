/**
 * Custom hook for InboxViewer data management
 * Handles message fetching, search, URL sync, and keyboard shortcuts
 */
import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import type { Message, FullMessage, AccessError } from "./types";
import { API_URL } from "./types";

export interface UseInboxViewerDataReturn {
    // State
    email: string;
    messages: Message[];
    total: number;
    page: number;
    loading: boolean;
    selectedMessage: FullMessage | null;
    detailLoading: boolean;
    showTelegramModal: boolean;
    accessError: AccessError | null;
    focusedIndex: number;
    // Actions
    setShowTelegramModal: (show: boolean) => void;
    handleSearch: (emailAddr: string) => Promise<void>;
    handleSelectMessage: (messageId: string) => Promise<void>;
    handlePageChange: (newPage: number) => void;
    handleClearError: () => void;
    handleChangeEmail: () => void;
    handleCopyShareLink: () => void;
    handleCopyEmail: () => void;
    handleRefresh: () => void;
    // Keyboard navigation
    handleKeyboardSelect: (index: number) => void;
    handleKeyboardEnter: (index: number) => void;
    handleKeyboardEscape: () => void;
}

/**
 * Parse API error response into AccessError
 */
function parseApiError(status: number, data: { error?: string; code?: string }): AccessError {
    if (status === 404) {
        return {
            type: "not_found",
            message: "Không tìm thấy hộp thư",
            suggestion: "Vui lòng kiểm tra lại địa chỉ email và thử lại.",
        };
    }
    if (status === 403) {
        if (data.code === "INBOX_PRIVATE") {
            return {
                type: "private",
                message: data.error || "Hộp thư này ở chế độ riêng tư.",
                suggestion: "Nếu bạn là chủ sở hữu, vui lòng đăng nhập để truy cập.",
            };
        }
        return {
            type: "error",
            message: data.error || "Truy cập bị từ chối",
        };
    }
    if (status === 429) {
        return {
            type: "rate_limit",
            message: "Quá nhiều yêu cầu",
            suggestion: "Vui lòng đợi một lát rồi thử lại.",
        };
    }
    return {
        type: "error",
        message: data.error || "Không thể truy cập hộp thư",
    };
}

export function useInboxViewerData(): UseInboxViewerDataReturn {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // State
    const [email, setEmail] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<FullMessage | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [showTelegramModal, setShowTelegramModal] = useState(false);
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    const [accessError, setAccessError] = useState<AccessError | null>(null);
    const [focusedIndex, setFocusedIndex] = useState(0);

    // Update URL when email changes (for shareable links)
    const updateUrlWithEmail = useCallback((emailAddr: string) => {
        const newUrl = emailAddr
            ? "/inbox-viewer?email=" + encodeURIComponent(emailAddr)
            : "/inbox-viewer";
        navigate(newUrl, { replace: true });
    }, [navigate]);

    // Fetch messages for email
    const fetchMessages = useCallback(async (emailAddr: string, pageNum: number) => {
        setLoading(true);
        setAccessError(null);
        try {
            const offset = (pageNum - 1) * 20;
            const res = await fetch(
                `${API_URL}/api/public/inbox/${encodeURIComponent(emailAddr)}/messages?limit=20&offset=${offset}`
            );

            if (!res.ok) {
                const data = await res.json();
                const error = parseApiError(res.status, data);
                setAccessError(error);
                throw new Error(error.message);
            }

            const data = await res.json();
            setMessages(data.data);
            setTotal(data.meta.total);
            setEmail(emailAddr);
            setPage(pageNum);
            setSelectedMessage(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Search and validate inbox
    const handleSearch = useCallback(async (emailAddr: string) => {
        setAccessError(null);
        try {
            const res = await fetch(`${API_URL}/api/public/inbox/search`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailAddr }),
            });

            if (!res.ok) {
                const data = await res.json();
                const error = parseApiError(res.status, data);
                setAccessError(error);
                throw new Error(error.message);
            }

            updateUrlWithEmail(emailAddr);
            await fetchMessages(emailAddr, 1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            toast.error(err.message);
        }
    }, [updateUrlWithEmail, fetchMessages]);

    // Select and load message detail
    const handleSelectMessage = async (messageId: string) => {
        setDetailLoading(true);
        try {
            const res = await fetch(
                `${API_URL}/api/public/inbox/${encodeURIComponent(email)}/messages/${messageId}`
            );

            if (!res.ok) {
                const data = await res.json();
                const error = parseApiError(res.status, data);
                throw new Error(error.message);
            }

            const data = await res.json();
            setSelectedMessage(data.message);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setDetailLoading(false);
        }
    };

    // Page change handler
    const handlePageChange = (newPage: number) => {
        fetchMessages(email, newPage);
    };

    // Clear error and reset
    const handleClearError = () => {
        setAccessError(null);
        setEmail("");
        updateUrlWithEmail("");
    };

    // Change email (reset state)
    const handleChangeEmail = () => {
        setEmail("");
        setMessages([]);
        setSelectedMessage(null);
        updateUrlWithEmail("");
    };

    // Copy share link to clipboard
    const handleCopyShareLink = () => {
        const shareUrl = window.location.origin + "/inbox-viewer?email=" + encodeURIComponent(email);
        navigator.clipboard.writeText(shareUrl).then(() => {
            toast.success("Đã sao chép link chia sẻ!");
        }).catch(() => {
            toast.error("Không thể sao chép link");
        });
    };

    // Copy email address to clipboard
    const handleCopyEmail = () => {
        navigator.clipboard.writeText(email).then(() => {
            toast.success("Đã sao chép email!");
        }).catch(() => {
            toast.error("Không thể sao chép email");
        });
    };

    // Refresh messages
    const handleRefresh = () => {
        if (email) fetchMessages(email, page);
    };

    // Keyboard navigation handlers
    const handleKeyboardSelect = useCallback((index: number) => {
        setFocusedIndex(index);
    }, []);

    const handleKeyboardEnter = useCallback((index: number) => {
        if (messages[index]) {
            handleSelectMessage(messages[index].id);
        }
    }, [messages, handleSelectMessage]);

    const handleKeyboardEscape = useCallback(() => {
        setSelectedMessage(null);
    }, []);

    // Auto-load inbox from URL query param
    useEffect(() => {
        if (initialLoadDone) return;
        const emailParam = searchParams.get("email");
        if (emailParam) {
            setInitialLoadDone(true);
            handleSearch(emailParam);
        }
    }, [searchParams, initialLoadDone, handleSearch]);

    // Keyboard shortcut: R to refresh
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key.toLowerCase() === "r" &&
                !loading &&
                email &&
                !(e.target instanceof HTMLInputElement) &&
                !(e.target instanceof HTMLTextAreaElement)
            ) {
                e.preventDefault();
                fetchMessages(email, page);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [email, page, loading, fetchMessages]);

    return {
        email,
        messages,
        total,
        page,
        loading,
        selectedMessage,
        detailLoading,
        showTelegramModal,
        accessError,
        setShowTelegramModal,
        handleSearch,
        handleSelectMessage,
        handlePageChange,
        handleClearError,
        handleChangeEmail,
        handleCopyShareLink,
        handleCopyEmail,
        handleRefresh,
        // Keyboard navigation
        focusedIndex,
        handleKeyboardSelect,
        handleKeyboardEnter,
        handleKeyboardEscape,
    };
}
