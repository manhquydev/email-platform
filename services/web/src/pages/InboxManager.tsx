import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CreateInboxModal } from "../components/CreateInboxModal";
import { Loading } from "../components/Loading";
import { VisibilityRulesPanel } from "../components/VisibilityRulesPanel";
import { ShareModeToggle } from "../components/inbox-card-modules";
import { useAuth } from "../context/AuthContext";
import { AppShell } from "../layouts/AppShell";
import { api } from "../utils/api";
import type { Domain, Inbox, PaginatedResponse, ShareMode } from "../types";

const PAGE_SIZE_OPTIONS = [10, 15] as const;
const MAX_PAGE_TABS = 7;
const SEARCH_DEBOUNCE_MS = 300;
const RECENT_STORAGE_KEY = "manager_recent_inboxes_v1";
const SCOPE_OPTIONS = [
    { value: "all", label: "Tất cả" },
    { value: "personal", label: "Cá nhân" },
    { value: "shared", label: "Team chia sẻ" },
] as const;

type InboxListResponse = PaginatedResponse<Inbox> & {
    total?: number;
    meta?: { total?: number };
};

type RecentInboxItem = {
    id: string;
    email: string;
    openedAt: string;
};

type PageTabToken = number | "ellipsis";

function toInboxEmail(inbox: Inbox) {
    return `${inbox.localPart}@${inbox.domain?.name ?? "unknown.local"}`;
}

function readRecentInboxes() {
    try {
        const raw = localStorage.getItem(RECENT_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as RecentInboxItem[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function buildPageTabs(currentPage: number, totalPages: number): PageTabToken[] {
    if (totalPages <= MAX_PAGE_TABS) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const tabs: PageTabToken[] = [1];
    const nearStart = currentPage <= 4;
    const nearEnd = currentPage >= totalPages - 3;

    if (!nearStart) tabs.push("ellipsis");

    const windowStart = nearStart ? 2 : Math.max(2, currentPage - 1);
    const windowEnd = nearEnd ? totalPages - 1 : Math.min(totalPages - 1, currentPage + 1);

    for (let page = windowStart; page <= windowEnd; page += 1) {
        tabs.push(page);
    }

    if (!nearEnd) tabs.push("ellipsis");
    tabs.push(totalPages);
    return tabs;
}

export function InboxManager() {
    const { token, user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [domains, setDomains] = useState<Domain[]>([]);
    const [inboxes, setInboxes] = useState<Inbox[]>([]);
    const [total, setTotal] = useState(0);
    const [selectedDomain, setSelectedDomain] = useState("");
    const [selectedScope, setSelectedScope] = useState<(typeof SCOPE_OPTIONS)[number]["value"]>("all");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [rowsPerPage, setRowsPerPage] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(15);
    const [currentPage, setCurrentPage] = useState(1);
    const [busy, setBusy] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deletingInboxId, setDeletingInboxId] = useState("");
    const [recentInboxes, setRecentInboxes] = useState<RecentInboxItem[]>(() => readRecentInboxes());
    const [visibilityRulesInbox, setVisibilityRulesInbox] = useState<Inbox | null>(null);

    const loadDomains = useCallback(async () => {
        if (!token) return;
        const response = await api<PaginatedResponse<Domain>>("/domains?limit=200", { token });
        setDomains(response?.data ?? []);
    }, [token]);

    const loadInboxes = useCallback(async () => {
        if (!token) return;
        setBusy(true);

        try {
            const params = new URLSearchParams({
                limit: String(rowsPerPage),
                offset: String((currentPage - 1) * rowsPerPage),
            });

            if (selectedScope === "personal") {
                params.set("personal", "true");
            } else if (selectedScope === "shared") {
                params.set("shared", "true");
            }

            if (selectedDomain) {
                params.set("domain", selectedDomain);
            }

            if (debouncedSearch) {
                params.set("search", debouncedSearch);
            }

            const response = await api<InboxListResponse>(`/inboxes?${params.toString()}`, { token });
            const pageData = Array.isArray(response?.data) ? response.data : [];
            const responseTotal = response?.meta?.total ?? response?.total ?? 0;
            setInboxes(pageData);
            setTotal(responseTotal);
        } catch (error) {
            console.error("[InboxManager] Failed to load inboxes", error);
            toast.error("Không thể tải danh sách inbox");
        } finally {
            setBusy(false);
        }
    }, [currentPage, debouncedSearch, rowsPerPage, selectedDomain, selectedScope, token]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        setSearch(params.get("q") ?? "");
    }, [location.search]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(search.trim());
        }, SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        if (!token) return;
        const initialize = async () => {
            try {
                await loadDomains();
            } catch (error) {
                console.error("[InboxManager] Failed to load domains", error);
                toast.error("Không thể tải danh sách domain");
            }
        };

        void initialize();
    }, [loadDomains, token]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedDomain, selectedScope, debouncedSearch, rowsPerPage]);

    useEffect(() => {
        if (!token) return;
        void loadInboxes();
    }, [loadInboxes, token]);

    const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
    const activePage = Math.min(currentPage, totalPages);
    const pageTabs = useMemo(() => buildPageTabs(activePage, totalPages), [activePage, totalPages]);

    useEffect(() => {
        if (currentPage !== activePage) {
            setCurrentPage(activePage);
        }
    }, [activePage, currentPage]);

    const openInbox = useCallback((inbox: Inbox) => {
        const nextRecent = [
            {
                id: inbox.id,
                email: toInboxEmail(inbox),
                openedAt: new Date().toISOString(),
            },
            ...recentInboxes.filter((item) => item.id !== inbox.id),
        ].slice(0, 8);

        setRecentInboxes(nextRecent);
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(nextRecent));
        navigate(`/app/inbox/${inbox.id}`);
    }, [navigate, recentInboxes]);

    const handleDelete = useCallback(async (inbox: Inbox) => {
        if (!token) return;
        if (!window.confirm(`Xóa inbox ${toInboxEmail(inbox)}?`)) return;

        setDeletingInboxId(inbox.id);
        try {
            await api(`/inboxes/${inbox.id}`, { method: "DELETE", token });
            toast.success("Đã xóa inbox");

            if (currentPage > 1 && inboxes.length === 1) {
                setCurrentPage((previous) => Math.max(1, previous - 1));
            } else {
                void loadInboxes();
            }
        } catch (error) {
            console.error("[InboxManager] Failed to delete inbox", error);
            toast.error("Xóa inbox thất bại");
        } finally {
            setDeletingInboxId("");
        }
    }, [currentPage, inboxes.length, loadInboxes, token]);

    const handleShareModeChange = useCallback(async (inbox: Inbox, shareMode: ShareMode) => {
        if (!token) return;

        try {
            await api(`/inboxes/${inbox.id}`, { method: "PATCH", token, body: { shareMode } });
            setInboxes((prev) => prev.map((item) => (item.id === inbox.id ? { ...item, shareMode } : item)));
            toast.success(shareMode === "PUBLIC" ? "Inbox đã công khai" : "Inbox đã chuyển sang riêng tư");
        } catch (error) {
            console.error("[InboxManager] Failed to update share mode", error);
            toast.error("Cập nhật chế độ chia sẻ thất bại");
        }
    }, [token]);

    return (
        <AppShell>
            <div className="space-y-3 p-3 pb-24 sm:space-y-4 sm:p-6 lg:p-8">
                <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-nebula-violet/20 via-nebula-cyan/10 to-nebula-pink/10 p-4 sm:p-5">
                    <h1 className="text-xl font-bold text-white sm:text-2xl">Inbox Manager 2.0</h1>
                    <p className="mt-1 text-sm text-text-secondary">Tối ưu thao tác nhanh: tạo inbox, tìm inbox, mở inbox trong 1 click.</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
                        <span className="rounded-full border border-white/10 px-3 py-1">Hiển thị {inboxes.length}/{total.toLocaleString("vi-VN")} inbox</span>
                        <span className="rounded-full border border-white/10 px-3 py-1">Đang xem: {SCOPE_OPTIONS.find((item) => item.value === selectedScope)?.label}</span>
                        {debouncedSearch ? (
                            <span className="rounded-full border border-nebula-cyan/30 px-3 py-1 text-nebula-cyan">Search server-side: "{debouncedSearch}"</span>
                        ) : null}
                    </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-surface/30 p-3 sm:p-4">
                    <div className="mb-3 flex flex-wrap gap-2">
                        {SCOPE_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setSelectedScope(option.value)}
                                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                                    selectedScope === option.value
                                        ? "border-nebula-cyan bg-nebula-cyan/20 text-white"
                                        : "border-white/10 text-text-secondary hover:text-white"
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-2 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto_auto] lg:items-center">
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Tìm email nhanh..."
                            className="h-11 flex-1 rounded-xl border border-white/20 bg-white/[0.08] px-4 text-sm text-white placeholder:text-text-secondary/80 focus:border-nebula-cyan focus:outline-none"
                        />
                        <select
                            value={selectedDomain}
                            onChange={(event) => setSelectedDomain(event.target.value)}
                            className="h-11 w-full rounded-xl border border-white/20 bg-white/[0.08] px-4 text-sm text-white focus:border-nebula-cyan focus:outline-none"
                        >
                            <option value="">Tất cả domain</option>
                            {domains.map((domain) => (
                                <option key={domain.id} value={domain.id}>
                                    {domain.name}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="h-11 w-full rounded-xl bg-nebula-cyan px-4 text-sm font-semibold text-slate-900 hover:bg-nebula-cyan/90 lg:w-auto"
                        >
                            Tạo email mới
                        </button>
                        <button
                            onClick={() => void loadInboxes()}
                            className="h-11 w-full rounded-xl border border-white/10 px-4 text-sm text-text-secondary hover:text-white lg:w-auto"
                        >
                            Làm mới
                        </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                        <span className="uppercase tracking-[0.14em]">Mỗi trang</span>
                        {PAGE_SIZE_OPTIONS.map((size) => (
                            <button
                                key={size}
                                type="button"
                                onClick={() => setRowsPerPage(size)}
                                className={`rounded-md border px-2 py-1 transition ${
                                    rowsPerPage === size
                                        ? "border-nebula-cyan bg-nebula-cyan/20 text-white"
                                        : "border-white/15 bg-white/[0.03] hover:text-white"
                                }`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </section>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                    <section className="rounded-2xl border border-white/10 bg-surface/30 p-4">
                        {busy ? (
                            <div className="flex justify-center py-12">
                                <Loading />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {inboxes.length === 0 ? (
                                    <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-text-secondary">
                                        Không có inbox phù hợp với bộ lọc hiện tại.
                                    </p>
                                ) : (
                                    inboxes.map((inbox) => {
                                        // Cosmetic badge: unchanged from original — only flags an *explicit* other owner.
                                        const isSharedToUser = Boolean(user?.id && inbox.ownerId && inbox.ownerId !== user.id);
                                        // Gate for owner-only actions (share toggle, visibility rules): backend
                                        // `verifyInboxOwnership` requires an exact `ownerId === userId` match and
                                        // 403s otherwise — so a null/missing ownerId must NOT be treated as "own".
                                        const canManageSharing = Boolean(user?.id && inbox.ownerId === user.id);

                                        return (
                                        <div key={inbox.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                                            <button onClick={() => openInbox(inbox)} className="w-full text-left">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate text-sm font-semibold text-white">{toInboxEmail(inbox)}</p>
                                                    {isSharedToUser && (
                                                        <span className="rounded border border-cyan-400/40 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-300">Shared</span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-xs text-text-secondary">
                                                    {inbox._count?.messages ?? 0} email • Tạo lúc {new Date(inbox.createdAt).toLocaleString("vi-VN")}
                                                </p>
                                            </button>
                                            <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                                                <button
                                                    onClick={() => openInbox(inbox)}
                                                    className="w-full rounded-lg border border-white/20 bg-white/[0.08] px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 sm:w-auto"
                                                >
                                                    Mở inbox
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        void navigator.clipboard
                                                            .writeText(toInboxEmail(inbox))
                                                            .then(() => toast.success("Đã copy email"));
                                                    }}
                                                    className="rounded-lg border border-white/10 px-3 py-2 text-xs text-text-secondary hover:text-white"
                                                >
                                                    Copy email
                                                </button>
                                                <button
                                                    disabled={deletingInboxId === inbox.id}
                                                    onClick={() => void handleDelete(inbox)}
                                                    className="rounded-lg border border-rose-400/40 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                                                >
                                                    {deletingInboxId === inbox.id ? "Đang xóa..." : "Xóa"}
                                                </button>
                                                {canManageSharing && (
                                                    <button
                                                        onClick={() => setVisibilityRulesInbox(inbox)}
                                                        className="rounded-lg border border-white/10 px-3 py-2 text-xs text-text-secondary hover:text-white"
                                                    >
                                                        Quy tắc hiển thị
                                                    </button>
                                                )}
                                            </div>
                                            {canManageSharing && (
                                                <div className="mt-2">
                                                    <ShareModeToggle
                                                        shareMode={(inbox.shareMode as ShareMode) ?? "PRIVATE"}
                                                        onChange={(mode) => void handleShareModeChange(inbox, mode)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        );
                                    })
                                )}

                                {total > rowsPerPage && (
                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
                                        <p className="text-xs text-text-secondary">
                                            Trang {activePage}/{totalPages}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
                                                disabled={activePage === 1}
                                                className="rounded-md border border-white/10 px-2 py-1 text-xs text-text-secondary hover:text-white disabled:opacity-50"
                                            >
                                                Trước
                                            </button>
                                            {pageTabs.map((token, index) => (
                                                token === "ellipsis" ? (
                                                    <span key={`dots-${index}`} className="px-1 text-xs text-text-secondary">
                                                        ...
                                                    </span>
                                                ) : (
                                                    <button
                                                        key={token}
                                                        type="button"
                                                        onClick={() => setCurrentPage(token)}
                                                        className={`rounded-md border px-2 py-1 text-xs transition ${
                                                            token === activePage
                                                                ? "border-nebula-cyan bg-nebula-cyan/20 text-white"
                                                                : "border-white/10 text-text-secondary hover:text-white"
                                                        }`}
                                                    >
                                                        {token}
                                                    </button>
                                                )
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => setCurrentPage((previous) => Math.min(totalPages, previous + 1))}
                                                disabled={activePage === totalPages}
                                                className="rounded-md border border-white/10 px-2 py-1 text-xs text-text-secondary hover:text-white disabled:opacity-50"
                                            >
                                                Sau
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    <aside className="space-y-3 rounded-2xl border border-white/10 bg-surface/30 p-4">
                        <h2 className="text-sm font-semibold text-white">Mở lại nhanh</h2>
                        {recentInboxes.length === 0 ? (
                            <p className="text-xs text-text-secondary">Các inbox đã mở gần đây sẽ hiện ở đây.</p>
                        ) : (
                            recentInboxes.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => navigate(`/app/inbox/${item.id}`)}
                                    className="w-full rounded-lg border border-white/10 px-3 py-2 text-left hover:bg-white/5"
                                >
                                    <p className="truncate text-sm text-white">{item.email}</p>
                                    <p className="text-xs text-text-secondary">{new Date(item.openedAt).toLocaleString("vi-VN")}</p>
                                </button>
                            ))
                        )}
                    </aside>
                </div>
            </div>

            {showCreateModal && (
                <CreateInboxModal
                    domains={domains}
                    token={token}
                    onClose={() => setShowCreateModal(false)}
                    onInboxCreated={() => {
                        void loadInboxes();
                    }}
                />
            )}

            {visibilityRulesInbox && (
                <VisibilityRulesPanel
                    inboxId={visibilityRulesInbox.id}
                    inboxEmail={toInboxEmail(visibilityRulesInbox)}
                    onClose={() => setVisibilityRulesInbox(null)}
                />
            )}
        </AppShell>
    );
}
