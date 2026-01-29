/**
 * ProvidersTable - Data table for hosting providers
 * Displays providers with actions for view, regenerate key, suspend/activate
 */
import type { Provider } from "./types";
import { STATUS_COLORS, TIER_COLORS } from "./types";

interface ProvidersTableProps {
  providers: Provider[];
  updating: string | null;
  onView: (provider: Provider) => void;
  onRegenerateKey: (id: string) => void;
  onUpdateStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') => void;
}

export function ProvidersTable({
  providers,
  updating,
  onView,
  onRegenerateKey,
  onUpdateStatus,
}: ProvidersTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Tên</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Email</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Tier</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Trạng thái</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Tenants</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-white/60">API Key</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Ngày tạo</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-white/60">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {providers.map((provider) => (
            <tr
              key={provider.id}
              className="border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <td className="py-3 px-4">
                <button
                  onClick={() => onView(provider)}
                  className="text-white font-medium hover:text-violet-400 transition-colors"
                >
                  {provider.name}
                </button>
              </td>
              <td className="py-3 px-4 text-white/70 text-sm">
                {provider.contactEmail}
              </td>
              <td className="py-3 px-4">
                <span className={`inline-flex px-2 py-1 text-xs rounded-full border ${TIER_COLORS[provider.tier]}`}>
                  {provider.tier}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={`inline-flex px-2 py-1 text-xs rounded-full border ${STATUS_COLORS[provider.status]}`}>
                  {provider.status === 'ACTIVE' ? 'Hoạt động' : provider.status === 'SUSPENDED' ? 'Tạm ngưng' : 'Đã hủy'}
                </span>
              </td>
              <td className="py-3 px-4 text-white/70 text-sm">
                {provider.tenantCount} / {provider.maxTenants}
              </td>
              <td className="py-3 px-4 text-white/50 text-sm font-mono">
                {provider.apiKeyPrefix}...
              </td>
              <td className="py-3 px-4 text-white/50 text-sm">
                {new Date(provider.createdAt).toLocaleDateString('vi-VN')}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onView(provider)}
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Xem chi tiết"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onRegenerateKey(provider.id)}
                    disabled={updating === provider.id}
                    className="p-2 text-white/60 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Tạo API key mới"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </button>
                  {provider.status === 'ACTIVE' ? (
                    <button
                      onClick={() => onUpdateStatus(provider.id, 'SUSPENDED')}
                      disabled={updating === provider.id}
                      className="p-2 text-white/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Tạm ngưng"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                  ) : provider.status === 'SUSPENDED' ? (
                    <button
                      onClick={() => onUpdateStatus(provider.id, 'ACTIVE')}
                      disabled={updating === provider.id}
                      className="p-2 text-white/60 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Kích hoạt"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
