/**
 * AnalyticsPage - Public inbox viewer analytics
 * Modules extracted to analytics-page-modules/
 */
import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { GlassCard, SectionHeader, PremiumButton, LoadingSpinner } from "../../components/admin/AdminUIComponents";
import { ClarityLinksGroup } from "../../components/admin/ClarityLinkButton";
import {
    type AnalyticsStats,
    type Session,
    type TimeRange,
    PAGE_SIZE,
    TimeRangeFilter,
    AnalyticsTabs,
    StatsGrid,
    TopInboxesCard,
    RecentActivityCard,
    SessionsTable
} from "./analytics-page-modules";

export function AnalyticsPage() {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<AnalyticsStats | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionsTotal, setSessionsTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [timeRange, setTimeRange] = useState<TimeRange>("7d");
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
                <TimeRangeFilter timeRange={timeRange} setTimeRange={setTimeRange} />
                <PremiumButton onClick={handleExport} isLoading={exporting} variant="secondary">
                    <span className="material-symbols-outlined text-[18px] mr-2">download</span>
                    Xuất CSV
                </PremiumButton>
            </div>

            {/* Tabs */}
            <AnalyticsTabs activeTab={activeTab} setActiveTab={setActiveTab} />

            {activeTab === "overview" && stats && (
                <>
                    <StatsGrid stats={stats} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <TopInboxesCard topInboxes={stats.topInboxes} />
                        <RecentActivityCard recentActivity={stats.recentActivity} />
                    </div>
                </>
            )}

            {activeTab === "sessions" && (
                <SessionsTable
                    sessions={sessions}
                    sessionsTotal={sessionsTotal}
                    page={page}
                    pageSize={PAGE_SIZE}
                    setPage={setPage}
                />
            )}
        </div>
    );
}
