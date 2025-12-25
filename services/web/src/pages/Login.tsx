import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export function Login() {
    const { login, verify2FA, token, busy } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [requires2FA, setRequires2FA] = useState(false);
    const [tempToken, setTempToken] = useState("");
    const [twoFactorCode, setTwoFactorCode] = useState("");

    useEffect(() => {
        if (token) navigate("/app");
    }, [token, navigate]);

    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const res = await login(email, password);
            if (res.requires2FA && res.tempToken) {
                setRequires2FA(true);
                setTempToken(res.tempToken);
                toast.success("Vui lòng nhập mã xác thực 2 lớp");
            }
        } catch (err) {
            const msg = (err as Error).toString().replace("Error: ", "");
            if (msg.includes("disabled") || msg.includes("khóa") || msg.includes("locked")) {
                setError("Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.");
            }
        }
    };

    const handleVerify2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await verify2FA(tempToken, twoFactorCode);
        } catch { /* Error handled in AuthContext */ }
    };

    return (
        <div className="auth-page" data-theme="dark">
            <div className="auth-container">
                {/* Left: Form Card */}
                <div className="auth-form-section">
                    <div className="auth-glass-card">
                        {/* Logo */}
                        <Link to="/" className="auth-brand">
                            <div className="auth-brand-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    {/* Broken Infinity Logo */}
                                    <path d="M12 12 C12 6, 3 6, 3 12 C3 18, 12 18, 12 12" strokeLinecap="round" />
                                    <path d="M12 12 C12 6, 21 6, 21 12" strokeLinecap="round" opacity="0.6" />
                                    <circle cx="21" cy="12" r="1" fill="currentColor" opacity="0.4" />
                                </svg>
                            </div>
                            <span>Ephemera</span>
                        </Link>

                        {!requires2FA ? (
                            <>
                                <div className="auth-header">
                                    <h1>Chào mừng trở lại</h1>
                                    <p>Đăng nhập để tiếp tục quản lý email của bạn</p>
                                </div>

                                <form onSubmit={handleSubmit} className="auth-form">
                                    {error && (
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-start gap-3">
                                            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            <div className="text-sm text-red-500">
                                                {error}
                                            </div>
                                        </div>
                                    )}
                                    <div className="auth-field">
                                        <label>Email</label>
                                        <div className="auth-input-group">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                            </svg>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="name@example.com"
                                                disabled={busy}
                                                required
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <div className="auth-field">
                                        <label>Mật khẩu</label>
                                        <div className="auth-input-group">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                disabled={busy}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <button type="submit" className="auth-submit" disabled={busy}>
                                        {busy ? (
                                            <>
                                                <span className="auth-spinner" />
                                                Đang đăng nhập...
                                            </>
                                        ) : (
                                            <>
                                                Đăng nhập
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            </>
                                        )}
                                    </button>
                                </form>
                            </>
                        ) : (
                            <>
                                <div className="auth-header">
                                    <div className="auth-2fa-icon">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </div>
                                    <h1>Xác thực 2 lớp</h1>
                                    <p>Nhập mã từ ứng dụng xác thực của bạn</p>
                                </div>

                                <form onSubmit={handleVerify2FA} className="auth-form">
                                    <div className="auth-field">
                                        <div className="auth-otp-input">
                                            <input
                                                type="text"
                                                value={twoFactorCode}
                                                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                                                placeholder="000000"
                                                maxLength={6}
                                                disabled={busy}
                                                required
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <button type="submit" className="auth-submit" disabled={busy || twoFactorCode.length < 6}>
                                        {busy ? (
                                            <>
                                                <span className="auth-spinner" />
                                                Đang xác thực...
                                            </>
                                        ) : (
                                            <>
                                                Xác nhận mã
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </>
                                        )}
                                    </button>

                                    <button type="button" className="auth-back-btn" onClick={() => setRequires2FA(false)} disabled={busy}>
                                        ← Quay lại đăng nhập
                                    </button>
                                </form>
                            </>
                        )}

                        <div className="auth-footer">
                            <p>
                                Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
                            </p>
                            <p className="text-xs text-muted mt-2 opacity-50">
                                v7.0 (Ultimate Lock)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Hero Section */}
                <div className="auth-hero-section">
                    <div className="auth-hero-content">
                        <div className="auth-hero-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h2>Email tạm thời chuyên nghiệp</h2>
                        <p>Bảo vệ quyền riêng tư với inbox không giới hạn theo domain của bạn</p>

                        <div className="auth-hero-features">
                            <div className="auth-hero-feature">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span>Tạo inbox tức thì</span>
                            </div>
                            <div className="auth-hero-feature">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                <span>Realtime notification</span>
                            </div>
                            <div className="auth-hero-feature">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                                <span>API cho developer</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
