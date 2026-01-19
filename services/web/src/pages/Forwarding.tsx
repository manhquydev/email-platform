/**
 * Forwarding Page - Email forwarding rules management
 * Refactored to use modular hooks and components
 */
import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { getFriendlyErrorMessage } from "../utils/errorMapping";
import { ConfirmationModal } from "../components/ConfirmationModal";

// Import modular components
import {
    useForwardingData,
    useEmailVerification,
    useForwardingRules,
    VerifiedEmailsSection,
    ForwardingRulesList,
    RuleModal
} from "./forwarding-modules";

export function Forwarding() {
    const { token } = useAuth();

    // Use modular hooks
    const { verifiedEmails, rules, telegramLinked, loading, loadData } = useForwardingData();
    const {
        verifyEmail, verifyCode, verifyStep, verifyBusy,
        setVerifyEmail, setVerifyCode, sendVerification,
        confirmVerification, cancelVerification
    } = useEmailVerification();
    const {
        showRuleModal, editingRule, ruleForm, ruleBusy,
        ruleToDelete, isDeleting: isRuleDeleting,
        openRuleModal, closeRuleModal, setRuleForm,
        saveRule, toggleRule, deleteRule, confirmDeleteRule, cancelDeleteRule
    } = useForwardingRules();

    // Email deletion state
    const [emailToDelete, setEmailToDelete] = useState<string | null>(null);
    const [isEmailDeleting, setIsEmailDeleting] = useState(false);

    // Email removal handler
    const confirmRemoveEmail = async () => {
        if (!emailToDelete) return;
        setIsEmailDeleting(true);
        try {
            await api(`/forwarding/emails/${encodeURIComponent(emailToDelete)}`, {
                method: "DELETE",
                token
            });
            toast.success("Đã xóa email");
            setEmailToDelete(null);
            loadData();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setIsEmailDeleting(false);
        }
    };

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
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="page-header-title">Email Forwarding</h1>
                                <p className="page-header-subtitle">Tự động chuyển tiếp email đến địa chỉ cá nhân</p>
                            </div>
                        </div>
                        <button
                            onClick={() => openRuleModal(undefined, verifiedEmails[0])}
                            disabled={verifiedEmails.length === 0}
                            className="btn-nebula btn-nebula-primary"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Thêm quy tắc
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
                    {/* Verified Emails Section */}
                    <VerifiedEmailsSection
                        verifiedEmails={verifiedEmails}
                        verifyEmail={verifyEmail}
                        verifyCode={verifyCode}
                        verifyStep={verifyStep}
                        verifyBusy={verifyBusy}
                        onVerifyEmailChange={setVerifyEmail}
                        onVerifyCodeChange={setVerifyCode}
                        onSendVerification={sendVerification}
                        onConfirmVerification={() => confirmVerification(loadData)}
                        onCancelVerification={cancelVerification}
                        onRemoveEmail={(email) => setEmailToDelete(email)}
                    />

                    {/* Forwarding Rules Section */}
                    <ForwardingRulesList
                        rules={rules}
                        verifiedEmails={verifiedEmails}
                        onCreateRule={() => openRuleModal(undefined, verifiedEmails[0])}
                        onEditRule={(rule) => openRuleModal(rule)}
                        onToggleRule={(rule) => toggleRule(rule, loadData)}
                        onDeleteRule={deleteRule}
                    />

                    {/* Info Card */}
                    <InfoCard />
                </div>

                {/* Rule Modal */}
                <RuleModal
                    isOpen={showRuleModal}
                    editingRule={editingRule}
                    ruleForm={ruleForm}
                    ruleBusy={ruleBusy}
                    verifiedEmails={verifiedEmails}
                    telegramLinked={telegramLinked}
                    onFormChange={setRuleForm}
                    onSave={() => saveRule(loadData)}
                    onClose={closeRuleModal}
                />

                {/* Confirmation Modals */}
                <ConfirmationModal
                    isOpen={!!emailToDelete}
                    title="Xác nhận xóa email"
                    message={`Xóa ${emailToDelete} khỏi danh sách đích chuyển tiếp?`}
                    confirmLabel="Xóa"
                    isDestructive
                    isLoading={isEmailDeleting}
                    onConfirm={confirmRemoveEmail}
                    onCancel={() => setEmailToDelete(null)}
                />

                <ConfirmationModal
                    isOpen={!!ruleToDelete}
                    title="Xác nhận xóa quy tắc"
                    message={`Bạn có chắc chắn muốn xóa quy tắc "${ruleToDelete?.name}"?`}
                    confirmLabel="Xóa"
                    isDestructive
                    isLoading={isRuleDeleting}
                    onConfirm={() => confirmDeleteRule(loadData)}
                    onCancel={cancelDeleteRule}
                />
            </div>
        </div>
    );
}

// Info Card Component
function InfoCard() {
    return (
        <div className="glass-card">
            <div className="glass-card-body">
                <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--nebula-text)' }}>
                    <span>💡</span> Cách hoạt động
                </h3>
                <ul className="space-y-2 text-sm" style={{ color: 'var(--nebula-text-muted)' }}>
                    <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full mt-2" style={{ background: 'var(--nebula-violet)' }}></span>
                        <span>Khi có email đến hộp thư tạm thời, hệ thống sẽ kiểm tra các quy tắc</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full mt-2" style={{ background: 'var(--nebula-cyan)' }}></span>
                        <span>Nếu email khớp với điều kiện, nó sẽ được chuyển tiếp đến email đích</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full mt-2" style={{ background: 'var(--nebula-pink)' }}></span>
                        <span>Mã OTP sẽ được tự động trích xuất và hiển thị nổi bật</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
