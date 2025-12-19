import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Navigation } from "../components/Navigation";
import toast from "react-hot-toast";

export function Login() {
    const { login, verify2FA, token, busy } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // 2FA state
    const [requires2FA, setRequires2FA] = useState(false);
    const [tempToken, setTempToken] = useState("");
    const [twoFactorCode, setTwoFactorCode] = useState("");

    useEffect(() => {
        if (token) {
            navigate("/app");
        }
    }, [token, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await login(email, password);
            if (res.requires2FA && res.tempToken) {
                setRequires2FA(true);
                setTempToken(res.tempToken);
                toast.success("Vui lòng nhập mã xác thực 2 lớp");
            }
        } catch (err) {
            // Error toast handled in AuthContext
        }
    };

    const handleVerify2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await verify2FA(tempToken, twoFactorCode);
        } catch (err) {
            // Error toast handled in AuthContext
        }
    };

    return (
        <div className="auth-page auth-page-with-nav">
            <Navigation variant="auth" />
            <div className="auth-bg"></div>

            <div className="auth-container">
                <div className="auth-card">
                    {/* Logo */}
                    <div className="auth-logo">
                        <div className="auth-logo-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span className="auth-logo-text">TempMail Pro</span>
                    </div>

                    {!requires2FA ? (
                        <>
                            {/* Header */}
                            <div className="auth-header">
                                <h1 className="auth-title">Chào mừng trở lại</h1>
                                <p className="auth-subtitle">Đăng nhập để tiếp tục quản lý email của bạn</p>
                            </div>

                            {/* Login Form */}
                            <form onSubmit={handleSubmit} className="auth-form">
                                <div className="auth-field">
                                    <label className="auth-label">Email</label>
                                    <div className="auth-input-wrapper">
                                        <svg className="auth-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                        </svg>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="auth-input"
                                            placeholder="name@example.com"
                                            disabled={busy}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="auth-field">
                                    <label className="auth-label">Mật khẩu</label>
                                    <div className="auth-input-wrapper">
                                        <svg className="auth-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="auth-input"
                                            placeholder="••••••••"
                                            disabled={busy}
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="auth-submit-btn"
                                    disabled={busy}
                                >
                                    {busy ? (
                                        <>
                                            <span className="auth-spinner"></span>
                                            Đang đăng nhập...
                                        </>
                                    ) : (
                                        <>
                                            Đăng nhập
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            {/* 2FA Header */}
                            <div className="auth-header">
                                <h1 className="auth-title">Xác thực 2 lớp</h1>
                                <p className="auth-subtitle">Vui lòng nhập mã TOTP từ ứng dụng xác thực của bạn</p>
                            </div>

                            {/* 2FA Form */}
                            <form onSubmit={handleVerify2FA} className="auth-form">
                                <div className="auth-field">
                                    <label className="auth-label">Mã xác thực</label>
                                    <div className="auth-input-wrapper">
                                        <svg className="auth-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                        <input
                                            type="text"
                                            value={twoFactorCode}
                                            onChange={(e) => setTwoFactorCode(e.target.value)}
                                            className="auth-input"
                                            placeholder="123456"
                                            maxLength={6}
                                            disabled={busy}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="auth-submit-btn"
                                    disabled={busy}
                                >
                                    {busy ? (
                                        <>
                                            <span className="auth-spinner"></span>
                                            Đang xác thực...
                                        </>
                                    ) : (
                                        <>
                                            Xác nhận mã
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    className="btn-ghost w-full mt-4 text-sm"
                                    onClick={() => setRequires2FA(false)}
                                    disabled={busy}
                                >
                                    Quay lại đăng nhập
                                </button>
                            </form>
                        </>
                    )}

                    {/* Footer */}
                    <div className="auth-footer">
                        <p>
                            Chưa có tài khoản?{" "}
                            <Link to="/register" className="auth-link">
                                Đăng ký ngay
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Side decoration */}
                <div className="auth-decoration">
                    <div className="auth-decoration-content">
                        <div className="auth-decoration-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h2>Email tạm thời chuyên nghiệp</h2>
                        <p>Bảo vệ quyền riêng tư với inbox không giới hạn theo domain của bạn</p>
                        <ul className="auth-decoration-features">
                            <li>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Tạo inbox tức thì
                            </li>
                            <li>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Realtime notification
                            </li>
                            <li>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                API cho developer
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
