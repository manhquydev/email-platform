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
        <section className="glass-panel rounded-xl p-6 bg-gradient-to-br from-nebula-violet/10 to-transparent border-t-2 border-t-nebula-violet/50 relative overflow-hidden bg-nebula-surface/80 border border-nebula-border shadow-sm">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-nebula-violet/20 rounded-full blur-2xl"></div>
            <h3 className="text-lg font-bold text-nebula-text mb-4 relative z-10">Trạng thái bảo mật</h3>
            <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between p-3 rounded-lg bg-nebula-elevated border border-nebula-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-success/10 text-success">
                            <span className="material-symbols-outlined text-[18px]">lock</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-nebula-text">Mật khẩu</span>
                            <span className="text-xs text-nebula-text-muted">An toàn</span>
                        </div>
                    </div>
                    <button
                        onClick={onUpdatePassword}
                        className="text-xs bg-nebula-elevated hover:bg-nebula-surface px-3 py-1 rounded text-nebula-text border border-nebula-border transition-colors"
                    >Cập nhật</button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-nebula-elevated border border-nebula-border">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${profile?.twoFactorEnabled ? 'bg-nebula-violet/10 text-nebula-violet' : 'bg-nebula-elevated text-nebula-text-muted'}`}>
                            <span className="material-symbols-outlined text-[18px]">phonelink_lock</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-nebula-text">Xác thực 2FA</span>
                            <span className={`text-xs flex items-center gap-1 ${profile?.twoFactorEnabled ? 'text-success' : 'text-nebula-text-muted'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${profile?.twoFactorEnabled ? 'bg-success' : 'bg-nebula-text-muted'}`}></span>
                                {profile?.twoFactorEnabled ? 'Đã bật' : 'Đã tắt'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={profile?.twoFactorEnabled ? onManage2FA : onSetup2FA}
                        className="text-xs bg-nebula-elevated hover:bg-nebula-surface px-3 py-1 rounded text-nebula-text border border-nebula-border transition-colors"
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
        <GlassCard className="p-6 bg-nebula-surface/80 border border-nebula-border shadow-sm">
            <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-nebula-text-muted">key</span>
                <h3 className="text-lg font-semibold text-nebula-text">Đổi mật khẩu</h3>
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
                                <div className="flex-1 h-1.5 rounded-full bg-nebula-elevated overflow-hidden">
                                    <div
                                        className={`h-full transition-all ${passwordStrength.color}`}
                                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                                    />
                                </div>
                                <span className="text-xs font-medium text-nebula-text-muted">{passwordStrength.label}</span>
                            </div>
                        </div>
                    )}
                </div>
                <Button type="submit" disabled={passwordBusy} isLoading={passwordBusy}>
                    Cập nhật mật khẩu
                </Button>
                {passwordMsg && <p className="text-sm text-success">{passwordMsg}</p>}
                {passwordErr && <p className="text-sm text-danger">{passwordErr}</p>}
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
        <GlassCard className="p-6 border-nebula-violet/30 bg-nebula-surface/80 shadow-sm">
            <h3 className="text-lg font-semibold text-nebula-text mb-4">Cài đặt xác thực 2 yếu tố</h3>
            {error && <p className="text-sm mb-3 text-danger">{error}</p>}

            {step === 'setup' && (
                <div className="space-y-4">
                    <p className="text-nebula-text-muted">Quét mã QR này bằng ứng dụng xác thực của bạn:</p>
                    <div className="p-4 rounded-xl inline-block bg-white border border-nebula-border">
                        <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                    </div>
                    <p className="text-xs text-nebula-text-muted">
                        Khóa thủ công: <code className="px-2 py-1 rounded bg-nebula-elevated text-nebula-text">{totpSecret}</code>
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
                    <div className="p-4 rounded-xl bg-warning/10 border border-warning/30">
                        <p className="text-sm font-medium mb-2 text-warning">⚠️ Lưu các mã dự phòng này!</p>
                        <p className="text-xs mb-3 text-nebula-text-muted">
                            Bạn sẽ không thấy lại chúng. Sử dụng chúng để đăng nhập nếu bạn mất quyền truy cập vào thiết bị.
                        </p>
                        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                            {backupCodes.map((code, i) => (
                                <div key={i} className="px-3 py-2 rounded bg-nebula-elevated text-nebula-text border border-nebula-border">
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
        <GlassCard className="p-6 border-danger/30 bg-nebula-surface/80 shadow-sm">
            <h3 className="text-lg font-semibold text-nebula-text mb-2">Tắt 2FA</h3>
            <p className="text-nebula-text-muted text-sm mb-4">Nhập mật khẩu của bạn để xác nhận tắt 2FA.</p>
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
