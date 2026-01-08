import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { PasskeyLogin } from "../components/Auth/PasskeyLogin";
import { TelegramLoginButton, type TelegramUser } from "../components/TelegramLoginButton";
import { EmailPromptModal } from "../components/EmailPromptModal";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { api } from "../utils/api";

type LoginMode = "password" | "magic-link";

export function Login() {
    const { login, verify2FA, token, busy } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [requires2FA, setRequires2FA] = useState(false);
    const [tempToken, setTempToken] = useState("");
    const [twoFactorCode, setTwoFactorCode] = useState("");

    // Magic Link states
    const [loginMode, setLoginMode] = useState<LoginMode>("password");
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const [magicLinkBusy, setMagicLinkBusy] = useState(false);

    // Telegram auth states
    const [showTelegramEmailPrompt, setShowTelegramEmailPrompt] = useState(false);
    const [telegramTempToken, setTelegramTempToken] = useState("");
    const [telegramUser, setTelegramUser] = useState<{ id: string; username?: string; firstName?: string; photoUrl?: string } | null>(null);
    const [telegramBusy, setTelegramBusy] = useState(false);

    useEffect(() => {
        if (token) navigate("/app");
    }, [token, navigate]);

    const [error, setError] = useState<string | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleLoginSuccess = (token: string, user: any) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        window.location.href = user.role === 'ADMIN' ? '/admin' : '/app';
    };

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
            } else {
                setError("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
            }
        }
    };

    const handleVerify2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await verify2FA(tempToken, twoFactorCode);
        } catch { /* Error handled in AuthContext */ }
    };

    // Magic Link handler
    const handleMagicLinkRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast.error("Vui lòng nhập email");
            return;
        }

        setMagicLinkBusy(true);
        try {
            await api("/auth/magic-link/request", {
                method: "POST",
                body: { email }
            });
            setMagicLinkSent(true);
            toast.success("Link đăng nhập đã được gửi tới email của bạn!");
        } catch {
            toast.error("Không thể gửi link đăng nhập. Vui lòng thử lại.");
        } finally {
            setMagicLinkBusy(false);
        }
    };

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
                handleLoginSuccess(response.token, response.user);
                toast.success("Đăng nhập thành công với Telegram!");
            }
        } catch (err) {
            const msg = (err as Error).message || "Đăng nhập Telegram thất bại";
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

    const BrandLogo = () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-primary">
            <path d="M12 12 C12 6, 3 6, 3 12 C3 18, 12 18, 12 12" strokeLinecap="round" />
            <path d="M12 12 C12 6, 21 6, 21 12" strokeLinecap="round" opacity="0.6" />
            <circle cx="21" cy="12" r="1" fill="currentColor" opacity="0.4" />
        </svg>
    );

    return (
        <div className="flex-1 w-full flex flex-col p-4 py-12 relative">
            {/* Floating Security Badge - Matches Wireframe Position */}
            <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 rounded-full bg-surface/80 dark:bg-black/40 backdrop-blur-md border border-border text-xs text-text-secondary hover:text-text-main transition-colors cursor-help hidden md:flex z-50">
                <span className="material-symbols-outlined text-sm">encrypted</span>
                <span>Mã hóa đầu cuối</span>
            </div>

            <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center mx-auto">

                {/* Login Form */}
                <GlassCard className="p-8 md:p-12 rounded-3xl w-full max-w-md mx-auto md:mx-0 relative z-10 animate-fade-in-up">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

                    <Link to="/" className="inline-flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
                        <div className="p-2 rounded-xl bg-primary/10 shadow-glow">
                            <BrandLogo />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Ephemera</span>
                    </Link>

                    {!requires2FA ? (
                        <>
                            <div className="mb-6">
                                <h1 className="text-3xl font-bold mb-2 tracking-tight">Chào mừng trở lại</h1>
                                <p className="text-text-secondary">Đăng nhập để tiếp tục quản lý email</p>
                            </div>

                            {/* Login Mode Tabs */}
                            <div className="flex mb-6 p-1 bg-nebula-elevated rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => { setLoginMode("password"); setMagicLinkSent(false); }}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                                        loginMode === "password"
                                            ? "bg-primary text-white shadow-lg"
                                            : "text-nebula-text-muted hover:text-nebula-text"
                                    }`}
                                >
                                    Mật khẩu
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setLoginMode("magic-link"); setMagicLinkSent(false); }}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                                        loginMode === "magic-link"
                                            ? "bg-primary text-white shadow-lg"
                                            : "text-nebula-text-muted hover:text-nebula-text"
                                    }`}
                                >
                                    Magic Link
                                </button>
                            </div>

                            {loginMode === "password" ? (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {error && (
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-red-500 text-sm">
                                            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {error}
                                        </div>
                                    )}

                                    <Input
                                        label="Email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        disabled={busy}
                                        required
                                        autoFocus
                                        className="bg-surface-elevated border-border focus:border-primary focus:ring-primary"
                                        icon={
                                            <span className="material-symbols-outlined text-[20px]">alternate_email</span>
                                        }
                                    />

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center ml-1">
                                            <label className="text-text-secondary text-sm font-medium">Mật khẩu</label>
                                            <a href="#" className="text-xs text-primary hover:text-primary-glow transition-colors">Quên mật khẩu?</a>
                                        </div>
                                        <Input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            disabled={busy}
                                            required
                                            className="bg-surface-elevated border-border focus:border-primary focus:ring-primary"
                                            icon={
                                                <span className="material-symbols-outlined text-[20px]">lock</span>
                                            }
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-12 text-base font-bold shadow-glow hover:shadow-[0_0_30px_rgba(37,37,244,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 group bg-primary hover:bg-blue-600"
                                        isLoading={busy}
                                    >
                                        <span>Đăng nhập</span>
                                        <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    </Button>
                                </form>
                            ) : (
                                /* Magic Link Form */
                                <div className="space-y-6">
                                    {!magicLinkSent ? (
                                        <form onSubmit={handleMagicLinkRequest} className="space-y-6">
                                            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-sm text-primary">
                                                <div className="flex gap-3">
                                                    <span className="material-symbols-outlined text-primary shrink-0">magic_button</span>
                                                    <p>Nhập email của bạn, chúng tôi sẽ gửi link đăng nhập không cần mật khẩu.</p>
                                                </div>
                                            </div>

                                            <Input
                                                label="Email"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="name@example.com"
                                                disabled={magicLinkBusy}
                                                required
                                                autoFocus
                                                className="bg-surface-elevated border-border focus:border-primary focus:ring-primary"
                                                icon={
                                                    <span className="material-symbols-outlined text-[20px]">alternate_email</span>
                                                }
                                            />

                                            <Button
                                                type="submit"
                                                className="w-full h-12 text-base font-bold shadow-glow hover:shadow-[0_0_30px_rgba(37,37,244,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 group bg-primary hover:bg-blue-600"
                                                isLoading={magicLinkBusy}
                                            >
                                                <span className="material-symbols-outlined text-[20px]">send</span>
                                                <span>Gửi link đăng nhập</span>
                                            </Button>
                                        </form>
                                    ) : (
                                        <div className="text-center py-8 space-y-4">
                                            <div className="w-16 h-16 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center mx-auto border border-green-500/20">
                                                <span className="material-symbols-outlined text-3xl">mark_email_read</span>
                                            </div>
                                            <h3 className="text-xl font-bold">Kiểm tra email của bạn!</h3>
                                            <p className="text-text-secondary text-sm">
                                                Chúng tôi đã gửi link đăng nhập tới <span className="text-primary font-medium">{email}</span>
                                            </p>
                                            <p className="text-xs text-nebula-text-muted">
                                                Không nhận được email? Kiểm tra thư mục spam hoặc
                                                <button
                                                    onClick={() => setMagicLinkSent(false)}
                                                    className="text-primary hover:underline ml-1"
                                                >
                                                    thử lại
                                                </button>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-8">
                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-border"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-surface text-nebula-text-muted rounded text-xs uppercase tracking-wider bg-opacity-80 backdrop-blur-sm">
                                            Hoặc tiếp tục với
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 space-y-3">
                                    <PasskeyLogin onSuccess={handleLoginSuccess} />

                                    {/* Telegram Login */}
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
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="mb-8 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 border border-primary/20 shadow-glow">
                                    <span className="material-symbols-outlined text-3xl">lock_clock</span>
                                </div>
                                <h1 className="text-2xl font-bold mb-2">Xác thực 2 lớp</h1>
                                <p className="text-text-secondary">Nhập mã từ ứng dụng xác thực của bạn</p>
                            </div>

                            <form onSubmit={handleVerify2FA} className="space-y-6">
                                <Input
                                    type="text"
                                    value={twoFactorCode}
                                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                                    placeholder="000000"
                                    maxLength={6}
                                    disabled={busy}
                                    required
                                    autoFocus
                                    className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-surface-elevated border-border focus:border-primary"
                                />

                                <Button
                                    type="submit"
                                    className="w-full h-12 shadow-glow"
                                    disabled={twoFactorCode.length < 6}
                                    isLoading={busy}
                                >
                                    Xác nhận
                                </Button>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full text-nebula-text-muted hover:text-nebula-text"
                                    onClick={() => setRequires2FA(false)}
                                    disabled={busy}
                                >
                                    Quay lại đăng nhập
                                </Button>
                            </form>
                        </>
                    )}

                    <div className="mt-8 text-center text-sm border-t border-border pt-4">
                        <p className="text-text-secondary">
                            Chưa có tài khoản? <Link to="/register" className="text-primary hover:text-white font-medium transition-colors ml-1">Đăng ký ngay</Link>
                        </p>
                    </div>
                </GlassCard>

                {/* Right Side - Hero/Visuals */}
                <div className="hidden md:flex flex-col justify-center text-white p-8 relative">
                    {/* Decorative Elements */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointing-events-none -z-10" />

                    <div className="mb-12">
                        <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                            Email tạm thời <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">chuyên nghiệp</span>
                        </h2>
                        <p className="text-lg text-white/70 max-w-md">
                            Bảo vệ quyền riêng tư với inbox không giới hạn theo domain của bạn. An toàn, nhanh chóng và riêng tư.
                        </p>
                    </div>

                    <div className="grid gap-6">
                        <GlassCard className="p-4 flex items-center gap-4 bg-surface/30 border-white/5">
                            <div className="p-2 rounded-lg bg-surface/50 text-primary">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-bold">Tạo inbox tức thì</h3>
                                <p className="text-sm text-white/60">Không cần đăng ký phức tạp</p>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-4 flex items-center gap-4 bg-surface/30 border-white/5">
                            <div className="p-2 rounded-lg bg-surface/50 text-purple-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-bold">Bảo mật tuyệt đối</h3>
                                <p className="text-sm text-white/60">Mã hóa end-to-end</p>
                            </div>
                        </GlassCard>
                    </div>
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
