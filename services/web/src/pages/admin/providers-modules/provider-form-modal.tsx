/**
 * ProviderFormModal - Modal for creating new hosting providers
 * Shows API key after successful creation (one-time display)
 */
import { useState } from "react";
import type { CreateProviderData } from "./types";
import { TIER_OPTIONS } from "./types";

interface ProviderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProviderData) => Promise<boolean>;
}

export function ProviderFormModal({ isOpen, onClose, onSubmit }: ProviderFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateProviderData>({
    name: "",
    contactEmail: "",
    billingEmail: "",
    webhookUrl: "",
    tier: "STARTER",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const success = await onSubmit({
      ...formData,
      billingEmail: formData.billingEmail || undefined,
      webhookUrl: formData.webhookUrl || undefined,
    });

    setLoading(false);
    if (success) {
      setFormData({ name: "", contactEmail: "", billingEmail: "", webhookUrl: "", tier: "STARTER" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Tạo Hosting Provider</h2>
            <button onClick={onClose} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Tên công ty *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-violet-500/50"
                placeholder="VD: Mắt Bão Hosting"
              />
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Email liên hệ *</label>
              <input
                type="email"
                required
                value={formData.contactEmail}
                onChange={e => setFormData(d => ({ ...d, contactEmail: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-violet-500/50"
                placeholder="admin@matbao.net"
              />
            </div>

            {/* Billing Email */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Email thanh toán</label>
              <input
                type="email"
                value={formData.billingEmail}
                onChange={e => setFormData(d => ({ ...d, billingEmail: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-violet-500/50"
                placeholder="billing@matbao.net"
              />
            </div>

            {/* Webhook URL */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Webhook URL</label>
              <input
                type="url"
                value={formData.webhookUrl}
                onChange={e => setFormData(d => ({ ...d, webhookUrl: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-violet-500/50"
                placeholder="https://yoursite.com/webhooks/ephemera"
              />
            </div>

            {/* Tier */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Gói dịch vụ *</label>
              <div className="grid grid-cols-3 gap-3">
                {TIER_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData(d => ({ ...d, tier: option.value }))}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.tier === option.value
                        ? "bg-violet-500/20 border-violet-500/50 text-white"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-white/50 mt-1">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl text-white font-medium transition-all disabled:opacity-50"
              >
                {loading ? "Đang tạo..." : "Tạo Provider"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * ApiKeyModal - Modal to display newly generated API key (one-time)
 */
interface ApiKeyModalProps {
  apiKey: string | null;
  onClose: () => void;
}

export function ApiKeyModal({ apiKey, onClose }: ApiKeyModalProps) {
  const [copied, setCopied] = useState(false);

  if (!apiKey) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-md mx-4 bg-slate-900/95 border border-amber-500/30 rounded-2xl shadow-2xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">API Key Mới</h3>
              <p className="text-sm text-amber-400">Lưu key này ngay - sẽ không hiển thị lại!</p>
            </div>
          </div>

          <div className="relative">
            <div className="p-4 bg-black/50 rounded-xl border border-white/10 font-mono text-sm text-emerald-400 break-all">
              {apiKey}
            </div>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="Copy"
            >
              {copied ? (
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-4 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl text-white font-medium transition-all"
          >
            Đã lưu API Key
          </button>
        </div>
      </div>
    </div>
  );
}
