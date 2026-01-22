/**
 * Admin Support UI Components
 */

import { Link } from "react-router-dom";
import type { SupportTicket, TicketStats } from "./types";
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "./types";
import {
  TableRow, TableCell, StatusBadge
} from "../../../components/admin/AdminUIComponents";

// --- Stats Cards ---
interface StatsCardsProps {
  stats: TicketStats | null;
  loading: boolean;
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl p-4 animate-pulse h-20" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Tổng", value: stats.total, color: "text-white" },
    { label: "Mở", value: stats.open, color: "text-blue-400" },
    { label: "Chờ user", value: stats.waitingUser, color: "text-yellow-400" },
    { label: "Đang xử lý", value: stats.waitingSupport, color: "text-purple-400" },
    { label: "Đã giải quyết", value: stats.resolved, color: "text-green-400" },
    { label: "Đã đóng", value: stats.closed, color: "text-gray-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      {cards.map((card) => (
        <div key={card.label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
          <div className="text-xs text-slate-400">{card.label}</div>
        </div>
      ))}
    </div>
  );
}

// --- Ticket Table Row ---
interface TicketTableRowProps {
  ticket: SupportTicket;
}

export function TicketTableRow({ ticket }: TicketTableRowProps) {
  const status = STATUS_CONFIG[ticket.status];
  const priority = PRIORITY_CONFIG[ticket.priority];
  const category = CATEGORY_CONFIG[ticket.category];

  return (
    <TableRow>
      <TableCell>
        <Link
          to={`/admin/support/${ticket.id}`}
          className="font-medium text-white hover:text-primary truncate block max-w-[200px]"
          title={ticket.subject}
        >
          {ticket.subject}
        </Link>
        <div className="text-xs text-slate-400 mt-0.5">
          #{ticket.id.slice(0, 8)}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-slate-300">{ticket.user?.email || "Unknown"}</div>
      </TableCell>
      <TableCell>
        <StatusBadge
          status={status.label}
          variant={ticket.status === "RESOLVED" ? "success" : ticket.status === "CLOSED" ? "default" : "warning"}
        />
      </TableCell>
      <TableCell>
        <span className={`text-sm font-medium ${priority.color}`}>{priority.label}</span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-slate-400">{category.label}</span>
      </TableCell>
      <TableCell>
        <div className="text-xs text-slate-400">
          {new Date(ticket.createdAt).toLocaleDateString("vi-VN")}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
          <span>{ticket._count?.messages || 0}</span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Link
          to={`/admin/support/${ticket.id}`}
          className="text-primary hover:underline text-sm"
        >
          Xem →
        </Link>
      </TableCell>
    </TableRow>
  );
}

// --- Ticket Table Header ---
export function TicketTableHeader() {
  return (
    <tr>
      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Tiêu đề</th>
      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Trạng thái</th>
      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Ưu tiên</th>
      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Danh mục</th>
      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Ngày tạo</th>
      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Tin nhắn</th>
      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Hành động</th>
    </tr>
  );
}

// --- Filters Bar ---
interface FiltersBarProps {
  filters: { status?: string; priority?: string; search?: string };
  onFilterChange: (filters: Partial<{ status?: string; priority?: string; search?: string }>) => void;
}

export function FiltersBar({ filters, onFilterChange }: FiltersBarProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <input
        type="text"
        placeholder="Tìm kiếm..."
        value={filters.search || ""}
        onChange={(e) => onFilterChange({ search: e.target.value })}
        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:border-primary focus:outline-none w-64"
      />
      <select
        value={filters.status || ""}
        onChange={(e) => onFilterChange({ status: e.target.value || undefined })}
        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-primary focus:outline-none"
      >
        <option value="">Tất cả trạng thái</option>
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <option key={key} value={key}>{config.label}</option>
        ))}
      </select>
      <select
        value={filters.priority || ""}
        onChange={(e) => onFilterChange({ priority: e.target.value || undefined })}
        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-primary focus:outline-none"
      >
        <option value="">Tất cả ưu tiên</option>
        {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
          <option key={key} value={key}>{config.label}</option>
        ))}
      </select>
    </div>
  );
}
