import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
    Area,
    AreaChart,
    CartesianGrid,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Cell
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { AppShell } from "../layouts/AppShell";
import { Loading } from "../components/Loading";
import { api } from "../utils/api";
import type { Domain, Inbox, Message, PaginatedResponse } from "../types";

// recharts colors are prop-driven (stroke/fill), not CSS-var-inherited — explicit
// light/dark sets mirroring src/styles/{primitives,semantic-tokens}.css values.
const CHART_PALETTE = {
    light: {
        categorical: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"],
        grid: "#EDECE9",
        axis: "#787774",
        line: "#3B82F6",
        tooltipBg: "#FFFFFF",
        tooltipBorder: "#E3E2DE",
        tooltipText: "#37352F",
    },
    dark: {
        categorical: ["#60A5FA", "#34D399", "#FBBF24", "#F87171", "#A78BFA", "#22D3EE"],
        grid: "rgba(255, 255, 255, 0.09)",
        axis: "#D3D1CB",
        line: "#60A5FA",
        tooltipBg: "#202020",
        tooltipBorder: "rgba(255, 255, 255, 0.09)",
        tooltipText: "#FBFBFA",
    },
} as const;

const DASHBOARD_INBOX_PAGE_SIZE = 200;
const DASHBOARD_MAX_INBOX_PAGES = 50;

type InboxListResponse = PaginatedResponse<Inbox> & {
    total?: number;
    meta?: { total?: number };
};

function toDayKey(value: string) {
    return new Date(value).toISOString().slice(5, 10);
}

async function loadAllPersonalInboxes(token: string): Promise<Inbox[]> {
    const allInboxes: Inbox[] = [];
    let offset = 0;
    let total: number | null = null;

    for (let page = 0; page < DASHBOARD_MAX_INBOX_PAGES; page += 1) {
        const response = await api<InboxListResponse>(
            `/inboxes?limit=${DASHBOARD_INBOX_PAGE_SIZE}&offset=${offset}&personal=true`,
            { token }
        );
        const pageData = Array.isArray(response?.data) ? response.data : [];
        allInboxes.push(...pageData);

        const metaTotal = response?.meta?.total;
        const directTotal = typeof response?.total === "number" ? response.total : undefined;
        if (typeof metaTotal === "number") {
            total = metaTotal;
        } else if (typeof directTotal === "number") {
            total = directTotal;
        }

        if (pageData.length === 0) break;
        offset += pageData.length;
        if (total !== null && offset >= total) break;
    }

    const uniqueInboxes = Array.from(
        allInboxes.reduce((map, inbox) => map.set(inbox.id, inbox), new Map<string, Inbox>()).values()
    );
    return total !== null ? uniqueInboxes.slice(0, total) : uniqueInboxes;
}

export function FocusDashboard() {
    const { token } = useAuth();
    const { resolvedTheme } = useTheme();
    const palette = resolvedTheme === "dark" ? CHART_PALETTE.dark : CHART_PALETTE.light;
    const [loading, setLoading] = useState(true);
    const [domains, setDomains] = useState<Domain[]>([]);
    const [inboxes, setInboxes] = useState<Inbox[]>([]);
    const [recentMessages, setRecentMessages] = useState<Message[]>([]);

    useEffect(() => {
        if (!token) return;
        let isMounted = true;

        const loadDashboard = async () => {
            setLoading(true);
            try {
                const [domainRes, loadedInboxes, messageRes] = await Promise.all([
                    api<PaginatedResponse<Domain>>("/domains?limit=200", { token }),
                    loadAllPersonalInboxes(token),
                    api<PaginatedResponse<Message>>("/messages/search?limit=200", { token }),
                ]);

                if (!isMounted) return;
                setDomains(domainRes?.data || []);
                setInboxes(loadedInboxes);
                setRecentMessages(messageRes?.data || []);
            } catch (error) {
                console.error("[FocusDashboard] Failed to load metrics", error);
                toast.error("Không thể tải số liệu dashboard");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadDashboard();
        return () => {
            isMounted = false;
        };
    }, [token]);

    const now = Date.now();
    const stats = useMemo(() => {
        const totalInboxes = inboxes.length;
        const activeInboxes = inboxes.filter((item) => !item.expiresAt || new Date(item.expiresAt).getTime() > now).length;
        const expiringSoon = inboxes.filter((item) => {
            if (!item.expiresAt) return false;
            const expiresAt = new Date(item.expiresAt).getTime();
            return expiresAt > now && expiresAt <= now + 24 * 60 * 60 * 1000;
        }).length;
        const permanentInboxes = inboxes.filter((item) => !item.expiresAt).length;
        const totalMessages = inboxes.reduce((sum, item) => sum + (item._count?.messages ?? 0), 0);
        const unreadMessages = recentMessages.filter((item) => !item.isRead).length;
        return { totalInboxes, activeInboxes, expiringSoon, permanentInboxes, totalMessages, unreadMessages };
    }, [inboxes, recentMessages, now]);

    const domainChartData = useMemo(() => {
        const map = new Map<string, number>();
        for (const inbox of inboxes) {
            const key = inbox.domain?.name ?? "unknown";
            map.set(key, (map.get(key) ?? 0) + 1);
        }
        return Array.from(map.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
    }, [inboxes]);

    const activityData = useMemo(() => {
        const keys: string[] = [];
        for (let offset = 6; offset >= 0; offset -= 1) {
            const day = new Date(now - offset * 24 * 60 * 60 * 1000);
            keys.push(day.toISOString().slice(5, 10));
        }
        const counter = new Map(keys.map((key) => [key, 0]));
        for (const message of recentMessages) {
            const key = toDayKey(message.receivedAt);
            if (counter.has(key)) counter.set(key, (counter.get(key) ?? 0) + 1);
        }
        return keys.map((day) => ({ day, messages: counter.get(day) ?? 0 }));
    }, [recentMessages, now]);

    const recentInboxes = useMemo(() => inboxes.slice(0, 6), [inboxes]);

    return (
        <AppShell>
            <div className="p-4 sm:p-6 lg:p-8 pb-24 space-y-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="rounded-2xl border border-semantic-border bg-semantic-accent-subtle p-6">
                        <p className="text-xs uppercase tracking-[0.2em] text-semantic-text-secondary mb-2">Dashboard</p>
                        <h1 className="text-2xl sm:text-3xl font-bold text-semantic-text-main mb-2">Tổng quan hệ thống email của bạn</h1>
                        <p className="text-semantic-text-secondary">Theo dõi số lượng inbox, lưu lượng email và trạng thái hoạt động trong một màn hình.</p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loading />
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                                <MetricCard label="Inbox" value={stats.totalInboxes} />
                                <MetricCard label="Đang hoạt động" value={stats.activeInboxes} />
                                <MetricCard label="Sắp hết hạn" value={stats.expiringSoon} />
                                <MetricCard label="Vĩnh viễn" value={stats.permanentInboxes} />
                                <MetricCard label="Tổng email" value={stats.totalMessages} />
                                <MetricCard label="Chưa đọc" value={stats.unreadMessages} />
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                                <div className="xl:col-span-2 rounded-2xl border border-semantic-border bg-semantic-bg-elevated p-4">
                                    <h2 className="text-sm font-semibold text-semantic-text-main mb-3">Lưu lượng email 7 ngày gần nhất</h2>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={activityData}>
                                                <defs>
                                                    <linearGradient id="dashboardMessages" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={palette.line} stopOpacity={0.6} />
                                                        <stop offset="95%" stopColor={palette.line} stopOpacity={0.05} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                                                <XAxis dataKey="day" stroke={palette.axis} />
                                                <YAxis stroke={palette.axis} allowDecimals={false} />
                                                <Tooltip
                                                    contentStyle={{
                                                        background: palette.tooltipBg,
                                                        border: `1px solid ${palette.tooltipBorder}`,
                                                        borderRadius: 8,
                                                        color: palette.tooltipText,
                                                    }}
                                                    labelStyle={{ color: palette.tooltipText }}
                                                />
                                                <Area dataKey="messages" type="monotone" stroke={palette.line} fill="url(#dashboardMessages)" strokeWidth={2} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-semantic-border bg-semantic-bg-elevated p-4">
                                    <h2 className="text-sm font-semibold text-semantic-text-main mb-3">Phân bổ inbox theo domain</h2>
                                    <div className="h-64">
                                        {domainChartData.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-semantic-text-secondary text-sm">Chưa có dữ liệu domain</div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={domainChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={78}>
                                                        {domainChartData.map((entry, index) => (
                                                            <Cell key={entry.name} fill={palette.categorical[index % palette.categorical.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{
                                                            background: palette.tooltipBg,
                                                            border: `1px solid ${palette.tooltipBorder}`,
                                                            borderRadius: 8,
                                                            color: palette.tooltipText,
                                                        }}
                                                        labelStyle={{ color: palette.tooltipText }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="rounded-2xl border border-semantic-border bg-semantic-bg-elevated p-4 lg:col-span-2">
                                    <h2 className="text-sm font-semibold text-semantic-text-main mb-3">Inbox tạo gần đây</h2>
                                    <div className="space-y-2">
                                        {recentInboxes.length === 0 ? (
                                            <p className="text-sm text-semantic-text-secondary">Bạn chưa tạo inbox nào.</p>
                                        ) : (
                                            recentInboxes.map((inbox) => (
                                                <div key={inbox.id} className="rounded-lg border border-semantic-border bg-semantic-bg-primary px-3 py-2 flex items-center justify-between gap-2">
                                                    <span className="text-sm text-semantic-text-main truncate">{inbox.localPart}@{inbox.domain?.name}</span>
                                                    <span className="text-xs text-semantic-text-secondary">{inbox._count?.messages ?? 0} email</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-semantic-border bg-semantic-bg-elevated p-4">
                                    <h2 className="text-sm font-semibold text-semantic-text-main mb-3">Thao tác nhanh</h2>
                                    <div className="grid grid-cols-1 gap-2">
                                        <ActionLink to="/app/manager" label="Mở quản lý inbox" />
                                        <ActionLink to="/my-domains" label="Quản lý domain" />
                                        <ActionLink to="/settings" label="Cài đặt tài khoản" />
                                    </div>
                                    <p className="text-xs text-semantic-text-secondary mt-3">{domains.filter((d) => d.status === "VERIFIED").length} domain đã xác thực</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AppShell>
    );
}

function MetricCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-semantic-border bg-semantic-bg-elevated px-3 py-4">
            <p className="text-xs text-semantic-text-secondary uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-semantic-text-main mt-1">{value.toLocaleString("vi-VN")}</p>
        </div>
    );
}

function ActionLink({ to, label }: { to: string; label: string }) {
    return (
        <Link
            to={to}
            className="rounded-lg border border-semantic-border hover:border-semantic-accent/40 bg-semantic-bg-primary hover:bg-semantic-accent-subtle text-sm text-semantic-text-main px-3 py-2 transition-colors"
        >
            {label}
        </Link>
    );
}
