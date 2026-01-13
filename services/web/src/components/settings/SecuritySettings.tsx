import { useState } from "react";
import type { FormEvent } from "react";
import { GlassCard } from "../ui/GlassCard";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { api } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import { PasskeyManager } from "../Auth/PasskeyManager";
import { TelegramSection } from "./TelegramSection";

interface UserProfile {
    twoFactorEnabled: boolean;
}

interface SecuritySettingsProps {
    profile: UserProfile | null;
    loadProfile: () => void;
}

export function SecuritySettings({ profile, loadProfile }: SecuritySettingsProps) {
    const { token } = useAuth();

    // Password change state
    const [password, setPassword] = useState("");
    const [passwordMsg, setPasswordMsg] = useState("");
    const [passwordErr, setPasswordErr] = useState("");
    const [passwordBusy, setPasswordBusy] = useState(false);

    // 2FA state
    const [twoFAStep, setTwoFAStep] = useState<"idle" | "setup" | "verify" | "backup">("idle");
    const [qrCode, setQrCode] = useState("");
    const [totpSecret, setTotpSecret] = useState("");
    const [verifyCode, setVerifyCode] = useState("");
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [twoFABusy, setTwoFABusy] = useState(false);
    const [twoFAError, setTwoFAError] = useState("");
    const [showDisable2FAConfirm, setShowDisable2FAConfirm] = useState(false);
    const [twoFAPassword, setTwoFAPassword] = useState("");

    const handlePasswordChange = async (e: FormEvent) => {
        e.preventDefault();
        if (!password || password.length < 6) {
            setPasswordErr("Mật khẩu phải có ít nhất 6 ký tự");
            return;
        }
        setPasswordBusy(true);
        setPasswordMsg("");
        setPasswordErr("");
        try {
            await api("/auth/change-password", { method: "POST", token, body: { newPassword: password } });
            setPasswordMsg("Cập nhật mật khẩu thành công!");
            setPassword("");
            toast.success("Đã đổi mật khẩu");
        } catch (error) {
            setPasswordErr(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setPasswordBusy(false);
        }
    };

    const setup2FA = async () => {
        setTwoFABusy(true);
        setTwoFAError("");
        try {
            const res = await api<{ qrCode: string; secret: string }>("/auth/2fa/setup", { method: "POST", token });
            setQrCode(res.qrCode);
            setTotpSecret(res.secret);
            setTwoFAStep("setup");
        } catch (error) {
            setTwoFAError(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTwoFABusy(false);
        }
    };

    const enable2FA = async () => {
        if (verifyCode.length !== 6) {
            setTwoFAError("Vui lòng nhập mã 6 chữ số");
            return;
        }
        setTwoFABusy(true);
        setTwoFAError("");
        try {
            const res = await api<{ ok: boolean; backupCodes: string[] }>("/auth/2fa/enable", {
                method: "POST",
                token,
                body: { code: verifyCode }
            });
            setBackupCodes(res.backupCodes);
            setTwoFAStep("backup");
            toast.success("Đã bật 2FA!");
            loadProfile();
        } catch (error) {
            setTwoFAError(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTwoFABusy(false);
        }
    };

    const confirmDisable2FA = async () => {
        if (!twoFAPassword) {
            setTwoFAError("Vui lòng nhập mật khẩu");
            return;
        }
        setTwoFABusy(true);
        setTwoFAError("");
        try {
            await api("/auth/2fa/disable", { method: "POST", token, body: { password: twoFAPassword } });
            toast.success("Đã tắt 2FA");
            setTwoFAStep("idle");
            setShowDisable2FAConfirm(false);
            setTwoFAPassword("");
            loadProfile();
        } catch (error) {
            setTwoFAError(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTwoFABusy(false);
        }
    };

    const getPasswordStrength = (pwd: string) => {
        if (!pwd) return { score: 0, label: '', color: '' };
        let score = 0;
        if (pwd.length >= 6) score++;
        if (pwd.length >= 10) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;

        if (score <= 2) return { score, label: 'Yếu', color: 'bg-danger' };
        if (score <= 3) return { score, label: 'Trung bình', color: 'bg-warning' };
        if (score <= 4) return { score, label: 'Tốt', color: 'bg-success' };
        return { score, label: 'Mạnh', color: 'bg-success' };
    };

    const passwordStrength = getPasswordStrength(password);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div>
                <h2 className="text-3xl font-bold text-nebula-text mb-2 tracking-tight">Bảo mật</h2>
                <p className="text-nebula-text-muted font-body">Bảo vệ tài khoản của bạn với các tiêu chuẩn bảo mật hiện đại.</p>
            </div>

            {/* Security Status Summary */}
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
                        <button className="text-xs bg-nebula-elevated hover:bg-nebula-surface px-3 py-1 rounded text-nebula-text border border-nebula-border transition-colors">Cập nhật</button>
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
                            onClick={profile?.twoFactorEnabled ? () => setShowDisable2FAConfirm(true) : setup2FA}
                            className="text-xs bg-nebula-elevated hover:bg-nebula-surface px-3 py-1 rounded text-nebula-text border border-nebula-border transition-colors"
                        >
                            {profile?.twoFactorEnabled ? 'Quản lý' : 'Cài đặt'}
                        </button>
                    </div>
                </div>
            </section>

            {/* Change Password */}
            <GlassCard className="p-6 bg-nebula-surface/80 border border-nebula-border shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-nebula-text-muted">key</span>
                    <h3 className="text-lg font-semibold text-nebula-text">Đổi mật khẩu</h3>
                </div>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                    {/* Hidden username field for browser accessibility */}
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

            {/* 2FA Section Detailed */}
            {twoFAStep !== 'idle' && (
                <GlassCard className="p-6 border-nebula-violet/30 bg-nebula-surface/80 shadow-sm">
                    <h3 className="text-lg font-semibold text-nebula-text mb-4">Cài đặt xác thực 2 yếu tố</h3>

                    {twoFAError && <p className="text-sm mb-3 text-danger">{twoFAError}</p>}

                    {twoFAStep === 'setup' && (
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
                                <Button onClick={enable2FA} disabled={twoFABusy || verifyCode.length !== 6}>
                                    {twoFABusy ? "Đang xác thực..." : "Xác nhận"}
                                </Button>
                                <Button onClick={() => setTwoFAStep("idle")} variant="secondary">
                                    Hủy
                                </Button>
                            </div>
                        </div>
                    )}

                    {twoFAStep === 'backup' && (
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
                            <Button onClick={() => setTwoFAStep("idle")}>
                                Tôi đã lưu chúng
                            </Button>
                        </div>
                    )}
                </GlassCard>
            )}

            {showDisable2FAConfirm && (
                <GlassCard className="p-6 border-danger/30 bg-nebula-surface/80 shadow-sm">
                    <h3 className="text-lg font-semibold text-nebula-text mb-2">Tắt 2FA</h3>
                    <p className="text-nebula-text-muted text-sm mb-4">Nhập mật khẩu của bạn để xác nhận tắt 2FA.</p>
                    <div className="flex gap-3">
                        <Input
                            type="password"
                            placeholder="Mật khẩu hiện tại"
                            value={twoFAPassword}
                            onChange={(e) => setTwoFAPassword(e.target.value)}
                        />
                        <Button onClick={confirmDisable2FA} variant="danger" disabled={twoFABusy}>
                            Tắt
                        </Button>
                        <Button onClick={() => setShowDisable2FAConfirm(false)} variant="secondary">
                            Hủy
                        </Button>
                    </div>
                </GlassCard>
            )}

            <PasskeyManager />

            {/* Telegram Account Linking */}
            <TelegramSection />
        </div>
    );
}
