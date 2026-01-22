/**
 * Support Data Hooks
 */

import { useState, useEffect, useCallback } from "react";
import { supportService } from "../../services/supportService";
import type { SupportTicket, CreateTicketInput, TicketFilters } from "./types";

export function useTickets(filters?: TicketFilters) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await supportService.getTickets(filters);
      setTickets(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.category]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tickets, loading, error, refresh };
}

export function useTicket(id: string | undefined) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await supportService.getTicket(id);
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

  const sendMessage = async (content: string) => {
    if (!id) return;
    await supportService.sendMessage(id, { content });
    await refresh();
  };

  return { ticket, loading, error, refresh, sendMessage };
}

export function useCreateTicket() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTicket = async (input: CreateTicketInput): Promise<SupportTicket | null> => {
    setLoading(true);
    setError(null);
    try {
      const ticket = await supportService.createTicket(input);
      return ticket;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createTicket, loading, error };
}
