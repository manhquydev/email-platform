/**
 * Admin Support Types - extends user support types with admin-specific fields
 */

// Re-export from user types for consistency
export type {
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TicketUser,
  TicketMessage,
  SupportTicket,
  TicketFilters
} from "../../support-modules/types";

export {
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  CATEGORY_CONFIG
} from "../../support-modules/types";

// Admin-specific types
export interface AdminTicketFilters {
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminUpdateTicketInput {
  status?: string;
  priority?: string;
}

export interface AdminMessageInput {
  content: string;
  isInternal?: boolean;
}

export interface TicketStats {
  total: number;
  open: number;
  waitingUser: number;
  waitingSupport: number;
  resolved: number;
  closed: number;
}

export interface AdminTicketsResponse {
  data: import("../../support-modules/types").SupportTicket[];
  total: number;
  page: number;
  limit: number;
}
