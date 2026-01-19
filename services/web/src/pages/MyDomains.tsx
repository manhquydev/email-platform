/**
 * MyDomains - Page for managing user's custom domains
 * Refactored to use modular hooks and components
 */
import { ConfirmationModal } from "../components/ConfirmationModal";
import {
    useMyDomainsData,
    AddDomainModal,
    DNSConfigCard,
    DomainCard,
    DomainsEmptyState
} from "./my-domains-modules";

export function MyDomains() {
    const {
        domains,
        loading,
        newDomainName,
        setNewDomainName,
        showAddForm,
        setShowAddForm,
        addedDomain,
        setAddedDomain,
        busy,
        verifyingId,
        togglingId,
        deletingId,
        deleteTarget,
        setDeleteTarget,
        handleAddDomain,
        handleVerify,
        handleTogglePublic,
        handleDelete,
        confirmDelete,
        copyToClipboard,
    } = useMyDomainsData();

    if (loading) {
        return (
            <div className="flex-1 h-full">
                <div className="flex items-center justify-center h-full" style={{ background: 'var(--nebula-void)' }}>
                    <div className="spinner" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 h-full flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto" style={{ background: 'var(--nebula-void)' }}>
                {/* Page Header */}
                <div className="page-header">
                    <div className="page-header-content">
                        <div className="flex items-center">
                            <div className="page-header-icon">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="page-header-title">Quản lý tên miền</h1>
                                <p className="page-header-subtitle">Thêm và cấu hình tên miền của bạn</p>
                            </div>
                        </div>
                        <button onClick={() => setShowAddForm(true)} className="btn-nebula btn-nebula-primary">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Thêm tên miền
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-5xl mx-auto px-6 py-8">
                    {/* Add Domain Modal */}
                    <AddDomainModal
                        showAddForm={showAddForm}
                        newDomainName={newDomainName}
                        setNewDomainName={setNewDomainName}
                        addedDomain={addedDomain}
                        busy={busy}
                        onClose={() => { setShowAddForm(false); setAddedDomain(null); }}
                        onAdd={handleAddDomain}
                        copyToClipboard={copyToClipboard}
                    />

                    {/* DNS Configuration Card */}
                    <DNSConfigCard />

                    {/* Domain List */}
                    {domains.length === 0 ? (
                        <DomainsEmptyState onAdd={() => setShowAddForm(true)} />
                    ) : (
                        <div className="grid gap-4">
                            {domains.map((domain) => (
                                <DomainCard
                                    key={domain.id}
                                    domain={domain}
                                    verifyingId={verifyingId}
                                    togglingId={togglingId}
                                    deletingId={deletingId}
                                    onVerify={handleVerify}
                                    onTogglePublic={handleTogglePublic}
                                    onDelete={handleDelete}
                                    copyToClipboard={copyToClipboard}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={!!deleteTarget}
                title="Xác nhận xóa tên miền"
                message={`Xóa tên miền "${deleteTarget?.name}"? Tất cả inbox trên domain này cũng sẽ bị xóa vĩnh viễn.`}
                confirmLabel="Xóa"
                isDestructive
                isLoading={!!deletingId}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
