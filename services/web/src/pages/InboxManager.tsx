import { useState, useEffect, useCallback, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api, PAGE_SIZE } from "../utils/api";
import { InboxCard } from "../components/InboxCard";
import { GlassCard } from "../components/ui/GlassCard";
import { cn } from "../utils/cn";
import { TabNavigation, InboxTabIcon, MessagesTabIcon } from "../components/TabNavigation";
import { EmailStream } from "../components/EmailStream";
import { FocusStreamLayout } from "../layouts/FocusStreamLayout";
import { useRealtimeSubscription } from "../hooks/useRealtimeContext";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { SplitPaneLayout } from "../components/split-pane/SplitPaneLayout";
import { InboxSidebar } from "../components/split-pane/InboxSidebar";
import { MessageViewer } from "../components/email-viewer/MessageViewer";
import { EnhancedSearchBar } from "../components/search";
import type { RealtimeEvent } from "../types/realtime";

import { InboxCardSkeleton, MessageItemSkeleton } from "../components/Skeleton";
import type { Domain, Inbox, Message, PaginatedResponse, ShareMode } from "../types";
import { lazy, Suspense } from "react";
import { SwipeableInboxCard, InboxActionSheet, PullToRefresh } from "../components/mobile";

const CreateInboxModal = lazy(() => import("../components/CreateInboxModal").then(m => ({ default: m.CreateInboxModal })));
const TransferInboxModal = lazy(() => import("../components/TransferInboxModal").then(m => ({ default: m.TransferInboxModal })));
const VisibilityRulesPanel = lazy(() => import("../components/VisibilityRulesPanel").then(m => ({ default: m.VisibilityRulesPanel })));
import { ConfirmationModal } from "../components/ConfirmationModal";

type SortOption = 'created' | 'name' | 'ttl' | 'messages';
type FilterOption = 'all' | 'active' | 'expired' | 'expiring';

export function InboxManager() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const breakpoint = useBreakpoint();
    const isDesktop = breakpoint === 'desktop';

    // Data
    const [domains, setDomains] = useState<Domain[]>([]);
    const [inboxes, setInboxes] = useState<Inbox[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    // Selection
    const [selectedDomain, setSelectedDomain] = useState<string>("");
    const [activeInbox, setActiveInbox] = useState<Inbox | null>(null);
    const [selectedInboxIds, setSelectedInboxIds] = useState<Set<string>>(new Set());

    // UI States
    const [activeTab, setActiveTab] = useState<'inboxes' | 'messages'>('inboxes');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>('created');
    const [filterBy, setFilterBy] = useState<FilterOption>('all');
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(0);

    // Search States
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [searchResults, setSearchResults] = useState<Message[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchMode, setIsSearchMode] = useState(false);

    const [inboxToDelete, setInboxToDelete] = useState<Inbox | null>(null);
    const [inboxToTransfer, setInboxToTransfer] = useState<Inbox | null>(null);
    const [inboxForVisibilityRules, setInboxForVisibilityRules] = useState<Inbox | null>(null);
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

    // Mobile-specific state
    const [inboxForActionSheet, setInboxForActionSheet] = useState<Inbox | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Tabs config
    const tabs = [
        { id: 'inboxes', label: 'Hộp thư', icon: <InboxTabIcon /> },
        { id: 'messages', label: 'Tin nhắn', icon: <MessagesTabIcon />, badge: messages.filter(m => !m.isRead).length }
    ];

    // --- Loaders ---
    const loadDomains = useCallback(async () => {
        if (!token) return;
        try {
            const res = await api<PaginatedResponse<Domain>>("/domains?limit=100", { token });
            setDomains(res?.data || []);
        } catch {
            toast.error("Lỗi tải danh sách domain");
        }
    }, [token]);

    // Auto-select domain
    useEffect(() => {
        if (domains.length > 0 && !selectedDomain) {
            setSelectedDomain(domains[0].id);
        }
    }, [domains, selectedDomain]);

    const loadInboxes = useCallback(async () => {
        if (!token) return;
        setBusy(true);
        try {
            const params = new URLSearchParams({
                limit: "100",
                personal: "true" // Fetch all personal inboxes across all domains
            });
            const res = await api<PaginatedResponse<Inbox>>(`/inboxes?${params.toString()}`, { token });
            setInboxes(res?.data || []);
        } catch {
            toast.error("Lỗi tải danh sách inbox");
        } finally {
            setBusy(false);
        }
    }, [token]);

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

    // --- Effects ---
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
            // Refresh messages if viewing the inbox that received new email
            if (activeInbox && payload.inboxId === activeInbox.id) {
                loadMessages(activeInbox.id);
            }
        } else if (event.type === 'email.deleted') {
            const payload = event.payload as { messageId: string; inboxId: string };
            // Remove deleted message from state
            if (activeInbox && payload.inboxId === activeInbox.id) {
                setMessages(prev => prev.filter(m => m.id !== payload.messageId));
            }
        } else if (event.type === 'email.read') {
            const payload = event.payload as { messageId: string; isRead: boolean };
            // Update read status in state
            setMessages(prev => prev.map(m =>
                m.id === payload.messageId ? { ...m, isRead: payload.isRead } : m
            ));
        } else if (event.type === 'inbox.created') {
            // Refresh inbox list when new inbox created
            loadInboxes();
        }
    }, [activeInbox?.id, loadMessages, loadInboxes]);

    // Handle payment success/cancellation
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("payment") === "success") {
            toast.success("Thanh toán thành công! Gói dịch vụ của bạn đã được cập nhật.");
            // Remove the query parameter from URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        } else if (urlParams.get("payment") === "cancelled") {
            toast.error("Thanh toán đã bị hủy.");
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }, []);

    // --- Sorting & Filtering ---
    const getFilteredInboxes = useCallback(() => {
        let filtered = [...inboxes];

        // Filter
        const now = new Date();
        if (filterBy === 'active') {
            filtered = filtered.filter(i => !i.expiresAt || new Date(i.expiresAt) > now);
        } else if (filterBy === 'expired') {
            filtered = filtered.filter(i => i.expiresAt && new Date(i.expiresAt) <= now);
        } else if (filterBy === 'expiring') {
            const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            filtered = filtered.filter(i => i.expiresAt && new Date(i.expiresAt) > now && new Date(i.expiresAt) <= in24h);
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.localPart.localeCompare(b.localPart);
                case 'ttl':
                    if (!a.expiresAt && !b.expiresAt) return 0;
                    if (!a.expiresAt) return 1;
                    if (!b.expiresAt) return -1;
                    return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
                case 'created':
                default:
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
        });

        return filtered;
    }, [inboxes, sortBy, filterBy]);

    const filteredInboxes = getFilteredInboxes();

    // --- Actions ---
    const handleSelectInbox = (inbox: Inbox) => {
        setActiveInbox(inbox);
    };

    const handleViewMessages = (inbox: Inbox) => {
        setActiveInbox(inbox);
        setActiveTab('messages');
    };

    const handleToggleSelect = (inboxId: string) => {
        setSelectedInboxIds(prev => {
            const next = new Set(prev);
            if (next.has(inboxId)) {
                next.delete(inboxId);
            } else {
                next.add(inboxId);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedInboxIds.size === filteredInboxes.length) {
            setSelectedInboxIds(new Set());
        } else {
            setSelectedInboxIds(new Set(filteredInboxes.map(i => i.id)));
        }
    };

    const handleDeleteInbox = (inbox: Inbox) => {
        setInboxToDelete(inbox);
    };

    const handleShareModeChange = async (inboxId: string, shareMode: ShareMode) => {
        try {
            const updated = await api<{ inbox: Inbox }>(`/inboxes/${inboxId}`, {
                method: "PATCH",
                token,
                body: { shareMode }
            });
            if (updated?.inbox) {
                setInboxes(prev => prev.map(i => i.id === inboxId ? { ...i, shareMode } : i));
                toast.success(shareMode === 'PUBLIC' ? 'Inbox is now public' : 'Inbox is now private');
            }
        } catch {
            toast.error("Failed to update share mode");
        }
    };

    const confirmDeleteInbox = async () => {
        if (!inboxToDelete) return;
        setBusy(true);
        try {
            await api(`/inboxes/${inboxToDelete.id}`, { method: "DELETE", token });
            setInboxes(prev => prev.filter(i => i.id !== inboxToDelete.id));
            if (activeInbox?.id === inboxToDelete.id) {
                setActiveInbox(null);
                setMessages([]);
            }
            toast.success("Đã xóa hộp thư");
            setInboxToDelete(null);
        } catch {
            toast.error("Không thể xóa hộp thư");
        } finally {
            setBusy(false);
        }
    };

    const handleBatchDelete = useCallback(() => {
        if (selectedInboxIds.size === 0) return;
        setShowBatchDeleteConfirm(true);
    }, [selectedInboxIds]);

    const confirmBatchDelete = async () => {
        setIsBatchDeleting(true);
        let deleted = 0;
        for (const id of selectedInboxIds) {
            try {
                await api(`/inboxes/${id}`, { method: "DELETE", token });
                deleted++;
            } catch {
                // Ignore individual deletion error
            }
        }
        setInboxes(prev => prev.filter(i => !selectedInboxIds.has(i.id)));
        setSelectedInboxIds(new Set());
        if (activeInbox && selectedInboxIds.has(activeInbox.id)) {
            setActiveInbox(null);
            setMessages([]);
        }
        setIsBatchDeleting(false);
        setShowBatchDeleteConfirm(false);
        toast.success(`Đã xóa ${deleted} hộp thư`);
    };

    const handleCopyAll = () => {
        if (selectedInboxIds.size === 0) return;
        const emails = filteredInboxes
            .filter(i => selectedInboxIds.has(i.id))
            .map(i => `${i.localPart}@${i.domain?.name}`)
            .join('\n');
        navigator.clipboard.writeText(emails);
        toast.success(`Đã sao chép ${selectedInboxIds.size} địa chỉ`);
    };

    // Pull-to-refresh handler for mobile
    const handlePullRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await loadInboxes();
            toast.success("Đã làm mới danh sách");
        } finally {
            setIsRefreshing(false);
        }
    }, [loadInboxes]);

    // Mobile long-press handler to show action sheet
    const handleLongPress = useCallback((inbox: Inbox) => {
        setInboxForActionSheet(inbox);
    }, []);

    // Keyboard navigation
    useEffect(() => {
        if (activeTab !== 'inboxes') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT') return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setFocusedIndex(prev => Math.min(prev + 1, filteredInboxes.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setFocusedIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (filteredInboxes[focusedIndex]) {
                        handleViewMessages(filteredInboxes[focusedIndex]);
                    }
                    break;
                case ' ':
                    e.preventDefault();
                    if (filteredInboxes[focusedIndex]) {
                        handleToggleSelect(filteredInboxes[focusedIndex].id);
                    }
                    break;
                case 'Delete':
                case 'Backspace':
                    if (selectedInboxIds.size > 0) {
                        e.preventDefault();
                        handleBatchDelete();
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [activeTab, filteredInboxes, focusedIndex, selectedInboxIds, handleBatchDelete]);

    const handleSelectMessage = async (msg: Message) => {
        setSelectedMessage(msg);
        setShowDetail(true);
        // Mark as read
        if (!msg.isRead) {
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
            try {
                await api(`/messages/${msg.id}/read`, { method: "PATCH", token, body: { isRead: true } });
            } catch { /* ignore read status update error */ }
        }
    };

    const handleSearch = async (query: string) => {
        if (!query.trim()) {
            // Clear search mode
            setIsSearchMode(false);
            setSearchQuery("");
            setSearchResults([]);
            return;
        }

        setSearchQuery(query);
        setIsSearchMode(true);
        setIsSearching(true);
        setActiveTab('messages'); // Switch to messages tab to show results

        try {
            // Parse search query to build URL params
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

            // Parse after:Xd filter (e.g., after:7d for last 7 days)
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

            // Remaining text becomes the general query
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
    };

    const clearSearch = () => {
        setIsSearchMode(false);
        setSearchQuery("");
        setSearchResults([]);
    };

    const unreadCount = messages.filter(m => !m.isRead).length;

    // Handler to create inbox from InboxSelector
    const handleCreateInboxFromSelector = async (domainId: string, localPart: string, expiresAt?: number) => {
        try {
            const body: { domainId: string; localPart: string; expiresAt?: number } = { domainId, localPart };
            if (expiresAt) body.expiresAt = expiresAt;
            const newInbox = await api<Inbox>("/inboxes", { method: "POST", token, body });
            if (newInbox) {
                setInboxes(prev => [newInbox, ...prev]);
                toast.success("Đã tạo hộp thư mới");
            }
        } catch {
            toast.error("Không thể tạo hộp thư");
        }
    };

    return (
        <FocusStreamLayout
            domains={domains}
            inboxes={inboxes}
            selectedDomainId={selectedDomain}
            selectedInboxId={activeInbox?.id || ""}
            onSelectDomain={setSelectedDomain}
            onSelectInbox={(id) => {
                const inbox = inboxes.find(i => i.id === id);
                if (inbox) handleSelectInbox(inbox);
            }}
            onCreateInbox={handleCreateInboxFromSelector}
            onDeleteInbox={handleDeleteInbox}
            onSearch={handleSearch}
            unreadCount={unreadCount}
        >

            {/* Desktop: Split-Pane Layout */}
            {isDesktop ? (
                <div className="h-[calc(100vh-64px)]">
                    <SplitPaneLayout
                        breakpoint={breakpoint}
                        leftPane={
                            <div className="h-full flex flex-col">
                                {/* Header with quick actions - Nebula glass style */}
                                <div className="p-3 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h2 className="text-sm font-semibold text-text-main flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.5)]" />
                                                <span className="text-cyan-400">Quản lý</span>
                                            </h2>
                                            <p className="text-[11px] text-text-secondary mt-0.5">{filteredInboxes.length} inboxes</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                className="p-2 hover:bg-white/5 rounded-xl text-text-secondary hover:text-primary transition-all"
                                                onClick={() => navigate('/app')}
                                                title="Đọc email"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                            </button>
                                            <button
                                                className="p-2 bg-primary/10 hover:bg-primary/20 rounded-xl text-primary transition-all hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] active:scale-95"
                                                onClick={() => setShowCreateModal(true)}
                                                title="Tạo inbox mới (n)"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    {/* Sort/Filter chips - Nebula styled */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <select
                                            value={filterBy}
                                            onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                                            className="text-[10px] px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-text-secondary hover:text-text-main hover:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 cursor-pointer transition-all"
                                        >
                                            <option value="all">Tất cả</option>
                                            <option value="active">Đang hoạt động</option>
                                            <option value="expiring">Sắp hết hạn</option>
                                            <option value="expired">Đã hết hạn</option>
                                        </select>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                                            className="text-[10px] px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-text-secondary hover:text-text-main hover:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 cursor-pointer transition-all"
                                        >
                                            <option value="created">Mới nhất</option>
                                            <option value="name">Tên A-Z</option>
                                            <option value="ttl">Thời gian</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <InboxSidebar
                                        inboxes={filteredInboxes}
                                        activeInboxId={activeInbox?.id || null}
                                        onSelectInbox={(id) => {
                                            const inbox = inboxes.find(i => i.id === id);
                                            if (inbox) {
                                                handleSelectInbox(inbox);
                                                loadMessages(inbox.id);
                                            }
                                        }}
                                        onDeleteInbox={handleDeleteInbox}
                                        onTransferInbox={(inbox) => setInboxToTransfer(inbox)}
                                        onShareModeChange={handleShareModeChange}
                                        onVisibilityRules={(inbox) => setInboxForVisibilityRules(inbox)}
                                        isLoading={busy && inboxes.length === 0}
                                    />
                                </div>
                            </div>
                        }
                        middlePane={
                            <div className="h-full flex flex-col">
                                {/* Header - Nebula glass style */}
                                <div className="p-3 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {activeInbox && (
                                                <>
                                                    {activeInbox.shareMode === 'PUBLIC' && (
                                                        <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" title="Công khai" />
                                                    )}
                                                    <h2 className="text-sm font-semibold text-text-main truncate">
                                                        {`${activeInbox.localPart}@${activeInbox.domain?.name}`}
                                                    </h2>
                                                </>
                                            )}
                                            {!activeInbox && !isSearchMode && (
                                                <h2 className="text-sm font-semibold text-text-main flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/50" />
                                                    Tin nhắn
                                                </h2>
                                            )}
                                            {isSearchMode && (
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                                                        <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                                        </svg>
                                                    </span>
                                                    <h2 className="text-sm font-semibold text-text-main">Kết quả tìm kiếm</h2>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {activeInbox && !isSearchMode && (
                                                <>
                                                    <button
                                                        className="p-1.5 hover:bg-white/5 rounded-lg text-text-secondary hover:text-primary transition-all"
                                                        onClick={() => loadMessages(activeInbox.id)}
                                                        title="Làm mới (r)"
                                                    >
                                                        <svg className={cn("w-4 h-4", busy && "animate-spin")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-text-secondary hover:text-red-400 transition-all"
                                                        onClick={() => handleDeleteInbox(activeInbox)}
                                                        title="Xóa inbox"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </>
                                            )}
                                            {isSearchMode && (
                                                <button
                                                    className="p-1.5 hover:bg-white/5 rounded-lg text-text-secondary hover:text-text-main transition-all"
                                                    onClick={clearSearch}
                                                    title="Xóa tìm kiếm"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-text-secondary mb-2.5">
                                        {isSearchMode
                                            ? `${searchResults.length} kết quả cho "${searchQuery}"`
                                            : activeInbox
                                                ? `${messages.length} tin nhắn${messages.filter(m => !m.isRead).length > 0 ? ` • ${messages.filter(m => !m.isRead).length} chưa đọc` : ''}`
                                                : 'Chọn inbox từ danh sách bên trái'}
                                    </p>
                                    <EnhancedSearchBar
                                        onSearch={handleSearch}
                                        onClear={clearSearch}
                                        isSearching={isSearching}
                                        placeholder="Tìm kiếm email..."
                                        showFilters={true}
                                    />
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {isSearchMode ? (
                                        isSearching ? (
                                            <div className="p-4 space-y-3">
                                                {Array(5).fill(0).map((_, i) => <MessageItemSkeleton key={i} />)}
                                            </div>
                                        ) : searchResults.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-center opacity-60 py-10">
                                                <div className="w-16 h-16 rounded-full bg-surface/50 flex items-center justify-center mb-4">
                                                    <svg className="w-8 h-8 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-lg font-bold text-text-main mb-1">Không tìm thấy kết quả</h3>
                                                <p className="text-sm text-text-secondary">Thử tìm kiếm với từ khóa khác</p>
                                            </div>
                                        ) : (
                                            <EmailStream
                                                messages={searchResults}
                                                selectedMessageId={selectedMessage?.id || null}
                                                onSelectMessage={handleSelectMessage}
                                            />
                                        )
                                    ) : activeInbox ? (
                                        busy && messages.length === 0 ? (
                                            <div className="p-4 space-y-3">
                                                {Array(5).fill(0).map((_, i) => <MessageItemSkeleton key={i} />)}
                                            </div>
                                        ) : (
                                            <EmailStream
                                                messages={messages}
                                                selectedMessageId={selectedMessage?.id || null}
                                                onSelectMessage={handleSelectMessage}
                                            />
                                        )
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-text-secondary">
                                            <p className="text-sm">← Chọn inbox từ danh sách</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        }
                        rightPane={
                            selectedMessage ? (
                                <MessageViewer
                                    message={selectedMessage}
                                    onDelete={() => {
                                        // Delete message logic
                                        setSelectedMessage(null);
                                    }}
                                    onPin={(isPinned) => {
                                        // Pin message logic
                                        setMessages(prev => prev.map(m =>
                                            m.id === selectedMessage.id ? { ...m, isPinned } : m
                                        ));
                                    }}
                                    variant="pane"
                                />
                            ) : undefined
                        }
                        showRightPane={!!selectedMessage}
                    />
                </div>
            ) : (
                /* Mobile/Tablet: Original Tab-based Layout */
                <Fragment>
                    {/* Tab Navigation */}
                    <div className="sticky top-0 z-30">
                        <TabNavigation
                            tabs={tabs}
                            activeTab={activeTab}
                            onTabChange={(id) => setActiveTab(id as 'inboxes' | 'messages')}
                        />
                    </div>

                    {/* Tab Content */}
                    <div className="p-4 md:p-6 w-full max-w-7xl mx-auto">
                        {activeTab === 'inboxes' ? (
                            <div className="flex flex-col gap-4">
                                {/* Toolbar */}
                                <GlassCard className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between rounded-2xl">
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    className="peer sr-only"
                                                    checked={selectedInboxIds.size === filteredInboxes.length && filteredInboxes.length > 0}
                                                    onChange={handleSelectAll}
                                                />
                                                <div className="w-5 h-5 rounded border border-white/40 bg-white/10 peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center group-hover:border-primary/50">
                                                    <svg className="w-3.5 h-3.5 text-white scale-0 peer-checked:scale-100 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <span className="text-sm font-medium text-text-secondary group-hover:text-text-main transition-colors">Select all</span>
                                        </label>
        
                                        {selectedInboxIds.size > 0 && (
                                            <div className="flex items-center gap-2 animate-fade-in">
                                                <button onClick={handleCopyAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-text-main transition-colors border border-white/10">
                                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                                    </svg>
                                                    Copy ({selectedInboxIds.size})
                                                </button>
                                                <button onClick={handleBatchDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-medium text-red-400 hover:text-red-300 transition-colors border border-red-500/20">
                                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                    </svg>
                                                    Delete ({selectedInboxIds.size})
                                                </button>
                                            </div>
                                        )}
                                    </div>
        
                                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                                        <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg border border-white/5">
                                            <select
                                                value={filterBy}
                                                onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                                                className="bg-transparent text-xs font-medium text-text-secondary hover:text-text-main focus:outline-none focus:text-primary cursor-pointer px-2 py-1 rounded"
                                            >
                                                <option value="all">All Status</option>
                                                <option value="active">Active</option>
                                                <option value="expiring">Expiring Soon</option>
                                                <option value="expired">Expired</option>
                                            </select>
                                            <div className="w-px h-4 bg-white/10" />
                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                                className="bg-transparent text-xs font-medium text-text-secondary hover:text-text-main focus:outline-none focus:text-primary cursor-pointer px-2 py-1 rounded"
                                            >
                                                <option value="created">Newest</option>
                                                <option value="name">Name A-Z</option>
                                                <option value="ttl">Time Left</option>
                                            </select>
                                        </div>
        
                                        <button
                                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 text-sm font-semibold whitespace-nowrap"
                                            onClick={() => setShowCreateModal(true)}
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                            </svg>
                                            Create New
                                        </button>
                                    </div>
                                </GlassCard>

                                {/* Inbox List with Pull-to-Refresh for Mobile */}
                                <PullToRefresh
                                    onRefresh={handlePullRefresh}
                                    isRefreshing={isRefreshing}
                                    disabled={isDesktop}
                                    className="flex-1"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {busy && inboxes.length === 0 ? (
                                            Array(6).fill(0).map((_, i) => <InboxCardSkeleton key={i} />)
                                        ) : filteredInboxes.length === 0 ? (
                                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center opacity-60">
                                                <div className="w-20 h-20 rounded-full bg-surface/50 flex items-center justify-center mb-6">
                                                    <svg className="w-10 h-10 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-xl font-bold bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent mb-2">No inboxes found</h3>
                                                <p className="text-text-secondary max-w-sm mx-auto mb-6">Start by creating your first temporary email inbox to receive messages.</p>
                                                <button
                                                    onClick={() => setShowCreateModal(true)}
                                                    className="px-6 py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 transition-colors font-medium"
                                                >
                                                    Create your first inbox
                                                </button>
                                            </div>
                                        ) : (
                                            filteredInboxes.map((inbox, index) => {
                                                const email = `${inbox.localPart}@${inbox.domain?.name}`;
                                                const card = (
                                                    <InboxCard
                                                        key={inbox.id}
                                                        inbox={inbox}
                                                        isSelected={selectedInboxIds.has(inbox.id)}
                                                        isActive={index === focusedIndex}
                                                        onSelect={() => setFocusedIndex(index)}
                                                        onToggleSelect={() => handleToggleSelect(inbox.id)}
                                                        onCopy={() => { }}
                                                        onDelete={() => handleDeleteInbox(inbox)}
                                                        onViewMessages={() => handleViewMessages(inbox)}
                                                        onTransfer={() => setInboxToTransfer(inbox)}
                                                        onShareModeChange={(shareMode) => handleShareModeChange(inbox.id, shareMode)}
                                                        onVisibilityRules={() => setInboxForVisibilityRules(inbox)}
                                                    />
                                                );

                                                // Use swipeable card on mobile/tablet
                                                if (!isDesktop) {
                                                    return (
                                                        <SwipeableInboxCard
                                                            key={inbox.id}
                                                            email={email}
                                                            onDelete={() => handleDeleteInbox(inbox)}
                                                            onCopy={() => handleLongPress(inbox)}
                                                        >
                                                            <div onContextMenu={(e) => { e.preventDefault(); handleLongPress(inbox); }}>
                                                                {card}
                                                            </div>
                                                        </SwipeableInboxCard>
                                                    );
                                                }

                                                return card;
                                            })
                                        )}
                                    </div>
                                </PullToRefresh>
        
                                {/* Footer stats */}
                                {filteredInboxes.length > 0 && (
                                    <div className="flex items-center justify-center text-xs text-text-secondary py-4">
                                        <span>{filteredInboxes.length} inboxes</span>
                                        {selectedInboxIds.size > 0 && (
                                            <span className="ml-1">• {selectedInboxIds.size} selected</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Messages Tab */
                            <div className="flex flex-col h-[calc(100vh-140px)]">
                                {/* Search Mode Header */}
                                {isSearchMode && (
                                    <GlassCard className="mb-4 p-4 flex items-center justify-between rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h2 className="font-bold text-lg text-text-main">Kết quả tìm kiếm</h2>
                                                <p className="text-xs text-text-secondary">
                                                    {isSearching ? "Đang tìm kiếm..." : `"${searchQuery}" - ${searchResults.length} kết quả`}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-main transition-colors text-sm font-medium flex items-center gap-2"
                                            onClick={clearSearch}
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Xóa tìm kiếm
                                        </button>
                                    </GlassCard>
                                )}
        
                                {/* Search Results */}
                                {isSearchMode ? (
                                    <div className="flex-1 overflow-y-auto min-h-0 rounded-2xl bg-surface/20 border border-white/5 backdrop-blur-sm">
                                        {isSearching ? (
                                            <div className="p-4 space-y-3">
                                                {Array(5).fill(0).map((_, i) => <MessageItemSkeleton key={i} />)}
                                            </div>
                                        ) : searchResults.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-center opacity-60 py-20">
                                                <div className="w-20 h-20 rounded-full bg-surface/50 flex items-center justify-center mb-6">
                                                    <svg className="w-10 h-10 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-xl font-bold text-text-main mb-2">Không tìm thấy kết quả</h3>
                                                <p className="text-text-secondary max-w-sm mb-6">Thử tìm kiếm với từ khóa khác</p>
                                                <button
                                                    onClick={clearSearch}
                                                    className="px-6 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                                                >
                                                    Quay lại
                                                </button>
                                            </div>
                                        ) : (
                                            <EmailStream
                                                messages={searchResults}
                                                selectedMessageId={selectedMessage?.id || null}
                                                onSelectMessage={handleSelectMessage}
                                            />
                                        )}
                                    </div>
                                ) : activeInbox ? (
                                    <div className="flex flex-col h-full">
                                        <GlassCard className="mb-4 p-4 flex items-center justify-between rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h2 className="font-bold text-lg text-text-main">{activeInbox.localPart}@{activeInbox.domain?.name}</h2>
                                                    <p className="text-xs text-text-secondary">{messages.length} messages</p>
                                                </div>
                                            </div>
                                            <button
                                                className="p-2 hover:bg-white/5 rounded-lg text-text-secondary transition-colors"
                                                onClick={() => loadMessages(activeInbox.id)}
                                                title="Refresh"
                                            >
                                                <svg className={cn("w-5 h-5", busy && "animate-spin")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            </button>
                                        </GlassCard>
        
                                        <div className="flex-1 overflow-y-auto min-h-0 rounded-2xl bg-surface/20 border border-white/5 backdrop-blur-sm">
                                            {busy && messages.length === 0 ? (
                                                <div className="p-4 space-y-3">
                                                    {Array(5).fill(0).map((_, i) => <MessageItemSkeleton key={i} />)}
                                                </div>
                                            ) : (
                                                <EmailStream
                                                    messages={messages}
                                                    selectedMessageId={selectedMessage?.id || null}
                                                    onSelectMessage={handleSelectMessage}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                                        <div className="w-20 h-20 rounded-full bg-surface/50 flex items-center justify-center mb-6">
                                            <svg className="w-10 h-10 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-bold text-text-main mb-2">Select an inbox</h3>
                                        <p className="text-text-secondary max-w-sm mb-6">Choose an inbox from the list to view its messages.</p>
                                        <button
                                            onClick={() => setActiveTab('inboxes')}
                                            className="px-6 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                                        >
                                            Go to Inboxes
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Fragment>
            )}

            {/* Message Detail Overlay - Only for mobile/tablet, desktop uses inline reading pane */}
            {!isDesktop && showDetail && selectedMessage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowDetail(false)}>
                    <GlassCard
                        className="w-full max-w-4xl max-h-full h-[80vh] flex flex-col rounded-2xl shadow-2xl relative overflow-hidden bg-bg-secondary/95"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-surface/30">
                            <div>
                                <h2 className="text-xl font-bold text-text-main pr-8">{selectedMessage.subject || '(No Subject)'}</h2>
                                <div className="flex items-center gap-2 mt-1 text-sm text-text-secondary">
                                    <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">From</span>
                                    <span>{selectedMessage.fromAddress}</span>
                                    <span className="text-muted">•</span>
                                    <span>{new Date(selectedMessage.receivedAt).toLocaleString('vi-VN')}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDetail(false)}
                                className="absolute top-4 right-4 p-2 rounded-lg bg-surface hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-auto bg-white">
                            {selectedMessage.htmlBody ? (
                                <iframe
                                    srcDoc={selectedMessage.htmlBody}
                                    title="Email content"
                                    sandbox="allow-same-origin allow-scripts"
                                    className="w-full h-full border-0"
                                />
                            ) : (
                                <div className="p-6 whitespace-pre-wrap font-mono text-sm text-[var(--nebula-text)]">
                                    {selectedMessage.textBody || 'No content'}
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Create Inbox Modal */}
            <Suspense fallback={null}>
                {showCreateModal && (
                    <CreateInboxModal
                        domains={domains}
                        token={token}
                        onClose={() => setShowCreateModal(false)}
                        onInboxCreated={(newInbox) => {
                            setInboxes(prev => [newInbox, ...prev]);
                            setShowCreateModal(false);
                        }}
                    />
                )}
            </Suspense>

            <Suspense fallback={null}>
                {inboxToTransfer && (
                    <TransferInboxModal
                        inbox={inboxToTransfer}
                        token={token}
                        onClose={() => setInboxToTransfer(null)}
                        onTransferComplete={() => {
                            setInboxes(prev => prev.filter(i => i.id !== inboxToTransfer.id));
                            if (activeInbox?.id === inboxToTransfer.id) {
                                setActiveInbox(null);
                                setMessages([]);
                            }
                            setInboxToTransfer(null);
                        }}
                    />
                )}
            </Suspense>

            <Suspense fallback={null}>
                {inboxForVisibilityRules && (
                    <VisibilityRulesPanel
                        inboxId={inboxForVisibilityRules.id}
                        inboxEmail={`${inboxForVisibilityRules.localPart}@${inboxForVisibilityRules.domain?.name}`}
                        onClose={() => setInboxForVisibilityRules(null)}
                    />
                )}
            </Suspense>

            <ConfirmationModal
                isOpen={!!inboxToDelete}
                title="Confirm Deletion"
                message={`Are you sure you want to delete ${inboxToDelete?.localPart}@${inboxToDelete?.domain?.name}? This action cannot be undone.`}
                confirmLabel="Delete"
                isDestructive
                isLoading={busy}
                onConfirm={confirmDeleteInbox}
                onCancel={() => setInboxToDelete(null)}
            />

            <ConfirmationModal
                isOpen={showBatchDeleteConfirm}
                title="Confirm Batch Deletion"
                message={`Are you sure you want to delete ${selectedInboxIds.size} selected inboxes? This action cannot be undone.`}
                confirmLabel="Delete All"
                isDestructive
                isLoading={isBatchDeleting}
                onConfirm={confirmBatchDelete}
                onCancel={() => setShowBatchDeleteConfirm(false)}
            />

            {/* Mobile Action Sheet */}
            <InboxActionSheet
                isOpen={!!inboxForActionSheet}
                onClose={() => setInboxForActionSheet(null)}
                inbox={inboxForActionSheet}
                onCopy={() => {
                    if (inboxForActionSheet) {
                        const email = `${inboxForActionSheet.localPart}@${inboxForActionSheet.domain?.name}`;
                        navigator.clipboard.writeText(email);
                        toast.success(`Đã sao chép: ${email}`);
                    }
                }}
                onViewMessages={() => {
                    if (inboxForActionSheet) handleViewMessages(inboxForActionSheet);
                }}
                onTransfer={() => {
                    if (inboxForActionSheet) setInboxToTransfer(inboxForActionSheet);
                }}
                onDelete={() => {
                    if (inboxForActionSheet) handleDeleteInbox(inboxForActionSheet);
                }}
                onShareModeChange={(mode) => {
                    if (inboxForActionSheet) handleShareModeChange(inboxForActionSheet.id, mode);
                }}
                onVisibilityRules={() => {
                    if (inboxForActionSheet) setInboxForVisibilityRules(inboxForActionSheet);
                }}
            />
        </FocusStreamLayout>
    );
}
