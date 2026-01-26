/**
 * Hooks for scheduled notification management
 */
import { useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';

export interface ScheduledNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'PROMOTION';
  targetMode: 'SPECIFIC' | 'ALL' | 'SEGMENT';
  targetUserId?: string;
  templateId?: string;
  imageUrl?: string;
  scheduledFor: string;
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'FAILED';
  executedAt?: string;
  createdAt: string;
  createdBy: string;
  template?: { name: string };
}

export interface SchedulePayload {
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'PROMOTION';
  targetMode: 'SPECIFIC' | 'ALL' | 'SEGMENT';
  targetUserId?: string;
  templateId?: string;
  imageUrl?: string;
  scheduledFor: string;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Hook for listing scheduled notifications
 */
export function useScheduledNotifications() {
  const { token } = useAuth();
  const [items, setItems] = useState<ScheduledNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScheduled = useCallback(async (status?: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const params = status ? `?status=${status}` : '';
      const res = await fetch(`${API_BASE}/notifications/admin/scheduled${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch scheduled notifications');
      const json = await res.json();
      setItems(json.items || []);
      setTotal(json.total || 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  return { items, total, loading, error, fetchScheduled };
}

/**
 * Hook for scheduled notification actions
 */
export function useScheduleActions() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const createScheduled = useCallback(async (payload: SchedulePayload): Promise<ScheduledNotification | null> => {
    if (!token) return null;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/notifications/admin/schedule`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create scheduled notification');
      }
      const json = await res.json();
      return json.scheduled;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const updateScheduled = useCallback(async (id: string, payload: Partial<SchedulePayload>): Promise<boolean> => {
    if (!token) return false;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/notifications/admin/scheduled/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const cancelScheduled = useCallback(async (id: string): Promise<boolean> => {
    if (!token) return false;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/notifications/admin/scheduled/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [token]);

  return { createScheduled, updateScheduled, cancelScheduled, loading };
}
