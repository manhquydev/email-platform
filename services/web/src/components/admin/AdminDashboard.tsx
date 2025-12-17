import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../../utils/api";
import toast from "react-hot-toast";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

interface Stats {
    totalUsers: number;
    totalDomains: number;
    verifiedDomains: number;
    totalInboxes: number;
    totalMessages: number;
    totalRules: number;
    openReports: number;
}

interface TimeSeriesData {
    date: string;
    emails: number;
    users: number;
    inboxes: number;
}

interface StatCard {
    label: string;
    value: number | string;
    subLabel?: string;
    color: string;
    icon: React.ReactNode;
}

const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds
const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#0ea5e9"];

export function AdminDashboard({ token }: { token: string }) {
    const [stats, setStats] = useState<Stats | null>(null);
    const [timeseries, setTimeseries] = useState<TimeSeriesData[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadStats = useCallback(async (showToast = false) => {
        try {
            const [statsRes, timeseriesRes] = await Promise.all([
                api<{ stats: Stats }>("/admin/stats", { token }),
                api<{ data: TimeSeriesData[] }>("/admin/stats/timeseries", { token })
            ]);
            setStats(statsRes.stats);
            setTimeseries(timeseriesRes.data);
            setLastUpdated(new Date());
            if (showToast) toast.success("Đã cập nhật thống kê");
        } catch (err) {
            toast.error("Không thể tải thống kê");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadStats();

        // Auto-refresh every 30 seconds
        refreshIntervalRef.current = setInterval(() => {
            loadStats();
        }, AUTO_REFRESH_INTERVAL);

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, [loadStats]);

    const handleManualRefresh = () => {
        loadStats(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!stats) {
        return <div className="text-muted text-center p-8">Không có dữ liệu</div>;
    }

    const cards: StatCard[] = [
        {
            label: "Người dùng",
            value: stats.totalUsers,
            color: "border-l-blue-500",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
            )
        },
        {
            label: "Tên miền",
            value: stats.verifiedDomains,
            subLabel: `/ ${stats.totalDomains} tổng`,
            color: "border-l-green-500",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
            )
        },
        {
            label: "Hộp thư",
            value: stats.totalInboxes,
            color: "border-l-purple-500",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
            )
        },
        {
            label: "Email",
            value: stats.totalMessages,
            color: "border-l-indigo-500",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
                </svg>
            )
        },
        {
            label: "Quy tắc",
            value: stats.totalRules,
            color: "border-l-amber-500",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
            )
        },
        {
            label: "Báo cáo mở",
            value: stats.openReports,
            color: stats.openReports > 0 ? "border-l-red-500" : "border-l-gray-400",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
                </svg>
            )
        },
    ];

    return (
        <div className="p-6 max-w-5xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold">Tổng quan</h1>
                    <p className="text-sm text-muted mt-1">Thống kê hệ thống</p>
                </div>
                <div className="flex items-center gap-4">
                    {lastUpdated && (
                        <span className="text-xs text-muted">
                            Cập nhật: {lastUpdated.toLocaleTimeString("vi-VN")}
                        </span>
                    )}
                    <button
                        onClick={handleManualRefresh}
                        className="text-sm px-3 py-1.5 border border-border rounded-md hover:bg-bg"
                    >
                        ↻ Làm mới
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {cards.map((card, i) => (
                    <div
                        key={i}
                        className={`bg-surface border border-border border-l-4 ${card.color} rounded-lg p-4`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-muted">{card.icon}</span>
                        </div>
                        <div className="text-2xl font-bold text-text-main">
                            {card.value}
                            {card.subLabel && <span className="text-sm font-normal text-muted">{card.subLabel}</span>}
                        </div>
                        <div className="text-xs text-muted mt-1">{card.label}</div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Email Activity Chart - 7 days */}
                <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-5">
                    <h3 className="text-sm font-medium mb-4">Hoạt động email (7 ngày)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorEmails" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                    stroke="var(--color-text-muted)"
                                />
                                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--color-surface)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                    labelFormatter={(val) => new Date(val).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="emails"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorEmails)"
                                    name="Email nhận được"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Domain Status Pie Chart */}
                <div className="bg-surface border border-border rounded-lg p-5">
                    <h3 className="text-sm font-medium mb-4">Trạng thái tên miền</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Đã xác thực', value: stats.verifiedDomains },
                                        { name: 'Chờ xác thực', value: stats.totalDomains - stats.verifiedDomains },
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    <Cell fill={CHART_COLORS[1]} />
                                    <Cell fill={CHART_COLORS[2]} />
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Activity Bar Chart */}
            <div className="mt-4 bg-surface border border-border rounded-lg p-5">
                <h3 className="text-sm font-medium mb-4">Hoạt động theo ngày</h3>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={timeseries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 11 }}
                                tickFormatter={(val) => new Date(val).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                stroke="var(--color-text-muted)"
                            />
                            <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" />
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--color-surface)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    fontSize: '12px'
                                }}
                            />
                            <Bar dataKey="emails" fill="#6366f1" radius={[4, 4, 0, 0]} name="Email" />
                            <Bar dataKey="users" fill="#22c55e" radius={[4, 4, 0, 0]} name="Users" />
                            <Bar dataKey="inboxes" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Inboxes" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-surface border border-border rounded-lg p-5">
                    <h3 className="text-sm font-medium mb-3">Hướng dẫn nhanh</h3>
                    <ul className="text-sm text-muted space-y-2">
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            <strong>Người dùng:</strong> Quản lý tài khoản và phân quyền
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <strong>Quy tắc bảo vệ:</strong> Thiết lập chặn/cho phép email
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            <strong>Báo cáo:</strong> Xử lý các vấn đề vi phạm
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            <strong>Nhật ký:</strong> Theo dõi hoạt động hệ thống
                        </li>
                    </ul>
                </div>

                <div className="bg-surface border border-border rounded-lg p-5">
                    <h3 className="text-sm font-medium mb-3">Thông tin hệ thống</h3>
                    <ul className="text-sm text-muted space-y-2">
                        <li className="flex items-center justify-between">
                            <span>Tự động làm mới</span>
                            <span className="text-green-600 text-xs">Mỗi 30 giây</span>
                        </li>
                        <li className="flex items-center justify-between">
                            <span>Tỷ lệ domain xác thực</span>
                            <span className="text-xs font-medium">
                                {stats.totalDomains > 0
                                    ? `${Math.round((stats.verifiedDomains / stats.totalDomains) * 100)}%`
                                    : "N/A"
                                }
                            </span>
                        </li>
                        <li className="flex items-center justify-between">
                            <span>Email/Hộp thư trung bình</span>
                            <span className="text-xs font-medium">
                                {stats.totalInboxes > 0
                                    ? (stats.totalMessages / stats.totalInboxes).toFixed(1)
                                    : "0"
                                }
                            </span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
