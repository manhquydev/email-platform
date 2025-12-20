import { useState, useEffect, useCallback, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { getFriendlyErrorMessage } from "../utils/errorMapping";
import toast from "react-hot-toast";
import { AppShell } from "../layouts/AppShell";

interface UserProfile {
    id: string;
    email: string;
    role: string;
    createdAt: string;
    emailVerified: string | null;
    twoFactorEnabled: boolean;
    tier: string;
    _count: { domains: number; inboxes: number };
}

type SettingsTab = 'account' | 'security' | 'notifications';

export function Settings() {
    const { token, user } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<SettingsTab>('account');

    // Password change
    const [password, setPassword] = useState("");
    const [passwordMsg, setPasswordMsg] = useState("");
    const [passwordErr, setPasswordErr] = useState("");
    const [passwordBusy, setPasswordBusy] = useState(false);

    // 2FA states
    const [twoFAStep, setTwoFAStep] = useState<"idle" | "setup" | "verify" | "backup">("idle");
    const [qrCode, setQrCode] = useState("");
    const [totpSecret, setTotpSecret] = useState("");
    const [verifyCode, setVerifyCode] = useState("");
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [twoFABusy, setTwoFABusy] = useState(false);
    const [twoFAError, setTwoFAError] = useState("");

    // Telegram integration states
    const [telegramStatus, setTelegramStatus] = useState<{
        linked: boolean;
        linkedAt?: string;
        notifyOnEmail: boolean;
    } | null>(null);
    const [telegramLinkToken, setTelegramLinkToken] = useState<string | null>(null);
    const [telegramBotLink, setTelegramBotLink] = useState<string | null>(null);
    const [telegramBusy, setTelegramBusy] = useState(false);

    const loadProfile = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await api<{ user: UserProfile }>("/auth/me", { token });
            setProfile(res.user);
        } catch {
            setProfile({
                id: user?.id || "",
                email: user?.email || "",
                role: user?.role || "USER",
                createdAt: new Date().toISOString(),
                emailVerified: null,
                twoFactorEnabled: false,
                tier: "FREE",
                _count: { domains: 0, inboxes: 0 }
            });
        } finally {
            setLoading(false);
        }
    }, [token, user]);

    useEffect(() => {
        loadProfile();
        loadTelegramStatus();
    }, [loadProfile]);

    const loadTelegramStatus = async () => {
        if (!token) return;
        try {
            const status = await api<{ linked: boolean; linkedAt?: string; notifyOnEmail: boolean }>(
                "/telegram/status",
                { token }
            );
            setTelegramStatus(status);
        } catch {
            // Telegram not configured, ignore
        }
    };

    const generateTelegramLink = async () => {
        setTelegramBusy(true);
        try {
            const res = await api<{ token: string; botLink: string }>(
                "/telegram/link-token",
                { method: "POST", token }
            );
            setTelegramLinkToken(res.token);
            setTelegramBotLink(res.botLink);
            toast.success("Mã liên kết đã được tạo!");
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTelegramBusy(false);
        }
    };

    const unlinkTelegram = async () => {
        if (!confirm("Bạn có chắc muốn hủy liên kết Telegram?")) return;
        setTelegramBusy(true);
        try {
            await api("/telegram/unlink", { method: "DELETE", token });
            setTelegramStatus({ linked: false, notifyOnEmail: true });
            toast.success("Đã hủy liên kết Telegram");
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTelegramBusy(false);
        }
    };

    const toggleTelegramNotify = async () => {
        if (!telegramStatus) return;
        setTelegramBusy(true);
        try {
            await api("/telegram/preferences", {
                method: "PATCH",
                token,
                body: { notifyOnEmail: !telegramStatus.notifyOnEmail }
            });
            setTelegramStatus(prev => prev ? { ...prev, notifyOnEmail: !prev.notifyOnEmail } : null);
            toast.success(telegramStatus.notifyOnEmail ? "Đã tắt thông báo" : "Đã bật thông báo");
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTelegramBusy(false);
        }
    };

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
            setPasswordMsg("Đã cập nhật mật khẩu thành công!");
            setPassword("");
            toast.success("Mật khẩu đã được thay đổi");
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
            toast.success("2FA đã được kích hoạt!");
            loadProfile();
        } catch (error) {
            setTwoFAError(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTwoFABusy(false);
        }
    };

    const disable2FA = async () => {
        const pwd = prompt("Nhập mật khẩu để tắt 2FA:");
        if (!pwd) return;

        setTwoFABusy(true);
        setTwoFAError("");
        try {
            await api("/auth/2fa/disable", { method: "POST", token, body: { password: pwd } });
            toast.success("2FA đã được tắt");
            setTwoFAStep("idle");
            loadProfile();
        } catch (error) {
            setTwoFAError(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTwoFABusy(false);
        }
    };

    // Password strength indicator
    const getPasswordStrength = (pwd: string) => {
        if (!pwd) return { score: 0, label: '', color: '' };
        let score = 0;
        if (pwd.length >= 6) score++;
        if (pwd.length >= 10) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;

        if (score <= 2) return { score, label: 'Yếu', color: 'bg-red-500' };
        if (score <= 3) return { score, label: 'Trung bình', color: 'bg-yellow-500' };
        if (score <= 4) return { score, label: 'Tốt', color: 'bg-green-500' };
        return { score, label: 'Mạnh', color: 'bg-green-600' };
    };

    const passwordStrength = getPasswordStrength(password);

    if (loading) {
        return (
            <AppShell>
                <div className="flex items-center justify-center h-full" style={{ background: 'var(--nebula-void)' }}>
                    <div className="spinner" />
                </div>
            </AppShell>
        );
    }

    const tabs = [
        { id: 'account' as const, label: 'Tài khoản', icon: UserIcon },
        { id: 'security' as const, label: 'Bảo mật', icon: ShieldIcon },
        { id: 'notifications' as const, label: 'Thông báo', icon: BellIcon },
    ];

    return (
        <AppShell>
            <div className="flex-1 overflow-y-auto" style={{ background: 'var(--nebula-void)' }}>
                {/* Page Header */}
                <div className="page-header">
                    <div className="page-header-content">
                        <div className="flex items-center">
                            <div className="page-header-icon">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="page-header-title">Cài đặt</h1>
                                <p className="page-header-subtitle">Quản lý tài khoản và tùy chọn bảo mật</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-4xl mx-auto px-6 py-8">
                    {/* Tabs */}
                    <div className="tabs-nebula">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`tab-nebula ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <tab.icon />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="space-y-6 animate-nebula-fade-in">
                        {/* Account Tab */}
                        {activeTab === 'account' && (
                            <>
                                {/* Profile Card */}
                                <div className="glass-card">
                                    <div className="glass-card-header">
                                        <h3 className="font-semibold" style={{ color: 'var(--nebula-text)' }}>Thông tin tài khoản</h3>
                                    </div>
                                    <div className="glass-card-body">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold" style={{ background: 'linear-gradient(135deg, var(--nebula-violet), var(--nebula-pink))' }}>
                                                {profile?.email?.charAt(0).toUpperCase() || "U"}
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-semibold" style={{ color: 'var(--nebula-text)' }}>{profile?.email?.split("@")[0]}</h2>
                                                <p style={{ color: 'var(--nebula-text-muted)' }}>{profile?.email}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="stat-card">
                                                <div className="stat-card-icon">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                                    </svg>
                                                </div>
                                                <div className="stat-card-label">Vai trò</div>
                                                <div className="stat-card-value text-lg">{profile?.role === "ADMIN" ? "Admin" : "User"}</div>
                                            </div>
                                            <div className="stat-card">
                                                <div className="stat-card-icon">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                                                    </svg>
                                                </div>
                                                <div className="stat-card-label">Gói dịch vụ</div>
                                                <div className="stat-card-value text-lg">{profile?.tier || "FREE"}</div>
                                            </div>
                                            <div className="stat-card">
                                                <div className="stat-card-icon">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                                                    </svg>
                                                </div>
                                                <div className="stat-card-label">Domains</div>
                                                <div className="stat-card-value text-lg">{profile?._count?.domains ?? 0}</div>
                                            </div>
                                            <div className="stat-card">
                                                <div className="stat-card-icon">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                                    </svg>
                                                </div>
                                                <div className="stat-card-label">Hộp thư</div>
                                                <div className="stat-card-value text-lg">{profile?._count?.inboxes ?? 0}</div>
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--nebula-border)' }}>
                                            <div className="flex items-center justify-between text-sm">
                                                <span style={{ color: 'var(--nebula-text-muted)' }}>Ngày đăng ký</span>
                                                <span style={{ color: 'var(--nebula-text)' }}>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("vi-VN") : "—"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Links */}
                                <div className="glass-card">
                                    <div className="glass-card-header">
                                        <h3 className="font-semibold" style={{ color: 'var(--nebula-text)' }}>Truy cập nhanh</h3>
                                    </div>
                                    <div className="glass-card-body">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <Link to="/app" className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-[var(--nebula-elevated)] transition-colors text-center">
                                                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--nebula-elevated)' }}>
                                                    <svg className="w-5 h-5" style={{ color: 'var(--nebula-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                                    </svg>
                                                </div>
                                                <span className="text-sm font-medium" style={{ color: 'var(--nebula-text)' }}>Inbox</span>
                                            </Link>
                                            <Link to="/my-domains" className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-[var(--nebula-elevated)] transition-colors text-center">
                                                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--nebula-elevated)' }}>
                                                    <svg className="w-5 h-5" style={{ color: 'var(--nebula-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3" />
                                                    </svg>
                                                </div>
                                                <span className="text-sm font-medium" style={{ color: 'var(--nebula-text)' }}>Domains</span>
                                            </Link>
                                            <Link to="/authenticator" className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-[var(--nebula-elevated)] transition-colors text-center">
                                                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--nebula-elevated)' }}>
                                                    <svg className="w-5 h-5" style={{ color: 'var(--nebula-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                                    </svg>
                                                </div>
                                                <span className="text-sm font-medium" style={{ color: 'var(--nebula-text)' }}>2FA</span>
                                            </Link>
                                            <Link to="/forwarding" className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-[var(--nebula-elevated)] transition-colors text-center">
                                                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--nebula-elevated)' }}>
                                                    <svg className="w-5 h-5" style={{ color: 'var(--nebula-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                                                    </svg>
                                                </div>
                                                <span className="text-sm font-medium" style={{ color: 'var(--nebula-text)' }}>Forwarding</span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <>
                                {/* Change Password */}
                                <div className="glass-card">
                                    <div className="glass-card-header">
                                        <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--nebula-text)' }}>
                                            <svg className="w-5 h-5" style={{ color: 'var(--nebula-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                            </svg>
                                            Đổi mật khẩu
                                        </h3>
                                    </div>
                                    <div className="glass-card-body">
                                        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                                            <div>
                                                <label className="label-nebula">Mật khẩu mới</label>
                                                <input
                                                    type="password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder="Tối thiểu 6 ký tự"
                                                    className="input-nebula"
                                                    minLength={6}
                                                />
                                                {password && (
                                                    <div className="mt-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-1.5 rounded-full bg-[var(--nebula-elevated)] overflow-hidden">
                                                                <div
                                                                    className={`h-full transition-all ${passwordStrength.color}`}
                                                                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-medium" style={{ color: 'var(--nebula-text-muted)' }}>{passwordStrength.label}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <button type="submit" disabled={passwordBusy} className="btn-nebula btn-nebula-primary">
                                                {passwordBusy ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                                            </button>
                                            {passwordMsg && <p className="text-sm" style={{ color: 'var(--nebula-success)' }}>{passwordMsg}</p>}
                                            {passwordErr && <p className="text-sm" style={{ color: 'var(--nebula-error)' }}>{passwordErr}</p>}
                                        </form>
                                    </div>
                                </div>

                                {/* Two-Factor Authentication */}
                                <div className="glass-card">
                                    <div className="glass-card-header">
                                        <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--nebula-text)' }}>
                                            <svg className="w-5 h-5" style={{ color: 'var(--nebula-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                            </svg>
                                            Xác thực hai yếu tố (2FA)
                                        </h3>
                                        {profile?.twoFactorEnabled && (
                                            <span className="px-2 py-1 text-xs font-medium rounded-full" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--nebula-success)' }}>
                                                Đã bật
                                            </span>
                                        )}
                                    </div>
                                    <div className="glass-card-body">
                                        {twoFAError && <p className="text-sm mb-3" style={{ color: 'var(--nebula-error)' }}>{twoFAError}</p>}

                                        {/* Not enabled */}
                                        {!profile?.twoFactorEnabled && twoFAStep === "idle" && (
                                            <div className="space-y-4">
                                                <p style={{ color: 'var(--nebula-text-muted)' }}>
                                                    Bảo vệ tài khoản của bạn bằng xác thực hai yếu tố. Sử dụng ứng dụng như Google Authenticator.
                                                </p>
                                                <button onClick={setup2FA} disabled={twoFABusy} className="btn-nebula btn-nebula-primary">
                                                    {twoFABusy ? "Đang thiết lập..." : "Kích hoạt 2FA"}
                                                </button>
                                            </div>
                                        )}

                                        {/* Setup QR */}
                                        {twoFAStep === "setup" && (
                                            <div className="space-y-4">
                                                <p style={{ color: 'var(--nebula-text-muted)' }}>Quét mã QR bằng ứng dụng xác thực:</p>
                                                <div className="p-4 rounded-xl inline-block" style={{ background: 'white' }}>
                                                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                                                </div>
                                                <p className="text-xs" style={{ color: 'var(--nebula-text-muted)' }}>
                                                    Hoặc nhập thủ công: <code className="px-2 py-1 rounded" style={{ background: 'var(--nebula-elevated)' }}>{totpSecret}</code>
                                                </p>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="text"
                                                        value={verifyCode}
                                                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                                        placeholder="000000"
                                                        className="input-nebula w-32 text-center tracking-widest font-mono"
                                                        maxLength={6}
                                                    />
                                                    <button onClick={enable2FA} disabled={twoFABusy || verifyCode.length !== 6} className="btn-nebula btn-nebula-primary">
                                                        {twoFABusy ? "Đang xác minh..." : "Xác nhận"}
                                                    </button>
                                                    <button onClick={() => setTwoFAStep("idle")} className="btn-nebula btn-nebula-secondary">
                                                        Hủy
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Backup codes */}
                                        {twoFAStep === "backup" && (
                                            <div className="space-y-4">
                                                <div className="p-4 rounded-xl" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                                    <p className="text-sm font-medium mb-2" style={{ color: 'var(--nebula-warning)' }}>⚠️ Lưu mã dự phòng!</p>
                                                    <p className="text-xs mb-3" style={{ color: 'var(--nebula-text-muted)' }}>
                                                        Các mã này cho phép bạn đăng nhập nếu mất điện thoại. Mỗi mã chỉ dùng được một lần.
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                                                        {backupCodes.map((code, i) => (
                                                            <div key={i} className="px-3 py-2 rounded" style={{ background: 'var(--nebula-surface)', color: 'var(--nebula-text)' }}>
                                                                {code}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button onClick={() => setTwoFAStep("idle")} className="btn-nebula btn-nebula-primary">
                                                    Tôi đã lưu mã
                                                </button>
                                            </div>
                                        )}

                                        {/* Already enabled */}
                                        {profile?.twoFactorEnabled && twoFAStep === "idle" && (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2" style={{ color: 'var(--nebula-success)' }}>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="text-sm font-medium">2FA đã được kích hoạt</span>
                                                </div>
                                                <button onClick={disable2FA} disabled={twoFABusy} className="btn-nebula btn-nebula-secondary" style={{ color: 'var(--nebula-error)' }}>
                                                    {twoFABusy ? "Đang xử lý..." : "Tắt 2FA"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Notifications Tab */}
                        {activeTab === 'notifications' && (
                            <div className="glass-card">
                                <div className="glass-card-header">
                                    <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--nebula-text)' }}>
                                        <svg className="w-5 h-5" style={{ color: '#0088cc' }} viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                        </svg>
                                        Thông báo Telegram
                                    </h3>
                                </div>
                                <div className="glass-card-body">
                                    {telegramStatus?.linked ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2" style={{ color: 'var(--nebula-success)' }}>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-sm font-medium">Đã liên kết Telegram</span>
                                            </div>

                                            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--nebula-elevated)' }}>
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4" style={{ color: 'var(--nebula-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                                                    </svg>
                                                    <span className="text-sm" style={{ color: 'var(--nebula-text)' }}>Thông báo email mới</span>
                                                </div>
                                                <button
                                                    onClick={toggleTelegramNotify}
                                                    disabled={telegramBusy}
                                                    className={`relative w-11 h-6 rounded-full transition-colors ${telegramStatus.notifyOnEmail ? 'bg-[var(--nebula-success)]' : 'bg-[var(--nebula-border)]'}`}
                                                >
                                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${telegramStatus.notifyOnEmail ? 'translate-x-5' : ''}`} />
                                                </button>
                                            </div>

                                            <button
                                                onClick={unlinkTelegram}
                                                disabled={telegramBusy}
                                                className="btn-nebula btn-nebula-secondary"
                                                style={{ color: 'var(--nebula-error)' }}
                                            >
                                                {telegramBusy ? "Đang xử lý..." : "Hủy liên kết"}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <p style={{ color: 'var(--nebula-text-muted)' }}>
                                                Nhận thông báo tin nhắn mới qua Telegram Bot. Bạn sẽ được thông báo ngay khi có email đến, bao gồm mã OTP.
                                            </p>

                                            {telegramLinkToken ? (
                                                <div className="space-y-4">
                                                    <div className="p-4 rounded-xl" style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                                                        <p className="text-sm mb-2" style={{ color: 'var(--nebula-cyan)' }}>Mã liên kết của bạn:</p>
                                                        <div className="flex items-center gap-3">
                                                            <code className="text-2xl font-mono font-bold tracking-widest" style={{ color: 'var(--nebula-cyan)' }}>
                                                                {telegramLinkToken}
                                                            </code>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(telegramLinkToken);
                                                                    toast.success("Đã copy mã!");
                                                                }}
                                                                className="btn-nebula btn-nebula-ghost btn-nebula-icon"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                        <p className="text-xs mt-2" style={{ color: 'var(--nebula-text-muted)' }}>Mã có hiệu lực trong 15 phút</p>
                                                    </div>

                                                    <div className="flex gap-3">
                                                        <a
                                                            href={telegramBotLink || '#'}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn-nebula btn-nebula-primary"
                                                        >
                                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                                            </svg>
                                                            Mở Telegram Bot
                                                        </a>
                                                        <button
                                                            onClick={() => {
                                                                setTelegramLinkToken(null);
                                                                setTelegramBotLink(null);
                                                            }}
                                                            className="btn-nebula btn-nebula-secondary"
                                                        >
                                                            Hủy
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={generateTelegramLink}
                                                    disabled={telegramBusy}
                                                    className="btn-nebula btn-nebula-primary"
                                                >
                                                    {telegramBusy ? "Đang tạo..." : "Liên kết Telegram"}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppShell>
    );
}

// Tab Icons
function UserIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    );
}

function ShieldIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
    );
}

function BellIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
    );
}
