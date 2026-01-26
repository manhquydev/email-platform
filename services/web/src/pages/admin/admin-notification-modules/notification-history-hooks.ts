/**
 * Hooks for notification history management
 */
import { useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';

export interface NotificationLog {
  id: string;
  notificationId: string;
  channel: 'WEB' | 'TELEGRAM' | 'PUSH';
  status: 'PENDING' | 'SENT' | 'FAILED';
  errorMessage?: string;
  sentAt: string;
  acknowledgedAt?: string;
}

export interface NotificationHistoryItem {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'PROMOTION';
  imageUrl?: string;
  isRead: boolean;
  createdAt: string;
  userId: string;
  templateId?: string;
  logs?: NotificationLog[];
}

export interface HistoryFilters {
  status: string[];
  type: string[];
  channel: string[];
  dateFrom?: string;
  dateTo?: string;
  search: string;
}

export interface HistoryResponse {
  logs: NotificationHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface LogStats {
  total: number;
  byStatus: Record<string, number>;
  byChannel: Record<string, number>;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Hook for fetching notification history with filters
 */
export function useNotificationHistory() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (
    filters: HistoryFilters,
    page = 1,
    limit = 20
  ) => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (filters.search) params.set('search', filters.search);
      if (filters.status.length) params.set('status', filters.status.join(','));
      if (filters.type.length) params.set('type', filters.type.join(','));
      if (filters.channel.length) params.set('channel', filters.channel.join(','));
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);

      const res = await fetch(`${API_BASE}/admin/notifications/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch logs');
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  return { data, loading, error, fetchHistory };
}

/**
 * Hook for fetching notification detail with logs
 */
export function useNotificationDetail() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<NotificationHistoryItem | null>(null);

  const fetchDetail = useCallback(async (id: string) => {
    if (!token || !id) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/admin/notifications/logs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch detail');
      const json = await res.json();
      setDetail(json.log);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  return { detail, loading, fetchDetail, setDetail };
}

/**
 * Hook for resending failed notifications
 */
export function useResendNotification() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const resend = useCallback(async (logId: string): Promise<boolean> => {
    if (!token) return false;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/admin/notifications/logs/${logId}/resend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [token]);

  return { resend, loading };
}

/**
 * Hook for fetching log statistics
 */
export function useLogStats() {
  const { token } = useAuth();
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/admin/notifications/logs/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      const json = await res.json();
      setStats(json);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  return { stats, loading, fetchStats };
}

/**
 * Export logs to CSV
 */
export function useExportLogs() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const exportCSV = useCallback(async (filters: HistoryFilters) => {
    if (!token) return;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status.length) params.set('status', filters.status.join(','));
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);

      const res = await fetch(`${API_BASE}/admin/notifications/logs?${params}&limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to export');
      const json = await res.json();

      // Convert to CSV
      const rows = json.logs || [];
      if (!rows.length) return;

      const headers = ['ID', 'Title', 'Type', 'Channel', 'Status', 'Sent At', 'Error'];
      const csvContent = [
        headers.join(','),
        ...rows.map((r: any) => [
          r.id,
          `"${(r.title || '').replace(/"/g, '""')}"`,
          r.type,
          r.channel || 'WEB',
          r.status || 'SENT',
          r.createdAt,
          `"${(r.errorMessage || '').replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notification-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  return { exportCSV, loading };
}
