import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { api } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { Navigation } from "../components/Navigation";

const registerSchema = z.object({
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu không khớp",
    path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

// Password strength helper
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score: 1, label: 'Yếu', color: 'var(--color-danger)' };
    if (score <= 3) return { score: 2, label: 'Trung bình', color: 'var(--color-warning)' };
    return { score: 3, label: 'Mạnh', color: 'var(--color-success)' };
}

// Password strength indicator component
function PasswordStrengthIndicator({ password }: { password: string }) {
    const strength = getPasswordStrength(password);
    return (
        <div className="password-strength">
            <div className="password-strength-bars">
                {[1, 2, 3].map((level) => (
                    <div
                        key={level}
                        className="password-strength-bar"
                        style={{
                            backgroundColor: level <= strength.score ? strength.color : 'var(--color-border)',
                        }}
                    />
                ))}
            </div>
            <span className="password-strength-label" style={{ color: strength.color }}>
                {strength.label}
            </span>
        </div>
    );
}

export function Register() {
    const [busy, setBusy] = useState(false);
    const [passwordValue, setPasswordValue] = useState('');
    const navigate = useNavigate();
    const { token } = useAuth();

    // Redirect if already logged in
    if (token) {
        navigate("/app");
    }

    const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterForm) => {
        setBusy(true);
        try {
            const res = await api<{ message: string }>("/auth/register", {
                method: "POST",
                body: { email: data.email, password: data.password },
            });
            toast.success(res.message || "Đăng ký thành công! Vui lòng kiểm tra email.");
            navigate("/login");
        } catch (e) {
            toast.error((e as Error).toString());
        } finally {
            setBusy(false);
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

                    {/* Header */}
                    <div className="auth-header">
                        <h1 className="auth-title">Tạo tài khoản mới</h1>
                        <p className="auth-subtitle">Bắt đầu sử dụng email tạm thời miễn phí</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
                        <div className="auth-field">
                            <label className="auth-label">Email</label>
                            <div className="auth-input-wrapper">
                                <svg className="auth-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                </svg>
                                <input
                                    {...register("email")}
                                    type="email"
                                    className="auth-input"
                                    placeholder="name@example.com"
                                    disabled={busy}
                                />
                            </div>
                            {errors.email && <p className="auth-input-error">{errors.email.message}</p>}
                        </div>

                        <div className="auth-field">
                            <label className="auth-label">Mật khẩu</label>
                            <div className="auth-input-wrapper">
                                <svg className="auth-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <input
                                    {...register("password")}
                                    type="password"
                                    className="auth-input"
                                    placeholder="••••••••"
                                    disabled={busy}
                                    onChange={(e) => setPasswordValue(e.target.value)}
                                />
                            </div>
                            {errors.password && <p className="auth-input-error">{errors.password.message}</p>}
                            {/* Password Strength Indicator */}
                            {passwordValue && (
                                <PasswordStrengthIndicator password={passwordValue} />
                            )}
                        </div>

                        <div className="auth-field">
                            <label className="auth-label">Xác nhận mật khẩu</label>
                            <div className="auth-input-wrapper">
                                <svg className="auth-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <input
                                    {...register("confirmPassword")}
                                    type="password"
                                    className="auth-input"
                                    placeholder="••••••••"
                                    disabled={busy}
                                />
                            </div>
                            {errors.confirmPassword && <p className="auth-input-error">{errors.confirmPassword.message}</p>}
                        </div>

                        <button
                            type="submit"
                            className="auth-submit-btn"
                            disabled={busy}
                        >
                            {busy ? (
                                <>
                                    <span className="auth-spinner"></span>
                                    Đang đăng ký...
                                </>
                            ) : (
                                <>
                                    Tạo tài khoản
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="auth-footer">
                        <p>
                            Đã có tài khoản?{" "}
                            <Link to="/login" className="auth-link">
                                Đăng nhập
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Side decoration */}
                <div className="auth-decoration">
                    <div className="auth-decoration-content">
                        <div className="auth-decoration-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h2>Tham gia miễn phí</h2>
                        <p>Tạo tài khoản để trải nghiệm nền tảng email tạm thời chuyên nghiệp</p>
                        <ul className="auth-decoration-features">
                            <li>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Không giới hạn inbox
                            </li>
                            <li>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Sử dụng domain riêng
                            </li>
                            <li>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Bảo mật end-to-end
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
