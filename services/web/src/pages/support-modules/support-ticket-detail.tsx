/**
 * Support Ticket Detail Component
 */

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { useTicket } from "./use-support-data";
import { STATUS_CONFIG, CATEGORY_CONFIG, TicketMessage } from "./types";

export function SupportTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { ticket, loading, error, sendMessage } = useTicket(id);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || sending) return;

    setSending(true);
    try {
      await sendMessage(reply);
      setReply("");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-5xl text-red-400 mb-4">error</span>
        <p className="text-red-400">{error || "Không tìm thấy ticket"}</p>
        <Link to="/support" className="text-primary hover:underline mt-4 inline-block">
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  const status = STATUS_CONFIG[ticket.status];
  const category = CATEGORY_CONFIG[ticket.category];
  const canReply = !["CLOSED", "RESOLVED"].includes(ticket.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/support" className="text-text-secondary hover:text-white text-sm flex items-center gap-1 mb-2">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Quay lại
          </Link>
          <h1 className="text-2xl font-bold text-white">{ticket.subject}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${status.color} text-white`}>
              <span className="material-symbols-outlined text-sm">{status.icon}</span>
              {status.label}
            </span>
            <span className="text-xs text-text-secondary flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">{category.icon}</span>
              {category.label}
            </span>
            <span className="text-xs text-text-secondary">
              #{ticket.id.slice(0, 8)}
            </span>
          </div>
        </div>
        <div className="text-right text-xs text-text-secondary">
          <div>Tạo: {new Date(ticket.createdAt).toLocaleString("vi-VN")}</div>
          <div>Cập nhật: {new Date(ticket.updatedAt).toLocaleString("vi-VN")}</div>
        </div>
      </div>

      {/* Messages */}
      <GlassCard className="p-6">
        <div className="space-y-4">
          {ticket.messages.map((message) => (
            <MessageBubble key={message.id} message={message} isOwn={message.userId === ticket.userId} />
          ))}
        </div>
      </GlassCard>

      {/* Reply Form */}
      {canReply ? (
        <GlassCard className="p-4">
          <form onSubmit={handleSendReply} className="flex gap-3">
            <textarea
              className="flex-1 h-20 px-3 py-2 bg-surface-elevated border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-text-main placeholder-gray-500 resize-none"
              placeholder="Nhập phản hồi của bạn..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              disabled={sending}
            />
            <Button type="submit" isLoading={sending} disabled={sending || !reply.trim()} className="self-end">
              <span className="material-symbols-outlined">send</span>
            </Button>
          </form>
        </GlassCard>
      ) : (
        <div className="text-center py-4 text-text-secondary">
          <span className="material-symbols-outlined text-2xl mb-2">lock</span>
          <p>Ticket này đã đóng. Tạo ticket mới nếu bạn cần hỗ trợ thêm.</p>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, isOwn }: { message: TicketMessage; isOwn: boolean }) {
  const isAdmin = message.user.role === "ADMIN";

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] ${isOwn ? "bg-primary/20 border-primary/30" : "bg-surface-elevated border-border"} border rounded-xl p-4`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-sm font-medium ${isAdmin ? "text-green-400" : "text-white"}`}>
            {isAdmin ? "🛡️ Hỗ trợ viên" : message.user.name || message.user.email}
          </span>
          <span className="text-xs text-text-secondary">
            {new Date(message.createdAt).toLocaleString("vi-VN")}
          </span>
        </div>
        <p className="text-text-main whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
