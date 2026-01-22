/**
 * Support Ticket Service - Frontend API Client
 */

import type { SupportTicket, CreateTicketInput, CreateMessageInput, TicketMessage, TicketFilters } from "../pages/support-modules/types";

import { API_BASE } from "../utils/api";

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
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

export const supportService = {
  /**
   * Create a new support ticket
   */
  async createTicket(input: CreateTicketInput): Promise<SupportTicket> {
    const { ticket } = await fetchWithAuth("/support/tickets", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return ticket;
  },

  /**
   * Get user's tickets
   */
  async getTickets(filters?: TicketFilters): Promise<SupportTicket[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.category) params.set("category", filters.category);

    const query = params.toString();
    const { data } = await fetchWithAuth(`/support/tickets${query ? `?${query}` : ""}`);
    return data;
  },

  /**
   * Get single ticket by ID
   */
  async getTicket(id: string): Promise<SupportTicket> {
    const { ticket } = await fetchWithAuth(`/support/tickets/${id}`);
    return ticket;
  },

  /**
   * Send a reply to a ticket
   */
  async sendMessage(ticketId: string, input: CreateMessageInput): Promise<TicketMessage> {
    const { message } = await fetchWithAuth(`/support/tickets/${ticketId}/messages`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    return message;
  },
};
