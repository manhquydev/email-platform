/**
 * UI components for AnalyticsPage
 */
import {
    GlassCard, PremiumTable, TableHeader, TableHeaderCell,
    TableBody, TableRow, TableCell, Pagination
} from "../../../components/admin/AdminUIComponents";
import type { AnalyticsStats, Session, TimeRange } from "./analytics-helpers";
import { formatDate, getActionLabel, getActionColor, TIME_RANGES, getTimeRangeLabel } from "./analytics-helpers";

// Stat Card
export function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
    return (
        <GlassCard className="text-center">
            <span className="material-symbols-outlined text-3xl text-primary/60 mb-2">{icon}</span>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
        </GlassCard>
    );
}

// Time Range Filter
interface TimeRangeFilterProps {
    timeRange: TimeRange;
    setTimeRange: (range: TimeRange) => void;
}

export function TimeRangeFilter({ timeRange, setTimeRange }: TimeRangeFilterProps) {
    return (
        <div className="flex gap-2">
            {TIME_RANGES.map((range) => (
                <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        timeRange === range
                            ? "bg-primary text-white"
                            : "bg-white/5 hover:bg-white/10 text-gray-400"
                    }`}
                >
                    {getTimeRangeLabel(range)}
                </button>
            ))}
        </div>
    );
}

// Tabs
interface TabsProps {
    activeTab: "overview" | "sessions";
    setActiveTab: (tab: "overview" | "sessions") => void;
}

export function AnalyticsTabs({ activeTab, setActiveTab }: TabsProps) {
    return (
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
    );
}

// Stats Overview Grid
export function StatsGrid({ stats }: { stats: AnalyticsStats }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Tìm kiếm" value={stats.totalSearches} icon="search" />
            <StatCard label="Xem danh sách" value={stats.totalMessageLists} icon="list" />
            <StatCard label="Xem email" value={stats.totalMessageViews} icon="mail" />
            <StatCard label="Tải file" value={stats.totalAttachmentDownloads} icon="download" />
            <StatCard label="IP duy nhất" value={stats.uniqueIPs} icon="language" />
            <StatCard label="Phiên" value={stats.uniqueSessions} icon="person" />
        </div>
    );
}

// Top Inboxes Card
export function TopInboxesCard({ topInboxes }: { topInboxes: AnalyticsStats["topInboxes"] }) {
    return (
        <GlassCard>
            <h3 className="text-lg font-semibold mb-4">Top Hòm thư được xem</h3>
            {topInboxes.length === 0 ? (
                <p className="text-gray-500 text-sm">Chưa có dữ liệu</p>
            ) : (
                <div className="space-y-3">
                    {topInboxes.map((inbox, idx) => (
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
    );
}

// Recent Activity Card
export function RecentActivityCard({ recentActivity }: { recentActivity: AnalyticsStats["recentActivity"] }) {
    return (
        <GlassCard>
            <h3 className="text-lg font-semibold mb-4">Hoạt động gần đây</h3>
            {recentActivity.length === 0 ? (
                <p className="text-gray-500 text-sm">Chưa có hoạt động</p>
            ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {recentActivity.map((activity) => (
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
    );
}

// Sessions Table
interface SessionsTableProps {
    sessions: Session[];
    sessionsTotal: number;
    page: number;
    pageSize: number;
    setPage: (page: number) => void;
}

export function SessionsTable({ sessions, sessionsTotal, page, pageSize, setPage }: SessionsTableProps) {
    return (
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
                totalPages={Math.ceil(sessionsTotal / pageSize) || 1}
                onPageChange={(p) => setPage(p - 1)}
            />
        </GlassCard>
    );
}
