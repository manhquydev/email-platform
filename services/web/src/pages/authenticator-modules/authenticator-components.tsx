/**
 * UI components for Authenticator page
 * OTP Card, Add Modal, Loading/Empty states
 */
import type { AuthenticatorAccount } from "./types";
import { getServiceColor } from "./types";

// --- Page Header ---
export interface AuthenticatorHeaderProps {
    onAdd: () => void;
}

export function AuthenticatorHeader({ onAdd }: AuthenticatorHeaderProps) {
    return (
        <div className="page-header">
            <div className="page-header-content">
                <div className="flex items-center">
                    <div className="page-header-icon animate-nebula-pulse">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="page-header-title">Authenticator Vault</h1>
                        <p className="page-header-subtitle">Quản lý mã OTP 2FA của bạn một cách an toàn</p>
                    </div>
                </div>
                <button onClick={onAdd} className="btn-nebula btn-nebula-primary">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Thêm tài khoản
                </button>
            </div>
        </div>
    );
}

// --- Loading Skeleton ---
export function AuthenticatorLoadingSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
                <div key={i} className="otp-card animate-pulse">
                    <div className="flex justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--nebula-elevated)]"></div>
                            <div>
                                <div className="h-4 w-20 bg-[var(--nebula-elevated)] rounded mb-2"></div>
                                <div className="h-3 w-32 bg-[var(--nebula-elevated)] rounded"></div>
                            </div>
                        </div>
                    </div>
                    <div className="h-12 bg-[var(--nebula-elevated)] rounded-lg my-6"></div>
                    <div className="h-1 bg-[var(--nebula-elevated)] rounded"></div>
                </div>
            ))}
        </div>
    );
}

// --- Empty State ---
export interface EmptyAuthenticatorStateProps {
    onAdd: () => void;
}

export function EmptyAuthenticatorState({ onAdd }: EmptyAuthenticatorStateProps) {
    return (
        <div className="empty-state-nebula">
            <div className="empty-state-nebula-icon">
                <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            </div>
            <h3 className="empty-state-nebula-title">Chưa có tài khoản nào</h3>
            <p className="empty-state-nebula-description">
                Thêm tài khoản 2FA đầu tiên của bạn để bắt đầu quản lý mã OTP một cách an toàn.
            </p>
            <button onClick={onAdd} className="btn-nebula btn-nebula-primary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Thêm tài khoản đầu tiên
            </button>
        </div>
    );
}

// --- OTP Card ---
export interface OTPCardProps {
    account: AuthenticatorAccount;
    code: string;
    timeLeft: number;
    copiedId: string | null;
    onCopy: (id: string, code: string) => void;
    onDelete: (account: AuthenticatorAccount) => void;
}

export function OTPCard({ account, code, timeLeft, copiedId, onCopy, onDelete }: OTPCardProps) {
    const formattedCode = code.length >= 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
    const serviceColor = getServiceColor(account.serviceName);
    const progressPercent = (timeLeft / 30) * 100;

    return (
        <div className="otp-card group animate-nebula-fade-in">
            {/* Header */}
            <div className="otp-card-header">
                <div className="otp-card-service">
                    <div className={`otp-card-icon ${serviceColor.bg}`}>
                        <span className="text-lg">{serviceColor.icon}</span>
                    </div>
                    <div>
                        <div className="otp-card-name">{account.serviceName}</div>
                        <div className="otp-card-account">{account.accountName || 'N/A'}</div>
                    </div>
                </div>
                <div className="otp-card-timer">
                    <span>{timeLeft}</span>
                    <svg className="otp-card-timer-ring" viewBox="0 0 36 36">
                        <circle
                            cx="18" cy="18" r="16"
                            fill="none"
                            stroke="var(--nebula-violet)"
                            strokeWidth="2"
                            strokeDasharray={`${progressPercent} 100`}
                            strokeLinecap="round"
                            transform="rotate(-90 18 18)"
                            style={{ transition: 'stroke-dasharray 1s linear' }}
                        />
                    </svg>
                </div>
            </div>

            {/* OTP Code */}
            <div
                className="otp-card-code cursor-pointer"
                onClick={() => onCopy(account.id, code)}
                title="Click để sao chép"
            >
                <div className={`otp-card-code-value ${copiedId === account.id ? 'text-[var(--nebula-success)]' : ''}`}>
                    {copiedId === account.id ? '✓ Đã sao chép' : formattedCode}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="otp-card-progress">
                <div className="otp-card-progress-bar" style={{ width: `${progressPercent}%` }} />
            </div>

            {/* Actions */}
            <div className="otp-card-actions">
                <button onClick={() => onCopy(account.id, code)} className="btn-nebula btn-nebula-secondary text-xs">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Sao chép
                </button>
                <button
                    onClick={() => onDelete(account)}
                    className="btn-nebula btn-nebula-ghost text-xs text-[var(--nebula-error)] hover:bg-red-500/10"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Xóa
                </button>
            </div>
        </div>
    );
}

// --- Add Account Modal ---
export interface AddAccountModalProps {
    isOpen: boolean;
    newService: string;
    newAccount: string;
    newSecret: string;
    onServiceChange: (v: string) => void;
    onAccountChange: (v: string) => void;
    onSecretChange: (v: string) => void;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    onClose: () => void;
}

export function AddAccountModal({
    isOpen, newService, newAccount, newSecret,
    onServiceChange, onAccountChange, onSecretChange, onSubmit, onClose
}: AddAccountModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-nebula-fade-in">
            <div className="glass-card-elevated w-full max-w-md animate-nebula-scale-in">
                <div className="glass-card-header">
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--nebula-text)' }}>Thêm tài khoản mới</h2>
                    <button onClick={onClose} className="btn-nebula btn-nebula-ghost btn-nebula-icon">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form onSubmit={onSubmit} className="glass-card-body space-y-4">
                    <div>
                        <label className="label-nebula">Tên dịch vụ *</label>
                        <input
                            className="input-nebula"
                            placeholder="VD: Google, GitHub, Facebook..."
                            required
                            value={newService}
                            onChange={e => onServiceChange(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label-nebula">Tên tài khoản</label>
                        <input
                            className="input-nebula"
                            placeholder="VD: user@example.com"
                            value={newAccount}
                            onChange={e => onAccountChange(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label-nebula">Secret Key *</label>
                        <input
                            className="input-nebula font-mono"
                            placeholder="Nhập mã Base32 secret"
                            required
                            value={newSecret}
                            onChange={e => onSecretChange(e.target.value.toUpperCase())}
                        />
                        <p className="text-xs mt-1" style={{ color: 'var(--nebula-text-muted)' }}>
                            Secret key từ ứng dụng hoặc trang web bạn muốn bảo vệ
                        </p>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-nebula btn-nebula-secondary">
                            Hủy
                        </button>
                        <button type="submit" className="btn-nebula btn-nebula-primary">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Lưu tài khoản
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
