import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import {
    GlassCard, SectionHeader, PremiumTable, TableHeader, TableHeaderCell,
    TableBody, TableRow, TableCell, StatusBadge, PremiumButton, PremiumInput,
    LoadingSpinner, Pagination, ConfirmModal
} from "../../components/admin/AdminUIComponents";

interface TelegramOverview {
    userLinks: number;
    inboxLinks: {
        total: number;
        active: number;
        paused: number;
        revoked: number;
    };
    notifications24h: {
        sent: number;
        failed: number;
        successRate: number;
    };
}

interface UserLink {
    id: string;
    email: string;
    telegramChatId: string;
    telegramLinkedAt: string;
    tier: string;
    createdAt: string;
}

interface InboxLink {
    id: string;
    inboxEmail: string;
    telegramChatId: string;
    telegramUsername: string | null;
    createdAt: string;
    status: "ACTIVE" | "PAUSED" | "REVOKED";
    notificationsSent: number;
    notificationsFailed: number;
}

const PAGE_SIZE = 20;

export function TelegramManagementPage() {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<TelegramOverview | null>(null);
    const [activeTab, setActiveTab] = useState<"overview" | "user-links" | "inbox-links">("overview");

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
    const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "PAUSED" | "REVOKED" | "all">("all");

    // Modals
    const [confirmUnlink, setConfirmUnlink] = useState<{ type: "user" | "inbox"; id: string; email: string } | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

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

    useEffect(() => { loadOverview(); }, [loadOverview]);
    useEffect(() => { if (activeTab === "user-links") loadUserLinks(); }, [loadUserLinks, activeTab]);
    useEffect(() => { if (activeTab === "inbox-links") loadInboxLinks(); }, [loadInboxLinks, activeTab]);

    const handleUnlinkUser = async (userId: string) => {
        setActionLoading(true);
        try {
            await api(`/admin/telegram/user-links/${userId}/unlink`, {
                method: "POST",
                token,
                body: { reason: "Admin action" },
            });
            toast.success("Đã hủy liên kết Telegram");
            setConfirmUnlink(null);
            loadUserLinks();
            loadOverview();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setActionLoading(false);
        }
    };

    const handleRevokeInboxLink = async (linkId: string) => {
        setActionLoading(true);
        try {
            await api(`/admin/telegram/inbox-links/${linkId}/revoke`, {
                method: "POST",
                token,
                body: { reason: "Admin action" },
            });
            toast.success("Đã thu hồi liên kết");
            setConfirmUnlink(null);
            loadInboxLinks();
            loadOverview();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setActionLoading(false);
        }
    };

    const handleReactivateInboxLink = async (linkId: string) => {
        setActionLoading(true);
        try {
            await api(`/admin/telegram/inbox-links/${linkId}/reactivate`, {
                method: "POST",
                token,
            });
            toast.success("Đã kích hoạt lại liên kết");
            loadInboxLinks();
            loadOverview();
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setActionLoading(false);
        }
    };

    const formatDate = (date: string) => new Date(date).toLocaleString("vi-VN");

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "ACTIVE": return <StatusBadge status="Hoạt động" variant="success" />;
            case "PAUSED": return <StatusBadge status="Tạm dừng" variant="warning" />;
            case "REVOKED": return <StatusBadge status="Thu hồi" variant="danger" />;
            default: return <StatusBadge status={status} variant="default" />;
        }
    };

    if (loading && !overview) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Quản lý Telegram"
                subtitle="Quản lý liên kết Telegram với tài khoản và hòm thư"
            />

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10">
                {[
                    { id: "overview", label: "Tổng quan" },
                    { id: "user-links", label: "Liên kết Người dùng" },
                    { id: "inbox-links", label: "Liên kết Hòm thư" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === tab.id
                                ? "border-primary text-primary"
                                : "border-transparent text-gray-400 hover:text-gray-300"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "overview" && overview && (
                <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            label="Người dùng liên kết"
                            value={overview.userLinks}
                            icon="person"
                            color="blue"
                        />
                        <StatCard
                            label="Hòm thư liên kết"
                            value={overview.inboxLinks.total}
                            icon="inbox"
                            color="green"
                            subtext={`${overview.inboxLinks.active} hoạt động`}
                        />
                        <StatCard
                            label="Thông báo 24h"
                            value={overview.notifications24h.sent}
                            icon="notifications"
                            color="purple"
                            subtext={`${overview.notifications24h.failed} thất bại`}
                        />
                        <StatCard
                            label="Tỷ lệ thành công"
                            value={overview.notifications24h.successRate}
                            icon="check_circle"
                            color="emerald"
                            suffix="%"
                        />
                    </div>

                    {/* Inbox Links Status Breakdown */}
                    <GlassCard>
                        <h3 className="text-lg font-semibold mb-4">Trạng thái liên kết Hòm thư</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-green-500/10 rounded-lg">
                                <p className="text-2xl font-bold text-green-400">{overview.inboxLinks.active}</p>
                                <p className="text-sm text-gray-400">Hoạt động</p>
                            </div>
                            <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                                <p className="text-2xl font-bold text-yellow-400">{overview.inboxLinks.paused}</p>
                                <p className="text-sm text-gray-400">Tạm dừng</p>
                            </div>
                            <div className="text-center p-4 bg-red-500/10 rounded-lg">
                                <p className="text-2xl font-bold text-red-400">{overview.inboxLinks.revoked}</p>
                                <p className="text-sm text-gray-400">Thu hồi</p>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            )}

            {activeTab === "user-links" && (
                <GlassCard>
                    <div className="mb-4">
                        <PremiumInput
                            placeholder="Tìm theo email hoặc Chat ID..."
                            value={userSearch}
                            onChange={(value) => { setUserSearch(value); setUserLinksPage(0); }}
                        />
                    </div>

                    <PremiumTable>
                        <TableHeader>
                            <TableHeaderCell>Email</TableHeaderCell>
                            <TableHeaderCell>Telegram Chat ID</TableHeaderCell>
                            <TableHeaderCell>Gói cước</TableHeaderCell>
                            <TableHeaderCell>Ngày liên kết</TableHeaderCell>
                            <TableHeaderCell>Hành động</TableHeaderCell>
                        </TableHeader>
                        <TableBody>
                            {userLinks.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <code className="text-xs bg-white/10 px-2 py-1 rounded">
                                            {user.telegramChatId}
                                        </code>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={user.tier} variant={user.tier === "FREE" ? "default" : "success"} />
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {user.telegramLinkedAt ? formatDate(user.telegramLinkedAt) : "-"}
                                    </TableCell>
                                    <TableCell>
                                        <PremiumButton
                                            variant="danger"
                                            size="sm"
                                            onClick={() => setConfirmUnlink({
                                                type: "user",
                                                id: user.id,
                                                email: user.email,
                                            })}
                                        >
                                            Hủy liên kết
                                        </PremiumButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </PremiumTable>

                    <Pagination
                        currentPage={userLinksPage + 1}
                        totalPages={Math.ceil(userLinksTotal / PAGE_SIZE) || 1}
                        onPageChange={(page) => setUserLinksPage(page - 1)}
                    />
                </GlassCard>
            )}

            {activeTab === "inbox-links" && (
                <GlassCard>
                    <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                            <PremiumInput
                                placeholder="Tìm theo email, Chat ID hoặc username..."
                                value={inboxSearch}
                                onChange={(value) => { setInboxSearch(value); setInboxLinksPage(0); }}
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value as any); setInboxLinksPage(0); }}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="ACTIVE">Hoạt động</option>
                            <option value="PAUSED">Tạm dừng</option>
                            <option value="REVOKED">Thu hồi</option>
                        </select>
                    </div>

                    <PremiumTable>
                        <TableHeader>
                            <TableHeaderCell>Hòm thư</TableHeaderCell>
                            <TableHeaderCell>Telegram</TableHeaderCell>
                            <TableHeaderCell>Trạng thái</TableHeaderCell>
                            <TableHeaderCell>Thông báo</TableHeaderCell>
                            <TableHeaderCell>Ngày tạo</TableHeaderCell>
                            <TableHeaderCell>Hành động</TableHeaderCell>
                        </TableHeader>
                        <TableBody>
                            {inboxLinks.map((link) => (
                                <TableRow key={link.id}>
                                    <TableCell>{link.inboxEmail}</TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <code className="text-xs bg-white/10 px-2 py-1 rounded block">
                                                {link.telegramChatId}
                                            </code>
                                            {link.telegramUsername && (
                                                <span className="text-xs text-gray-400">@{link.telegramUsername}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(link.status)}</TableCell>
                                    <TableCell>
                                        <div className="text-xs">
                                            <span className="text-green-400">{link.notificationsSent} gửi</span>
                                            {" / "}
                                            <span className="text-red-400">{link.notificationsFailed} lỗi</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs">{formatDate(link.createdAt)}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            {link.status !== "ACTIVE" && (
                                                <PremiumButton
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleReactivateInboxLink(link.id)}
                                                    isLoading={actionLoading}
                                                >
                                                    Kích hoạt
                                                </PremiumButton>
                                            )}
                                            {link.status === "ACTIVE" && (
                                                <PremiumButton
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => setConfirmUnlink({
                                                        type: "inbox",
                                                        id: link.id,
                                                        email: link.inboxEmail,
                                                    })}
                                                >
                                                    Thu hồi
                                                </PremiumButton>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </PremiumTable>

                    <Pagination
                        currentPage={inboxLinksPage + 1}
                        totalPages={Math.ceil(inboxLinksTotal / PAGE_SIZE) || 1}
                        onPageChange={(page) => setInboxLinksPage(page - 1)}
                    />
                </GlassCard>
            )}

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={!!confirmUnlink}
                onClose={() => setConfirmUnlink(null)}
                onConfirm={() => {
                    if (confirmUnlink?.type === "user") {
                        handleUnlinkUser(confirmUnlink.id);
                    } else if (confirmUnlink?.type === "inbox") {
                        handleRevokeInboxLink(confirmUnlink.id);
                    }
                }}
                title={confirmUnlink?.type === "user" ? "Hủy liên kết Telegram" : "Thu hồi liên kết"}
                message={`Bạn có chắc muốn ${confirmUnlink?.type === "user" ? "hủy liên kết" : "thu hồi"} Telegram cho ${confirmUnlink?.email}?`}
                confirmText={confirmUnlink?.type === "user" ? "Hủy liên kết" : "Thu hồi"}
                isLoading={actionLoading}
            />
        </div>
    );
}

function StatCard({
    label,
    value,
    icon,
    color,
    subtext,
    suffix = "",
}: {
    label: string;
    value: number;
    icon: string;
    color: "blue" | "green" | "purple" | "emerald";
    subtext?: string;
    suffix?: string;
}) {
    const colorClasses = {
        blue: "text-blue-400 bg-blue-500/10",
        green: "text-green-400 bg-green-500/10",
        purple: "text-purple-400 bg-purple-500/10",
        emerald: "text-emerald-400 bg-emerald-500/10",
    };

    return (
        <GlassCard className="text-center">
            <div className={`inline-flex p-3 rounded-xl ${colorClasses[color]} mb-3`}>
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <p className="text-2xl font-bold">
                {value.toLocaleString()}{suffix}
            </p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
            {subtext && <p className="text-xs text-gray-600 mt-1">{subtext}</p>}
        </GlassCard>
    );
}
