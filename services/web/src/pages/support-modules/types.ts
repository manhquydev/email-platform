/**
 * Support Ticket System Types
 */

export type TicketStatus = "OPEN" | "WAITING_USER" | "WAITING_SUPPORT" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type TicketCategory = "TECHNICAL" | "BILLING" | "ABUSE" | "OTHER";

export interface TicketUser {
  id: string;
  email: string;
  name: string | null;
  role?: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  user: TicketUser;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  user: TicketUser;
  messages: TicketMessage[];
  _count?: { messages: number };
}

export interface CreateTicketInput {
  subject: string;
  category: TicketCategory;
  content: string;
}

export interface CreateMessageInput {
  content: string;
}

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
}

// Status display config
export const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: string }> = {
  OPEN: { label: "Mở", color: "bg-blue-500", icon: "inbox" },
  WAITING_USER: { label: "Chờ phản hồi", color: "bg-yellow-500", icon: "hourglass_top" },
  WAITING_SUPPORT: { label: "Đang xử lý", color: "bg-purple-500", icon: "support_agent" },
  RESOLVED: { label: "Đã giải quyết", color: "bg-green-500", icon: "check_circle" },
  CLOSED: { label: "Đã đóng", color: "bg-gray-500", icon: "cancel" },
};

export const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  LOW: { label: "Thấp", color: "text-gray-400" },
  NORMAL: { label: "Bình thường", color: "text-blue-400" },
  HIGH: { label: "Cao", color: "text-orange-400" },
  URGENT: { label: "Khẩn cấp", color: "text-red-400" },
};

export const CATEGORY_CONFIG: Record<TicketCategory, { label: string; icon: string }> = {
  TECHNICAL: { label: "Kỹ thuật", icon: "build" },
  BILLING: { label: "Thanh toán", icon: "payments" },
  ABUSE: { label: "Báo cáo lạm dụng", icon: "report" },
  OTHER: { label: "Khác", icon: "help" },
};
