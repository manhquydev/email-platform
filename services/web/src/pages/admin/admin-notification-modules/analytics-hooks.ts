/**
 * Analytics Hooks
 * Data fetching for notification analytics dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';

export interface AnalyticsSummary {
    totalSent: number;
    deliveryRate: number;
    acknowledgeRate: number;
    trend: {
        sent: number;
        rate: number;
    };
}

export interface DailyVolume {
    date: string;
    sent: number;
    delivered: number;
    failed: number;
}

export interface ChannelBreakdown {
    channel: string;
    count: number;
    rate: number;
}

export interface FailureReason {
    reason: string;
    count: number;
}

export interface TemplatePerformance {
    templateId: string;
    templateName: string;
    sent: number;
    deliveryRate: number;
    acknowledgeRate: number;
}

export interface NotificationAnalytics {
    summary: AnalyticsSummary;
    dailyVolume: DailyVolume[];
    channelBreakdown: ChannelBreakdown[];
    failureReasons: FailureReason[];
    templatePerformance: TemplatePerformance[];
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export function useNotificationAnalytics(days: number = 7) {
    const { token } = useAuth();
    const [data, setData] = useState<NotificationAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = useCallback(async () => {
        if (!token) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/notifications/admin/analytics?days=${days}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                throw new Error('Failed to fetch analytics');
            }

            const result = await res.json();
            setData(result);
        } catch (err: any) {
            setError(err.message || 'Error fetching analytics');
        } finally {
            setLoading(false);
        }
    }, [token, days]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    return { data, loading, error, refetch: fetchAnalytics };
}
