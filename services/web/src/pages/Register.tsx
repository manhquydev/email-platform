import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { api } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { TelegramLoginButton, type TelegramUser } from "../components/TelegramLoginButton";
import { EmailPromptModal } from "../components/EmailPromptModal";

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

    if (score <= 2) return { score: 1, label: 'Yếu', color: '#ff4444' };
    if (score <= 3) return { score: 2, label: 'Trung bình', color: '#ffbb33' };
    return { score: 3, label: 'Mạnh', color: '#00C851' };
}

export function Register() {
    const [busy, setBusy] = useState(false);
    const [passwordValue, setPasswordValue] = useState('');
    const [registered, setRegistered] = useState(false);
    const { token } = useAuth();
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
    });

    // Telegram auth states
    const [showTelegramEmailPrompt, setShowTelegramEmailPrompt] = useState(false);
    const [telegramTempToken, setTelegramTempToken] = useState("");
    const [telegramUser, setTelegramUser] = useState<{ id: string; username?: string; firstName?: string; photoUrl?: string } | null>(null);
    const [telegramBusy, setTelegramBusy] = useState(false);

    if (token) return <Navigate to="/app" replace />;
    if (registered) return <Navigate to="/login" replace />;

    // Telegram auth handler
    const handleTelegramAuth = async (user: TelegramUser) => {
        setTelegramBusy(true);
        try {
            const response = await api<{
                requiresEmail?: boolean;
                tempToken?: string;
                telegramUser?: { id: string; username?: string; firstName?: string; photoUrl?: string };
                token?: string;
                user?: { id: string; email: string; role: string };
            }>("/auth/telegram", {
                method: "POST",
                body: user,
            });

            if (response.requiresEmail) {
                // New user - needs email
                setTelegramTempToken(response.tempToken || "");
                setTelegramUser(response.telegramUser || null);
                setShowTelegramEmailPrompt(true);
            } else if (response.token) {
                // Existing user - login successful
                localStorage.setItem("token", response.token);
                localStorage.setItem("user", JSON.stringify(response.user));
                toast.success("Đăng nhập thành công với Telegram!");
                navigate("/app");
            }
        } catch (err) {
            const msg = (err as Error).message || "Đăng ký Telegram thất bại";
            toast.error(msg);
        } finally {
            setTelegramBusy(false);
        }
    };

    const handleTelegramRegistrationComplete = (token: string) => {
        localStorage.setItem("token", token);
        setShowTelegramEmailPrompt(false);
        toast.success("Đăng ký thành công!");
        navigate("/app");
    };

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

    const BrandLogo = () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-primary">
            <path d="M12 12 C12 6, 3 6, 3 12 C3 18, 12 18, 12 12" strokeLinecap="round" />
            <path d="M12 12 C12 6, 21 6, 21 12" strokeLinecap="round" opacity="0.6" />
            <circle cx="21" cy="12" r="1" fill="currentColor" opacity="0.4" />
        </svg>
    );

    return (
        <div className="flex-1 w-full flex flex-col p-4 py-12">
            <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center mx-auto">

                {/* Register Form */}
                <GlassCard className="p-8 md:p-12 rounded-3xl w-full max-w-md mx-auto md:mx-0 relative z-10 animate-fade-in-up">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

                    <Link to="/" className="inline-flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
                        <div className="p-2 rounded-xl bg-primary/10 shadow-glow">
                            <BrandLogo />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Ephemera</span>
                    </Link>

                    <div className="mb-8 text-center md:text-left">
                        <h1 className="text-3xl font-bold mb-2 tracking-tight">Tham gia Ephemera</h1>
                        <p className="text-text-secondary">Tạo inbox an toàn, ẩn danh trong vài giây.</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <Input
                            label="Địa chỉ Email"
                            {...register("email")}
                            type="email"
                            placeholder="you@ephemera.io"
                            disabled={busy}
                            error={errors.email?.message}
                            className="bg-surface-elevated border-border focus:border-primary focus:ring-primary"
                            icon={
                                <span className="material-symbols-outlined text-[20px]">alternate_email</span>
                            }
                        />

                        <div className="space-y-2">
                            <Input
                                label="Mật khẩu"
                                {...register("password")}
                                type="password"
                                placeholder="••••••••"
                                disabled={busy}
                                error={errors.password?.message}
                                onChange={(e) => {
                                    register("password").onChange(e);
                                    setPasswordValue(e.target.value);
                                }}
                                className="bg-surface-elevated border-border focus:border-primary focus:ring-primary"
                                icon={
                                    <span className="material-symbols-outlined text-[20px]">lock</span>
                                }
                            />

                            {/* Password Strength */}
                            {passwordValue && (
                                <div className="flex items-center gap-2 mt-2 px-1">
                                    <span className="text-xs text-nebula-text-muted">Độ mạnh:</span>
                                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden flex gap-1">
                                        <div
                                            className="h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(37,244,100,0.5)]"
                                            style={{
                                                width: `${(strength.score / 3) * 100}%`,
                                                backgroundColor: strength.color
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium" style={{ color: strength.color }}>{strength.label}</span>
                                </div>
                            )}
                        </div>

                        <Input
                            label="Xác nhận mật khẩu"
                            {...register("confirmPassword")}
                            type="password"
                            placeholder="••••••••"
                            disabled={busy}
                            error={errors.confirmPassword?.message}
                            className="bg-surface-elevated border-border focus:border-primary focus:ring-primary"
                            icon={
                                <span className="material-symbols-outlined text-[20px]">lock_reset</span>
                            }
                        />

                        {/* Terms Checkbox - Visual Only for now */}
                        <div className="flex items-start gap-3 mt-1 px-1">
                            <input
                                id="terms"
                                type="checkbox"
                                required
                                className="mt-1 h-4 w-4 rounded border-border bg-surface-elevated text-primary focus:ring-primary focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer"
                            />
                            <label htmlFor="terms" className="text-xs text-nebula-text-muted cursor-pointer selection:bg-none">
                                Tôi đồng ý với <Link to="/terms" className="text-primary hover:text-white underline transition-colors">Điều khoản Dịch vụ</Link> và <Link to="/privacy" className="text-primary hover:text-white underline transition-colors">Chính sách Bảo mật</Link>.
                            </label>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-bold shadow-glow hover:shadow-[0_0_30px_rgba(37,37,244,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 group bg-primary hover:bg-blue-600"
                            isLoading={busy}
                        >
                            <span>Tạo tài khoản</span>
                            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                        </Button>
                    </form>

                    {/* Social Divider */}
                    <div className="relative flex py-4 items-center">
                        <div className="flex-grow border-t border-border"></div>
                        <span className="flex-shrink-0 mx-4 text-xs text-nebula-text-muted uppercase tracking-wider">Hoặc tiếp tục với</span>
                        <div className="flex-grow border-t border-border"></div>
                    </div>

                    {/* Telegram Registration */}
                    {import.meta.env.VITE_TELEGRAM_BOT_USERNAME && (
                        <div className="flex justify-center">
                            {telegramBusy ? (
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <span className="animate-spin">⏳</span>
                                    <span>Đang xử lý...</span>
                                </div>
                            ) : (
                                <TelegramLoginButton
                                    botName={import.meta.env.VITE_TELEGRAM_BOT_USERNAME}
                                    onAuth={handleTelegramAuth}
                                    buttonSize="large"
                                />
                            )}
                        </div>
                    )}

                    <div className="mt-6 text-center text-sm border-t border-border pt-4">
                        <p className="text-text-secondary">
                            Đã có tài khoản? <Link to="/login" className="text-primary hover:text-white font-medium transition-colors ml-1">Đăng nhập ngay</Link>
                        </p>
                    </div>
                </GlassCard>

                {/* Right: Hero/Visuals - Desktop */}
                <div className="hidden md:flex flex-col justify-center text-white p-8 relative">
                    {/* Decorative Elements */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointing-events-none -z-10" />

                    <div className="mb-12">
                        <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                            Tham gia <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">miễn phí</span>
                        </h2>
                        <p className="text-lg text-white/70 max-w-md">
                            Tạo tài khoản để trải nghiệm nền tảng email tạm thời chuyên nghiệp. Không cần thẻ tín dụng.
                        </p>
                    </div>

                    <div className="grid gap-6">
                        <GlassCard className="p-4 flex items-center gap-4 bg-surface/30 border-white/5">
                            <div className="p-2 rounded-lg bg-surface/50 text-green-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-bold">Không giới hạn inbox</h3>
                                <p className="text-sm text-white/60">Tạo bao nhiêu tùy thích</p>
                            </div>
                        </GlassCard>
                        <GlassCard className="p-4 flex items-center gap-4 bg-surface/30 border-white/5">
                            <div className="p-2 rounded-lg bg-surface/50 text-blue-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-bold">Sử dụng domain riêng</h3>
                                <p className="text-sm text-white/60">Chuyên nghiệp hóa email</p>
                            </div>
                        </GlassCard>
                    </div>
                </div>

                {/* Floating Security Badge - Matches Wireframe Position */}
                <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 rounded-full bg-surface/80 dark:bg-black/40 backdrop-blur-md border border-border text-xs text-text-secondary hover:text-text-main transition-colors cursor-help hidden md:flex z-50">
                    <span className="material-symbols-outlined text-sm">encrypted</span>
                    <span>Mã hóa đầu cuối</span>
                </div>
            </div>

            {/* Telegram Email Prompt Modal */}
            {showTelegramEmailPrompt && telegramUser && (
                <EmailPromptModal
                    tempToken={telegramTempToken}
                    telegramUser={telegramUser}
                    onComplete={handleTelegramRegistrationComplete}
                    onCancel={() => {
                        setShowTelegramEmailPrompt(false);
                        setTelegramUser(null);
                        setTelegramTempToken("");
                    }}
                />
            )}
        </div>
    );
}
