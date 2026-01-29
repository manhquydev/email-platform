/**
 * ProviderDetailDrawer - Slide-out drawer for provider details and usage stats
 */
import { useEffect } from "react";
import type { Provider, ProviderUsage } from "./types";
import { STATUS_COLORS, TIER_COLORS } from "./types";

interface ProviderDetailDrawerProps {
  provider: Provider | null;
  usage: ProviderUsage | null;
  loadingUsage: boolean;
  onClose: () => void;
  onLoadUsage: (id: string) => void;
  onRegenerateKey: (id: string) => void;
  onUpdateStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') => void;
}

export function ProviderDetailDrawer({
  provider,
  usage,
  loadingUsage,
  onClose,
  onLoadUsage,
  onRegenerateKey,
  onUpdateStatus,
}: ProviderDetailDrawerProps) {
  // Load usage when provider changes
  useEffect(() => {
    if (provider) {
      onLoadUsage(provider.id);
    }
  }, [provider?.id]);

  if (!provider) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-slate-900/98 border-l border-white/10 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{provider.name}</h2>
            <button onClick={onClose} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2 py-1 text-xs rounded-full border ${TIER_COLORS[provider.tier]}`}>
              {provider.tier}
            </span>
            <span className={`px-2 py-1 text-xs rounded-full border ${STATUS_COLORS[provider.status]}`}>
              {provider.status === 'ACTIVE' ? 'Hoạt động' : provider.status === 'SUSPENDED' ? 'Tạm ngưng' : 'Đã hủy'}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Contact Info */}
          <section>
            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">Thông tin liên hệ</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/20 rounded-lg">
                  <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-white/50">Email liên hệ</div>
                  <div className="text-white">{provider.contactEmail}</div>
                </div>
              </div>
              {provider.billingEmail && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-white/50">Email thanh toán</div>
                    <div className="text-white">{provider.billingEmail}</div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* API Key */}
          <section>
            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">API Key</h3>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-white/80">{provider.apiKeyPrefix}...</div>
                  <div className="text-xs text-white/40 mt-1">Prefix - key đã được mã hóa</div>
                </div>
                <button
                  onClick={() => onRegenerateKey(provider.id)}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm rounded-lg transition-colors"
                >
                  Tạo mới
                </button>
              </div>
            </div>
          </section>

          {/* Quotas */}
          <section>
            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">Giới hạn</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
                <div className="text-2xl font-bold text-white">{provider.tenantCount}</div>
                <div className="text-xs text-white/50">/ {provider.maxTenants} tenants</div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
                <div className="text-2xl font-bold text-white">{usage?.summary?.mailboxes || 0}</div>
                <div className="text-xs text-white/50">/ {provider.maxMailboxes} mailboxes</div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
                <div className="text-2xl font-bold text-white">{provider.maxStorageGb}</div>
                <div className="text-xs text-white/50">GB storage</div>
              </div>
            </div>
          </section>

          {/* Usage Stats */}
          <section>
            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">Thống kê sử dụng</h3>
            {loadingUsage ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : usage ? (
              <div className="space-y-3">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Tổng messages</span>
                    <span className="text-white font-medium">{usage.summary.messages.toLocaleString()}</span>
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Kỳ thanh toán</span>
                    <span className="text-white font-medium">
                      {new Date(usage.period).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-white/50 py-4">Không có dữ liệu</div>
            )}
          </section>

          {/* Actions */}
          <section>
            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">Thao tác</h3>
            <div className="space-y-2">
              {provider.status === 'ACTIVE' ? (
                <button
                  onClick={() => onUpdateStatus(provider.id, 'SUSPENDED')}
                  className="w-full px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Tạm ngưng Provider
                </button>
              ) : provider.status === 'SUSPENDED' ? (
                <button
                  onClick={() => onUpdateStatus(provider.id, 'ACTIVE')}
                  className="w-full px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Kích hoạt Provider
                </button>
              ) : null}
            </div>
          </section>

          {/* Meta */}
          <div className="pt-4 border-t border-white/10 text-xs text-white/40">
            <div>ID: {provider.id}</div>
            <div>Tạo lúc: {new Date(provider.createdAt).toLocaleString('vi-VN')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
