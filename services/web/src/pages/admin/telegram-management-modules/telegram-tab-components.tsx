/**
 * Tab components for Telegram Management Page
 * Overview, UserLinks, and InboxLinks tabs
 */
import {
    GlassCard, PremiumTable, TableHeader, TableHeaderCell,
    TableBody, TableRow, TableCell, StatusBadge, PremiumButton, PremiumInput,
    Pagination
} from "../../../components/admin/AdminUIComponents";
import type { TelegramOverview, UserLink, InboxLink, StatusFilterType } from "./types";
import { PAGE_SIZE } from "./types";
import type { ConfirmUnlinkState } from "./use-telegram-actions";

// --- Utility functions ---
const formatDate = (date: string) => new Date(date).toLocaleString("vi-VN");

const getStatusBadge = (status: string) => {
    switch (status) {
        case "ACTIVE": return <StatusBadge status="Hoạt động" variant="success" />;
        case "PAUSED": return <StatusBadge status="Tạm dừng" variant="warning" />;
        case "REVOKED": return <StatusBadge status="Thu hồi" variant="danger" />;
        default: return <StatusBadge status={status} variant="default" />;
    }
};

// --- StatCard Component ---
export function StatCard({
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

// --- Overview Tab ---
export function OverviewTab({ overview }: { overview: TelegramOverview }) {
    return (
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
    );
}

// --- User Links Tab ---
export interface UserLinksTabProps {
    userLinks: UserLink[];
    userLinksTotal: number;
    userLinksPage: number;
    userSearch: string;
    setUserLinksPage: (page: number) => void;
    setUserSearch: (search: string) => void;
    onUnlink: (state: ConfirmUnlinkState) => void;
}

export function UserLinksTab({
    userLinks,
    userLinksTotal,
    userLinksPage,
    userSearch,
    setUserLinksPage,
    setUserSearch,
    onUnlink,
}: UserLinksTabProps) {
    return (
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
                                    onClick={() => onUnlink({
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
    );
}

// --- Inbox Links Tab ---
export interface InboxLinksTabProps {
    inboxLinks: InboxLink[];
    inboxLinksTotal: number;
    inboxLinksPage: number;
    inboxSearch: string;
    statusFilter: StatusFilterType;
    setInboxLinksPage: (page: number) => void;
    setInboxSearch: (search: string) => void;
    setStatusFilter: (filter: StatusFilterType) => void;
    onRevoke: (state: ConfirmUnlinkState) => void;
    onReactivate: (linkId: string) => Promise<void>;
    actionLoading: boolean;
}

export function InboxLinksTab({
    inboxLinks,
    inboxLinksTotal,
    inboxLinksPage,
    inboxSearch,
    statusFilter,
    setInboxLinksPage,
    setInboxSearch,
    setStatusFilter,
    onRevoke,
    onReactivate,
    actionLoading,
}: InboxLinksTabProps) {
    return (
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
                    onChange={(e) => { setStatusFilter(e.target.value as StatusFilterType); setInboxLinksPage(0); }}
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
                                            onClick={() => onReactivate(link.id)}
                                            isLoading={actionLoading}
                                        >
                                            Kích hoạt
                                        </PremiumButton>
                                    )}
                                    {link.status === "ACTIVE" && (
                                        <PremiumButton
                                            variant="danger"
                                            size="sm"
                                            onClick={() => onRevoke({
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
    );
}
