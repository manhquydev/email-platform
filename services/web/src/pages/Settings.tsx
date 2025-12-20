import { useState, useEffect, useCallback, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { getFriendlyErrorMessage } from "../utils/errorMapping";
import toast from "react-hot-toast";
import { ThemeToggle } from "../components/ThemeToggle";

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

export function Settings() {
    const { token, user } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

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

    const loadProfile = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await api<{ user: UserProfile }>("/auth/me", { token });
            setProfile(res.user);
        } catch {
            // Will add endpoint later
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
    }, [loadProfile]);

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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-bg">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg">
            {/* Header */}
            <header className="bg-surface border-b border-border px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/app" className="text-muted hover:text-text-main transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <h1 className="text-xl font-semibold">Cài đặt tài khoản</h1>
                    </div>
                    <ThemeToggle />
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Profile Card */}
                    <div className="bg-surface border border-border rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white text-lg font-semibold">
                                {profile?.email?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div>
                                <h2 className="font-semibold">{profile?.email?.split("@")[0]}</h2>
                                <p className="text-sm text-muted">{profile?.email}</p>
                            </div>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-2 border-b border-border">
                                <span className="text-muted">Vai trò</span>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${profile?.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                                    {profile?.role === "ADMIN" ? "Quản trị viên" : "Người dùng"}
                                </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-border">
                                <span className="text-muted">Gói dịch vụ</span>
                                <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700">
                                    {profile?.tier || "FREE"}
                                </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-border">
                                <span className="text-muted">Ngày tạo</span>
                                <span>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("vi-VN") : "—"}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-border">
                                <span className="text-muted">Domains sở hữu</span>
                                <Link to="/my-domains" className="text-primary hover:underline">
                                    {profile?._count?.domains ?? 0} domains
                                </Link>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-muted">Inboxes</span>
                                <span>{profile?._count?.inboxes ?? 0} hộp thư</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links Card */}
                    <div className="bg-surface border border-border rounded-xl p-6">
                        <h3 className="font-medium mb-4">Truy cập nhanh</h3>
                        <div className="space-y-2">
                            <Link to="/app" className="flex items-center gap-3 p-3 rounded-lg hover:bg-bg transition-colors">
                                <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                                <span>Hộp thư đến</span>
                            </Link>
                            <Link to="/my-domains" className="flex items-center gap-3 p-3 rounded-lg hover:bg-bg transition-colors">
                                <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                </svg>
                                <span>Quản lý tên miền</span>
                            </Link>
                            <Link to="/authenticator" className="flex items-center gap-3 p-3 rounded-lg hover:bg-bg transition-colors">
                                <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                </svg>
                                <span>Authenticator</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Security Section */}
                <div className="mt-6 space-y-6">
                    {/* Change Password */}
                    <div className="bg-surface border border-border rounded-xl p-6">
                        <h3 className="font-medium mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                            Đổi mật khẩu
                        </h3>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label className="block text-sm text-muted mb-1.5">Mật khẩu mới</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Tối thiểu 6 ký tự"
                                    className="w-full max-w-sm"
                                    minLength={6}
                                />
                            </div>
                            <button type="submit" disabled={passwordBusy} className="btn-primary">
                                {passwordBusy ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                            </button>
                            {passwordMsg && <p className="text-sm text-green-600">{passwordMsg}</p>}
                            {passwordErr && <p className="text-sm text-red-600">{passwordErr}</p>}
                        </form>
                    </div>

                    {/* Two-Factor Authentication */}
                    <div className="bg-surface border border-border rounded-xl p-6">
                        <h3 className="font-medium mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                            </svg>
                            Xác thực hai yếu tố (2FA)
                        </h3>

                        {twoFAError && <p className="text-sm text-red-600 mb-3">{twoFAError}</p>}

                        {/* Not enabled */}
                        {!profile?.twoFactorEnabled && twoFAStep === "idle" && (
                            <div className="space-y-3">
                                <p className="text-sm text-muted">
                                    Bảo vệ tài khoản của bạn bằng xác thực hai yếu tố. Sử dụng ứng dụng như Google Authenticator.
                                </p>
                                <button onClick={setup2FA} disabled={twoFABusy} className="btn-primary">
                                    {twoFABusy ? "Đang thiết lập..." : "Kích hoạt 2FA"}
                                </button>
                            </div>
                        )}

                        {/* Setup QR */}
                        {twoFAStep === "setup" && (
                            <div className="space-y-4">
                                <p className="text-sm text-muted">Quét mã QR bằng ứng dụng xác thực:</p>
                                <div className="bg-white p-4 rounded-lg inline-block border">
                                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                                </div>
                                <p className="text-xs text-muted">
                                    Hoặc nhập thủ công: <code className="bg-bg px-2 py-1 rounded">{totpSecret}</code>
                                </p>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        value={verifyCode}
                                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                        placeholder="000000"
                                        className="w-32 text-center tracking-widest font-mono"
                                        maxLength={6}
                                    />
                                    <button onClick={enable2FA} disabled={twoFABusy || verifyCode.length !== 6} className="btn-primary">
                                        {twoFABusy ? "Đang xác minh..." : "Xác nhận"}
                                    </button>
                                    <button onClick={() => setTwoFAStep("idle")} className="btn btn-secondary">
                                        Hủy
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Backup codes */}
                        {twoFAStep === "backup" && (
                            <div className="space-y-4">
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <p className="text-sm font-medium text-yellow-800 mb-2">⚠️ Lưu mã dự phòng!</p>
                                    <p className="text-xs text-yellow-700 mb-3">
                                        Các mã này cho phép bạn đăng nhập nếu mất điện thoại. Mỗi mã chỉ dùng được một lần.
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                                        {backupCodes.map((code, i) => (
                                            <div key={i} className="bg-white px-3 py-2 rounded border">
                                                {code}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={() => setTwoFAStep("idle")} className="btn-primary">
                                    Tôi đã lưu mã
                                </button>
                            </div>
                        )}

                        {/* Already enabled */}
                        {profile?.twoFactorEnabled && twoFAStep === "idle" && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-green-600">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-sm font-medium">2FA đã được kích hoạt</span>
                                </div>
                                <button onClick={disable2FA} disabled={twoFABusy} className="btn btn-secondary text-red-600 hover:bg-red-50">
                                    {twoFABusy ? "Đang xử lý..." : "Tắt 2FA"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
