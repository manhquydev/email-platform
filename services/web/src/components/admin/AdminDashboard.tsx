/**
 * Admin Dashboard - System overview with stats and charts
 * Modules extracted to admin-dashboard-modules/
 */
import { ClaritySection } from "./ClarityInsightsWidget";
import {
    useAdminDashboardData,
    GlassCard,
    StatCard,
    CircularGauge,
    ActivityFeedItem,
    ActivityChart,
    RadarChartSection,
    DashboardHeader,
    RevenueOverview
} from "./admin-dashboard-modules";

export function AdminDashboard({ token }: { token: string }) {
    const {
        stats,
        revenueStats,
        trends,
        timeseries,
        activity,
        loading,
        lastUpdated,
        loadStats
    } = useAdminDashboardData(token);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-primary/30 rounded-full animate-spin border-t-primary" />
                </div>
            </div>
        );
    }

    if (!stats) {
        return <div className="text-muted text-center p-8">Không có dữ liệu</div>;
    }

    const statCards = [
        { label: "Người dùng", value: stats.totalUsers, trend: trends?.users.trend, color: "from-nebula-violet to-nebula-violet-dark", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg> },
        { label: "Tên miền", value: stats.verifiedDomains, trend: trends?.domains.trend, color: "from-emerald-500 to-emerald-600", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" /></svg> },
        { label: "Hộp thư", value: stats.totalInboxes, trend: trends?.inboxes.trend, color: "from-violet-500 to-violet-600", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg> },
        { label: "Email", value: stats.totalMessages, trend: trends?.emails.trend, color: "from-indigo-500 to-indigo-600", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51" /></svg> },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <DashboardHeader lastUpdated={lastUpdated} onRefresh={() => loadStats(true)} />

            {/* Revenue Overview */}
            {revenueStats && <RevenueOverview revenueStats={revenueStats} />}

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-12 gap-4">
                {/* Clarity Live Insights */}
                <div className="col-span-12">
                    <ClaritySection />
                </div>

                {/* Stats Cards */}
                {statCards.map((card, i) => (
                    <div key={i} className="col-span-6 md:col-span-3">
                        <StatCard {...card} delay={i * 100} />
                    </div>
                ))}

                {/* Hero Chart */}
                <div className="col-span-12 lg:col-span-8">
                    <ActivityChart timeseries={timeseries} />
                </div>

                {/* Radar Chart */}
                <div className="col-span-12 lg:col-span-4">
                    <RadarChartSection stats={stats} />
                </div>

                {/* Activity Feed */}
                <div className="col-span-12 md:col-span-6 lg:col-span-4">
                    <GlassCard className="p-6 h-full" hover={false}>
                        <h3 className="text-base font-semibold text-nebula-text mb-4">Hoạt động gần đây</h3>
                        <div className="space-y-1">
                            {activity.length > 0 ? (
                                activity.map((item, i) => <ActivityFeedItem key={item.id} item={item} index={i} />)
                            ) : (
                                <p className="text-sm text-nebula-text-muted text-center py-8">Chưa có hoạt động</p>
                            )}
                        </div>
                    </GlassCard>
                </div>

                {/* System Health Gauges */}
                <div className="col-span-12 md:col-span-6 lg:col-span-4">
                    <GlassCard className="p-6 h-full" hover={false}>
                        <h3 className="text-base font-semibold text-nebula-text mb-6">Sức khỏe hệ thống</h3>
                        <div className="flex justify-around">
                            <CircularGauge
                                value={stats.verifiedDomains}
                                max={stats.totalDomains}
                                label="Domain xác thực"
                                color="#10b981"
                            />
                            <CircularGauge
                                value={stats.totalMessages}
                                max={stats.totalInboxes * 50}
                                label="Dung lượng email"
                                color="#6366f1"
                            />
                        </div>
                    </GlassCard>
                </div>

                {/* Quick Stats */}
                <div className="col-span-12 lg:col-span-4">
                    <GlassCard className="p-6 h-full" hover={false}>
                        <h3 className="text-base font-semibold text-nebula-text mb-4">Thống kê nhanh</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-2 border-b border-nebula-border">
                                <span className="text-sm text-nebula-text-secondary">Quy tắc bảo vệ</span>
                                <span className="font-semibold text-nebula-text">{stats.totalRules}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-nebula-border">
                                <span className="text-sm text-nebula-text-secondary">Báo cáo mở</span>
                                <span className={`font-semibold ${stats.openReports > 0 ? "text-danger" : "text-success"}`}>
                                    {stats.openReports}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-nebula-border">
                                <span className="text-sm text-nebula-text-secondary">Email/Inbox TB</span>
                                <span className="font-semibold text-nebula-text">
                                    {stats.totalInboxes > 0 ? (stats.totalMessages / stats.totalInboxes).toFixed(1) : "0"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-nebula-text-secondary">Tự động làm mới</span>
                                <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full font-medium">
                                    Mỗi 30s
                                </span>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
