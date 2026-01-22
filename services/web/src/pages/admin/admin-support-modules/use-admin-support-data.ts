/**
 * Admin Support Data Hooks
 */

import { useState, useEffect, useCallback } from "react";
import { adminSupportService } from "./admin-support-service";
import type { SupportTicket, AdminTicketFilters, TicketStats } from "./types";

export function useAdminTickets(initialFilters?: AdminTicketFilters) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AdminTicketFilters>(initialFilters || {});

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminSupportService.getTickets(filters);
      setTickets(response.data);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateFilters = (newFilters: Partial<AdminTicketFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: newFilters.page ?? 0 }));
  };

  return { tickets, total, loading, error, filters, updateFilters, refresh };
}

export function useAdminTicket(id: string | undefined) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await adminSupportService.getTicket(id);
      setTicket(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateTicket = async (updates: { status?: string; priority?: string }) => {
    if (!id) return;
    setUpdating(true);
    try {
      const updated = await adminSupportService.updateTicket(id, updates);
      setTicket(updated);
    } finally {
      setUpdating(false);
    }
  };

  const sendMessage = async (content: string, isInternal = false) => {
    if (!id) return;
    setUpdating(true);
    try {
      await adminSupportService.sendMessage(id, { content, isInternal });
      await refresh();
    } finally {
      setUpdating(false);
    }
  };

  return { ticket, loading, error, updating, refresh, updateTicket, sendMessage };
}

export function useTicketStats() {
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminSupportService.getStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}
