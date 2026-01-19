/**
 * Verified Emails Section component
 * Displays verified emails and verification form
 */
import type { VerifyStep } from './hooks';

interface VerifiedEmailsSectionProps {
    verifiedEmails: string[];
    verifyEmail: string;
    verifyCode: string;
    verifyStep: VerifyStep;
    verifyBusy: boolean;
    onVerifyEmailChange: (email: string) => void;
    onVerifyCodeChange: (code: string) => void;
    onSendVerification: () => void;
    onConfirmVerification: () => void;
    onCancelVerification: () => void;
    onRemoveEmail: (email: string) => void;
}

export function VerifiedEmailsSection({
    verifiedEmails,
    verifyEmail,
    verifyCode,
    verifyStep,
    verifyBusy,
    onVerifyEmailChange,
    onVerifyCodeChange,
    onSendVerification,
    onConfirmVerification,
    onCancelVerification,
    onRemoveEmail
}: VerifiedEmailsSectionProps) {
    return (
        <div className="glass-card">
            <div className="glass-card-header">
                <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--nebula-text)' }}>
                    <svg className="w-5 h-5" style={{ color: 'var(--nebula-success)' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Email đích đã xác minh
                </h2>
            </div>
            <div className="glass-card-body">
                <p className="text-sm mb-4" style={{ color: 'var(--nebula-text-muted)' }}>
                    Bạn chỉ có thể chuyển tiếp email đến các địa chỉ đã được xác minh.
                </p>

                {/* Verified emails list */}
                {verifiedEmails.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {verifiedEmails.map((email) => (
                            <div key={email} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--nebula-success)' }}>
                                <span className="font-medium">{email}</span>
                                <button
                                    onClick={() => onRemoveEmail(email)}
                                    className="hover:text-[var(--nebula-error)] transition-colors"
                                    title="Xóa email này"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add email form */}
                {verifyStep === "idle" && (
                    <div className="flex gap-2">
                        <input
                            type="email"
                            value={verifyEmail}
                            onChange={(e) => onVerifyEmailChange(e.target.value)}
                            placeholder="Nhập email cá nhân của bạn"
                            className="input-nebula flex-1 max-w-sm"
                        />
                        <button onClick={onSendVerification} disabled={verifyBusy || !verifyEmail} className="btn-nebula btn-nebula-primary">
                            {verifyBusy ? "Đang gửi..." : "Thêm email"}
                        </button>
                    </div>
                )}

                {verifyStep === "code" && (
                    <div className="p-4 rounded-xl" style={{ background: 'var(--nebula-glow-cyan)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                        <p className="text-sm mb-3" style={{ color: 'var(--nebula-cyan)' }}>
                            Mã xác minh đã được gửi tới <strong>{verifyEmail}</strong>
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={verifyCode}
                                onChange={(e) => onVerifyCodeChange(e.target.value)}
                                placeholder="Nhập mã 6 số"
                                className="input-nebula w-32 text-center tracking-widest font-mono"
                                maxLength={6}
                            />
                            <button onClick={onConfirmVerification} disabled={verifyBusy || verifyCode.length !== 6} className="btn-nebula btn-nebula-primary">
                                {verifyBusy ? "Đang xác minh..." : "Xác nhận"}
                            </button>
                            <button onClick={onCancelVerification} className="btn-nebula btn-nebula-secondary">
                                Hủy
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
