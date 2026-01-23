/**
 * Admin Support Detail Page - View and manage single ticket
 */

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { GlassCard, LoadingSpinner, PremiumButton } from "../../../components/admin/AdminUIComponents";
import { useAdminTicket } from "./use-admin-support-data";
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "./types";
import type { TicketMessage } from "./types";

export function AdminSupportDetail() {
  const { id } = useParams<{ id: string }>();
  const { ticket, loading, error, updating, updateTicket, sendMessage } = useAdminTicket(id);
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || updating) return;
    await sendMessage(reply, isInternal);
    setReply("");
    setIsInternal(false);
  };

  if (loading) {
    return <div className="p-6"><LoadingSpinner /></div>;
  }

  if (error || !ticket) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400 mb-4">{error || "Không tìm thấy ticket"}</p>
        <Link to="/admin/support" className="text-primary hover:underline">← Quay lại</Link>
      </div>
    );
  }

  const status = STATUS_CONFIG[ticket.status];
  const priority = PRIORITY_CONFIG[ticket.priority];
  const category = CATEGORY_CONFIG[ticket.category];

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link to="/admin/support" className="text-slate-400 hover:text-white text-sm flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Quay lại danh sách
        </Link>
        <h1 className="text-xl font-bold text-white mb-2">{ticket.subject}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className={`px-2 py-1 rounded text-xs font-medium ${status.color} text-white`}>
            {status.label}
          </span>
          <span className={`font-medium ${priority.color}`}>{priority.label}</span>
          <span className="text-slate-400">{category.label}</span>
          <span className="text-slate-500">#{ticket.id.slice(0, 8)}</span>
        </div>
      </div>

      {/* Ticket Info + Controls */}
      <GlassCard className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-400 mb-1">Người gửi</div>
            <div className="text-white">{ticket.user?.email || "Unknown"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Ngày tạo</div>
            <div className="text-white">{new Date(ticket.createdAt).toLocaleString("vi-VN")}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Trạng thái</div>
            <select
              value={ticket.status}
              onChange={(e) => updateTicket({ status: e.target.value })}
              disabled={updating}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-primary focus:outline-none"
            >
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Ưu tiên</div>
            <select
              value={ticket.priority}
              onChange={(e) => updateTicket({ priority: e.target.value })}
              disabled={updating}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-primary focus:outline-none"
            >
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Messages */}
      <GlassCard className="p-4 mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Tin nhắn ({ticket.messages?.length || 0})</h3>
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {ticket.messages?.map((message) => (
            <MessageBubble key={message.id} message={message} ticketUserId={ticket.userId} />
          ))}
          {(!ticket.messages || ticket.messages.length === 0) && (
            <p className="text-slate-500 text-sm">Chưa có tin nhắn</p>
          )}
        </div>
      </GlassCard>

      {/* Reply Form */}
      <GlassCard className="p-4">
        <form onSubmit={handleSendReply} className="space-y-3">
          <textarea
            className="w-full h-24 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 resize-none focus:border-primary focus:outline-none"
            placeholder="Nhập phản hồi..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            disabled={updating}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800"
              />
              Ghi chú nội bộ (không hiển thị cho user)
            </label>
            <PremiumButton
              type="submit"
              disabled={updating || !reply.trim()}
              isLoading={updating}
            >
              Gửi phản hồi
            </PremiumButton>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}

function MessageBubble({ message, ticketUserId: _ticketUserId }: { message: TicketMessage; ticketUserId: string }) { // eslint-disable-line @typescript-eslint/no-unused-vars
  const isAdmin = message.user?.role === "ADMIN";
  

  return (
    <div className={`p-3 rounded-lg ${message.isInternal ? "bg-yellow-900/20 border border-yellow-700/30" : isAdmin ? "bg-primary/10 border border-primary/20" : "bg-slate-800 border border-slate-700"}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-sm font-medium ${isAdmin ? "text-primary" : "text-white"}`}>
          {isAdmin ? "🛡️ Admin" : message.user?.email || "User"}
        </span>
        {message.isInternal && (
          <span className="text-xs bg-yellow-600/20 text-yellow-400 px-1.5 py-0.5 rounded">Nội bộ</span>
        )}
        <span className="text-xs text-slate-500 ml-auto">
          {new Date(message.createdAt).toLocaleString("vi-VN")}
        </span>
      </div>
      <p className="text-sm text-slate-300 whitespace-pre-wrap">{message.content}</p>
    </div>
  );
}
