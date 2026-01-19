/**
 * Hook for AdminDashboard data loading
 * Handles stats, trends, timeseries, activity, and revenue data
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../../../utils/api";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import toast from "react-hot-toast";
import type { Stats, Trends, TimeSeriesData, ActivityItem, RevenueStats } from "./types";
import { AUTO_REFRESH_INTERVAL } from "./types";

export interface UseAdminDashboardDataReturn {
    stats: Stats | null;
    revenueStats: RevenueStats | null;
    trends: Trends | null;
    timeseries: TimeSeriesData[];
    activity: ActivityItem[];
    loading: boolean;
    lastUpdated: Date | null;
    loadStats: (showToast?: boolean) => Promise<void>;
}

export function useAdminDashboardData(token: string): UseAdminDashboardDataReturn {
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
                api<RevenueStats>("/admin/stats/revenue", { token }).catch(() => null),
            ]);
            setStats(statsRes.stats);
            setTimeseries(timeseriesRes.data);
            setTrends(trendsRes.trends);
            setActivity(activityRes.activity);
            if (revenueRes) setRevenueStats(revenueRes);

            setLastUpdated(new Date());
            if (showToast) toast.success("Đã cập nhật thống kê");
        } catch (err) {
            console.error('[AdminDashboard] Load stats failed:', err);
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

    return {
        stats,
        revenueStats,
        trends,
        timeseries,
        activity,
        loading,
        lastUpdated,
        loadStats
    };
}
