import { useState } from "react";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { API_BASE } from "../utils/api";

export function Sales() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    companySize: "1-10 nhân viên",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(API_BASE + "/contact/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Request failed");
      setSubmitted(true);
      toast.success("Đã gửi thành công!");
    } catch {
      toast.error("Có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen pt-24 pb-20 neo-mesh-bg text-white flex flex-col items-center px-4">
        <div className="max-w-xl text-center animate-fade-in-up">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-green-400">check_circle</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">Cảm ơn bạn!</h1>
          <p className="text-nebula-text-muted mb-8">Chúng tôi sẽ liên hệ trong 24h.</p>
          <Link to="/"><Button variant="secondary">Về trang chủ</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20 neo-mesh-bg text-white flex flex-col items-center px-4">
      <div className="max-w-4xl w-full text-center">
        <div className="mb-16 animate-fade-in-up">
          <span className="inline-block px-3 py-1 rounded bg-purple-500/20 text-purple-300 text-sm font-bold mb-4 border border-purple-500/30">DOANH NGHIỆP</span>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-200 via-white to-purple-200 bg-clip-text text-transparent">Liên hệ Kinh doanh</h1>
          <p className="text-nebula-text-muted text-lg max-w-2xl mx-auto">Cần giải pháp tùy chỉnh? Đội ngũ sẵn sàng thảo luận.</p>
        </div>
        <GlassCard className="max-w-xl mx-auto p-8 md:p-12 animate-fade-in-up">
          <form className="space-y-4 text-left" onSubmit={handleSubmit}>
            <Input label="Họ và tên" placeholder="Tên của bạn" value={form.name} onChange={(e) => setForm(f => ({...f, name: e.target.value}))} required />
            <Input label="Email" placeholder="name@company.com" type="email" value={form.email} onChange={(e) => setForm(f => ({...f, email: e.target.value}))} required />
            <Input label="Công ty" placeholder="Acme Corp" value={form.company} onChange={(e) => setForm(f => ({...f, company: e.target.value}))} required />
            <div className="space-y-2">
              <label className="text-text-secondary text-sm font-medium ml-1">Quy mô</label>
              <select className="w-full h-10 px-3 py-2 bg-input-bg border border-[#313168] rounded-xl text-sm text-white" value={form.companySize} onChange={(e) => setForm(f => ({...f, companySize: e.target.value}))}>
                <option>1-10 nhân viên</option>
                <option>11-50 nhân viên</option>
                <option>51-200 nhân viên</option>
                <option>201+ nhân viên</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-text-secondary text-sm font-medium ml-1">Nhu cầu</label>
              <textarea className="w-full h-32 px-3 py-2 bg-surface-elevated border border-border rounded-xl text-sm text-text-main resize-none" placeholder="VD: API Rate limits..." value={form.message} onChange={(e) => setForm(f => ({...f, message: e.target.value}))} required minLength={10}></textarea>
            </div>
            <Button type="submit" className="w-full h-12 text-base font-bold bg-purple-600 hover:bg-purple-700" disabled={submitting}>
              {submitting ? "Đang gửi..." : "Liên hệ Sales Team"}
            </Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
