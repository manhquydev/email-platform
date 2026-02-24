/**
 * UI components for Login page
 */
import { Link } from "react-router-dom";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PasskeyLogin } from "../../components/Auth/PasskeyLogin";
import { TelegramLoginButton } from "../../components/TelegramLoginButton";
import type { TelegramUser } from "../../components/TelegramLoginButton";

/** Brand logo component */
export const BrandLogo = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-primary">
        <path d="M12 12 C12 6, 3 6, 3 12 C3 18, 12 18, 12 12" strokeLinecap="round" />
        <path d="M12 12 C12 6, 21 6, 21 12" strokeLinecap="round" opacity="0.6" />
        <circle cx="21" cy="12" r="1" fill="currentColor" opacity="0.4" />
    </svg>
);

/** Floating security badge */
export function SecurityBadge() {
    return (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 rounded-full bg-surface/80 dark:bg-black/40 backdrop-blur-md border border-border text-xs text-text-secondary hover:text-text-main transition-colors cursor-help hidden md:flex z-50">
            <span className="material-symbols-outlined text-sm">encrypted</span>
            <span>Mã hóa đầu cuối</span>
        </div>
    );
}

/** Error alert component */
export function ErrorAlert({ message }: { message: string }) {
    return (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-red-500 text-sm">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {message}
        </div>
    );
}

/** Login form component */
interface LoginFormProps {
    email: string;
    password: string;
    error: string | null;
    busy: boolean;
    telegramBusy?: boolean;
    rememberMe: boolean;
    onEmailChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    onRememberMeChange: (checked: boolean) => void;
    onSubmit: (e: React.FormEvent) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onLoginSuccess: (token: string, user: any) => void;
    onTelegramAuth?: (user: TelegramUser) => void;
}

export function LoginForm({
    email,
    password,
    error,
    busy,
    telegramBusy,
    rememberMe,
    onEmailChange,
    onPasswordChange,
    onRememberMeChange,
    onSubmit,
    onLoginSuccess,
    onTelegramAuth
}: LoginFormProps) {
    const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;

    return (
        <>
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2 tracking-tight">Chào mừng trở lại</h1>
                <p className="text-text-secondary">Đăng nhập để tiếp tục quản lý email</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
                {error && <ErrorAlert message={error} />}

                <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    placeholder="name@example.com"
                    disabled={busy}
                    required
                    autoFocus
                    className="bg-surface-elevated border-border focus:border-primary focus:ring-primary"
                    icon={<span className="material-symbols-outlined text-[20px]">alternate_email</span>}
                />

                <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                        <label className="text-text-secondary text-sm font-medium">Mật khẩu</label>
                        <a href="#" className="text-xs text-primary hover:text-primary-glow transition-colors py-1 px-2 -mr-2 min-h-[44px] flex items-center">Quên mật khẩu?</a>
                    </div>
                    <Input
                        type="password"
                        value={password}
                        onChange={(e) => onPasswordChange(e.target.value)}
                        placeholder="••••••••"
                        disabled={busy}
                        required
                        className="bg-surface-elevated border-border focus:border-primary focus:ring-primary"
                        icon={<span className="material-symbols-outlined text-[20px]">lock</span>}
                    />
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                        <div className="relative">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                checked={rememberMe}
                                onChange={(e) => onRememberMeChange(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-4 h-4 rounded border border-border bg-surface-elevated peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center">
                                {rememberMe && (
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        </div>
                        <span className="text-sm text-text-secondary group-hover:text-text-main transition-colors">
                            Ghi nhớ đăng nhập <span className="text-xs text-text-secondary/60">(30 ngày)</span>
                        </span>
                    </label>
                </div>

                <Button
                    type="submit"
                    className="w-full h-12 text-base font-bold shadow-glow hover:shadow-nebula-glow hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 group bg-primary hover:bg-nebula-violet-dark"
                    isLoading={busy}
                >
                    <span>Đăng nhập</span>
                    <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Button>
            </form>

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
                    <PasskeyLogin onSuccess={onLoginSuccess} />

                    {/* Telegram Login - only for accounts already linked */}
                    {botUsername && onTelegramAuth && (
                        <div className="flex flex-col items-center gap-2">
                            <div className="relative w-full flex items-center justify-center min-h-[40px]">
                                {telegramBusy && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-surface/50 backdrop-blur-sm rounded-lg z-10">
                                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                                <TelegramLoginButton
                                    botName={botUsername}
                                    onAuth={onTelegramAuth}
                                    buttonSize="large"
                                    cornerRadius={12}
                                    showUserPhoto={false}
                                    className="flex justify-center"
                                />
                            </div>
                            <p className="text-xs text-text-secondary text-center">
                                Chỉ dành cho tài khoản đã liên kết Telegram
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

/** 2FA verification form component */
interface TwoFactorFormProps {
    code: string;
    busy: boolean;
    onCodeChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    onBack: () => void;
}

export function TwoFactorForm({ code, busy, onCodeChange, onSubmit, onBack }: TwoFactorFormProps) {
    return (
        <>
            <div className="mb-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 border border-primary/20 shadow-glow">
                    <span className="material-symbols-outlined text-3xl">lock_clock</span>
                </div>
                <h1 className="text-2xl font-bold mb-2">Xác thực 2 lớp</h1>
                <p className="text-text-secondary">Nhập mã từ ứng dụng xác thực của bạn</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
                <Input
                    type="text"
                    value={code}
                    onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ""))}
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
                    disabled={code.length < 6}
                    isLoading={busy}
                >
                    Xác nhận
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-nebula-text-muted hover:text-nebula-text"
                    onClick={onBack}
                    disabled={busy}
                >
                    Quay lại đăng nhập
                </Button>
            </form>
        </>
    );
}

/** Hero section for desktop */
export function HeroSection() {
    return (
        <div className="hidden md:flex flex-col justify-center text-white p-8 relative">
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
    );
}

/** Footer with register link */
export function LoginFooter() {
    return (
        <div className="mt-8 text-center text-sm border-t border-border pt-4">
            <p className="text-text-secondary">
                Chưa có tài khoản? <Link to="/register" className="text-primary hover:text-white font-medium transition-colors ml-1">Đăng ký ngay</Link>
            </p>
        </div>
    );
}
