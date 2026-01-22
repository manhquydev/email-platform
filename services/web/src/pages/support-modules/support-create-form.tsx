/**
 * Support Create Ticket Form Component
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useCreateTicket } from "./use-support-data";
import type { TicketCategory } from "./types";
import { CATEGORY_CONFIG } from "./types";

interface CreateFormProps {
  onSuccess?: () => void;
}

export function SupportCreateForm({ onSuccess }: CreateFormProps) {
  const navigate = useNavigate();
  const { createTicket, loading, error } = useCreateTicket();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("TECHNICAL");
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !content.trim()) return;

    const ticket = await createTicket({ subject, category, content });
    if (ticket) {
      onSuccess?.();
      navigate(`/support/tickets/${ticket.id}`);
    }
  };

  return (
    <GlassCard className="p-6 md:p-8">
      <h2 className="text-2xl font-bold mb-6">Tạo yêu cầu hỗ trợ</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Tiêu đề"
          placeholder="Mô tả ngắn gọn vấn đề của bạn"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          minLength={5}
          maxLength={200}
          icon={<span className="material-symbols-outlined text-[20px]">subject</span>}
        />

        <div className="space-y-2">
          <label className="text-text-secondary text-sm font-medium ml-1">Danh mục</label>
          <select
            className="w-full h-10 px-3 py-2 bg-surface-elevated border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-text-main"
            value={category}
            onChange={(e) => setCategory(e.target.value as TicketCategory)}
          >
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-text-secondary text-sm font-medium ml-1">Nội dung chi tiết</label>
          <textarea
            className="w-full h-32 px-3 py-2 bg-surface-elevated border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-text-main placeholder-gray-500 resize-none"
            placeholder="Mô tả chi tiết vấn đề của bạn..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            minLength={10}
            maxLength={5000}
          />
        </div>

        {error && (
          <div className="text-red-400 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
          </div>
        )}

        <Button type="submit" className="w-full h-12" isLoading={loading} disabled={loading}>
          Gửi yêu cầu
        </Button>
      </form>
    </GlassCard>
  );
}
