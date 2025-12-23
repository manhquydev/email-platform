import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { api } from "../utils/api";
import { useAuth } from "../context/AuthContext";

const registerSchema = z.object({
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu không khớp",
    path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score: 1, label: 'Yếu', color: 'var(--nebula-error)' };
    if (score <= 3) return { score: 2, label: 'Trung bình', color: 'var(--nebula-warning)' };
    return { score: 3, label: 'Mạnh', color: 'var(--nebula-success)' };
}

export function Register() {
    const [busy, setBusy] = useState(false);
    const [passwordValue, setPasswordValue] = useState('');
    const [registered, setRegistered] = useState(false);
    const { token } = useAuth();
    const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
    });

    if (token) return <Navigate to="/app" replace />;
    if (registered) return <Navigate to="/login" replace />;

    const onSubmit = async (data: RegisterForm) => {
        setBusy(true);
        try {
            const res = await api<{ message: string }>("/auth/register", {
                method: "POST",
                body: { email: data.email, password: data.password },
            });
            toast.success(res.message || "Đăng ký thành công!");
            setRegistered(true);
        } catch (e) {
            toast.error((e as Error).toString());
        } finally {
            setBusy(false);
        }
    };

    const strength = getPasswordStrength(passwordValue);

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

                        <div className="auth-header">
                            <h1>Tạo tài khoản mới</h1>
                            <p>Bắt đầu sử dụng email tạm thời miễn phí</p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
                            <div className="auth-field">
                                <label>Email</label>
                                <div className="auth-input-group">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                    </svg>
                                    <input
                                        {...register("email")}
                                        type="email"
                                        placeholder="name@example.com"
                                        disabled={busy}
                                    />
                                </div>
                                {errors.email && <p className="auth-error">{errors.email.message}</p>}
                            </div>

                            <div className="auth-field">
                                <label>Mật khẩu</label>
                                <div className="auth-input-group">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <input
                                        {...register("password")}
                                        type="password"
                                        placeholder="••••••••"
                                        disabled={busy}
                                        onChange={(e) => setPasswordValue(e.target.value)}
                                    />
                                </div>
                                {errors.password && <p className="auth-error">{errors.password.message}</p>}

                                {/* Password Strength */}
                                {passwordValue && (
                                    <div className="auth-password-strength">
                                        <div className="auth-strength-bars">
                                            {[1, 2, 3].map((level) => (
                                                <div
                                                    key={level}
                                                    className={`auth-strength-bar ${level <= strength.score ? 'active' : ''}`}
                                                    style={{ backgroundColor: level <= strength.score ? strength.color : undefined }}
                                                />
                                            ))}
                                        </div>
                                        <span style={{ color: strength.color }}>{strength.label}</span>
                                    </div>
                                )}
                            </div>

                            <div className="auth-field">
                                <label>Xác nhận mật khẩu</label>
                                <div className="auth-input-group">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    <input
                                        {...register("confirmPassword")}
                                        type="password"
                                        placeholder="••••••••"
                                        disabled={busy}
                                    />
                                </div>
                                {errors.confirmPassword && <p className="auth-error">{errors.confirmPassword.message}</p>}
                            </div>

                            <button type="submit" className="auth-submit" disabled={busy}>
                                {busy ? (
                                    <>
                                        <span className="auth-spinner" />
                                        Đang đăng ký...
                                    </>
                                ) : (
                                    <>
                                        Tạo tài khoản
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="auth-footer">
                            <p>
                                Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Hero Section */}
                <div className="auth-hero-section">
                    <div className="auth-hero-content">
                        <div className="auth-hero-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h2>Tham gia miễn phí</h2>
                        <p>Tạo tài khoản để trải nghiệm nền tảng email tạm thời chuyên nghiệp</p>

                        <div className="auth-hero-features">
                            <div className="auth-hero-feature">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Không giới hạn inbox</span>
                            </div>
                            <div className="auth-hero-feature">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Sử dụng domain riêng</span>
                            </div>
                            <div className="auth-hero-feature">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Bảo mật end-to-end</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
