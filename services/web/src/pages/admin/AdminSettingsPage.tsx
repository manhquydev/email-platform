import { useState, useEffect, useCallback, type FormEvent } from "react";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

export function AdminSettingsPage() {
    const { token } = useAuth();
    const [password, setPassword] = useState("");
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);
    const [profile, setProfile] = useState<{
        email: string;
        role: string;
        createdAt: string;
        twoFactorEnabled?: boolean;
        _count: { domains: number };
    } | null>(null);
    const [systemInfo, setSystemInfo] = useState<{
        userCount: number;
        domainCount: number;
        messageCount: number;
        recentLogins24h: number;
        serverTime: string;
    } | null>(null);

    // 2FA states
    const [twoFAStep, setTwoFAStep] = useState<"idle" | "setup" | "verify" | "backup">("idle");
    const [qrCode, setQrCode] = useState("");
    const [totpSecret, setTotpSecret] = useState("");
    const [verifyCode, setVerifyCode] = useState("");
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [twoFABusy, setTwoFABusy] = useState(false);
    const [twoFAError, setTwoFAError] = useState("");

    const loadProfile = useCallback(async () => {
        try {
            const profileRes = await api<{ user: typeof profile }>("/admin/profile", { token });
            setProfile(profileRes.user);
        } catch {
            // Silent fail
        }
    }, [token]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [profileRes, systemRes] = await Promise.all([
                    api<{ user: typeof profile }>("/admin/profile", { token }),
                    api<{ system: typeof systemInfo }>("/admin/system-info", { token })
                ]);
                setProfile(profileRes.user);
                setSystemInfo(systemRes.system);
            } catch {
                // Silent fail
            }
        };
        loadData();
    }, [token]);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!password || password.length < 6) {
            setErr("Mật khẩu phải có ít nhất 6 ký tự");
            return;
        }
        setBusy(true);
        setMsg("");
        setErr("");
        try {
            await api("/auth/change-password", { method: "POST", token, body: { newPassword: password } });
            setMsg("Đã cập nhật mật khẩu");
            setPassword("");
        } catch {
            setErr(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setBusy(false);
        }
    };

    // 2FA handlers
    const setup2FA = async () => {
        setTwoFABusy(true);
        setTwoFAError("");
        try {
            const res = await api<{ qrCode: string; secret: string }>("/auth/2fa/setup", { method: "POST", token });
            setQrCode(res.qrCode);
            setTotpSecret(res.secret);
            setTwoFAStep("setup");
        } catch {
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
        } catch {
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
        } catch {
            setTwoFAError(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTwoFABusy(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl">
            <div className="mb-6">
                <h1 className="text-xl font-semibold">Cài đặt</h1>
                <p className="text-sm text-muted mt-1">Quản lý tài khoản và hệ thống</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Admin Profile */}
                <div className="bg-surface border border-border rounded-lg p-5">
                    <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        Thông tin tài khoản
                    </h3>
                    {profile ? (
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted">Email</span>
                                <span className="font-medium">{profile.email}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Vai trò</span>
                                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-purple-50 text-purple-600">
                                    {profile.role}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Tạo tài khoản</span>
                                <span>{new Date(profile.createdAt).toLocaleDateString("vi-VN")}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Domains sở hữu</span>
                                <span>{profile._count.domains}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-muted">Đang tải...</div>
                    )}
                </div>

                {/* System Info */}
                <div className="bg-surface border border-border rounded-lg p-5">
                    <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
                        </svg>
                        Thông tin hệ thống
                    </h3>
                    {systemInfo ? (
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted">Tổng người dùng</span>
                                <span className="font-medium">{systemInfo.userCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Tổng domains</span>
                                <span>{systemInfo.domainCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Tổng email</span>
                                <span>{systemInfo.messageCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Đăng nhập 24h</span>
                                <span className="text-green-600">{systemInfo.recentLogins24h}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-muted">Đang tải...</div>
                    )}
                </div>
            </div>

            {/* Change Password */}
            <div className="bg-surface border border-border rounded-lg p-5 mt-6">
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    Đổi mật khẩu
                </h3>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-muted mb-1.5">Mật khẩu mới</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Tối thiểu 6 ký tự"
                            className="text-sm input-nebula w-full max-w-xs"
                            minLength={6}
                            required
                        />
                    </div>
                    <button type="submit" disabled={busy} className="btn-primary h-10 px-6">
                        {busy ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                    </button>
                    {msg && <div className="text-sm text-green-600">{msg}</div>}
                    {err && <div className="text-sm text-danger">{err}</div>}
                </form>
            </div>

            {/* Two-Factor Authentication */}
            <div className="bg-surface border border-border rounded-lg p-5 mt-6">
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    Xác thực hai yếu tố (2FA)
                </h3>

                {twoFAError && <div className="text-sm text-danger mb-3">{twoFAError}</div>}

                {/* Status: Not enabled */}
                {!profile?.twoFactorEnabled && twoFAStep === "idle" && (
                    <div className="space-y-3">
                        <p className="text-sm text-muted">
                            Bảo vệ tài khoản của bạn bằng xác thực hai yếu tố sử dụng ứng dụng như Google Authenticator.
                        </p>
                        <button onClick={setup2FA} disabled={twoFABusy} className="btn-primary h-10 px-6">
                            {twoFABusy ? "Đang thiết lập..." : "Kích hoạt 2FA"}
                        </button>
                    </div>
                )}

                {/* Step: Show QR code */}
                {twoFAStep === "setup" && (
                    <div className="space-y-4">
                        <p className="text-sm text-muted">Quét mã QR bằng ứng dụng xác thực:</p>
                        <div className="bg-white p-4 rounded-lg inline-block border border-border">
                            <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                        </div>
                        <p className="text-xs text-muted">Hoặc nhập thủ công: <code className="bg-bg px-2 py-1 rounded text-xs">{totpSecret}</code></p>
                        <div className="pt-2">
                            <label className="block text-xs text-muted mb-1.5">Nhập mã 6 chữ số từ ứng dụng:</label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={verifyCode}
                                    onChange={(e) => setVerifyCode(e.target.value)}
                                    className="text-sm w-32 tracking-widest text-center input-nebula"
                                    placeholder="000000"
                                    maxLength={6}
                                />
                                <button onClick={enable2FA} disabled={twoFABusy} className="btn-primary h-10">
                                    Xác nhận
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step: Backup codes (Success) */}
                {twoFAStep === "backup" && (
                    <div className="space-y-4">
                        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm border border-green-200">
                            <strong>Đã kích hoạt thành công!</strong> Đây là các mã dự phòng của bạn. Hãy lưu chúng vào nơi an toàn.
                        </div>
                        <div className="grid grid-cols-2 gap-2 bg-bg p-4 rounded-lg border border-border">
                            {backupCodes.map((code) => (
                                <div key={code} className="font-mono text-xs text-center">{code}</div>
                            ))}
                        </div>
                        <button onClick={() => setTwoFAStep("idle")} className="btn-secondary h-10 w-full">
                            Đã lưu mã dự phòng
                        </button>
                    </div>
                )}

                {/* Status: Enabled */}
                {profile?.twoFactorEnabled && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-200 text-sm">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Đang bật bảo vệ 2FA
                        </div>
                        <button onClick={disable2FA} disabled={twoFABusy} className="text-sm text-danger hover:underline">
                            Tắt 2FA
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
