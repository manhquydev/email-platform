/**
 * Authenticator - 2FA OTP Manager page
 * Securely manage TOTP codes for various services
 */
import { ConfirmationModal } from "../components/ConfirmationModal";
import {
    useAuthenticatorData,
    AuthenticatorHeader,
    AuthenticatorLoadingSkeleton,
    EmptyAuthenticatorState,
    OTPCard,
    AddAccountModal
} from "./authenticator-modules";

export function Authenticator() {
    const {
        accounts,
        loading,
        timeLeft,
        codes,
        copiedId,
        isAdding,
        newService,
        newAccount,
        newSecret,
        accountToDelete,
        isDeleting,
        setIsAdding,
        setNewService,
        setNewAccount,
        setNewSecret,
        setAccountToDelete,
        handleAdd,
        handleDelete,
        confirmDelete,
        copyCode,
    } = useAuthenticatorData();

    return (
        <div className="flex-1 h-full flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto" style={{ background: 'var(--nebula-void)' }}>
                {/* Header */}
                <AuthenticatorHeader onAdd={() => setIsAdding(true)} />

                {/* Content Area */}
                <div className="max-w-6xl mx-auto px-6 py-8">
                    {loading ? (
                        <AuthenticatorLoadingSkeleton />
                    ) : accounts.length === 0 ? (
                        <EmptyAuthenticatorState onAdd={() => setIsAdding(true)} />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {accounts.map(acc => (
                                <OTPCard
                                    key={acc.id}
                                    account={acc}
                                    code={codes[acc.id] || "--- ---"}
                                    timeLeft={timeLeft}
                                    copiedId={copiedId}
                                    onCopy={copyCode}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Modal */}
                <AddAccountModal
                    isOpen={isAdding}
                    newService={newService}
                    newAccount={newAccount}
                    newSecret={newSecret}
                    onServiceChange={setNewService}
                    onAccountChange={setNewAccount}
                    onSecretChange={setNewSecret}
                    onSubmit={handleAdd}
                    onClose={() => setIsAdding(false)}
                />

                {/* Delete Confirmation */}
                <ConfirmationModal
                    isOpen={!!accountToDelete}
                    title="Xác nhận xóa tài khoản"
                    message={`Bạn có chắc chắn muốn xóa tài khoản "${accountToDelete?.serviceName}"? Hành động này không thể hoàn tác.`}
                    confirmLabel="Xóa"
                    isDestructive
                    isLoading={isDeleting}
                    onConfirm={confirmDelete}
                    onCancel={() => setAccountToDelete(null)}
                />
            </div>
        </div>
    );
}
