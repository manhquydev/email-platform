import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import {
    GlassCard, SectionHeader, PremiumTable, TableHeader, TableHeaderCell,
    TableBody, TableRow, TableCell, PremiumButton, LoadingSpinner, Pagination
} from "../../components/admin/AdminUIComponents";
import { ClarityLinksGroup } from "../../components/admin/ClarityLinkButton";

interface AnalyticsStats {
    totalSearches: number;
    totalMessageViews: number;
    totalMessageLists: number;
    totalAttachmentDownloads: number;
    uniqueIPs: number;
    uniqueSessions: number;
    topInboxes: Array<{ email: string; views: number }>;
    recentActivity: Array<{
        id: string;
        action: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: Record<string, any>;
        createdAt: string;
    }>;
    timeRange: string;
}

interface Session {
    sessionId: string;
    ip: string;
    userAgent: string;
    firstSeen: string;
    lastSeen: string;
    searchCount: number;
    viewCount: number;
    inboxesAccessed: string[];
}

const PAGE_SIZE = 20;

export function AnalyticsPage() {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<AnalyticsStats | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionsTotal, setSessionsTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("7d");
    const [activeTab, setActiveTab] = useState<"overview" | "sessions">("overview");
    const [exporting, setExporting] = useState(false);

    const loadStats = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api<AnalyticsStats>(`/admin/analytics/public-viewer?timeRange=${timeRange}`, { token });
            setStats(res);
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token, timeRange]);

    const loadSessions = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            params.set("limit", String(PAGE_SIZE));
            params.set("offset", String(page * PAGE_SIZE));

            const res = await api<{ sessions: Session[]; meta: { total: number } }>(
                `/admin/analytics/public-viewer/sessions?${params}`,
                { token }
            );
            setSessions(res.sessions);
            setSessionsTotal(res.meta.total);
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        }
    }, [token, page]);

    useEffect(() => { loadStats(); }, [loadStats]);
    useEffect(() => { if (activeTab === "sessions") loadSessions(); }, [loadSessions, activeTab]);

    const handleExport = async () => {
        setExporting(true);
        try {
            const response = await fetch(`/api/admin/analytics/public-viewer/export`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `audit-public-viewer-${new Date().toISOString().split("T")[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success("Đã xuất file CSV");
        } catch {
            toast.error("Không thể xuất file");
        } finally {
            setExporting(false);
        }
    };

    const formatDate = (date: string) => new Date(date).toLocaleString("vi-VN");

    const getActionLabel = (action: string) => {
        switch (action) {
            case "PUBLIC_INBOX_SEARCHED": return "Tìm kiếm";
            case "PUBLIC_MESSAGE_VIEWED": return "Xem email";
            case "PUBLIC_MESSAGES_LISTED": return "Xem danh sách";
            case "PUBLIC_ATTACHMENT_DOWNLOADED": return "Tải file";
            default: return action;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case "PUBLIC_INBOX_SEARCHED": return "bg-blue-500/20 text-blue-400";
            case "PUBLIC_MESSAGE_VIEWED": return "bg-green-500/20 text-green-400";
            case "PUBLIC_MESSAGES_LISTED": return "bg-purple-500/20 text-purple-400";
            case "PUBLIC_ATTACHMENT_DOWNLOADED": return "bg-orange-500/20 text-orange-400";
            default: return "bg-gray-500/20 text-gray-400";
        }
    };

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Public Inbox Viewer Analytics"
                subtitle="Theo dõi hoạt động truy cập công khai vào hòm thư"
            />

            {/* Clarity Deep Links */}
            <GlassCard className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-nebula-text">Microsoft Clarity</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Session recordings, heatmaps & user insights</p>
                    </div>
                    <ClarityLinksGroup />
                </div>
            </GlassCard>

            {/* Time Range Filter */}
            <div className="flex items-center gap-4">
                <div className="flex gap-2">
                    {(["7d", "30d", "all"] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                timeRange === range
                                    ? "bg-primary text-white"
                                    : "bg-white/5 hover:bg-white/10 text-gray-400"
                            }`}
                        >
                            {range === "7d" ? "7 ngày" : range === "30d" ? "30 ngày" : "Tất cả"}
                        </button>
                    ))}
                </div>
                <PremiumButton onClick={handleExport} isLoading={exporting} variant="secondary">
                    <span className="material-symbols-outlined text-[18px] mr-2">download</span>
                    Xuất CSV
                </PremiumButton>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "overview"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-400 hover:text-gray-300"
                    }`}
                >
                    Tổng quan
                </button>
                <button
                    onClick={() => setActiveTab("sessions")}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "sessions"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-400 hover:text-gray-300"
                    }`}
                >
                    Phiên truy cập
                </button>
            </div>

            {activeTab === "overview" && stats && (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <StatCard label="Tìm kiếm" value={stats.totalSearches} icon="search" />
                        <StatCard label="Xem danh sách" value={stats.totalMessageLists} icon="list" />
                        <StatCard label="Xem email" value={stats.totalMessageViews} icon="mail" />
                        <StatCard label="Tải file" value={stats.totalAttachmentDownloads} icon="download" />
                        <StatCard label="IP duy nhất" value={stats.uniqueIPs} icon="language" />
                        <StatCard label="Phiên" value={stats.uniqueSessions} icon="person" />
                    </div>

                    {/* Top Inboxes */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <GlassCard>
                            <h3 className="text-lg font-semibold mb-4">Top Hòm thư được xem</h3>
                            {stats.topInboxes.length === 0 ? (
                                <p className="text-gray-500 text-sm">Chưa có dữ liệu</p>
                            ) : (
                                <div className="space-y-3">
                                    {stats.topInboxes.map((inbox, idx) => (
                                        <div key={inbox.email} className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-gray-500 w-6">#{idx + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{inbox.email}</p>
                                            </div>
                                            <span className="text-sm font-semibold text-primary">{inbox.views}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </GlassCard>

                        {/* Recent Activity */}
                        <GlassCard>
                            <h3 className="text-lg font-semibold mb-4">Hoạt động gần đây</h3>
                            {stats.recentActivity.length === 0 ? (
                                <p className="text-gray-500 text-sm">Chưa có hoạt động</p>
                            ) : (
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                    {stats.recentActivity.map((activity) => (
                                        <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(activity.action)}`}>
                                                {getActionLabel(activity.action)}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm truncate">{activity.meta?.email || "N/A"}</p>
                                                <p className="text-xs text-gray-500">{activity.meta?.ip}</p>
                                            </div>
                                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                                {formatDate(activity.createdAt)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </GlassCard>
                    </div>
                </>
            )}

            {activeTab === "sessions" && (
                <GlassCard>
                    <PremiumTable>
                        <TableHeader>
                            <TableHeaderCell>Session ID</TableHeaderCell>
                            <TableHeaderCell>IP</TableHeaderCell>
                            <TableHeaderCell>Tìm kiếm</TableHeaderCell>
                            <TableHeaderCell>Xem</TableHeaderCell>
                            <TableHeaderCell>Hòm thư truy cập</TableHeaderCell>
                            <TableHeaderCell>Lần đầu</TableHeaderCell>
                            <TableHeaderCell>Lần cuối</TableHeaderCell>
                        </TableHeader>
                        <TableBody>
                            {sessions.map((session) => (
                                <TableRow key={session.sessionId}>
                                    <TableCell>
                                        <code className="text-xs bg-white/10 px-2 py-1 rounded">
                                            {session.sessionId}
                                        </code>
                                    </TableCell>
                                    <TableCell>{session.ip}</TableCell>
                                    <TableCell>
                                        <span className="text-blue-400 font-semibold">{session.searchCount}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-green-400 font-semibold">{session.viewCount}</span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-[200px] truncate text-sm text-gray-400">
                                            {session.inboxesAccessed.join(", ") || "-"}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs">{formatDate(session.firstSeen)}</TableCell>
                                    <TableCell className="text-xs">{formatDate(session.lastSeen)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </PremiumTable>

                    <Pagination
                        currentPage={page + 1}
                        totalPages={Math.ceil(sessionsTotal / PAGE_SIZE) || 1}
                        onPageChange={(p) => setPage(p - 1)}
                    />
                </GlassCard>
            )}
        </div>
    );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
    return (
        <GlassCard className="text-center">
            <span className="material-symbols-outlined text-3xl text-primary/60 mb-2">{icon}</span>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
        </GlassCard>
    );
}
