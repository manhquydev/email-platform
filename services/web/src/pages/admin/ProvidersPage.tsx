/**
 * ProvidersPage - Admin page for managing Hosting Providers
 * Enables Super Admins to register, view, and manage cPanel/WHMCS providers
 */
import {
  GlassCard,
  SectionHeader,
  PremiumInput,
  EmptyState,
  LoadingSpinner,
  Pagination,
} from "../../components/admin/AdminUIComponents";
import {
  useProvidersPageData,
  ProvidersTable,
  ProviderFormModal,
  ApiKeyModal,
  ProviderDetailDrawer,
} from "./providers-modules";

export function ProvidersPage() {
  const {
    providers,
    loading,
    total,
    page,
    search,
    updating,
    showCreateModal,
    selectedProvider,
    newApiKey,
    providerUsage,
    loadingUsage,
    setSearch,
    setPage,
    setShowCreateModal,
    setSelectedProvider,
    setNewApiKey,
    createProvider,
    regenerateApiKey,
    updateStatus,
    loadProviderUsage,
    totalPages,
  } = useProvidersPageData();

  return (
    <div className="p-4 md:p-6 max-w-full">
      <SectionHeader
        title="Quản lý Hosting Providers"
        subtitle={`Tổng số: ${total} providers`}
        action={
          <div className="flex items-center gap-3">
            <PremiumInput
              value={search}
              onChange={setSearch}
              placeholder="Tìm kiếm..."
              className="w-64"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              }
            />
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tạo Provider
            </button>
          </div>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <GlassCard padding="p-0" hover={false}>
          {providers.length > 0 ? (
            <ProvidersTable
              providers={providers}
              updating={updating}
              onView={setSelectedProvider}
              onRegenerateKey={regenerateApiKey}
              onUpdateStatus={updateStatus}
            />
          ) : (
            <EmptyState
              title="Chưa có Hosting Provider nào"
              description="Tạo provider đầu tiên để bắt đầu tích hợp cPanel/WHMCS"
            />
          )}
        </GlassCard>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={page + 1}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p - 1)}
        />
      )}

      {/* Create Provider Modal */}
      <ProviderFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={createProvider}
      />

      {/* API Key Display Modal */}
      <ApiKeyModal
        apiKey={newApiKey}
        onClose={() => setNewApiKey(null)}
      />

      {/* Provider Detail Drawer */}
      <ProviderDetailDrawer
        provider={selectedProvider}
        usage={providerUsage}
        loadingUsage={loadingUsage}
        onClose={() => setSelectedProvider(null)}
        onLoadUsage={loadProviderUsage}
        onRegenerateKey={regenerateApiKey}
        onUpdateStatus={updateStatus}
      />
    </div>
  );
}
