import { useState } from "react";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Link } from "react-router-dom";
import { useTickets, SupportTicketList, SupportCreateForm } from "./support-modules";
import { tokenManager } from "../utils/token-manager";

function useIsAuthenticated() {
  return !!tokenManager.getAccessToken();
}

export function Support() {
  const isAuth = useIsAuthenticated();
  const [showForm, setShowForm] = useState(false);
  const { tickets, loading, error, refresh } = useTickets();

  return (
    <div className="min-h-screen pt-24 pb-20 neo-mesh-bg text-white flex flex-col items-center px-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
            Trung tâm Trợ giúp
          </h1>
          <p className="text-nebula-text-muted text-lg max-w-2xl mx-auto">
            Chúng tôi ở đây để giúp đỡ. Tìm câu trả lời hoặc liên hệ trực tiếp với đội ngũ hỗ trợ.
          </p>
        </div>

        {isAuth ? (
          <div className="space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Yêu cầu hỗ trợ của bạn</h2>
              <Button onClick={() => setShowForm(!showForm)}>
                <span className="material-symbols-outlined mr-2">add</span>
                Tạo yêu cầu mới
              </Button>
            </div>

            {showForm && (
              <SupportCreateForm onSuccess={() => { setShowForm(false); refresh(); }} />
            )}

            <SupportTicketList tickets={tickets} loading={loading} error={error} />

            <div className="grid md:grid-cols-3 gap-4 mt-8">
              <QuickLink icon="menu_book" color="text-primary" title="Tài liệu" desc="Xem hướng dẫn" to="/docs" />
              <QuickLink icon="email" color="text-green-400" title="Email" desc="support@manhquy.click" href="mailto:support@manhquy.click" />
              <QuickLink icon="schedule" color="text-yellow-400" title="Giờ làm việc" desc="T2-T6: 9:00-18:00" />
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 animate-fade-in-up">
            <GlassCard className="p-8">
              <h2 className="text-2xl font-bold mb-4">Đăng nhập để gửi yêu cầu</h2>
              <p className="text-text-secondary mb-6">Đăng nhập để theo dõi yêu cầu hỗ trợ.</p>
              <div className="flex gap-3">
                <Link to="/login"><Button>Đăng nhập</Button></Link>
                <Link to="/register"><Button variant="secondary">Đăng ký</Button></Link>
              </div>
            </GlassCard>
            <div className="space-y-4">
              <QuickLink icon="menu_book" color="text-primary" title="Tài liệu" desc="Xem hướng dẫn" to="/docs" />
              <QuickLink icon="email" color="text-green-400" title="Email" desc="support@manhquy.click" href="mailto:support@manhquy.click" />
              <QuickLink icon="schedule" color="text-yellow-400" title="Giờ làm việc" desc="T2-T6: 9:00-18:00" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickLink({ icon, color, title, desc, to, href }: { icon: string; color: string; title: string; desc: string; to?: string; href?: string }) {
  const card = (
    <GlassCard className="p-4 hover:border-primary/30 transition-all cursor-pointer">
      <div className="flex items-center gap-3">
        <span className={"material-symbols-outlined " + color}>{icon}</span>
        <div><h3 className="font-semibold">{title}</h3><p className="text-sm text-text-secondary">{desc}</p></div>
      </div>
    </GlassCard>
  );
  if (to) return <Link to={to}>{card}</Link>;
  if (href) return <a href={href}>{card}</a>;
  return card;
}

export function Sales() {
  return (
    <div className="min-h-screen pt-24 pb-20 neo-mesh-bg text-white flex flex-col items-center px-4">
      <div className="max-w-4xl w-full text-center">
        <div className="mb-16 animate-fade-in-up">
          <span className="inline-block px-3 py-1 rounded bg-purple-500/20 text-purple-300 text-sm font-bold mb-4 border border-purple-500/30">DOANH NGHIỆP</span>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-200 via-white to-purple-200 bg-clip-text text-transparent">
            Liên hệ Kinh doanh
          </h1>
          <p className="text-nebula-text-muted text-lg max-w-2xl mx-auto">
            Cần giải pháp tùy chỉnh, SLA cao hơn, hoặc gói doanh nghiệp? Đội ngũ của chúng tôi sẵn sàng thảo luận.
          </p>
        </div>
        <GlassCard className="max-w-xl mx-auto p-8 md:p-12 animate-fade-in-up">
          <form className="space-y-4 text-left">
            <Input label="Họ và tên" placeholder="Tên của bạn" className="bg-surface-elevated border-border" />
            <Input label="Email Công việc" placeholder="name@company.com" type="email" className="bg-surface-elevated border-border" />
            <Input label="Tên công ty" placeholder="Acme Corp" className="bg-surface-elevated border-border" />
            <div className="space-y-2">
              <label className="text-text-secondary text-sm font-medium ml-1">Quy mô công ty</label>
              <select className="w-full h-10 px-3 py-2 bg-input-bg border border-[#313168] rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-white placeholder-gray-500">
                <option>1-10 nhân viên</option>
                <option>11-50 nhân viên</option>
                <option>51-200 nhân viên</option>
                <option>201+ nhân viên</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-text-secondary text-sm font-medium ml-1">Nhu cầu cụ thể</label>
              <textarea className="w-full h-32 px-3 py-2 bg-surface-elevated border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-text-main placeholder-gray-500 resize-none" placeholder="VD: API Rate limits, Dedicated IP, ..."></textarea>
            </div>
            <Button className="w-full h-12 text-base font-bold bg-purple-600 hover:bg-purple-700 shadow-purple-500/20 shadow-lg">Liên hệ Sales Team</Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}

export const Contact = Support;
