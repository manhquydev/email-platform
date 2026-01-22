/**
 * Support Ticket List Component
 */

import { Link } from "react-router-dom";
import { GlassCard } from "../../components/ui/GlassCard";
import { SupportTicket, STATUS_CONFIG, CATEGORY_CONFIG } from "./types";

interface TicketListProps {
  tickets: SupportTicket[];
  loading: boolean;
  error: string | null;
}

export function SupportTicketList({ tickets, loading, error }: TicketListProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-400">
        <span className="material-symbols-outlined text-4xl mb-2">error</span>
        <p>{error}</p>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <span className="material-symbols-outlined text-5xl mb-4 opacity-50">inbox</span>
        <p className="text-lg">Chưa có yêu cầu hỗ trợ nào</p>
        <p className="text-sm mt-2">Tạo yêu cầu mới để được hỗ trợ</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
}

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const status = STATUS_CONFIG[ticket.status];
  const category = CATEGORY_CONFIG[ticket.category];
  const lastMessage = ticket.messages?.[0];

  return (
    <Link to={`/support/tickets/${ticket.id}`}>
      <GlassCard className="p-4 hover:border-primary/50 transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${status.color} text-white`}>
                <span className="material-symbols-outlined text-sm">{status.icon}</span>
                {status.label}
              </span>
              <span className="text-xs text-text-secondary flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">{category.icon}</span>
                {category.label}
              </span>
            </div>
            <h3 className="font-semibold text-white truncate">{ticket.subject}</h3>
            {lastMessage && (
              <p className="text-sm text-text-secondary mt-1 line-clamp-1">
                {lastMessage.content}
              </p>
            )}
          </div>
          <div className="text-right text-xs text-text-secondary whitespace-nowrap">
            <div>{new Date(ticket.createdAt).toLocaleDateString("vi-VN")}</div>
            {ticket._count && (
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="material-symbols-outlined text-sm">chat</span>
                {ticket._count.messages}
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}
