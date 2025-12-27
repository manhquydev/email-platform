import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import {
    Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ComposedChart, Line
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface Stats {
    totalUsers: number;
    totalDomains: number;
    verifiedDomains: number;
    totalInboxes: number;
    totalMessages: number;
    totalRules: number;
    openReports: number;
}

interface TrendData {
    current: number;
    previous: number;
    trend: number;
}

interface Trends {
    users: TrendData;
    emails: TrendData;
    inboxes: TrendData;
    domains: TrendData;
}

interface ActivityItem {
    id: string;
    action: string;
    createdAt: string;
    user: { email: string } | null;
    meta: Record<string, unknown> | null;
}

interface TimeSeriesData {
    date: string;
    emails: number;
    users: number;
    inboxes: number;
}

const AUTO_REFRESH_INTERVAL = 30000;

// Count-up animation hook
function useCountUp(end: number, duration: number = 1000) {
    const [count, setCount] = useState(0);
    const countRef = useRef(0);
    const startTime = useRef(0);

    useEffect(() => {
        if (end === 0) {
            setCount(0);
            return;
        }

        const startValue = countRef.current;
        startTime.current = Date.now();

        const animate = () => {
            const now = Date.now();
            const progress = Math.min((now - startTime.current) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(startValue + (end - startValue) * easeOut);

            setCount(current);
            countRef.current = current;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setCount(end);
                countRef.current = end;
            }
        };

        requestAnimationFrame(animate);
    }, [end, duration]);

    return count;
}

// Glassmorphism Card Component - using Ephemera CSS variables
function GlassCard({ children, className = "", hover = true }: {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
}) {
    return (
        <div
            className={`
                glass-card-elevated relative overflow-hidden
                ${hover ? "transition-all duration-300 hover:shadow-xl hover:scale-[1.01]" : ""}
                ${className}
            `}
            style={{
                background: 'var(--neo-glass-bg-medium)',
                backdropFilter: 'var(--neo-glass-blur-medium)',
                border: '1px solid var(--neo-glass-border)',
                borderRadius: 'var(--nebula-radius-xl)',
                boxShadow: 'var(--neo-shadow-float)'
            }}
        >
            {children}
        </div>
    );
}


// Stat Card with Sparkline
function StatCard({ label, value, trend, icon, color, delay = 0 }: {
    label: string;
    value: number;
    trend?: number;
    icon: React.ReactNode;
    color: string;
    delay?: number;
}) {
    const animatedValue = useCountUp(value, 1200);

    return (
        <GlassCard className={`p-5 animate-fade-in-up delay-${delay}`}>
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
                    <span className="text-white">{icon}</span>
                </div>
                {trend !== undefined && trend !== 0 && (
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trend > 0
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                        {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                {animatedValue.toLocaleString()}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">{label}</div>
        </GlassCard>
    );
}

// Circular Progress Gauge
function CircularGauge({ value, max, label, color }: {
    value: number;
    max: number;
    label: string;
    color: string;
}) {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-28 h-28">
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="56"
                        cy="56"
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-border"
                    />
                    <circle
                        cx="56"
                        cy="56"
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-slate-800 dark:text-white">{Math.round(percentage)}%</span>
                </div>
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-medium">{label}</span>
        </div>
    );
}

// Activity Feed Item with Animation
function ActivityFeedItem({ item, index }: { item: ActivityItem; index: number }) {
    const actionLabels: Record<string, { label: string; color: string }> = {
        USER_REGISTERED: { label: "Đăng ký mới", color: "bg-blue-500" },
        LOGIN: { label: "Đăng nhập", color: "bg-green-500" },
        DOMAIN_CREATED: { label: "Tạo domain", color: "bg-purple-500" },
        INBOX_CREATED: { label: "Tạo inbox", color: "bg-indigo-500" },
        MESSAGE_DELETED: { label: "Xóa email", color: "bg-red-500" },
        ABUSE_REPORTED: { label: "Báo cáo", color: "bg-amber-500" },
    };

    const action = actionLabels[item.action] || { label: item.action, color: "bg-gray-500" };

    return (
        <div
            className="flex items-center gap-3 py-3 last:border-0 animate-fade-in-up"
            style={{ animationDelay: `${index * 100}ms`, borderBottom: '1px solid var(--nebula-border-subtle)' } as React.CSSProperties}
        >
            <div className={`w-2.5 h-2.5 rounded-full ${action.color} ring-4 ring-opacity-20 ring-current flex-shrink-0`} />
            <div className="flex-1 min-w-0">
                <span className="text-sm font-medium" style={{ color: 'var(--nebula-text)' }}>{action.label}</span>
                {item.user && (
                    <span className="text-xs ml-2 truncate" style={{ color: 'var(--nebula-text-muted)' }}>
                        {item.user.email}
                    </span>
                )}
            </div>
            <span className="text-xs flex-shrink-0" style={{ color: 'var(--nebula-text-muted)' }}>
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: vi })}
            </span>
        </div>
    );
}

interface RevenueStats {
    totalRevenue: number;
    mrr: number;
    activeSubscribers: number;
}

export function AdminDashboard({ token }: { token: string }) {
    const [stats, setStats] = useState<Stats | null>(null);
    const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
    const [trends, setTrends] = useState<Trends | null>(null);
    const [timeseries, setTimeseries] = useState<TimeSeriesData[]>([]);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadStats = useCallback(async (showToast = false) => {
        try {
            const [statsRes, timeseriesRes, trendsRes, activityRes, revenueRes] = await Promise.all([
                api<{ stats: Stats }>("/admin/stats", { token }),
                api<{ data: TimeSeriesData[] }>("/admin/stats/timeseries", { token }),
                api<{ trends: Trends }>("/admin/stats/trends", { token }),
                api<{ activity: ActivityItem[] }>("/admin/activity?limit=5", { token }),
                api<RevenueStats>("/admin/stats/revenue", { token }).catch(() => null), // Fail gracefully if endpoint not ready
            ]);
            setStats(statsRes.stats);
            setTimeseries(timeseriesRes.data);
            setTrends(trendsRes.trends);
            setActivity(activityRes.activity);
            if (revenueRes) setRevenueStats(revenueRes);

            setLastUpdated(new Date());
            if (showToast) toast.success("Đã cập nhật thống kê");
        } catch (err) {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadStats();
        refreshIntervalRef.current = setInterval(() => loadStats(), AUTO_REFRESH_INTERVAL);
        return () => {
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
        };
    }, [loadStats]);

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

    // Radar chart data
    const radarData = [
        { metric: "Users", value: stats.totalUsers, fullMark: Math.max(stats.totalUsers * 1.5, 100) },
        { metric: "Domains", value: stats.totalDomains, fullMark: Math.max(stats.totalDomains * 1.5, 50) },
        { metric: "Inboxes", value: stats.totalInboxes, fullMark: Math.max(stats.totalInboxes * 1.5, 100) },
        { metric: "Emails", value: stats.totalMessages, fullMark: Math.max(stats.totalMessages * 1.5, 500) },
        { metric: "Rules", value: stats.totalRules, fullMark: Math.max(stats.totalRules * 1.5, 50) },
    ];

    const statCards = [
        { label: "Người dùng", value: stats.totalUsers, trend: trends?.users.trend, color: "from-blue-500 to-blue-600", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg> },
        { label: "Tên miền", value: stats.verifiedDomains, trend: trends?.domains.trend, color: "from-emerald-500 to-emerald-600", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" /></svg> },
        { label: "Hộp thư", value: stats.totalInboxes, trend: trends?.inboxes.trend, color: "from-violet-500 to-violet-600", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg> },
        { label: "Email", value: stats.totalMessages, trend: trends?.emails.trend, color: "from-indigo-500 to-indigo-600", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51" /></svg> },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--nebula-text)' }}>
                        Tổng quan hệ thống
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--nebula-text-muted)' }}>Thống kê realtime Dashboard</p>
                </div>
                <div className="flex items-center gap-4">
                    {lastUpdated && (
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--nebula-text-muted)' }}>
                            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--nebula-success)' }} />
                            Cập nhật: {lastUpdated.toLocaleTimeString("vi-VN")}
                        </div>
                    )}
                    <button
                        onClick={() => loadStats(true)}
                        className="btn-nebula-secondary flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        Làm mới
                    </button>
                </div>
            </div>

            {/* Revenue Overview */}
            {revenueStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <GlassCard className="p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Tổng doanh thu</h3>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(revenueStats.totalRevenue)}
                        </div>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                            </div>
                            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Doanh thu định kỳ (MRR)</h3>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(revenueStats.mrr)} <span className="text-xs text-slate-400 font-normal">/tháng (ước tính)</span>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                            </div>
                            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Thuê bao kích hoạt</h3>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {revenueStats.activeSubscribers} <span className="text-xs text-slate-400 font-normal">users</span>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-12 gap-4">
                {/* Stats Cards - Row 1 */}
                {statCards.map((card, i) => (
                    <div key={i} className="col-span-6 md:col-span-3">
                        <StatCard {...card} delay={i * 100} />
                    </div>
                ))}

                {/* Hero Chart - 2x2 equivalent */}
                <div className="col-span-12 lg:col-span-8">
                    <GlassCard className="p-6" hover={false}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold text-slate-800 dark:text-white">Xu hướng hoạt động (7 ngày)</h3>
                            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500" /> Email</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Users</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" /> Inboxes</span>
                            </div>
                        </div>
                        <div className="h-72 min-h-[300px] w-full block relative" style={{ minHeight: '300px' }}>
                            <ResponsiveContainer width="99%" height="100%">
                                <ComposedChart data={timeseries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorEmailsGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 11 }}
                                        tickFormatter={(val) => new Date(val).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                                        stroke="var(--color-text-muted)"
                                    />
                                    <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" />
                                    <Tooltip
                                        contentStyle={{
                                            background: "var(--glass-bg)",
                                            backdropFilter: "blur(12px)",
                                            border: "1px solid var(--color-border)",
                                            borderRadius: "12px",
                                            fontSize: "12px",
                                        }}
                                        labelFormatter={(val) => new Date(val).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" })}
                                    />
                                    <Area type="monotone" dataKey="emails" stroke="#6366f1" strokeWidth={2} fill="url(#colorEmailsGrad)" name="Email" />
                                    <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} dot={false} name="Users" />
                                    <Bar dataKey="inboxes" fill="#f59e0b" radius={[4, 4, 0, 0]} opacity={0.6} name="Inboxes" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>
                </div>

                {/* Radar Chart */}
                <div className="col-span-12 lg:col-span-4">
                    <GlassCard className="p-6 h-full" hover={false}>
                        <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4">Phân tích đa chiều</h3>
                        <div className="h-64 relative" style={{ minHeight: '250px' }}>
                            <ResponsiveContainer width="99%" height="100%">
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="var(--color-border)" />
                                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" />
                                    <PolarRadiusAxis tick={{ fontSize: 10 }} stroke="var(--color-text-muted)" />
                                    <Radar
                                        name="Metrics"
                                        dataKey="value"
                                        stroke="#8b5cf6"
                                        fill="#8b5cf6"
                                        fillOpacity={0.3}
                                        strokeWidth={2}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>
                </div>

                {/* Activity Feed */}
                <div className="col-span-12 md:col-span-6 lg:col-span-4">
                    <GlassCard className="p-6 h-full" hover={false}>
                        <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4">Hoạt động gần đây</h3>
                        <div className="space-y-1">
                            {activity.length > 0 ? (
                                activity.map((item, i) => <ActivityFeedItem key={item.id} item={item} index={i} />)
                            ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">Chưa có hoạt động</p>
                            )}
                        </div>
                    </GlassCard>
                </div>

                {/* System Health Gauges */}
                <div className="col-span-12 md:col-span-6 lg:col-span-4">
                    <GlassCard className="p-6 h-full" hover={false}>
                        <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-6">Sức khỏe hệ thống</h3>
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
                        <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4">Thống kê nhanh</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-600/50">
                                <span className="text-sm text-slate-600 dark:text-slate-300">Quy tắc bảo vệ</span>
                                <span className="font-semibold text-slate-800 dark:text-white">{stats.totalRules}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-600/50">
                                <span className="text-sm text-slate-600 dark:text-slate-300">Báo cáo mở</span>
                                <span className={`font-semibold ${stats.openReports > 0 ? "text-red-500" : "text-green-500"}`}>
                                    {stats.openReports}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-600/50">
                                <span className="text-sm text-slate-600 dark:text-slate-300">Email/Inbox TB</span>
                                <span className="font-semibold text-slate-800 dark:text-white">
                                    {stats.totalInboxes > 0 ? (stats.totalMessages / stats.totalInboxes).toFixed(1) : "0"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-slate-600 dark:text-slate-300">Tự động làm mới</span>
                                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 rounded-full font-medium">
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
