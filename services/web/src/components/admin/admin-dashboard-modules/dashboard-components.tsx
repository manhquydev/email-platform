/**
 * Reusable UI components for AdminDashboard
 * GlassCard, StatCard, CircularGauge, ActivityFeedItem
 */
import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import type { ActivityItem } from "./types";

// Count-up animation hook
// eslint-disable-next-line react-refresh/only-export-components
export function useCountUp(end: number, duration: number = 1000) {
    const [count, setCount] = useState(0);
    const countRef = useRef(0);
    const startTime = useRef(0);

    useEffect(() => {
        if (end === 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
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

// Glassmorphism Card Component
export function GlassCard({ children, className = "", hover = true }: {
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

// Stat Card with animated value
export function StatCard({ label, value, trend, icon, color, delay = 0 }: {
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
                        ? "bg-success/10 text-success"
                        : "bg-danger/10 text-danger"
                        }`}>
                        {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <div className="text-3xl font-bold text-nebula-text tracking-tight">
                {animatedValue.toLocaleString()}
            </div>
            <div className="text-sm text-nebula-text-secondary mt-1 font-medium">{label}</div>
        </GlassCard>
    );
}

// Circular Progress Gauge
export function CircularGauge({ value, max, label, color }: {
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
                    <span className="text-2xl font-bold text-nebula-text">{Math.round(percentage)}%</span>
                </div>
            </div>
            <span className="text-xs text-nebula-text-secondary mt-2 font-medium">{label}</span>
        </div>
    );
}

// Activity Feed Item with Animation
const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    USER_REGISTERED: { label: "Đăng ký mới", color: "bg-info" },
    LOGIN: { label: "Đăng nhập", color: "bg-success" },
    DOMAIN_CREATED: { label: "Tạo domain", color: "bg-nebula-violet" },
    INBOX_CREATED: { label: "Tạo inbox", color: "bg-primary" },
    MESSAGE_DELETED: { label: "Xóa email", color: "bg-danger" },
    ABUSE_REPORTED: { label: "Báo cáo", color: "bg-warning" },
};

export function ActivityFeedItem({ item, index }: { item: ActivityItem; index: number }) {
    const action = ACTION_LABELS[item.action] || { label: item.action, color: "bg-nebula-text-muted" };

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

/** Dashboard Header with refresh button */
export function DashboardHeader({ lastUpdated, onRefresh }: { lastUpdated: Date | null; onRefresh: () => void }) {
    return (
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
                <button onClick={onRefresh} className="btn-nebula-secondary flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Làm mới
                </button>
            </div>
        </div>
    );
}

/** Revenue Overview cards */
import type { RevenueStats } from "./types";

export function RevenueOverview({ revenueStats }: { revenueStats: RevenueStats }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-success/10 text-success">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 className="text-sm font-medium text-nebula-text-muted">Tổng doanh thu</h3>
                </div>
                <div className="text-2xl font-bold text-nebula-text">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(revenueStats.totalRevenue)}
                </div>
            </GlassCard>

            <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-info/10 text-info">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                    </div>
                    <h3 className="text-sm font-medium text-nebula-text-muted">Doanh thu định kỳ (MRR)</h3>
                </div>
                <div className="text-2xl font-bold text-nebula-text">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(revenueStats.mrr)} <span className="text-xs text-nebula-text-muted font-normal">/tháng (ước tính)</span>
                </div>
            </GlassCard>

            <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-nebula-violet/10 text-nebula-violet">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                    </div>
                    <h3 className="text-sm font-medium text-nebula-text-muted">Thuê bao kích hoạt</h3>
                </div>
                <div className="text-2xl font-bold text-nebula-text">
                    {revenueStats.activeSubscribers} <span className="text-xs text-nebula-text-muted font-normal">users</span>
                </div>
            </GlassCard>
        </div>
    );
}
