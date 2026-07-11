/**
 * UI components for SecuritySettings
 */
import { GlassCard } from "../../ui/GlassCard";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import type { UserProfile, PasswordStrength, TwoFAStep } from "./security-types";
import { getPasswordStrength } from "./security-types";

/** Security Status Summary Card */
interface SecurityStatusProps {
    profile: UserProfile | null;
    onSetup2FA: () => void;
    onManage2FA: () => void;
    onUpdatePassword: () => void;
}

export function SecurityStatusCard({ profile, onSetup2FA, onManage2FA, onUpdatePassword }: SecurityStatusProps) {
    return (
        <section className="rounded-xl p-6 bg-gradient-to-br from-semantic-accent/10 to-transparent border-t-2 border-t-semantic-accent/50 relative overflow-hidden bg-semantic-bg-elevated border border-semantic-border shadow-semantic-sm">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-semantic-accent/20 rounded-full blur-2xl"></div>
            <h3 className="text-lg font-bold text-semantic-text-main mb-4 relative z-10">Trạng thái bảo mật</h3>
            <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between p-3 rounded-lg bg-semantic-bg-secondary border border-semantic-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-semantic-success-subtle text-semantic-success">
                            <span className="material-symbols-outlined text-[18px]">lock</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-semantic-text-main">Mật khẩu</span>
                            <span className="text-xs text-semantic-text-muted">An toàn</span>
                        </div>
                    </div>
                    <button
                        onClick={onUpdatePassword}
                        className="text-xs bg-semantic-bg-secondary hover:bg-semantic-bg-hover px-3 py-1 rounded text-semantic-text-main border border-semantic-border transition-colors"
                    >Cập nhật</button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-semantic-bg-secondary border border-semantic-border">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${profile?.twoFactorEnabled ? 'bg-semantic-accent-subtle text-semantic-accent-text' : 'bg-semantic-bg-secondary text-semantic-text-muted'}`}>
                            <span className="material-symbols-outlined text-[18px]">phonelink_lock</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-semantic-text-main">Xác thực 2FA</span>
                            <span className={`text-xs flex items-center gap-1 ${profile?.twoFactorEnabled ? 'text-semantic-success' : 'text-semantic-text-muted'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${profile?.twoFactorEnabled ? 'bg-semantic-success' : 'bg-semantic-text-muted'}`}></span>
                                {profile?.twoFactorEnabled ? 'Đã bật' : 'Đã tắt'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={profile?.twoFactorEnabled ? onManage2FA : onSetup2FA}
                        className="text-xs bg-semantic-bg-secondary hover:bg-semantic-bg-hover px-3 py-1 rounded text-semantic-text-main border border-semantic-border transition-colors"
                    >
                        {profile?.twoFactorEnabled ? 'Quản lý' : 'Cài đặt'}
                    </button>
                </div>
            </div>
        </section>
    );
}

/** Password Change Form */
interface PasswordFormProps {
    password: string;
    setPassword: (val: string) => void;
    passwordMsg: string;
    passwordErr: string;
    passwordBusy: boolean;
    onSubmit: (e: React.FormEvent) => void;
}

export function PasswordChangeForm({ password, setPassword, passwordMsg, passwordErr, passwordBusy, onSubmit }: PasswordFormProps) {
    const passwordStrength: PasswordStrength = getPasswordStrength(password);

    return (
        <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-semantic-text-muted">key</span>
                <h3 className="text-lg font-semibold text-semantic-text-main">Đổi mật khẩu</h3>
            </div>
            <form onSubmit={onSubmit} className="space-y-4 max-w-md">
                <input type="text" autoComplete="username" className="hidden" aria-hidden="true" tabIndex={-1} />
                <div>
                    <Input
                        label="Mật khẩu mới"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự"
                        minLength={6}
                    />
                    {password && (
                        <div className="mt-2">
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-semantic-bg-secondary overflow-hidden">
                                    <div
                                        className={`h-full transition-all ${passwordStrength.color}`}
                                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                                    />
                                </div>
                                <span className="text-xs font-medium text-semantic-text-muted">{passwordStrength.label}</span>
                            </div>
                        </div>
                    )}
                </div>
                <Button type="submit" disabled={passwordBusy} isLoading={passwordBusy}>
                    Cập nhật mật khẩu
                </Button>
                {passwordMsg && <p className="text-sm text-semantic-success">{passwordMsg}</p>}
                {passwordErr && <p className="text-sm text-semantic-danger">{passwordErr}</p>}
            </form>
        </GlassCard>
    );
}

/** 2FA Setup Card */
interface TwoFASetupProps {
    step: TwoFAStep;
    qrCode: string;
    totpSecret: string;
    verifyCode: string;
    setVerifyCode: (val: string) => void;
    backupCodes: string[];
    busy: boolean;
    error: string;
    onEnable: () => void;
    onCancel: () => void;
    onDone: () => void;
}

export function TwoFASetupCard({ step, qrCode, totpSecret, verifyCode, setVerifyCode, backupCodes, busy, error, onEnable, onCancel, onDone }: TwoFASetupProps) {
    if (step === 'idle') return null;

    return (
        <GlassCard className="p-6 border-semantic-accent/30">
            <h3 className="text-lg font-semibold text-semantic-text-main mb-4">Cài đặt xác thực 2 yếu tố</h3>
            {error && <p className="text-sm mb-3 text-semantic-danger">{error}</p>}

            {step === 'setup' && (
                <div className="space-y-4">
                    <p className="text-semantic-text-muted">Quét mã QR này bằng ứng dụng xác thực của bạn:</p>
                    <div className="p-4 rounded-xl inline-block bg-white border border-semantic-border">
                        <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                    </div>
                    <p className="text-xs text-semantic-text-muted">
                        Khóa thủ công: <code className="px-2 py-1 rounded bg-semantic-bg-secondary text-semantic-text-main">{totpSecret}</code>
                    </p>
                    <div className="flex items-center gap-3">
                        <Input
                            value={verifyCode}
                            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder="000000"
                            className="w-32 text-center tracking-widest font-mono"
                            maxLength={6}
                        />
                        <Button onClick={onEnable} disabled={busy || verifyCode.length !== 6}>
                            {busy ? "Đang xác thực..." : "Xác nhận"}
                        </Button>
                        <Button onClick={onCancel} variant="secondary">Hủy</Button>
                    </div>
                </div>
            )}

            {step === 'backup' && (
                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-semantic-warning-subtle border border-semantic-warning/30">
                        <p className="text-sm font-medium mb-2 text-semantic-warning">⚠️ Lưu các mã dự phòng này!</p>
                        <p className="text-xs mb-3 text-semantic-text-muted">
                            Bạn sẽ không thấy lại chúng. Sử dụng chúng để đăng nhập nếu bạn mất quyền truy cập vào thiết bị.
                        </p>
                        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                            {backupCodes.map((code, i) => (
                                <div key={i} className="px-3 py-2 rounded bg-semantic-bg-secondary text-semantic-text-main border border-semantic-border">
                                    {code}
                                </div>
                            ))}
                        </div>
                    </div>
                    <Button onClick={onDone}>Tôi đã lưu chúng</Button>
                </div>
            )}
        </GlassCard>
    );
}

/** 2FA Disable Confirm Card */
interface Disable2FAProps {
    show: boolean;
    password: string;
    setPassword: (val: string) => void;
    busy: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function Disable2FACard({ show, password, setPassword, busy, onConfirm, onCancel }: Disable2FAProps) {
    if (!show) return null;

    return (
        <GlassCard className="p-6 border-semantic-danger/30">
            <h3 className="text-lg font-semibold text-semantic-text-main mb-2">Tắt 2FA</h3>
            <p className="text-semantic-text-muted text-sm mb-4">Nhập mật khẩu của bạn để xác nhận tắt 2FA.</p>
            <div className="flex gap-3">
                <Input
                    type="password"
                    placeholder="Mật khẩu hiện tại"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <Button onClick={onConfirm} variant="danger" disabled={busy}>Tắt</Button>
                <Button onClick={onCancel} variant="secondary">Hủy</Button>
            </div>
        </GlassCard>
    );
}
