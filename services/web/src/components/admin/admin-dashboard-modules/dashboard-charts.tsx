/**
 * Chart components for AdminDashboard
 * Activity Chart, Radar Chart sections
 */
import {
    Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ComposedChart, Line
} from "recharts";
import { GlassCard } from "./dashboard-components";
import type { TimeSeriesData, Stats } from "./types";

interface ActivityChartProps {
    timeseries: TimeSeriesData[];
}

export function ActivityChart({ timeseries }: ActivityChartProps) {
    return (
        <GlassCard className="p-6" hover={false}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-nebula-text">Xu hướng hoạt động (7 ngày)</h3>
                <div className="flex items-center gap-4 text-xs text-nebula-text-secondary">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500" /> Email</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Users</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" /> Inboxes</span>
                </div>
            </div>
            <div className="h-72 w-full relative" style={{ minHeight: '300px', display: 'block', minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
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
    );
}

interface RadarChartSectionProps {
    stats: Stats;
}

export function RadarChartSection({ stats }: RadarChartSectionProps) {
    const radarData = [
        { metric: "Users", value: stats.totalUsers, fullMark: Math.max(stats.totalUsers * 1.5, 100) },
        { metric: "Domains", value: stats.totalDomains, fullMark: Math.max(stats.totalDomains * 1.5, 50) },
        { metric: "Inboxes", value: stats.totalInboxes, fullMark: Math.max(stats.totalInboxes * 1.5, 100) },
        { metric: "Emails", value: stats.totalMessages, fullMark: Math.max(stats.totalMessages * 1.5, 500) },
        { metric: "Rules", value: stats.totalRules, fullMark: Math.max(stats.totalRules * 1.5, 50) },
    ];

    return (
        <GlassCard className="p-6 h-full" hover={false}>
            <h3 className="text-base font-semibold text-nebula-text mb-4">Phân tích đa chiều</h3>
            <div className="h-64 w-full relative" style={{ minHeight: '250px', display: 'block', minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
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
    );
}
