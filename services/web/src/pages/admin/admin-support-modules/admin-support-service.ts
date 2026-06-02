/**
 * Admin Support Service - API Client for Admin Support Operations
 */

import type {
  SupportTicket,
  TicketMessage,
  AdminTicketFilters,
  AdminUpdateTicketInput,
  AdminMessageInput,
  TicketStats,
  AdminTicketsResponse
} from "./types";

import { API_BASE } from "../../../utils/api";
import { tokenManager } from "../../../utils/token-manager";

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = tokenManager.getAccessToken();
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  return res.json();
}

export const adminSupportService = {
  /**
   * Get all tickets with filters (admin)
   */
  async getTickets(filters?: AdminTicketFilters): Promise<AdminTicketsResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.priority) params.set("priority", filters.priority);
    if (filters?.category) params.set("category", filters.category);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.page !== undefined) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));

    const query = params.toString();
    return fetchWithAuth(`/admin/support/tickets${query ? `?${query}` : ""}`);
  },

  /**
   * Get single ticket by ID (admin)
   */
  async getTicket(id: string): Promise<SupportTicket> {
    const { ticket } = await fetchWithAuth(`/admin/support/tickets/${id}`);
    return ticket;
  },

  /**
   * Update ticket status/priority (admin)
   */
  async updateTicket(id: string, updates: AdminUpdateTicketInput): Promise<SupportTicket> {
    const { ticket } = await fetchWithAuth(`/admin/support/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    return ticket;
  },

  /**
   * Send admin reply (can be internal note)
   */
  async sendMessage(ticketId: string, input: AdminMessageInput): Promise<TicketMessage> {
    const { message } = await fetchWithAuth(`/admin/support/tickets/${ticketId}/messages`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    return message;
  },

  /**
   * Get ticket statistics
   */
  async getStats(): Promise<TicketStats> {
    const { stats } = await fetchWithAuth("/admin/support/tickets/stats");
    return stats;
  },
};
