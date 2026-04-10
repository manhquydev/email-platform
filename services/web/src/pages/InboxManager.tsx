import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CreateInboxModal } from "../components/CreateInboxModal";
import { Loading } from "../components/Loading";
import { useAuth } from "../context/AuthContext";
import { AppShell } from "../layouts/AppShell";
import { api } from "../utils/api";
import type { Domain, Inbox, PaginatedResponse } from "../types";

const PAGE_SIZE = 120;
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

function toInboxEmail(inbox: Inbox) {
    return `${inbox.localPart}@${inbox.domain?.name ?? "unknown.local"}`;
}

function mergeUniqueInboxes(items: Inbox[]) {
    return Array.from(items.reduce((map, inbox) => map.set(inbox.id, inbox), new Map<string, Inbox>()).values());
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

export function InboxManager() {
    const { token, user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const offsetRef = useRef(0);

    const [domains, setDomains] = useState<Domain[]>([]);
    const [inboxes, setInboxes] = useState<Inbox[]>([]);
    const [total, setTotal] = useState(0);
    const [selectedDomain, setSelectedDomain] = useState("");
    const [selectedScope, setSelectedScope] = useState<(typeof SCOPE_OPTIONS)[number]["value"]>("all");
    const [search, setSearch] = useState("");
    const [busy, setBusy] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deletingInboxId, setDeletingInboxId] = useState("");
    const [recentInboxes, setRecentInboxes] = useState<RecentInboxItem[]>(() => readRecentInboxes());

    const loadDomains = useCallback(async () => {
        if (!token) return;
        const response = await api<PaginatedResponse<Domain>>("/domains?limit=200", { token });
        setDomains(response?.data ?? []);
    }, [token]);

    const loadInboxes = useCallback(async (reset = false) => {
        if (!token) return;
        const nextOffset = reset ? 0 : offsetRef.current;

        if (reset) {
            setBusy(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const params = new URLSearchParams({
                limit: String(PAGE_SIZE),
                offset: String(nextOffset),
            });

            if (selectedScope === "personal") {
                params.set("personal", "true");
            }

            if (selectedDomain) {
                params.set("domain", selectedDomain);
            }

            const response = await api<InboxListResponse>(`/inboxes?${params.toString()}`, { token });
            const pageData = Array.isArray(response?.data) ? response.data : [];
            const responseTotal = response?.meta?.total ?? response?.total ?? 0;
            offsetRef.current = nextOffset + pageData.length;
            setInboxes((prev) => (reset ? pageData : mergeUniqueInboxes([...prev, ...pageData])));
            setTotal(responseTotal);
            setHasMore(responseTotal > offsetRef.current);
        } catch (error) {
            console.error("[InboxManager] Failed to load inboxes", error);
            toast.error("Không thể tải danh sách inbox");
        } finally {
            if (reset) {
                setBusy(false);
            } else {
                setLoadingMore(false);
            }
        }
    }, [selectedDomain, selectedScope, token]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        setSearch(params.get("q") ?? "");
    }, [location.search]);

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
        if (!token) return;
        offsetRef.current = 0;
        setHasMore(true);
        setInboxes([]);
        void loadInboxes(true);
    }, [selectedDomain, selectedScope, token, loadInboxes]);

    const filteredInboxes = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return inboxes.filter((inbox) => {
            if (selectedDomain && inbox.domainId !== selectedDomain) return false;
            if (selectedScope === "shared" && user?.id && inbox.ownerId === user.id) return false;
            const email = toInboxEmail(inbox).toLowerCase();
            const domainName = inbox.domain?.name?.toLowerCase() ?? "";
            if (!keyword) return true;
            return email.includes(keyword) || domainName.includes(keyword);
        });
    }, [inboxes, search, selectedDomain, selectedScope, user?.id]);

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
            setInboxes((prev) => prev.filter((item) => item.id !== inbox.id));
            setTotal((prev) => Math.max(0, prev - 1));
            toast.success("Đã xóa inbox");
        } catch (error) {
            console.error("[InboxManager] Failed to delete inbox", error);
            toast.error("Xóa inbox thất bại");
        } finally {
            setDeletingInboxId("");
        }
    }, [token]);

    return (
        <AppShell>
            <div className="space-y-4 p-4 pb-24 sm:p-6 lg:p-8">
                <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-nebula-violet/20 via-nebula-cyan/10 to-nebula-pink/10 p-5">
                    <h1 className="text-2xl font-bold text-white">Inbox Manager 2.0</h1>
                    <p className="mt-1 text-sm text-text-secondary">Tối ưu thao tác nhanh: tạo inbox, tìm inbox, mở inbox trong 1 click.</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
                        <span className="rounded-full border border-white/10 px-3 py-1">Đã tải {inboxes.length}/{total.toLocaleString("vi-VN")} inbox</span>
                        <span className="rounded-full border border-white/10 px-3 py-1">Hiển thị {filteredInboxes.length.toLocaleString("vi-VN")} inbox</span>
                        <span className="rounded-full border border-white/10 px-3 py-1">Đang xem: {SCOPE_OPTIONS.find((item) => item.value === selectedScope)?.label}</span>
                    </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-surface/30 p-4">
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

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Tìm email nhanh..."
                            className="h-11 flex-1 rounded-xl border border-white/10 bg-surface/40 px-4 text-sm text-white placeholder:text-text-secondary focus:border-nebula-cyan focus:outline-none"
                        />
                        <select
                            value={selectedDomain}
                            onChange={(event) => setSelectedDomain(event.target.value)}
                            className="h-11 rounded-xl border border-white/10 bg-surface/40 px-4 text-sm text-white focus:border-nebula-cyan focus:outline-none"
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
                            className="h-11 rounded-xl bg-nebula-cyan px-4 text-sm font-semibold text-slate-900 hover:bg-nebula-cyan/90"
                        >
                            Tạo email mới
                        </button>
                        <button
                            onClick={() => void loadInboxes(true)}
                            className="h-11 rounded-xl border border-white/10 px-4 text-sm text-text-secondary hover:text-white"
                        >
                            Làm mới
                        </button>
                    </div>
                </section>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                    <section className="rounded-2xl border border-white/10 bg-surface/30 p-4">
                        {busy && inboxes.length === 0 ? (
                            <div className="flex justify-center py-12">
                                <Loading />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredInboxes.length === 0 ? (
                                    <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-text-secondary">
                                        Không có inbox phù hợp với bộ lọc hiện tại.
                                    </p>
                                ) : (
                                    filteredInboxes.map((inbox) => (
                                        <div key={inbox.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                                            <button onClick={() => openInbox(inbox)} className="w-full text-left">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate text-sm font-semibold text-white">{toInboxEmail(inbox)}</p>
                                                    {user?.id && inbox.ownerId && inbox.ownerId !== user.id && (
                                                        <span className="rounded border border-cyan-400/40 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-300">Shared</span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-xs text-text-secondary">
                                                    {inbox._count?.messages ?? 0} email • Tạo lúc {new Date(inbox.createdAt).toLocaleString("vi-VN")}
                                                </p>
                                            </button>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => openInbox(inbox)}
                                                    className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
                                                >
                                                    Mở inbox
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        void navigator.clipboard
                                                            .writeText(toInboxEmail(inbox))
                                                            .then(() => toast.success("Đã copy email"));
                                                    }}
                                                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-text-secondary hover:text-white"
                                                >
                                                    Copy email
                                                </button>
                                                <button
                                                    disabled={deletingInboxId === inbox.id}
                                                    onClick={() => void handleDelete(inbox)}
                                                    className="rounded-lg border border-rose-400/40 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                                                >
                                                    {deletingInboxId === inbox.id ? "Đang xóa..." : "Xóa"}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}

                                {hasMore && !search && (
                                    <button
                                        onClick={() => void loadInboxes(false)}
                                        disabled={loadingMore}
                                        className="mt-2 w-full rounded-xl border border-white/10 py-2 text-sm text-text-secondary hover:text-white disabled:opacity-50"
                                    >
                                        {loadingMore ? "Đang tải thêm..." : "Tải thêm inbox"}
                                    </button>
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
                        void loadInboxes(true);
                    }}
                />
            )}
        </AppShell>
    );
}
